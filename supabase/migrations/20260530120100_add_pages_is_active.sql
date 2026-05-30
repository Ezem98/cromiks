-- =============================================================================
-- T2: pages.is_active — gate del pool de la beta
-- =============================================================================
-- Restringe qué cromos pueden salir en un sobre durante la soft-beta: solo los
-- de páginas marcadas is_active. roll_cards (migration siguiente) filtra por
-- esta columna. Expandir post-beta = `UPDATE pages SET is_active = true WHERE
-- page_number IN (...)` (una línea, sin reseed).
--
-- Default false: NINGUNA página activa hasta que se elija la página héroe
-- (paso 3 del plan — tiene que ser legendary-bearing: croacia / francia /
-- la-gloria / paises-bajos / polonia-australia) y su contenido esté 100% real.
-- La activación es un paso de data aparte (seed.ts o UPDATE manual), no se
-- hardcodea acá para no activar una página con cromos placeholder.
-- =============================================================================

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.pages.is_active IS
  'Beta gate: roll_cards solo sortea cromos de páginas activas. Default false. Activar la página héroe recién cuando su contenido esté 100% real.';
