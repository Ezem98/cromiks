-- =============================================================================
-- T2: card_assets — provenance + estado del asset de cada cromo (pipeline R2)
-- =============================================================================
--
-- Proyección a DB del bloque `content.photo` del catálogo (YAML = fuente de
-- verdad; el seed la empuja vía la RPC de abajo). Habilita:
--   1. El resolver de runtime (resolveCardImage, T4): arma la URL servida como
--      ${R2_PUBLIC_BASE}/${r2_key} cuando status='published'.
--   2. El KILL SWITCH legal: `UPDATE card_assets SET status='takedown' WHERE
--      card_id=...` baja la imagen en TODAS las superficies en <1min sin redeploy
--      (la RLS de SELECT esconde la fila → el runtime sirve placeholder).
--   3. /about (T10): lista autor/fuente/licencia de cada foto publicada.
--
-- Un asset por cromo → PK = card_id (FK cards.id, que es text). content_hash es
-- solo change-detection del asset en `--force` de la CLI, NO dedup cross-card.
--
-- `license` (cc-by/cc-by-sa/cc0/all-rights-reserved/ai-generated) es la licencia
-- REAL; `legal_posture` (licensed/takedown) es la POSTURA: si la imagen va por el
-- régimen de baja-a-pedido o está propiamente licenciada. /about rinde según ambos.
--
-- RLS: SELECT solo de filas `published` (anon + authenticated). pending/takedown
-- quedan invisibles al cliente → placeholder. NO hay policy de INSERT/UPDATE/DELETE:
-- solo el service role (seed / dashboard) escribe, y siempre vía upsert_card_asset.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.card_assets (
  card_id        text primary key references public.cards(id) on delete cascade,

  -- INPUT (provenance, viene del YAML curado a mano) --------------------------
  source_url     text,                       -- URL HQ de origen, o NULL/"TODO" si sin curar
  source_kind    text,                       -- wikimedia | direct | youtube | instagram | manual
  photo_type     text,                       -- official | video_capture | collage | social-media (intent)
  author         text,                       -- autor/fotógrafo (para crédito)
  license        text,                       -- cc-by | cc-by-sa | cc0 | all-rights-reserved | ai-generated
  legal_posture  text not null default 'takedown'
                   check (legal_posture in ('licensed', 'takedown')),

  -- OUTPUT (lo completa la CLI al publicar) -----------------------------------
  credit         text,                       -- string armado para alt/caption
  r2_key         text,                       -- key R2 = cromos/<album>/<card_id>.webp (NULL hasta publicar)
  fetched_at     timestamptz,                -- fecha de obtención
  content_hash   text,                       -- sha256 del asset (change-detection en --force)

  -- ESTADO --------------------------------------------------------------------
  status         text not null default 'pending'
                   check (status in ('pending', 'published', 'takedown')),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- /about lista las publicadas; el resolver busca por card_id (ya es PK).
CREATE INDEX IF NOT EXISTS idx_card_assets_status ON public.card_assets(status);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.card_assets ENABLE ROW LEVEL SECURITY;

-- SELECT: solo filas publicadas. Un takedown (o pending) deja de ser visible al
-- cliente → el runtime cae a CromoPlaceholder. Es la mitad de runtime del kill
-- switch (la otra mitad es que el read path sea dinámico, T10).
DROP POLICY IF EXISTS "card_assets_select_published" ON public.card_assets;
CREATE POLICY "card_assets_select_published" ON public.card_assets
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- Sin policy de INSERT/UPDATE/DELETE a propósito: las escrituras son solo del
-- service role (seed.ts con SUPABASE_SECRET_KEY, que bypassa RLS) vía la RPC.

-- =============================================================================
-- RPC: upsert_card_asset — proyección idempotente YAML → card_assets (T3)
-- =============================================================================
-- El seed la llama una vez por cromo. INVARIANTE LEGAL: takedown es TERMINAL.
-- Si la fila ya está en 'takedown' (baja hecha por SQL), el reseed NO la revive
-- ni la pisa — el guard del ON CONFLICT (`WHERE ca.status <> 'takedown'`) bloquea
-- el UPDATE, y devolvemos la fila existente para que el caller loguee "preservada".
--
-- SECURITY DEFINER + REVOKE público: solo el service role puede ejecutarla; un
-- cliente con anon/publishable key NO puede publicar ni pisar assets.
-- =============================================================================

DROP FUNCTION IF EXISTS public.upsert_card_asset(
  text, text, text, text, text, text, text, text, text, text, timestamptz, text
);

CREATE OR REPLACE FUNCTION public.upsert_card_asset(
  p_card_id       text,
  p_source_url    text,
  p_source_kind   text,
  p_photo_type    text,
  p_author        text,
  p_license       text,
  p_legal_posture text,
  p_credit        text,
  p_r2_key        text,
  p_status        text,
  p_fetched_at    timestamptz,
  p_content_hash  text
)
 RETURNS public.card_assets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- INVARIANTE LEGAL: takedown es terminal. El reseed NUNCA revive una baja.
  where ca.status <> 'takedown'
  returning * into v_row;

  -- Si el guard bloqueó el UPDATE (fila en takedown), RETURNING no trae nada:
  -- recuperamos la fila real para que el caller vea el estado preservado.
  if v_row.card_id is null then
    select * into v_row from public.card_assets where card_id = p_card_id;
  end if;

  return v_row;
end;
$function$;

-- Solo el service role ejecuta esta RPC (no anon/authenticated).
REVOKE ALL ON FUNCTION public.upsert_card_asset(
  text, text, text, text, text, text, text, text, text, text, timestamptz, text
) FROM public;
GRANT EXECUTE ON FUNCTION public.upsert_card_asset(
  text, text, text, text, text, text, text, text, text, text, timestamptz, text
) TO service_role;

COMMENT ON TABLE public.card_assets IS
  'Provenance + estado del asset de cada cromo (pipeline R2). YAML es fuente de verdad; el seed proyecta vía upsert_card_asset. status=takedown es terminal (kill switch legal).';
