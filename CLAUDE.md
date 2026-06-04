# Design Context

Generado por `/impeccable init` (2026-06-03). Antes de cualquier trabajo de diseño/UI, leé:

- **[PRODUCT.md](./PRODUCT.md)** — capa estratégica: register (`product`, con override brand para landing/pack opening/detalle de cromo), usuarios, propósito, personalidad, anti-referencias y principios de diseño.
- **[DESIGN.md](./DESIGN.md)** — fuente de verdad del design system: tokens, tipografía (Anton/Geist/Geist Mono), color (dark-only), motion, voice & tone (voseo rioplatense), anatomía de cromos por tier.

Regla central: los colores de tier y efectos (foil, glow, prisma) viven SOLO en los cromos; la UI general es sobria. Tokens reales en `src/app/globals.css`.

# gstack

This project uses [gstack](https://github.com/garrytan/gstack) for browser automation and dev workflows.

**Install it once** (per machine), then re-run after every `git pull` of gstack:
```
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```
> Requires `bun`. On Windows, if `./setup` hangs at "Installing Playwright Chromium" (100% then stall), install the browser manually with node instead of bunx — see the gstack docs / your team lead.

Use the `/browse` skill from gstack for all web browsing. **Never** use `mcp__claude-in-chrome__*` tools.

Available gstack skills:
- `/office-hours`
- `/plan-ceo-review`
- `/plan-eng-review`
- `/plan-design-review`
- `/design-consultation`
- `/design-shotgun`
- `/design-html`
- `/review`
- `/ship`
- `/land-and-deploy`
- `/canary`
- `/benchmark`
- `/browse`
- `/connect-chrome`
- `/qa`
- `/qa-only`
- `/design-review`
- `/setup-browser-cookies`
- `/setup-deploy`
- `/setup-gbrain`
- `/retro`
- `/investigate`
- `/document-release`
- `/document-generate`
- `/codex`
- `/cso`
- `/autoplan`
- `/plan-devex-review`
- `/devex-review`
- `/careful`
- `/freeze`
- `/guard`
- `/unfreeze`
- `/gstack-upgrade`
- `/learn`
