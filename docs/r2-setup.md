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

1. Cloudflare dashboard → **R2 Object Storage** → **Create bucket**.
2. Nombre: `cromiks-assets` (o el que prefieras; va a `R2_BUCKET`).
3. Location: **Automatic**. **No** habilites el **Public Development URL**
   (`*.r2.dev`) para prod — está rate-limiteado y es "non-production". El acceso
   público va por dominio propio (paso 3). Si ya estaba activado, desactivalo.

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

## 3. Dominio público propio (Custom Domain, en vez de r2.dev)

Prerrequisito: **`cromiks.app` tiene que ser una zona en tu cuenta de Cloudflare**.
Si el DNS está en otro registrar, agregá el dominio a Cloudflare primero (sirve un
**partial / CNAME setup**, no hace falta mover los nameservers).

Pasos (navegación actual, verificada contra la docu de Cloudflare jun-2026):

1. Cloudflare → **R2 Object Storage** → bucket `cromiks-assets` → **Settings**.
2. Sección **Custom Domains** → **Add**.
   _(No es "Public access" — esa terminología quedó vieja. El dev URL `r2.dev` es
   una sección aparte que dejamos desactivada.)_
3. Ingresá el dominio: `assets.cromiks.app` → **Continue**.
4. Revisá el registro DNS que Cloudflare va a crear → **Connect Domain**.
5. El estado pasa de **Initializing** a **Active** en unos minutos.
6. Verificá: subí un objeto de prueba y abrí `https://assets.cromiks.app/<key>` →
   debe servir la imagen (200, `content-type: image/webp`).

> **CORS:** no hace falta. El cromo renderiza con `<img>`/next/image `unoptimized`
> y la OG la fetchea Satori server-side; ninguno necesita CORS. Solo configuralo si
> después leés el pixel data en canvas.

## 4. Variable en Railway (app)

Valor: `NEXT_PUBLIC_R2_PUBLIC_BASE=https://assets.cromiks.app` (**sin barra final**).

Vía dashboard: proyecto `respectful-transformation` → servicio `cromiks` →
**Variables** → agregar.

Vía CLI (ya linkeada a `cromiks`/`production`):
```
railway variables --set "NEXT_PUBLIC_R2_PUBLIC_BASE=https://assets.cromiks.app"
```

⚠️ **`NEXT_PUBLIC_*` se inlinea en build-time.** Setear la var dispara un redeploy
en Railway, que rebuildea con el valor horneado en el bundle cliente y en
`remotePatterns`. Sin ese rebuild, no toma efecto.

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
