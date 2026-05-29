# 01 · Stack técnico

## Versiones core

| Pieza | Versión | Razón |
|---|---|---|
| **Next.js** | 16.2.6 (Turbopack) | App Router, server components, Server Actions, edge-ready |
| **React** | 19.2.0 | Concurrent features, useTransition |
| **TypeScript** | 5.7+ | Strict mode |
| **Node** | ≥22 | Engine requirement (ver `package.json`) |
| **pnpm** | ≥10 | Package manager |
| **Tailwind CSS** | v4 | Nueva sintaxis con CSS vars `--color-*` |
| **Biome** | 2.4.15 | Linter + formatter (reemplaza ESLint + Prettier) |

---

## Dependencias clave

### Backend / data
| Lib | Uso |
|---|---|
| `@supabase/ssr` | Server-side client de Supabase (App Router) |
| `@supabase/supabase-js` | Cliente JS general |
| `dotenv` | Load env vars en scripts standalone |
| `js-yaml` | Parsear el catálogo de cromos `catalog/eterno-diciembre.yaml` |

### UI / forms
| Lib | Uso |
|---|---|
| `radix-ui` + `@radix-ui/react-slot` | Primitivos accesibles (Dialog, Sheet, Dropdown, Tooltip) |
| `class-variance-authority` | Variants tipados para componentes (`Button`) |
| `clsx` + `tailwind-merge` | Utility de classes (`cn()`) |
| `lucide-react` | Íconos |
| `sonner` | Toast notifications |
| `next-themes` | Theme provider (dark por default) |

### Animación
| Lib | Uso |
|---|---|
| `motion` (ex Framer Motion v12) | Animaciones declarativas |
| `tw-animate-css` | Animaciones utility de Tailwind |

### 3D (apertura del sobre)
| Lib | Uso |
|---|---|
| `three` (`0.184.0`) | Engine 3D |
| `@react-three/fiber` (`9.6.1`) | React renderer para Three |
| `@react-three/drei` (`10.7.7`) | Helpers (Environment, useGLTF) |

⚠️ **Incompatibilidad conocida**: `drei`'s `<Text>` component no funciona con three r0.184. Por eso se usa el approach híbrido 3D + HTML overlay para el texto de las cards. Ver [`features/e1-pack-opening.md`](./features/e1-pack-opening.md).

### Dev
| Lib | Uso |
|---|---|
| `tsx` | Run TypeScript scripts (`pnpm seed`, `pnpm seed:reset`) |
| `husky` + `lint-staged` | Pre-commit hooks |
| `@commitlint/cli` | Conventional commits |

---

## Variables de entorno

**Fuente de verdad: [`src/env.ts`](../src/env.ts)** (TP-11 · `@t3-oss/env-nextjs`).
Las vars que el proceso Next lee se validan con Zod al boot/build: si falta o
está vacía una requerida, **`next build` falla** con un error claro (en vez de
romper en runtime — ver el incidente de `NEXT_PUBLIC_APP_URL` en PR6). Reemplazá
`process.env.X` por `env.X` tipado. El listado completo (incluidas las vars que
NO se validan y por qué) vive en [`.env.example`](../.env.example) y en el
comentario de cabecera de `src/env.ts`.

```env
# Supabase (públicas)
NEXT_PUBLIC_SUPABASE_URL=https://oaussuztahdxivemqbnd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...

# Supabase (privada — solo para admin / scripts)
SUPABASE_SECRET_KEY=...

# App (requerida — magic links + metadataBase)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend (la consume Supabase Auth SMTP; env.ts la valida como guard de presencia)
RESEND_API_KEY=...

# PostHog (project key viene de env; host está hardcodeado en src/lib/posthog/config.ts)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
```

> **Validación en CI**: el job `check` (type-check/lint) y los builds de CI usan
> `SKIP_ENV_VALIDATION=1` (no necesitan secrets). El gate real es el build de
> deploy en Railway, que tiene todas las vars. Kill switches y vars de tooling
> (Playwright) se leen crudas, fuera del schema.

**Project ID Supabase**: `oaussuztahdxivemqbnd` (São Paulo region). El `db:types` script lo tiene hardcodeado.

---

## Comandos importantes

```bash
# Dev
pnpm dev                  # Next dev server con Turbopack

# Build
pnpm build
pnpm start

# Linting
pnpm lint                 # Biome check
pnpm lint:fix             # Auto-fix
pnpm format               # Biome format
pnpm type-check           # tsc --noEmit

# Data
pnpm seed                 # Popula la DB desde catalog/eterno-diciembre.yaml
pnpm seed:reset           # ⚠️ DESTRUCTIVO — borra todo y resemea

# Tipos generados de Supabase
pnpm db:types             # Regenera src/types/database.types.ts desde el schema actual
```

⚠️ **Después de aplicar una migration SQL siempre correr `pnpm db:types`**, sino el TS no sabe de columnas/funciones nuevas.

---

## Hosting / deploy

- **Frontend**: Railway (Hobby plan)
- **DB / Auth**: Supabase (São Paulo)
- **Storage**: Cloudflare R2 (avatares, assets de cromos, OG renders cacheables)
- **Email**: Resend
- **Error monitoring**: Sentry (cromiks-web)
- **Product analytics + feature flags**: PostHog Cloud (us.i.posthog.com)
- **Anti-abuso / rate limiting**: Upstash Redis (sa-east-1)
- **Domain**: TBD pre-launch

---

## Servicios futuros (planeados)

| Servicio | Para qué | Estado |
|---|---|---|
| Sentry | Error monitoring | ✅ Instalado (PR2) |
| PostHog | Analytics + feature flags | ✅ Instalado (PR6) |
| Better Uptime | Uptime monitoring | 🚧 No instalado |
| Mercado Pago | Tip jar | 🚧 No integrado |
| Apple Developer | iOS push notifications eventual | 🚧 TBD |

---

## Estructura mínima del repo

```
cromiks/
├── public/
│   └── models/pack/       # GLTF + texturas del sobre 3D
├── catalog/
│   └── eterno-diciembre.yaml  # Definición de los 205 cromos
├── scripts/
│   ├── seed.ts            # pnpm seed
│   └── reset.ts           # pnpm seed:reset
├── src/
│   ├── app/               # Routes (App Router)
│   ├── components/        # UI compartida
│   ├── features/          # Lógica por dominio
│   ├── lib/               # Utilities, supabase clients
│   └── types/             # database.types.ts (generado)
├── supabase/
│   └── migrations/        # SQL versionado
└── docs/                  # ← Estás acá
```

Ver detalle en [`02-architecture.md`](./02-architecture.md).

---

## Referencias

- [`02-architecture.md`](./02-architecture.md) — Estructura de carpetas, patterns
- [`03-design-system.md`](./03-design-system.md) — CSS vars, fonts
- [`operations/migrations.md`](./operations/migrations.md) — Cómo aplicar SQL
