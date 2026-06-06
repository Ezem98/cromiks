-- Guard contra la race de asignación de misiones diarias.
--
-- Antes la asignación vivía en JS (server action assignDailyMissions): contaba
-- las misiones del ciclo y luego insertaba con el admin client. Dos cargas
-- concurrentes del home podían contar 0 a la vez e insertar 3 c/u (6 misiones).
-- La idempotencia por count, sola, no cierra la race (es TOCTOU).
--
-- Esta función mete todo en UNA transacción serializada por
-- pg_advisory_xact_lock(user + ciclo): lock -> count -> pick -> insert acotado.
-- Dos llamadas concurrentes del mismo user+ciclo se serializan: la segunda ve el
-- count ya en 3 y no inserta nada. Además el pick de templates pasa a SQL, así
-- el cliente no puede elegir qué misiones se le asignan (ya no hace falta el
-- admin client ni confiar en picks del cliente).
--
-- `p_expires_at` = frontera del ciclo (próxima medianoche AR). La calcula el
-- caller (nextDailyCycleExpiry) y es la misma clave que usa el conteo del home.

CREATE OR REPLACE FUNCTION "public"."assign_daily_missions"("p_expires_at" timestamp with time zone) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id   uuid;
  v_existing  integer;
  v_to_insert integer;
  v_inserted  integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  -- Serializa asignaciones concurrentes del mismo user+ciclo. Lock por
  -- transacción: se libera solo al commit/rollback, así el count + insert de
  -- abajo son atómicos frente a otra llamada en paralelo.
  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || '|' || p_expires_at::text, 0)
  );

  select count(*) into v_existing
  from public.user_missions
  where user_id = v_user_id and expires_at = p_expires_at;

  v_to_insert := 3 - v_existing;
  if v_to_insert <= 0 then
    return 0;
  end if;

  -- Pick weighted sin reemplazo (Efraimidis–Spirakis: key = u^(1/w), top-k),
  -- 100% en SQL. Solo del pool diario.
  insert into public.user_missions (user_id, mission_template_id, status, progress, target, expires_at)
  select
    v_user_id,
    mt.id,
    'active'::public.mission_status,
    0,
    coalesce((mt.config->>'target_count')::integer, 1),
    p_expires_at
  from public.mission_templates mt
  where mt.is_daily_pool = true
  order by power(random(), 1.0 / greatest(coalesce(mt.weight, 100), 1)) desc
  limit v_to_insert;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    raise exception 'no_templates_available' using errcode = 'P0001';
  end if;

  return v_inserted;
end;
$$;


ALTER FUNCTION "public"."assign_daily_missions"("p_expires_at" timestamp with time zone) OWNER TO "postgres";

-- Mismo patrón de grants que el resto de los RPC del baseline. La función igual
-- scopea todo a auth.uid() y tira 'auth_required' si no hay sesión.
GRANT ALL ON FUNCTION "public"."assign_daily_missions"("p_expires_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."assign_daily_missions"("p_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_daily_missions"("p_expires_at" timestamp with time zone) TO "service_role";
