-- =============================================================================
-- Fix _on_share_event_inserted — usar new.platform en lugar de new.channel
-- =============================================================================
--
-- La función original (en 20260526150000_e3_sharing_trigger.sql) referenciaba
-- `new.channel`, pero la tabla share_events nunca tuvo esa columna — el
-- atributo se llama `platform` (de tipo share_platform enum).
--
-- Síntoma: TODO INSERT a share_events erroraba con
--   `ERROR: record "new" has no field "channel"`
-- y la action recordShare devolvía { ok: false, code: 'insert_failed' }, lo
-- que provocaba que:
--   - 0 rows en public.share_events para cualquier usuario
--   - 0 eventos `share_initiated` en PostHog
--   - Misiones de tipo share_card no avanzaban (obvio, el insert no completaba)
--
-- Descubierto durante validación de AC3 de PR6 (analytics PostHog), siguiendo
-- error_severity=ERROR en logs de postgres.
--
-- Único cambio funcional: `new.channel` → `new.platform::text`. El cast a text
-- es necesario porque platform es del enum share_platform; el JSON output queda
-- igual (string).
-- =============================================================================

CREATE OR REPLACE FUNCTION public._on_share_event_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;
