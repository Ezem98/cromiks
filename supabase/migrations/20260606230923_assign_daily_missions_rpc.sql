-- Guard contra la race de asignación de misiones diarias + anti-farmeo.
--
-- Antes la asignación vivía en JS (server action assignDailyMissions): contaba
-- las misiones del ciclo y luego insertaba con el admin client. Dos cargas
-- concurrentes del home podían contar 0 a la vez e insertar 3 c/u (6 misiones).
-- La idempotencia por count, sola, no cierra la race (es TOCTOU).
--
-- Esta función mete todo en UNA transacción serializada por
-- pg_advisory_xact_lock(user + ciclo): lock -> count -> pick -> insert acotado.
--
-- CLAVE: la frontera del ciclo se computa en el SERVIDOR (próxima medianoche AR),
-- NUNCA desde el cliente. Si el caller pudiera elegir el expires_at, mintearía 3
-- misiones por cada timestamp distinto llamando el RPC directo por PostgREST
-- (recompensas infinitas). El pick de templates también vive en SQL, así el
-- cliente no elige qué misiones recibe. date_trunc en tz AR es DST-safe.

-- Reemplaza la versión vieja que tomaba p_expires_at del cliente (insegura).
DROP FUNCTION IF EXISTS "public"."assign_daily_missions"(timestamp with time zone);

CREATE OR REPLACE FUNCTION "public"."assign_daily_missions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id   uuid;
  v_cycle     timestamptz;
  v_existing  integer;
  v_to_insert integer;
  v_inserted  integer;
  v_pool      integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  -- Próxima medianoche AR (00:00 AR = frontera del ciclo). Computada server-side.
  v_cycle := (
    date_trunc('day', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))
    + interval '1 day'
  ) AT TIME ZONE 'America/Argentina/Buenos_Aires';

  -- Serializa asignaciones concurrentes del mismo user+ciclo. Lock por
  -- transacción: se libera al commit/rollback, así count + insert son atómicos.
  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || '|' || v_cycle::text, 0)
  );

  select count(*) into v_existing
  from public.user_missions
  where user_id = v_user_id and expires_at = v_cycle;

  v_to_insert := 3 - v_existing;
  if v_to_insert <= 0 then
    return 0;
  end if;

  -- Pick weighted sin reemplazo (Efraimidis–Spirakis: key = u^(1/w), top-k),
  -- excluyendo templates que el user ya tiene para este ciclo (evita duplicados
  -- en retries parciales). Solo del pool diario.
  insert into public.user_missions (user_id, mission_template_id, status, progress, target, expires_at)
  select
    v_user_id,
    mt.id,
    'active'::public.mission_status,
    0,
    coalesce((mt.config->>'target_count')::integer, 1),
    v_cycle
  from public.mission_templates mt
  where mt.is_daily_pool = true
    and mt.id not in (
      select um.mission_template_id
      from public.user_missions um
      where um.user_id = v_user_id and um.expires_at = v_cycle
    )
  order by power(random(), 1.0 / greatest(coalesce(mt.weight, 100), 1)) desc
  limit v_to_insert;

  get diagnostics v_inserted = row_count;

  -- 'no_templates_available' SOLO si el pool está realmente vacío, no cuando
  -- simplemente no quedaba nada nuevo para sumar.
  if v_inserted = 0 then
    select count(*) into v_pool from public.mission_templates where is_daily_pool = true;
    if v_pool = 0 then
      raise exception 'no_templates_available' using errcode = 'P0001';
    end if;
  end if;

  return v_inserted;
end;
$$;


ALTER FUNCTION "public"."assign_daily_missions"() OWNER TO "postgres";

-- Mismo patrón de grants que el resto de los RPC del baseline. La función igual
-- scopea todo a auth.uid() y tira 'auth_required' si no hay sesión.
GRANT ALL ON FUNCTION "public"."assign_daily_missions"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_daily_missions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_daily_missions"() TO "service_role";
