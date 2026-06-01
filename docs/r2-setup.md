# Cableado de Cloudflare R2 (T7 — mitad de infra)

La mitad de código ya está mergeada (commit `c12409f`): `next.config.ts`
(`remotePatterns` derivado del env), `cromo.tsx` (`<Image unoptimized>`) y
`env.ts` (`NEXT_PUBLIC_R2_PUBLIC_BASE`). Hasta completar lo de abajo, el resolver
de imágenes devuelve `null` (fail-safe) y todos los cromos muestran placeholder.

Dos consumidores de R2, con vars distintas:
- **App Next (Railway):** solo necesita `NEXT_PUBLIC_R2_PUBLIC_BASE` para armar la
  URL servida. NO usa credenciales.
- **CLI Python (local, T9):** necesita las credenciales (account/key/secret/bucket)
  para subir vía boto3. NO viven en `env.ts`.

---

## 1. Crear el bucket R2

1. Cloudflare dashboard → **R2** → **Create bucket**.
2. Nombre: `cromiks-assets` (o el que prefieras; va a `R2_BUCKET`).
3. Location: **Automatic**. **No** habilites el dev URL público `*.r2.dev` para
   prod (está rate-limiteado y desaconsejado). El acceso público va por dominio
   propio (paso 3).

## 2. Credenciales para la CLI (boto3)

1. R2 → **Manage R2 API Tokens** → **Create API token**.
2. Permiso: **Object Read & Write**, scopeado al bucket `cromiks-assets`.
3. Guardá (el secret se muestra UNA sola vez):
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
4. `R2_ACCOUNT_ID`: el Account ID de Cloudflare (sidebar derecho en R2 overview).
5. `R2_BUCKET`: `cromiks-assets`.
6. Endpoint boto3 (no es una env aparte, se arma): `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`
   - `region_name="auto"`, **sin `ACL`** (R2 rechaza `ACL=public-read`).

Estas 5 van en el `.env.local` (o el env desde donde corras la CLI), **no** en Railway-app.
> Si las 5 `R2_*` ya estaban declaradas en el entorno (el design doc lo menciona),
> verificá que el token siga vivo y scopeado a este bucket.

## 3. Dominio público propio (en vez de r2.dev)

Prerrequisito: **`cromiks.app` tiene que ser una zona DNS manejada por Cloudflare**
(si el DNS está en otro lado, primero agregá el dominio a Cloudflare).

1. Bucket `cromiks-assets` → **Settings** → **Public access** → **Connect Domain**.
2. Ingresá: `assets.cromiks.app`.
3. Cloudflare crea el CNAME proxied automáticamente. Esperá a que propague
   (estado "Active").
4. Verificá: subí un objeto de prueba y abrí `https://assets.cromiks.app/<key>` →
   debe servir la imagen (200, `content-type: image/webp`).

> **CORS:** no hace falta. El cromo renderiza con `<img>`/next/image `unoptimized`
> y la OG la fetchea Satori server-side; ninguno necesita CORS. Solo configuralo si
> después leés el pixel data en canvas.

## 4. Variable en Railway (app)

1. Railway → proyecto `respectful-transformation` → servicio `cromiks` → **Variables**.
2. Agregá:
   ```
   NEXT_PUBLIC_R2_PUBLIC_BASE=https://assets.cromiks.app
   ```
   **Sin barra final.**
3. ⚠️ **`NEXT_PUBLIC_*` se inlinea en build-time.** Después de agregarla,
   **disparar un redeploy/rebuild** para que quede horneada en el bundle cliente y
   en `remotePatterns`. Sin rebuild, no toma efecto.

## 5. Verificación end-to-end (post-CLI / T9)

Una vez que la CLI suba al menos un cromo (`status='published'`, `r2_key` seteado):
1. `pnpm seed` (proyecta el `r2_key` a `card_assets`).
2. Abrí `/cromo/<ese-card-id>` → debe verse la foto real (no placeholder).
3. Smoke del kill switch: `UPDATE card_assets SET status='takedown' WHERE card_id='<id>'`
   → recargá → placeholder en las 5 superficies, sin redeploy.

## Resumen de variables

| Variable | Dónde | La usa |
|---|---|---|
| `NEXT_PUBLIC_R2_PUBLIC_BASE` | Railway (app) + `.env.local` | App Next (resolver) — **rebuild tras setear** |
| `R2_ACCOUNT_ID` | `.env.local` (CLI) | CLI (endpoint boto3) |
| `R2_ACCESS_KEY_ID` | `.env.local` (CLI) | CLI (boto3) |
| `R2_SECRET_ACCESS_KEY` | `.env.local` (CLI) | CLI (boto3) |
| `R2_BUCKET` | `.env.local` (CLI) | CLI (target del upload) |
