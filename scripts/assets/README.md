# CLI de assets (pipeline de imágenes → R2)

Toma `content.photo.source_url` de cada cromo del catálogo, baja la imagen, la
normaliza (3:4 · 800x1066 · WebP <200KB), la sube a Cloudflare R2 con key
determinístico (`cromos/<album>/<card_id>.webp`) y escribe la provenance de vuelta
en el YAML (`asset`, `credit`, `author`, `license`, `status=published`,
`fetched_at`, `content_hash`). Después un `pnpm seed` proyecta eso a `card_assets`.

## Setup (una vez)

```bash
python -m venv scripts/assets/.venv
# Windows:  scripts\assets\.venv\Scripts\activate
# bash:     source scripts/assets/.venv/bin/activate
pip install -r scripts/assets/requirements.txt
```

Credenciales en `.env.local` (las mismas del proyecto):
`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`,
`R2_ACCOUNT_ID`. Ver `docs/r2-setup.md`.

## Uso

```bash
python scripts/assets/cli.py --only dibu-plantel --dry-run   # probar fuente sin subir
python scripts/assets/cli.py --only dibu-plantel             # subir 1 cromo
python scripts/assets/cli.py --limit 5                       # los primeros 5 curados
python scripts/assets/cli.py --force --only dibu-plantel     # re-procesar (respeta hash)
python scripts/assets/cli.py                                 # todos los curados (pending)
```

## Flujo de curado

1. Pegá `source_url` (y para `direct`, `author` + `license`) en el cromo del YAML.
2. `--dry-run` para validar que la fuente baja y normaliza bien.
3. Corré sin `--dry-run` para subir + escribir el YAML.
4. `pnpm seed` para proyectar a `card_assets` (la app ya sirve la foto).

## Adapters (v1)

- **direct**: `source_url` es la imagen. `author`/`license` se completan a mano en el YAML.
- **wikimedia**: consulta la Commons API (imageinfo + extmetadata) para la URL
  full-res + Artist/Licencia. YouTube/Instagram quedan para F2.

## Invariantes

- **NUNCA re-publica un `takedown`** (terminal; se saltea).
- **No upscalea**: si la fuente no da para un crop 3:4 ≥ 800x1066, se flaggea y skip.
- **Idempotente**: mismo input → mismo key; `--force` re-baja y compara `content_hash`.
- Falla por cromo = skip-and-continue + reporte final (no aborta el lote).
