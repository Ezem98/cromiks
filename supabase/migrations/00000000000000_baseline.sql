


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."card_rarity" AS ENUM (
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary'
);


ALTER TYPE "public"."card_rarity" OWNER TO "postgres";


CREATE TYPE "public"."content_type" AS ENUM (
    'photo',
    'video',
    'audio',
    'relator_clip'
);


ALTER TYPE "public"."content_type" OWNER TO "postgres";


CREATE TYPE "public"."mission_status" AS ENUM (
    'active',
    'completed',
    'claimed',
    'expired'
);


ALTER TYPE "public"."mission_status" OWNER TO "postgres";


CREATE TYPE "public"."mission_type" AS ENUM (
    'open_pack',
    'pin_card',
    'share_card',
    'collect_rarity',
    'complete_page',
    'login_streak'
);


ALTER TYPE "public"."mission_type" OWNER TO "postgres";


CREATE TYPE "public"."pack_status" AS ENUM (
    'pending',
    'opening',
    'opened',
    'expired'
);


ALTER TYPE "public"."pack_status" OWNER TO "postgres";


CREATE TYPE "public"."pack_type" AS ENUM (
    'daily',
    'mission',
    'match',
    'streak',
    'referral',
    'welcome',
    'premium'
);


ALTER TYPE "public"."pack_type" OWNER TO "postgres";


CREATE TYPE "public"."share_platform" AS ENUM (
    'whatsapp',
    'twitter',
    'instagram',
    'tiktok',
    'facebook',
    'telegram',
    'copy_link',
    'other'
);


ALTER TYPE "public"."share_platform" OWNER TO "postgres";


CREATE TYPE "public"."user_language" AS ENUM (
    'es',
    'en',
    'pt',
    'it'
);


ALTER TYPE "public"."user_language" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_advance_missions"("p_user_id" "uuid", "p_type" "public"."mission_type", "p_increment" integer DEFAULT 1, "p_context" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_mission        record;
  v_should_advance boolean;
  v_new_progress   integer;
  v_min_rarity_rank int;
  v_ctx_rarity_rank int;
begin
  -- Recorrer todas las misiones activas del user del type dado
  for v_mission in
    select um.id, um.progress, um.target, mt.config
    from public.user_missions um
    join public.mission_templates mt on mt.id = um.mission_template_id
    where um.user_id = p_user_id
      and um.status = 'active'
      and mt.type = p_type
      and (um.expires_at is null or um.expires_at > now())
    for update of um  -- lock para evitar race conditions entre triggers
  loop
    v_should_advance := true;

    -- Filtro: only_new
    -- Si la mission tiene only_new=true y el context NO trae is_new=true, skip.
    if (v_mission.config->>'only_new')::boolean is true then
      if (p_context->>'is_new')::boolean is distinct from true then
        v_should_advance := false;
      end if;
    end if;

    -- Filtro: min_rarity
    -- Si la mission tiene min_rarity, comparar con context.rarity.
    if v_should_advance and v_mission.config->>'min_rarity' is not null then
      v_min_rarity_rank := case v_mission.config->>'min_rarity'
        when 'common'    then 1
        when 'uncommon'  then 2
        when 'rare'      then 3
        when 'epic'      then 4
        when 'legendary' then 5
        else 0
      end;
      v_ctx_rarity_rank := case p_context->>'rarity'
        when 'common'    then 1
        when 'uncommon'  then 2
        when 'rare'      then 3
        when 'epic'      then 4
        when 'legendary' then 5
        else 0
      end;
      if v_ctx_rarity_rank < v_min_rarity_rank then
        v_should_advance := false;
      end if;
    end if;

    if not v_should_advance then
      continue;
    end if;

    -- Avanzar progress
    v_new_progress := v_mission.progress + p_increment;

    if v_new_progress >= v_mission.target then
      update public.user_missions
      set progress     = v_mission.target,
          status       = 'completed',
          completed_at = now()
      where id = v_mission.id;
    else
      update public.user_missions
      set progress = v_new_progress
      where id = v_mission.id;
    end if;
  end loop;
end;
$$;


