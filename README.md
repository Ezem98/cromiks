# Cromiks

> El primer álbum digital donde los cromos épicos se mueven, suenan y te devuelven el momento original. Argentina campeón mundial 2022.

Side project personal. Modelo de homenaje no comercial. Free + tip jar hacia fundación.

---

## Stack

- **Framework**: Next.js 16 (App Router + Turbopack)
- **UI**: React 19.2, Tailwind v4
- **Lenguaje**: TypeScript 5.7 strict
- **Linting + formatting**: Biome 2.0
- **Package manager**: pnpm 10
- **Node**: 22+
- **Fonts**: Anton (display), Geist (body), Geist Mono (mono) — todas via `next/font`

Pendiente integrar (Fase B): Supabase, Cloudflare R2, Upstash Redis, PostHog, Resend, Sentry.

## Setup local

```bash
# Verificar versión de Node (22+)
node --version

# Si no tenés pnpm:
corepack enable
corepack prepare pnpm@latest --activate

# Instalar dependencias
pnpm install

# Inicializar Husky (corre automáticamente vía postinstall)
# Si no se instalaron los hooks:
pnpm exec husky init

# Crear archivo de env (todavía no necesario para que arranque)
cp .env.example .env.local

# Dev server
pnpm dev
```

Abrí [http://localhost:3000](http://localhost:3000) y deberías ver la landing placeholder con los tokens del brand book aplicados.

## Scripts

```bash
pnpm dev          # Dev server con Turbopack
pnpm build        # Build de producción
pnpm start        # Servidor de producción
pnpm lint         # Lint con Biome
pnpm lint:fix     # Lint + auto-fix
pnpm format       # Format con Biome
pnpm type-check   # Verificar tipos sin emitir
```

## Estructura

```
cromiks/
├── .husky/                  # Git hooks (pre-commit + commit-msg)
├── .vscode/                 # Editor settings (Biome como formatter)
├── public/                  # Assets estáticos
├── src/
│   ├── app/                 # App Router
│   │   ├── globals.css      # Tokens del DESIGN.md + base styles
│   │   ├── layout.tsx       # Root layout con fonts
│   │   └── page.tsx         # Landing placeholder
│   ├── components/
│   │   ├── ui/              # Primitives (Button, Card, Modal, etc.)
│   │   ├── domain/          # Componentes específicos (Cromo, Sobre, Album)
│   │   ├── layout/          # Shells, Nav, Footer
│   │   └── effects/         # Tilt, Holographic, Parallax (lazy load)
│   ├── features/            # Lógica por bounded context (packs, album, missions)
│   ├── lib/                 # Utils, fonts, clients (Supabase, R2, etc.)
│   ├── hooks/               # Custom React hooks
│   ├── types/               # Types compartidos
│   └── styles/              # Helpers de estilo en TS
├── DESIGN.md                # Source of truth del design system
├── biome.json               # Config de Biome
├── commitlint.config.mjs    # Config de conventional commits
├── next.config.ts
├── package.json
├── postcss.config.mjs       # Para Tailwind v4
└── tsconfig.json
```

## Convenciones

### Naming

| Tipo | Convención | Ejemplo |
|---|---|---|
| Componentes | PascalCase | `CardReveal.tsx` |
| Hooks | camelCase con `use` | `usePackReveal.ts` |
| Utilidades | kebab-case | `format-card-name.ts` |
| Types | kebab-case con `.types` | `card.types.ts` |
| Carpetas | kebab-case | `card-detail/` |
| Constantes | SCREAMING_SNAKE | `MAX_DAILY_PACKS` |

### Git

Branches:
- `main` — siempre deployable, protected
- `feat/nombre-feature` — features
- `fix/nombre-bug` — bugfixes
- `chore/nombre-tarea` — refactors, deps, docs

Commits con [conventional commits](https://www.conventionalcommits.org):

```
feat: add daily pack claim endpoint
fix: pack opening animation freezes on Safari
chore: bump tailwind to 4.0
docs: update README with setup instructions
design: refine legendary card border treatment
```

Tipos válidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, `design`.

## Design system

La fuente de verdad es `DESIGN.md`. Antes de tocar tokens (colores, tipografía, spacing, radius, motion), leelo y respetalo. Los tokens viven en `src/app/globals.css` bajo el bloque `@theme` de Tailwind v4.

Para ver el brand book renderizado, abrí `brand-book.html` (versión visual del `DESIGN.md`).

## Próximas fases

- **Fase A** (✅ esto): Setup del repo
- **Fase B**: Infraestructura (Supabase, R2, Upstash, PostHog, Resend, Sentry)
- **Fase C**: Modelo de datos (schema + migration del catálogo YAML)
- **Fase D**: Componentes base (Card, Modal, Input, Badge, Toast, Sobre)
- **Fase E**: Features (auth, packs, album, missions, share)

## Notas

- El nombre **Cromiks** es placeholder de trabajo. El nombre final está en revisión y los tokens son agnósticos al nombre.
- Este es un proyecto de homenaje no comercial. Todo el contenido pertenece a sus respectivos dueños. Los donativos van íntegros a fundación a definir.

---

Hecho con cariño en Argentina.
