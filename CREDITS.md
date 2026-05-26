# Cromiks — Atribuciones y Créditos

Este documento lista los recursos de terceros usados en Cromiks y sus respectivas licencias.

> **Nota legal:** Cuando exista una página `/about` o `/credits` en el sitio público, estos créditos deben ser visibles también allí. Algunas licencias (notablemente CC-BY-4.0) lo requieren.

---

## Modelos 3D

### Sobre / Pack — `public/models/pack/`

**"Trading Card Pack"** by **goonmize1**
- Fuente: https://sketchfab.com/3d-models/trading-card-pack-26d1a87e47814d0ea3a710d169e3a671
- Licencia: **CC-BY-4.0** (Creative Commons Attribution 4.0)
- Uso: Sobre 3D en el flow de apertura de packs (`/open/[packId]`)
- Atribución requerida: Sí — incluir el nombre del autor + link al original donde el modelo sea visible al usuario

> ⚠️ **PENDIENTE de re-texturizar antes del launch público:** la textura `body_baseColor.png` actual contiene IP de Pokémon Trading Card Game (logo, personajes Blastoise). Hay que reemplazarla por una textura propia con identidad Cromiks/Argentina antes del soft-launch. El normal map (`body_normal.png`) se reusa tal cual — es geometría del foil arrugado, sin IP.

### Modelo alternativo (no usado actualmente)

**"Booster Pack TCG Pack"** by **Hasan**
- Fuente: Sketchfab
- Licencia: CC-BY-4.0
- Estado: Disponible pero no integrado. Tiene 2 meshes separados (techo + base) que permitirían un tear visual real. Conservado como fallback futuro.

---

## Librerías y dependencias

Ver `package.json` para el listado completo. Principales:

- **Next.js** (MIT) — Vercel
- **React** (MIT) — Meta
- **Tailwind CSS** (MIT) — Tailwind Labs
- **shadcn/ui** (MIT) — primitives base reskinadas
- **three** (MIT) — Three.js Authors
- **@react-three/fiber** (MIT) — Poimandres
- **@react-three/drei** (MIT) — Poimandres
- **motion** (MIT) — Framer
- **Supabase** (Apache 2.0) — backend

---

## TODO antes del launch público

- [ ] Re-texturizar `body_baseColor.png` del sobre con identidad Cromiks
- [ ] Agregar página `/about` o `/credits` con atribuciones visibles
- [ ] Incluir créditos del HDRI usado (drei `<Environment preset="warehouse" />` — verificar licencia de drei para el preset)
- [ ] Verificar fuentes del proyecto (Outfit, Roboto) — ambas son SIL Open Font License (OFL), uso libre