ALTER FUNCTION "public"."_advance_missions"("p_user_id" "uuid", "p_type" "public"."mission_type", "p_increment" integer, "p_context" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_check_and_unlock_badges"("p_user_id" "uuid", "p_condition_type" "text", "p_context" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_badge         record;
  v_threshold     int;
  v_target_rar    text;
  v_should_unlock boolean;
  v_owned_count   int;
  v_total_count   int;
begin
  for v_badge in
    select b.id, b.unlock_condition
    from public.badges b
    where b.is_active = true
      and b.unlock_condition->>'type' = p_condition_type
      and not exists (
        select 1 from public.user_badges ub
        where ub.user_id = p_user_id and ub.badge_id = b.id
      )
  loop
    v_should_unlock := false;

    case p_condition_type
      when 'card_count' then
        v_threshold := (v_badge.unlock_condition->>'threshold')::int;
        select count(distinct uc.card_id) into v_owned_count
        from public.user_cards uc
        join public.cards c on c.id = uc.card_id
        where uc.user_id = p_user_id
          and c.album_id = 'eterno-diciembre';
        v_should_unlock := coalesce(v_owned_count, 0) >= v_threshold;

      when 'rarity_obtained' then
        v_target_rar := v_badge.unlock_condition->>'rarity';
        -- Shortcut: si el context viene con la rarity actual, evita la subquery.
        if p_context->>'rarity' = v_target_rar then
          v_should_unlock := true;
        else
          select exists(
            select 1
            from public.user_cards uc
            join public.cards c on c.id = uc.card_id
            where uc.user_id = p_user_id
              and c.rarity = v_target_rar::card_rarity
          ) into v_should_unlock;
        end if;

      when 'all_legendaries' then
        -- Dinámico contra el catálogo: si tiene todas las legendarias del
        -- álbum eterno-diciembre, desbloquea. Hoy son 12 (no 11 como sugiere
        -- el nombre del badge 'Los 11 momentos' — el catálogo tiene 12
        -- legendarias). Si en el futuro se agrega más, el check sigue válido.
        select count(distinct uc.card_id) into v_owned_count
        from public.user_cards uc
        join public.cards c on c.id = uc.card_id
        where uc.user_id = p_user_id
          and c.album_id = 'eterno-diciembre'
          and c.rarity = 'legendary'::card_rarity;

        select count(*) into v_total_count
        from public.cards
        where album_id = 'eterno-diciembre'
          and rarity = 'legendary'::card_rarity;

        v_should_unlock := v_total_count > 0
          and coalesce(v_owned_count, 0) >= v_total_count;

      when 'streak' then
        v_threshold := (v_badge.unlock_condition->>'threshold')::int;
        select greatest(coalesce(s.current_streak, 0), coalesce(s.longest_streak, 0))
        into v_owned_count
        from public.streaks s
        where s.user_id = p_user_id;
        v_should_unlock := coalesce(v_owned_count, 0) >= v_threshold;

      when 'share_count' then
        v_threshold := (v_badge.unlock_condition->>'threshold')::int;
        select count(*) into v_owned_count
        from public.share_events
        where user_id = p_user_id;
        v_should_unlock := coalesce(v_owned_count, 0) >= v_threshold;

      else
        -- referral_count u otros types: no-op por ahora.
        v_should_unlock := false;
    end case;

    if v_should_unlock then
      insert into public.user_badges (user_id, badge_id, unlocked_at)
      values (p_user_id, v_badge.id, now())
      on conflict (user_id, badge_id) do nothing;
    end if;
  end loop;
end;
$$;


ALTER FUNCTION "public"."_check_and_unlock_badges"("p_user_id" "uuid", "p_condition_type" "text", "p_context" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_coin_reward_for_rarity"("p_rarity" "public"."card_rarity") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case p_rarity
    when 'common'    then 1
    when 'uncommon'  then 3
    when 'rare'      then 8
    when 'epic'      then 20
    when 'legendary' then 0
  end;
$$;


ALTER FUNCTION "public"."_coin_reward_for_rarity"("p_rarity" "public"."card_rarity") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_on_pack_opened"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if old.status = 'pending' and new.status = 'opened' then
    perform public._advance_missions(new.user_id, 'open_pack'::mission_type, 1, '{}'::jsonb);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."_on_pack_opened"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_on_share_event_check_badges"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public._check_and_unlock_badges(new.user_id, 'share_count', '{}'::jsonb);
  return new;
end;
$$;


ALTER FUNCTION "public"."_on_share_event_check_badges"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_on_share_event_inserted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Pasamos el platform como context por si en el futuro hay misiones del tipo
  -- "compartí por Twitter específicamente". Por ahora ningún filtro lo usa.
  perform public._advance_missions(
    new.user_id,
    'share_card'::mission_type,
    1,
    jsonb_build_object('channel', coalesce(new.platform::text, 'unknown'))
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."_on_share_event_inserted"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_on_streak_check_badges"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public._check_and_unlock_badges(new.user_id, 'streak', '{}'::jsonb);
  return new;
end;
$$;


ALTER FUNCTION "public"."_on_streak_check_badges"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_on_user_card_check_badges"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_rarity card_rarity;
begin
  select rarity into v_rarity from public.cards where id = new.card_id;

  perform public._check_and_unlock_badges(new.user_id, 'card_count', '{}'::jsonb);
  perform public._check_and_unlock_badges(
    new.user_id,
    'rarity_obtained',
    jsonb_build_object('rarity', v_rarity)
  );

  if v_rarity = 'legendary'::card_rarity then
    perform public._check_and_unlock_badges(new.user_id, 'all_legendaries', '{}'::jsonb);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."_on_user_card_check_badges"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_on_user_card_inserted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_rarity card_rarity;
begin
  -- Get rarity de la card
  select rarity into v_rarity from public.cards where id = new.card_id;

  -- Avanzar missions de type collect_rarity con context completo
  perform public._advance_missions(
    new.user_id,
    'collect_rarity'::mission_type,
    1,
    jsonb_build_object('rarity', v_rarity, 'is_new', true)
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."_on_user_card_inserted"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_on_user_card_pinned"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if old.is_pinned is distinct from true and new.is_pinned is true then
    perform public._advance_missions(new.user_id, 'pin_card'::mission_type, 1, '{}'::jsonb);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."_on_user_card_pinned"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_daily_pack"() RETURNS TABLE("pack_id" "uuid", "new_streak" integer, "is_first_claim" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_today date := current_date;
  v_streak record;
  v_new_streak int;
  v_pack_id uuid;
  v_is_first boolean;
begin
  -- Obtener user actual
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  -- Lock del streak para evitar race conditions
  select * into v_streak
  from public.streaks
  where user_id = v_user_id
  for update;

  if not found then
    raise exception 'streak_not_initialized' using errcode = 'P0001';
  end if;

  -- ¿Ya reclamó hoy?
  if v_streak.last_claim_date = v_today then
    raise exception 'already_claimed_today' using errcode = 'P0001';
  end if;

  -- Calcular nueva racha
  v_is_first := v_streak.last_claim_date is null;

  if v_is_first then
    v_new_streak := 1;
  elsif v_streak.last_claim_date = v_today - interval '1 day' then
    v_new_streak := v_streak.current_streak + 1;
  else
    -- Perdió la racha, reinicia
    v_new_streak := 1;
  end if;

  -- Actualizar streak
  update public.streaks
  set
    current_streak = v_new_streak,
    longest_streak = greatest(longest_streak, v_new_streak),
    last_claim_date = v_today,
    total_claims = total_claims + 1
  where user_id = v_user_id;

  -- Crear el sobre
  insert into public.packs (user_id, type, card_count, context, available_at, expires_at)
  values (
    v_user_id,
    'daily',
    4,
    jsonb_build_object('streak_day', v_new_streak),
    now(),
    now() + interval '7 days'      -- expira en 7 días si no se abre
  )
  returning id into v_pack_id;

  return query select v_pack_id, v_new_streak, v_is_first;
end;
$$;


ALTER FUNCTION "public"."claim_daily_pack"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_mission"("p_user_mission_id" "uuid") RETURNS TABLE("out_coins_earned" integer, "out_pack_id" "uuid", "out_cards_earned" integer, "out_new_balance" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id     uuid;
  v_mission     record;
  v_template    record;
  v_pack_id     uuid;
  v_new_balance integer;
  v_card_count  integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select um.* into v_mission
  from public.user_missions um
  where um.id = p_user_mission_id and um.user_id = v_user_id
  for update;

  if not found then
    raise exception 'mission_not_found' using errcode = 'P0001';
  end if;

  if v_mission.status != 'completed' then
    raise exception 'mission_not_completed' using errcode = 'P0001';
  end if;

  select mt.* into v_template
  from public.mission_templates mt
  where mt.id = v_mission.mission_template_id;

  if not found then
    raise exception 'template_not_found' using errcode = 'P0001';
  end if;

  if v_template.reward_coins is not null and v_template.reward_coins > 0 then
    insert into public.user_coins (user_id, balance, total_earned)
    values (v_user_id, v_template.reward_coins, v_template.reward_coins)
    on conflict (user_id) do update
    set balance      = public.user_coins.balance + v_template.reward_coins,
        total_earned = public.user_coins.total_earned + v_template.reward_coins,
        updated_at   = now()
    returning public.user_coins.balance into v_new_balance;
  else
    select coalesce(uc.balance, 0) into v_new_balance
    from public.user_coins uc where uc.user_id = v_user_id;
    v_new_balance := coalesce(v_new_balance, 0);
  end if;

  v_card_count := coalesce(v_template.reward_card_count, 0);
  if v_template.reward_pack_type is not null then
    if v_card_count <= 0 then
      v_card_count := 5;
    end if;

    insert into public.packs (user_id, type, card_count, status, available_at, context)
    values (
      v_user_id,
      v_template.reward_pack_type,
      v_card_count,
      'pending',
      now(),
      jsonb_build_object('source_mission_template', v_template.id)
    )
    returning id into v_pack_id;
  end if;

  update public.user_missions
  set status     = 'claimed',
      claimed_at = now()
  where id = p_user_mission_id;

  return query select
    coalesce(v_template.reward_coins, 0)::integer  as out_coins_earned,
    v_pack_id                                       as out_pack_id,
    coalesce(v_card_count, 0)::integer              as out_cards_earned,
    v_new_balance::integer                          as out_new_balance;
end;
$$;


ALTER FUNCTION "public"."claim_mission"("p_user_mission_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_referral"("p_referral_token" "text") RETURNS TABLE("referrer_id" "uuid", "referrer_pack_id" "uuid", "referred_pack_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_referred_id uuid;
  v_share record;
  v_referrer_pack uuid;
  v_referred_pack uuid;
begin
  v_referred_id := auth.uid();
  if v_referred_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  -- Buscar el share
  select * into v_share
  from public.share_events
  where referral_token = p_referral_token
  for update;

  if not found then
    raise exception 'invalid_referral_token' using errcode = 'P0001';
  end if;

  -- No se puede referrir a sí mismo
  if v_share.user_id = v_referred_id then
    raise exception 'self_referral_not_allowed' using errcode = 'P0001';
  end if;

  -- No se puede usar dos veces
  if v_share.referred_user_id is not null then
    raise exception 'referral_already_used' using errcode = 'P0001';
  end if;

  -- Anti-abuse: el referred no puede ya tener un referral completado previo
  if exists (
    select 1 from public.share_events
    where referred_user_id = v_referred_id
      and referral_completed_at is not null
  ) then
    raise exception 'referred_already_used_a_referral' using errcode = 'P0001';
  end if;

  -- Marcar el share como completado
  update public.share_events
  set
    referred_user_id = v_referred_id,
    referral_completed_at = now()
  where id = v_share.id;

  -- Dar un sobre premium al referrer
  insert into public.packs (user_id, type, card_count, context, available_at, expires_at)
  values (
    v_share.user_id,
    'referral',
    4,
    jsonb_build_object('referred_user_id', v_referred_id),
    now(),
    now() + interval '30 days'
  )
  returning id into v_referrer_pack;

  -- Dar un sobre welcome con bonus al referred
  insert into public.packs (user_id, type, card_count, context, available_at, expires_at)
  values (
    v_referred_id,
    'referral',
    4,
    jsonb_build_object('referred_by_user_id', v_share.user_id),
    now(),
    now() + interval '30 days'
  )
  returning id into v_referred_pack;

  return query select v_share.user_id, v_referrer_pack, v_referred_pack;
end;
$$;


ALTER FUNCTION "public"."complete_referral"("p_referral_token" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_referral"("p_referral_token" "text") IS 'Procesa un referral: marca share, otorga sobre a ambos lados.';



CREATE OR REPLACE FUNCTION "public"."dismantle_card"("p_card_id" "text", "p_count" integer DEFAULT 1) RETURNS TABLE("copies_left" integer, "coins_earned" integer, "new_balance" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_user_card record;
  v_card record;
  v_reward_per_card int;
  v_total_reward int;
  v_new_copies int;
  v_new_balance int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  if p_count < 1 then
    raise exception 'invalid_count' using errcode = 'P0001';
  end if;

  -- Validar cromo
  select * into v_card from public.cards where id = p_card_id;
  if not found then
    raise exception 'card_not_found' using errcode = 'P0001';
  end if;

  -- Legendarias NO se canjean
  if v_card.rarity = 'legendary' then
    raise exception 'legendary_not_dismantlable' using errcode = 'P0001';
  end if;

  -- Lock del user_card
  select * into v_user_card
  from public.user_cards
  where user_id = v_user_id and card_id = p_card_id
  for update;

  if not found then
    raise exception 'card_not_owned' using errcode = 'P0001';
  end if;

  -- Debe quedarle al menos 1 copia
  if v_user_card.copies - p_count < 1 then
    raise exception 'must_keep_one' using errcode = 'P0001';
  end if;

  -- Reward por rareza
  v_reward_per_card := case v_card.rarity
    when 'common' then 2
    when 'uncommon' then 5
    when 'rare' then 15
    when 'epic' then 40
    else 0
  end;

  v_total_reward := v_reward_per_card * p_count;
  v_new_copies := v_user_card.copies - p_count;

  -- Actualizar copies
  update public.user_cards
  set copies = v_new_copies
  where user_id = v_user_id and card_id = p_card_id;

  -- Actualizar balance del user
  update public.user_coins
  set
    balance = balance + v_total_reward,
    total_earned = total_earned + v_total_reward
  where user_id = v_user_id
  returning balance into v_new_balance;

  -- Ledger
  insert into public.coin_transactions (user_id, amount, reason, reference_id, balance_after)
  values (v_user_id, v_total_reward, 'dismantle_repeat', p_card_id, v_new_balance);

  return query select v_new_copies, v_total_reward, v_new_balance;
end;
$$;


ALTER FUNCTION "public"."dismantle_card"("p_card_id" "text", "p_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."open_pack"("p_pack_id" "uuid") RETURNS TABLE("out_card_id" "text", "card_name" "text", "card_role" "text", "out_card_number" integer, "card_tier" "public"."card_rarity", "is_new" boolean, "copies_after" integer, "coin_reward" integer, "pack_type" "public"."pack_type", "coins_earned" integer, "coins_after" integer, "was_replay" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id      uuid;
  v_pack         record;
  v_rolled_ids   text[];
  v_card_id      text;
  v_rarity       card_rarity;
  v_is_new       boolean;
  v_total_earned int := 0;
  v_coins_after  int;
  v_album_id     text := 'eterno-diciembre';
  v_replay       boolean := false;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select * into v_pack
  from public.packs
  where id = p_pack_id and user_id = v_user_id;

  if not found then
    raise exception 'pack_not_found' using errcode = 'P0001';
  end if;

  if v_pack.expires_at is not null
     and v_pack.expires_at < now()
     and v_pack.status != 'opened' then
    update public.packs set status = 'expired' where id = p_pack_id and status = 'pending';
    raise exception 'pack_expired' using errcode = 'P0001';
  end if;

  if v_pack.status = 'pending' then
    v_rolled_ids := public.roll_cards(v_album_id, v_pack.card_count);

    update public.packs
    set
      status = 'opened',
      rolled_card_ids = v_rolled_ids,
      opened_at = now()
    where id = p_pack_id
      and user_id = v_user_id
      and status = 'pending'
    returning * into v_pack;

    if not found then
      select * into v_pack
      from public.packs
      where id = p_pack_id and user_id = v_user_id;

      if v_pack.status = 'opened' then
        v_replay := true;
        v_rolled_ids := v_pack.rolled_card_ids;
      elsif v_pack.status = 'expired' then
        raise exception 'pack_expired' using errcode = 'P0001';
      else
        raise exception 'pack_not_pending' using errcode = 'P0001';
      end if;
    end if;
  elsif v_pack.status = 'opened' then
    v_replay := true;
    v_rolled_ids := v_pack.rolled_card_ids;
  elsif v_pack.status = 'expired' then
    raise exception 'pack_expired' using errcode = 'P0001';
  else
    raise exception 'pack_not_pending' using errcode = 'P0001';
  end if;

  if not v_replay then
    for v_card_id in select unnest(v_rolled_ids) loop
      select c.rarity into v_rarity from public.cards c where c.id = v_card_id;

      insert into public.user_cards (user_id, card_id, copies, first_obtained_at, last_obtained_at)
      values (v_user_id, v_card_id, 1, now(), now())
      on conflict (user_id, card_id) do update
      set copies = public.user_cards.copies + 1,
          last_obtained_at = now()
      returning (xmax = 0) into v_is_new;

      if not v_is_new then
        v_total_earned := v_total_earned + public._coin_reward_for_rarity(v_rarity);
      end if;
    end loop;

    if v_total_earned > 0 then
      insert into public.user_coins (user_id, balance, total_earned)
      values (v_user_id, v_total_earned, v_total_earned)
      on conflict (user_id) do update
      set balance = public.user_coins.balance + v_total_earned,
          total_earned = public.user_coins.total_earned + v_total_earned,
          updated_at = now()
      returning public.user_coins.balance into v_coins_after;
    else
      select coalesce(uc.balance, 0) into v_coins_after
      from public.user_coins uc where uc.user_id = v_user_id;
      v_coins_after := coalesce(v_coins_after, 0);
    end if;
  else
    select coalesce(uc.balance, 0) into v_coins_after
    from public.user_coins uc where uc.user_id = v_user_id;
    v_coins_after := coalesce(v_coins_after, 0);
  end if;

  return query
  with rolled as (
    select unnest(v_rolled_ids) as cid, generate_subscripts(v_rolled_ids, 1) as ord
  )
  select
    c.id::text                                                     as out_card_id,
    c.name::text                                                   as card_name,
    case
      when coalesce(c.metadata->>'position','') != '' and coalesce(c.metadata->>'club','') != ''
        then (c.metadata->>'position') || ' · ' || (c.metadata->>'club')
      when coalesce(c.metadata->>'position','') != '' then c.metadata->>'position'
      when coalesce(c.metadata->>'club','')     != '' then c.metadata->>'club'
      else ''
    end::text                                                      as card_role,
    c.card_number                                                  as out_card_number,
    c.rarity                                                       as card_tier,
    (uc.copies = 1)                                                as is_new,
    uc.copies                                                      as copies_after,
    (case when uc.copies = 1 then null
          else public._coin_reward_for_rarity(c.rarity) end)::int  as coin_reward,
    v_pack.type                                                    as pack_type,
    v_total_earned                                                 as coins_earned,
    v_coins_after                                                  as coins_after,
    v_replay                                                       as was_replay
  from rolled r
  join public.cards c on c.id = r.cid
  join public.user_cards uc on uc.card_id = c.id and uc.user_id = v_user_id
  order by r.ord;
end;
$$;


ALTER FUNCTION "public"."open_pack"("p_pack_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pin_card"("p_card_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  update public.user_cards
  set is_pinned = true
  where user_id = v_user_id and card_id = p_card_id;

  if not found then
    raise exception 'card_not_owned' using errcode = 'P0001';
  end if;
end;
$$;


ALTER FUNCTION "public"."pin_card"("p_card_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_share"("p_card_id" "text", "p_platform" "public"."share_platform", "p_format" "text" DEFAULT 'image'::"text") RETURNS TABLE("share_id" "uuid", "referral_token" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_share_id uuid;
  v_token text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  -- Validar formato
  if p_format not in ('image', 'video', 'sticker', 'link', 'og_image') then
    raise exception 'invalid_format' using errcode = 'P0001';
  end if;

  -- El user debe poseer el cromo para compartirlo
  if not exists (
    select 1 from public.user_cards
    where user_id = v_user_id and card_id = p_card_id
  ) then
    raise exception 'card_not_owned' using errcode = 'P0001';
  end if;

  -- Token de referral: 12 chars random hex
  v_token := encode(gen_random_bytes(6), 'hex');

  insert into public.share_events (user_id, card_id, platform, format, referral_token)
  values (v_user_id, p_card_id, p_platform, p_format, v_token)
  returning id into v_share_id;

  return query select v_share_id, v_token;
end;
$$;


ALTER FUNCTION "public"."record_share"("p_card_id" "text", "p_platform" "public"."share_platform", "p_format" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_share"("p_card_id" "text", "p_platform" "public"."share_platform", "p_format" "text") IS 'Registra un share y genera token único para tracking de referrals.';



CREATE OR REPLACE FUNCTION "public"."roll_cards"("p_album_id" "text", "p_count" integer DEFAULT 4) RETURNS "text"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_rolled     text[] := array[]::text[];
  v_card_id    text;
  v_pool_count int;
  i int;
begin
  -- Guard: pool activo no vacío. Sin esto, si ninguna página está activa el
  -- loop devolvería un array vacío en silencio (sobre de 0 cromos). Preferimos
  -- fallar fuerte y visible.
  select count(*) into v_pool_count
  from public.cards c
  join public.pages p on p.id = c.page_id
  where c.album_id = p_album_id
    and p.is_active = true;

  if v_pool_count = 0 then
    raise exception 'no_active_cards' using errcode = 'P0001';
  end if;

  for i in 1..p_count loop
    select c.id into v_card_id
    from public.cards c
    join public.pages p on p.id = c.page_id
    where c.album_id = p_album_id
      and p.is_active = true
    order by power(random(), 1.0 / (case c.rarity
      when 'common'    then 100
      when 'uncommon'  then 60
      when 'rare'      then 25
      when 'epic'      then 15
      when 'legendary' then 8
      else 50
    end)) desc
    limit 1;

    v_rolled := array_append(v_rolled, v_card_id);
  end loop;

  return v_rolled;
end;
$$;


ALTER FUNCTION "public"."roll_cards"("p_album_id" "text", "p_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."roll_cards"("p_album_id" "text", "p_count" integer) IS 'Sortea N cromos con distribución por rareza. Se llamará desde open_pack.';



CREATE OR REPLACE FUNCTION "public"."tg_handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_username text;
  v_base text;
  v_suffix int := 0;
begin
  -- Estrategia de username:
  -- 1. Si raw_user_meta_data tiene "username", usar ese
  -- 2. Si no, generar del email (parte antes del @, sanitizado)
  -- 3. Si está tomado, append un suffix numérico

  v_base := coalesce(
    new.raw_user_meta_data->>'username',
    regexp_replace(
      lower(split_part(new.email, '@', 1)),
      '[^a-z0-9_]',
      '_',
      'g'
    )
  );

  -- Asegurar longitud mínima de 3
  if char_length(v_base) < 3 then
    v_base := v_base || 'user';
  end if;

  -- Trim a max 20
  v_base := substring(v_base from 1 for 20);

  v_username := v_base;

  -- Resolver colisiones
  while exists (select 1 from public.profiles where username = v_username) loop
    v_suffix := v_suffix + 1;
    v_username := substring(v_base from 1 for 17) || lpad(v_suffix::text, 2, '0');
    if v_suffix > 99 then
      v_username := v_base || floor(random() * 1000000)::text;
      exit;
    end if;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    v_username,
    coalesce(new.raw_user_meta_data->>'display_name', null)
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."tg_handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_init_user_data"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.streaks (user_id) values (new.id);
  insert into public.user_coins (user_id) values (new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."tg_init_user_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."tg_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unpin_card"("p_card_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  update public.user_cards
  set is_pinned = false
  where user_id = v_user_id and card_id = p_card_id;
end;
$$;


ALTER FUNCTION "public"."unpin_card"("p_card_id" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."card_assets" (
    "card_id" "text" NOT NULL,
    "source_url" "text",
    "source_kind" "text",
    "photo_type" "text",
    "author" "text",
    "license" "text",
    "legal_posture" "text" DEFAULT 'takedown'::"text" NOT NULL,
    "credit" "text",
    "r2_key" "text",
    "fetched_at" timestamp with time zone,
    "content_hash" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "card_assets_legal_posture_check" CHECK (("legal_posture" = ANY (ARRAY['licensed'::"text", 'takedown'::"text"]))),
    CONSTRAINT "card_assets_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'published'::"text", 'takedown'::"text"])))
);


ALTER TABLE "public"."card_assets" OWNER TO "postgres";


COMMENT ON TABLE "public"."card_assets" IS 'Provenance + estado del asset de cada cromo (pipeline R2). YAML es fuente de verdad; el seed proyecta via upsert_card_asset. status=takedown es terminal (kill switch legal).';



CREATE OR REPLACE FUNCTION "public"."upsert_card_asset"("p_card_id" "text", "p_source_url" "text", "p_source_kind" "text", "p_photo_type" "text", "p_author" "text", "p_license" "text", "p_legal_posture" "text", "p_credit" "text", "p_r2_key" "text", "p_status" "text", "p_fetched_at" timestamp with time zone, "p_content_hash" "text") RETURNS "public"."card_assets"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.card_assets;
begin
  insert into public.card_assets as ca (
    card_id, source_url, source_kind, photo_type, author, license,
    legal_posture, credit, r2_key, status, fetched_at, content_hash, updated_at
  ) values (
    p_card_id, p_source_url, p_source_kind, p_photo_type, p_author, p_license,
    coalesce(p_legal_posture, 'takedown'), p_credit, p_r2_key,
    coalesce(p_status, 'pending'), p_fetched_at, p_content_hash, now()
  )
  on conflict (card_id) do update set
    source_url    = excluded.source_url,
    source_kind   = excluded.source_kind,
    photo_type    = excluded.photo_type,
    author        = excluded.author,
    license       = excluded.license,
    legal_posture = excluded.legal_posture,
    credit        = excluded.credit,
    r2_key        = excluded.r2_key,
    status        = excluded.status,
    fetched_at    = excluded.fetched_at,
    content_hash  = excluded.content_hash,
    updated_at    = now()
  where ca.status <> 'takedown'
  returning * into v_row;

  if v_row.card_id is null then
    select * into v_row from public.card_assets where card_id = p_card_id;
  end if;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."upsert_card_asset"("p_card_id" "text", "p_source_url" "text", "p_source_kind" "text", "p_photo_type" "text", "p_author" "text", "p_license" "text", "p_legal_posture" "text", "p_credit" "text", "p_r2_key" "text", "p_status" "text", "p_fetched_at" timestamp with time zone, "p_content_hash" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."badges" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "text" NOT NULL,
    "rarity" "text" DEFAULT 'common'::"text" NOT NULL,
    "icon_name" "text",
    "unlock_condition" "jsonb" NOT NULL,
    "display_order" integer DEFAULT 100,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "badges_category_check" CHECK (("category" = ANY (ARRAY['progress'::"text", 'rarity'::"text", 'engagement'::"text", 'social'::"text", 'special_date'::"text", 'skill'::"text"]))),
    CONSTRAINT "badges_rarity_check" CHECK (("rarity" = ANY (ARRAY['common'::"text", 'rare'::"text", 'epic'::"text", 'legendary'::"text"])))
);


ALTER TABLE "public"."badges" OWNER TO "postgres";


COMMENT ON TABLE "public"."badges" IS 'Catálogo de badges. Separados de los cromos.';



CREATE TABLE IF NOT EXISTS "public"."cards" (
    "id" "text" NOT NULL,
    "album_id" "text" NOT NULL,
    "page_id" "text",
    "card_number" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "rarity" "public"."card_rarity" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "content" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "legendary_brief" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cards" OWNER TO "postgres";


COMMENT ON TABLE "public"."cards" IS 'Catálogo de cromos. 205 cromos en el primer álbum.';



COMMENT ON COLUMN "public"."cards"."metadata" IS 'Match, fecha, minuto, posición, número, quote, relator, etc.';



COMMENT ON COLUMN "public"."cards"."content" IS 'Array de assets: [{ type: "photo", source: "url..." }, ...]';



COMMENT ON COLUMN "public"."cards"."legendary_brief" IS 'Solo para Legendarias: brief visual completo con concepto, visual, sound.';



CREATE TABLE IF NOT EXISTS "public"."coin_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "reason" "text" NOT NULL,
    "reference_id" "text",
    "balance_after" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coin_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mission_templates" (
    "id" "text" NOT NULL,
    "type" "public"."mission_type" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "config" "jsonb" NOT NULL,
    "reward_pack_type" "public"."pack_type" DEFAULT 'mission'::"public"."pack_type",
    "reward_card_count" integer DEFAULT 4,
    "reward_coins" integer DEFAULT 0,
    "is_daily_pool" boolean DEFAULT true NOT NULL,
    "weight" integer DEFAULT 100,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "mission_templates_weight_check" CHECK (("weight" > 0))
);


ALTER TABLE "public"."mission_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."mission_templates" IS 'Catálogo de misiones. El sistema pickea 3 daily por usuario.';



CREATE TABLE IF NOT EXISTS "public"."packs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."pack_type" NOT NULL,
    "status" "public"."pack_status" DEFAULT 'pending'::"public"."pack_status" NOT NULL,
    "card_count" integer DEFAULT 4 NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "rolled_card_ids" "text"[],
    "available_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "opened_at" timestamp with time zone,
    CONSTRAINT "packs_card_count_check" CHECK ((("card_count" >= 1) AND ("card_count" <= 10)))
);


ALTER TABLE "public"."packs" OWNER TO "postgres";


COMMENT ON TABLE "public"."packs" IS 'Sobres que tiene cada usuario. Algunos pendientes, otros ya abiertos.';



CREATE TABLE IF NOT EXISTS "public"."pages" (
    "id" "text" NOT NULL,
    "album_id" "text" NOT NULL,
    "page_number" integer NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "description" "text",
    "card_range_start" integer NOT NULL,
    "card_range_end" integer NOT NULL,
    "bonus_card_ids" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."pages" OWNER TO "postgres";


COMMENT ON TABLE "public"."pages" IS 'Las 10 páginas narrativas que estructuran el álbum.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "bio" "text",
    "country_code" "text",
    "language" "public"."user_language" DEFAULT 'es'::"public"."user_language" NOT NULL,
    "is_public" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_bio_check" CHECK (("char_length"("bio") <= 140)),
    CONSTRAINT "profiles_country_code_check" CHECK (("char_length"("country_code") = 2)),
    CONSTRAINT "username_format" CHECK (("username" ~ '^[a-z0-9_]{3,20}$'::"text"))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Perfil público de cada usuario. Extiende auth.users.';



COMMENT ON COLUMN "public"."profiles"."username" IS 'Username lowercase, alfanumerico + underscore, 3-20 chars.';



COMMENT ON COLUMN "public"."profiles"."bio" IS 'Bio corta, máx 140 chars.';



COMMENT ON COLUMN "public"."profiles"."country_code" IS 'ISO 3166-1 alpha-2 (AR, BR, etc.)';



CREATE TABLE IF NOT EXISTS "public"."share_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "card_id" "text" NOT NULL,
    "platform" "public"."share_platform" NOT NULL,
    "format" "text",
    "referral_token" "text",
    "referred_user_id" "uuid",
    "referral_completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "share_events_format_check" CHECK (("format" = ANY (ARRAY['image'::"text", 'video'::"text", 'sticker'::"text", 'link'::"text", 'og_image'::"text"])))
);


ALTER TABLE "public"."share_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."share_events" IS 'Cada vez que un usuario comparte un cromo. Habilita el sistema de referrals.';



CREATE TABLE IF NOT EXISTS "public"."streaks" (
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "longest_streak" integer DEFAULT 0 NOT NULL,
    "last_claim_date" "date",
    "total_claims" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "streaks_current_streak_check" CHECK (("current_streak" >= 0)),
    CONSTRAINT "streaks_longest_streak_check" CHECK (("longest_streak" >= 0))
);


ALTER TABLE "public"."streaks" OWNER TO "postgres";


COMMENT ON TABLE "public"."streaks" IS 'Racha de claims del sobre diario por usuario.';



CREATE TABLE IF NOT EXISTS "public"."tips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'ARS'::"text" NOT NULL,
    "foundation" "text" NOT NULL,
    "provider" "text" DEFAULT 'mercadopago'::"text" NOT NULL,
    "provider_payment_id" "text",
    "provider_status" "text",
    "message" "text",
    "is_anonymous" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "paid_at" timestamp with time zone,
    CONSTRAINT "tips_amount_cents_check" CHECK (("amount_cents" > 0)),
    CONSTRAINT "tips_currency_check" CHECK (("char_length"("currency") = 3)),
    CONSTRAINT "tips_message_check" CHECK (("char_length"("message") <= 280))
);


ALTER TABLE "public"."tips" OWNER TO "postgres";


COMMENT ON TABLE "public"."tips" IS 'Donaciones voluntarias hacia fundación. No es modelo de revenue, es tip jar.';



CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "user_id" "uuid" NOT NULL,
    "badge_id" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_pinned" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_badges" IS 'Badges desbloqueados por usuario.';



CREATE TABLE IF NOT EXISTS "public"."user_cards" (
    "user_id" "uuid" NOT NULL,
    "card_id" "text" NOT NULL,
    "copies" integer DEFAULT 1 NOT NULL,
    "first_obtained_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_obtained_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_pinned" boolean DEFAULT false NOT NULL,
    CONSTRAINT "user_cards_copies_check" CHECK (("copies" >= 1))
);


ALTER TABLE "public"."user_cards" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_cards" IS 'Inventario de cromos por usuario. Copies > 1 = repetidas.';



CREATE TABLE IF NOT EXISTS "public"."user_coins" (
    "user_id" "uuid" NOT NULL,
    "balance" integer DEFAULT 0 NOT NULL,
    "total_earned" integer DEFAULT 0 NOT NULL,
    "total_spent" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_coins_balance_check" CHECK (("balance" >= 0))
);


ALTER TABLE "public"."user_coins" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_coins" IS 'Balance de monedas de cada user. Se ganan canjeando repetidas y se gastan en sobres premium.';



CREATE TABLE IF NOT EXISTS "public"."user_missions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "mission_template_id" "text" NOT NULL,
    "status" "public"."mission_status" DEFAULT 'active'::"public"."mission_status" NOT NULL,
    "progress" integer DEFAULT 0 NOT NULL,
    "target" integer NOT NULL,
    "expires_at" timestamp with time zone,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "claimed_at" timestamp with time zone
);


ALTER TABLE "public"."user_missions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_missions" IS 'Misiones asignadas a cada usuario. Tracking de progreso.';



CREATE TABLE IF NOT EXISTS "public"."waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "locale" "text",
    "source" "text" DEFAULT 'landing'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."waitlist" OWNER TO "postgres";


ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."card_assets"
    ADD CONSTRAINT "card_assets_pkey" PRIMARY KEY ("card_id");



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_album_id_card_number_key" UNIQUE ("album_id", "card_number");



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coin_transactions"
    ADD CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mission_templates"
    ADD CONSTRAINT "mission_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."packs"
    ADD CONSTRAINT "packs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_album_id_page_number_key" UNIQUE ("album_id", "page_number");



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."share_events"
    ADD CONSTRAINT "share_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."share_events"
    ADD CONSTRAINT "share_events_referral_token_key" UNIQUE ("referral_token");



ALTER TABLE ONLY "public"."streaks"
    ADD CONSTRAINT "streaks_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."tips"
    ADD CONSTRAINT "tips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tips"
    ADD CONSTRAINT "tips_provider_payment_id_key" UNIQUE ("provider_payment_id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id", "badge_id");



ALTER TABLE ONLY "public"."user_cards"
    ADD CONSTRAINT "user_cards_pkey" PRIMARY KEY ("user_id", "card_id");



ALTER TABLE ONLY "public"."user_coins"
    ADD CONSTRAINT "user_coins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_missions"
    ADD CONSTRAINT "user_missions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id");



CREATE INDEX "badges_category_idx" ON "public"."badges" USING "btree" ("category", "display_order");



CREATE INDEX "cards_album_idx" ON "public"."cards" USING "btree" ("album_id", "card_number");



CREATE INDEX "cards_page_idx" ON "public"."cards" USING "btree" ("page_id");



CREATE INDEX "cards_rarity_idx" ON "public"."cards" USING "btree" ("rarity");



CREATE INDEX "coin_tx_user_idx" ON "public"."coin_transactions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_card_assets_status" ON "public"."card_assets" USING "btree" ("status");



CREATE INDEX "idx_share_events_card_id" ON "public"."share_events" USING "btree" ("card_id");



CREATE INDEX "idx_share_events_user_id" ON "public"."share_events" USING "btree" ("user_id");



CREATE INDEX "mission_templates_pool_idx" ON "public"."mission_templates" USING "btree" ("is_daily_pool", "weight");



CREATE INDEX "packs_expires_idx" ON "public"."packs" USING "btree" ("expires_at") WHERE (("expires_at" IS NOT NULL) AND ("status" = 'pending'::"public"."pack_status"));



CREATE INDEX "packs_user_status_idx" ON "public"."packs" USING "btree" ("user_id", "status");



CREATE INDEX "packs_user_type_idx" ON "public"."packs" USING "btree" ("user_id", "type");



CREATE INDEX "pages_album_idx" ON "public"."pages" USING "btree" ("album_id", "page_number");



CREATE INDEX "profiles_created_at_idx" ON "public"."profiles" USING "btree" ("created_at" DESC);



CREATE INDEX "profiles_username_idx" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "share_events_card_idx" ON "public"."share_events" USING "btree" ("card_id");



CREATE INDEX "share_events_referral_idx" ON "public"."share_events" USING "btree" ("referral_token") WHERE ("referral_token" IS NOT NULL);



CREATE INDEX "share_events_user_idx" ON "public"."share_events" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "tips_foundation_idx" ON "public"."tips" USING "btree" ("foundation", "created_at" DESC);



CREATE INDEX "tips_user_idx" ON "public"."tips" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "user_badges_pinned_idx" ON "public"."user_badges" USING "btree" ("user_id") WHERE "is_pinned";



CREATE INDEX "user_badges_user_idx" ON "public"."user_badges" USING "btree" ("user_id");



CREATE INDEX "user_cards_card_idx" ON "public"."user_cards" USING "btree" ("card_id");



CREATE INDEX "user_cards_pinned_idx" ON "public"."user_cards" USING "btree" ("user_id") WHERE "is_pinned";



CREATE INDEX "user_cards_user_idx" ON "public"."user_cards" USING "btree" ("user_id");



CREATE INDEX "user_missions_user_expires_idx" ON "public"."user_missions" USING "btree" ("user_id", "expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "user_missions_user_status_idx" ON "public"."user_missions" USING "btree" ("user_id", "status");



CREATE OR REPLACE TRIGGER "cards_set_updated_at" BEFORE UPDATE ON "public"."cards" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_init_user_data" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."tg_init_user_data"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "streaks_set_updated_at" BEFORE UPDATE ON "public"."streaks" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_advance_collect_rarity" AFTER INSERT ON "public"."user_cards" FOR EACH ROW EXECUTE FUNCTION "public"."_on_user_card_inserted"();



CREATE OR REPLACE TRIGGER "trg_advance_open_pack" AFTER UPDATE OF "status" ON "public"."packs" FOR EACH ROW WHEN ((("old"."status" = 'pending'::"public"."pack_status") AND ("new"."status" = 'opened'::"public"."pack_status"))) EXECUTE FUNCTION "public"."_on_pack_opened"();



CREATE OR REPLACE TRIGGER "trg_advance_pin_card" AFTER UPDATE OF "is_pinned" ON "public"."user_cards" FOR EACH ROW WHEN ((("old"."is_pinned" IS DISTINCT FROM true) AND ("new"."is_pinned" IS TRUE))) EXECUTE FUNCTION "public"."_on_user_card_pinned"();



CREATE OR REPLACE TRIGGER "trg_advance_share_card" AFTER INSERT ON "public"."share_events" FOR EACH ROW EXECUTE FUNCTION "public"."_on_share_event_inserted"();



CREATE OR REPLACE TRIGGER "trg_check_badges_on_share_event" AFTER INSERT ON "public"."share_events" FOR EACH ROW EXECUTE FUNCTION "public"."_on_share_event_check_badges"();



CREATE OR REPLACE TRIGGER "trg_check_badges_on_streak_insert" AFTER INSERT ON "public"."streaks" FOR EACH ROW EXECUTE FUNCTION "public"."_on_streak_check_badges"();



CREATE OR REPLACE TRIGGER "trg_check_badges_on_streak_update" AFTER UPDATE OF "current_streak", "longest_streak" ON "public"."streaks" FOR EACH ROW WHEN ((("new"."current_streak" IS DISTINCT FROM "old"."current_streak") OR ("new"."longest_streak" IS DISTINCT FROM "old"."longest_streak"))) EXECUTE FUNCTION "public"."_on_streak_check_badges"();



CREATE OR REPLACE TRIGGER "trg_check_badges_on_user_card" AFTER INSERT ON "public"."user_cards" FOR EACH ROW EXECUTE FUNCTION "public"."_on_user_card_check_badges"();



CREATE OR REPLACE TRIGGER "user_coins_set_updated_at" BEFORE UPDATE ON "public"."user_coins" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_updated_at"();



ALTER TABLE ONLY "public"."card_assets"
    ADD CONSTRAINT "card_assets_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."coin_transactions"
    ADD CONSTRAINT "coin_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."packs"
    ADD CONSTRAINT "packs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."share_events"
    ADD CONSTRAINT "share_events_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."share_events"
    ADD CONSTRAINT "share_events_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."share_events"
    ADD CONSTRAINT "share_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."streaks"
    ADD CONSTRAINT "streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tips"
    ADD CONSTRAINT "tips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_cards"
    ADD CONSTRAINT "user_cards_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_cards"
    ADD CONSTRAINT "user_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_coins"
    ADD CONSTRAINT "user_coins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_missions"
    ADD CONSTRAINT "user_missions_mission_template_id_fkey" FOREIGN KEY ("mission_template_id") REFERENCES "public"."mission_templates"("id");



ALTER TABLE ONLY "public"."user_missions"
    ADD CONSTRAINT "user_missions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "badges_select_all" ON "public"."badges" FOR SELECT USING (("is_active" = true));



ALTER TABLE "public"."card_assets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "card_assets_select_published" ON "public"."card_assets" FOR SELECT TO "authenticated", "anon" USING (("status" = 'published'::"text"));



ALTER TABLE "public"."cards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cards_select_all" ON "public"."cards" FOR SELECT USING (true);



ALTER TABLE "public"."coin_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coin_tx_select_self" ON "public"."coin_transactions" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."mission_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mission_templates_select_all" ON "public"."mission_templates" FOR SELECT USING (true);



ALTER TABLE "public"."packs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "packs_select_self" ON "public"."packs" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."pages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pages_select_all" ON "public"."pages" FOR SELECT USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_public" ON "public"."profiles" FOR SELECT USING (("is_public" = true));



CREATE POLICY "profiles_select_self" ON "public"."profiles" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."share_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "share_events_insert_own" ON "public"."share_events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "share_events_insert_self" ON "public"."share_events" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "share_events_select_all" ON "public"."share_events" FOR SELECT USING (true);



CREATE POLICY "share_events_select_self" ON "public"."share_events" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."streaks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "streaks_select_self" ON "public"."streaks" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."tips" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tips_insert_self" ON "public"."tips" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "tips_select_self" ON "public"."tips" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_badges_select_all" ON "public"."user_badges" FOR SELECT USING (true);



CREATE POLICY "user_badges_select_public_profile" ON "public"."user_badges" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "user_badges"."user_id") AND ("profiles"."is_public" = true)))));



CREATE POLICY "user_badges_select_self" ON "public"."user_badges" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "user_badges_update_own_pin" ON "public"."user_badges" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_badges_update_self" ON "public"."user_badges" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."user_cards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_cards_select_public_profile" ON "public"."user_cards" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "user_cards"."user_id") AND ("profiles"."is_public" = true)))));



CREATE POLICY "user_cards_select_self" ON "public"."user_cards" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "user_cards_update_self" ON "public"."user_cards" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."user_coins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_coins_select_self" ON "public"."user_coins" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."user_missions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_missions_select_self" ON "public"."user_missions" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."waitlist" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "waitlist_insert_public" ON "public"."waitlist" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."_advance_missions"("p_user_id" "uuid", "p_type" "public"."mission_type", "p_increment" integer, "p_context" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."_advance_missions"("p_user_id" "uuid", "p_type" "public"."mission_type", "p_increment" integer, "p_context" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_advance_missions"("p_user_id" "uuid", "p_type" "public"."mission_type", "p_increment" integer, "p_context" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."_check_and_unlock_badges"("p_user_id" "uuid", "p_condition_type" "text", "p_context" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."_check_and_unlock_badges"("p_user_id" "uuid", "p_condition_type" "text", "p_context" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_check_and_unlock_badges"("p_user_id" "uuid", "p_condition_type" "text", "p_context" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."_coin_reward_for_rarity"("p_rarity" "public"."card_rarity") TO "anon";
GRANT ALL ON FUNCTION "public"."_coin_reward_for_rarity"("p_rarity" "public"."card_rarity") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_coin_reward_for_rarity"("p_rarity" "public"."card_rarity") TO "service_role";



GRANT ALL ON FUNCTION "public"."_on_pack_opened"() TO "anon";
GRANT ALL ON FUNCTION "public"."_on_pack_opened"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_on_pack_opened"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_on_share_event_check_badges"() TO "anon";
GRANT ALL ON FUNCTION "public"."_on_share_event_check_badges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_on_share_event_check_badges"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_on_share_event_inserted"() TO "anon";
GRANT ALL ON FUNCTION "public"."_on_share_event_inserted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_on_share_event_inserted"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_on_streak_check_badges"() TO "anon";
GRANT ALL ON FUNCTION "public"."_on_streak_check_badges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_on_streak_check_badges"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_on_user_card_check_badges"() TO "anon";
GRANT ALL ON FUNCTION "public"."_on_user_card_check_badges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_on_user_card_check_badges"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_on_user_card_inserted"() TO "anon";
GRANT ALL ON FUNCTION "public"."_on_user_card_inserted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_on_user_card_inserted"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_on_user_card_pinned"() TO "anon";
GRANT ALL ON FUNCTION "public"."_on_user_card_pinned"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_on_user_card_pinned"() TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_daily_pack"() TO "anon";
GRANT ALL ON FUNCTION "public"."claim_daily_pack"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_daily_pack"() TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_mission"("p_user_mission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_mission"("p_user_mission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_mission"("p_user_mission_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_referral"("p_referral_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_referral"("p_referral_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_referral"("p_referral_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."dismantle_card"("p_card_id" "text", "p_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."dismantle_card"("p_card_id" "text", "p_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dismantle_card"("p_card_id" "text", "p_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."open_pack"("p_pack_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."open_pack"("p_pack_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."open_pack"("p_pack_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pin_card"("p_card_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pin_card"("p_card_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pin_card"("p_card_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_share"("p_card_id" "text", "p_platform" "public"."share_platform", "p_format" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_share"("p_card_id" "text", "p_platform" "public"."share_platform", "p_format" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_share"("p_card_id" "text", "p_platform" "public"."share_platform", "p_format" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."roll_cards"("p_album_id" "text", "p_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."roll_cards"("p_album_id" "text", "p_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."roll_cards"("p_album_id" "text", "p_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_init_user_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_init_user_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_init_user_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unpin_card"("p_card_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unpin_card"("p_card_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unpin_card"("p_card_id" "text") TO "service_role";



GRANT ALL ON TABLE "public"."card_assets" TO "anon";
GRANT ALL ON TABLE "public"."card_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."card_assets" TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_card_asset"("p_card_id" "text", "p_source_url" "text", "p_source_kind" "text", "p_photo_type" "text", "p_author" "text", "p_license" "text", "p_legal_posture" "text", "p_credit" "text", "p_r2_key" "text", "p_status" "text", "p_fetched_at" timestamp with time zone, "p_content_hash" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_card_asset"("p_card_id" "text", "p_source_url" "text", "p_source_kind" "text", "p_photo_type" "text", "p_author" "text", "p_license" "text", "p_legal_posture" "text", "p_credit" "text", "p_r2_key" "text", "p_status" "text", "p_fetched_at" timestamp with time zone, "p_content_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_card_asset"("p_card_id" "text", "p_source_url" "text", "p_source_kind" "text", "p_photo_type" "text", "p_author" "text", "p_license" "text", "p_legal_posture" "text", "p_credit" "text", "p_r2_key" "text", "p_status" "text", "p_fetched_at" timestamp with time zone, "p_content_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_card_asset"("p_card_id" "text", "p_source_url" "text", "p_source_kind" "text", "p_photo_type" "text", "p_author" "text", "p_license" "text", "p_legal_posture" "text", "p_credit" "text", "p_r2_key" "text", "p_status" "text", "p_fetched_at" timestamp with time zone, "p_content_hash" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."badges" TO "anon";
GRANT ALL ON TABLE "public"."badges" TO "authenticated";
GRANT ALL ON TABLE "public"."badges" TO "service_role";



GRANT ALL ON TABLE "public"."cards" TO "anon";
GRANT ALL ON TABLE "public"."cards" TO "authenticated";
GRANT ALL ON TABLE "public"."cards" TO "service_role";



GRANT ALL ON TABLE "public"."coin_transactions" TO "anon";
GRANT ALL ON TABLE "public"."coin_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."coin_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."mission_templates" TO "anon";
GRANT ALL ON TABLE "public"."mission_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."mission_templates" TO "service_role";



GRANT ALL ON TABLE "public"."packs" TO "anon";
GRANT ALL ON TABLE "public"."packs" TO "authenticated";
GRANT ALL ON TABLE "public"."packs" TO "service_role";



GRANT ALL ON TABLE "public"."pages" TO "anon";
GRANT ALL ON TABLE "public"."pages" TO "authenticated";
GRANT ALL ON TABLE "public"."pages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."share_events" TO "anon";
GRANT ALL ON TABLE "public"."share_events" TO "authenticated";
GRANT ALL ON TABLE "public"."share_events" TO "service_role";



GRANT ALL ON TABLE "public"."streaks" TO "anon";
GRANT ALL ON TABLE "public"."streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."streaks" TO "service_role";



GRANT ALL ON TABLE "public"."tips" TO "anon";
GRANT ALL ON TABLE "public"."tips" TO "authenticated";
GRANT ALL ON TABLE "public"."tips" TO "service_role";



GRANT ALL ON TABLE "public"."user_badges" TO "anon";
GRANT ALL ON TABLE "public"."user_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges" TO "service_role";



GRANT ALL ON TABLE "public"."user_cards" TO "anon";
GRANT ALL ON TABLE "public"."user_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."user_cards" TO "service_role";



GRANT ALL ON TABLE "public"."user_coins" TO "anon";
GRANT ALL ON TABLE "public"."user_coins" TO "authenticated";
GRANT ALL ON TABLE "public"."user_coins" TO "service_role";



GRANT ALL ON TABLE "public"."user_missions" TO "anon";
GRANT ALL ON TABLE "public"."user_missions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_missions" TO "service_role";



GRANT ALL ON TABLE "public"."waitlist" TO "anon";
GRANT ALL ON TABLE "public"."waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."waitlist" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

































-- ============================================================================
-- Trigger en auth.users (no lo captura `supabase db dump`: vive en el schema
-- `auth`, que es managed). Recreado a mano desde prod para que el baseline sea
-- self-contained — sin esto, crear un user no inicializa sus base rows
-- (user_coins, streaks, profile) y el e2e/golden-path se rompe.
-- ============================================================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.tg_handle_new_user();
