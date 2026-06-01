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

## Adapters

- **direct**: `source_url` es la URL directa de la imagen. `author`/`license` a mano en el YAML.
- **wikimedia**: pegás el link de Commons; la Commons API (imageinfo + extmetadata) da la
  URL full-res + Artist/Licencia (mapea CC-BY/CC-BY-SA/CC0). Lo más sólido.
- **x**: pegás el link del tweet (`x.com/.../status/123`). Usa la syndication API de
  Twitter (sin login) → foto full-res (`name=orig`) + @autor. `license=all-rights-reserved`.
- **instagram**: pegás el link del post (`instagram.com/p/...`). Vía instaloader,
  **best-effort** — IG suele exigir login. Para que sea confiable, configurá una sesión:
  `instaloader --login=<tu_usuario>` y exportá `IG_USERNAME=<tu_usuario>`. Si falla, pegá
  la URL directa de la imagen como `source_kind: direct`. Fuente de **alto riesgo legal**.

YouTube (frames de video) queda para más adelante.

## Invariantes

- **NUNCA re-publica un `takedown`** (terminal; se saltea).
- **No upscalea**: si la fuente no da para un crop 3:4 ≥ 800x1066, se flaggea y skip.
- **Idempotente**: mismo input → mismo key; `--force` re-baja y compara `content_hash`.
- Falla por cromo = skip-and-continue + reporte final (no aborta el lote).
