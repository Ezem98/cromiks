#!/usr/bin/env tsx
/**
 * Cromiks · Seed script
 *
 * Lee el catálogo YAML y popula la DB con:
 *  - 10 páginas del álbum "eterno-diciembre"
 *  - Los cromos definidos en el YAML (+ placeholders si faltan para llegar a 205)
 *  - card_assets: provenance + estado del asset de cada cromo (vía upsert_card_asset).
 *    Respeta el takedown: una baja hecha por SQL NO se revive al reseed.
 *  - Mission templates iniciales
 *  - Badges iniciales
 *
 * Usa el admin client (bypass RLS). Hace upserts, así que es idempotente:
 * podés correrlo cuantas veces quieras sin duplicar.
 *
 * Uso:
 *   pnpm seed
 *
 * Reset (peligroso, solo en dev):
 *   pnpm seed:reset
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import yaml from 'js-yaml'

// ============================================================
// Setup env
// ============================================================

loadEnv({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('❌ Faltan env vars: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY')
  console.error('   Verificá tu .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ============================================================
// Types del YAML
// ============================================================

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

interface YamlPage {
  id: string
  name: string
  description?: string
  order: number
  card_range: [number, number]
  bonus_card_id?: string
}

interface YamlCard {
  id: string
  name: string
  page: string
  rarity: Rarity
  card_number: number
  description?: string
  content?: Record<string, unknown>
  metadata?: Record<string, unknown> & { legendary_brief?: string }
}

interface YamlCatalog {
  meta: {
    album_id: string
    album_name: string
    total_cards: number
  }
  pages: YamlPage[]
  cards: YamlCard[]
}

// ============================================================
// Helpers
// ============================================================

const reset = '\x1b[0m'
const dim = '\x1b[2m'
const green = '\x1b[32m'
const yellow = '\x1b[33m'
const cyan = '\x1b[36m'
const red = '\x1b[31m'

function log(label: string, msg: string) {
  console.info(`${cyan}[${label}]${reset} ${msg}`)
}

function ok(msg: string) {
  console.info(`${green}✓${reset} ${msg}`)
}

function warn(msg: string) {
  console.info(`${yellow}⚠${reset} ${msg}`)
}

// El catálogo usa "TODO" como sentinel de "sin curar". En DB eso es NULL
// (no guardamos URLs/autores falsos). Strings vacíos también → NULL.
function nullIfTodo(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' || t === 'TODO' ? null : t
}

// ============================================================
// Step 1: Cargar YAML
// ============================================================

function loadCatalog(): YamlCatalog {
  const path = resolve(process.cwd(), 'catalog/eterno-diciembre.yaml')
  log('catalog', `cargando ${dim}${path}${reset}`)
  const raw = readFileSync(path, 'utf-8')
  const parsed = yaml.load(raw) as YamlCatalog
  log('catalog', `${parsed.pages.length} páginas, ${parsed.cards.length} cromos definidos`)
  return parsed
}

// ============================================================
// Step 2: Seed pages
// ============================================================

async function seedPages(catalog: YamlCatalog) {
  log('pages', 'sembrando…')

  const rows = catalog.pages.map((p) => ({
    id: p.id,
    album_id: catalog.meta.album_id,
    page_number: p.order,
    title: p.name,
    subtitle: null,
    description: p.description ?? null,
    card_range_start: p.card_range[0],
    card_range_end: p.card_range[1],
    bonus_card_ids: p.bonus_card_id ? [p.bonus_card_id] : null,
  }))

  const { error } = await supabase.from('pages').upsert(rows, { onConflict: 'id' })

  if (error) {
    console.error(`${red}✗${reset} pages upsert failed:`, error)
    process.exit(1)
  }

  ok(`${rows.length} páginas sembradas`)
}

// ============================================================
// Step 3: Seed cards
// ============================================================

interface CardRow {
  id: string
  album_id: string
  page_id: string
  card_number: number
  name: string
  description: string | null
  rarity: Rarity
  metadata: Record<string, unknown>
  content: unknown
  legendary_brief: Record<string, unknown> | null
}

async function seedCards(catalog: YamlCatalog) {
  log('cards', 'sembrando…')

  // Convertir cromos del YAML al shape de DB
  const yamlRows: CardRow[] = catalog.cards.map((c) => {
    const { legendary_brief, ...restMetadata } = c.metadata ?? {}
    return {
      id: c.id,
      album_id: catalog.meta.album_id,
      page_id: c.page,
      card_number: c.card_number,
      name: c.name,
      description: c.description ?? null,
      rarity: c.rarity,
      metadata: restMetadata,
      content: c.content ?? [],
      legendary_brief: legendary_brief ? { brief: legendary_brief } : null,
    }
  })

  log('cards', `${yamlRows.length} cromos desde YAML`)

  // Upsert en batches de 50 (Supabase tiene límites en payloads grandes)
  const BATCH_SIZE = 50
  for (let i = 0; i < yamlRows.length; i += BATCH_SIZE) {
    const batch = yamlRows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('cards').upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`${red}✗${reset} cards batch ${i}-${i + batch.length} failed:`, error)
      process.exit(1)
    }
  }

  ok(`${yamlRows.length} cromos sembrados`)

  // Verificar distribución
  const { count: totalCount } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('album_id', catalog.meta.album_id)

  if (totalCount !== catalog.meta.total_cards) {
    warn(`distribución: hay ${totalCount} cromos pero el catálogo dice ${catalog.meta.total_cards}`)
  } else {
    ok(`distribución correcta: ${totalCount} cromos en total`)
  }
}

// ============================================================
// Step 3.5: Seed card_assets (provenance + estado del asset)
// ============================================================
//
// Proyecta el bloque content.photo de cada cromo a la tabla card_assets vía la
// RPC upsert_card_asset. Idempotente (la RPC hace upsert por card_id) y respeta
// el INVARIANTE LEGAL: si una fila ya está en 'takedown', el guard de la RPC NO
// la revive — el reseed la deja como está. Los cromos sin bloque photo (bonus de
// página, o cromos sin fuente curada todavía) se saltean.

interface YamlPhoto {
  type?: string | null
  source_url?: string | null
  source_kind?: string | null
  author?: string | null
  license?: string | null
  legal_posture?: string | null
  status?: string | null
  asset?: string | null
  credit?: string | null
  fetched_at?: string | null
  content_hash?: string | null
}

function getPhoto(card: YamlCard): YamlPhoto | null {
  const content = card.content
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null
  const photo = (content as Record<string, unknown>).photo
  if (!photo || typeof photo !== 'object') return null
  return photo as YamlPhoto
}

async function seedCardAssets(catalog: YamlCatalog) {
  log('assets', 'proyectando card_assets vía upsert_card_asset…')

  const withPhoto = catalog.cards
    .map((c) => ({ id: c.id, photo: getPhoto(c) }))
    .filter((x): x is { id: string; photo: YamlPhoto } => x.photo !== null)

  const tally: Record<string, number> = { pending: 0, published: 0, takedown: 0 }
  let preserved = 0
  let failed = 0

  for (const { id, photo } of withPhoto) {
    const requestedStatus = nullIfTodo(photo.status) ?? 'pending'

    const { data, error } = await supabase.rpc('upsert_card_asset', {
      p_card_id: id,
      p_source_url: nullIfTodo(photo.source_url),
      p_source_kind: nullIfTodo(photo.source_kind),
      p_photo_type: nullIfTodo(photo.type),
      p_author: nullIfTodo(photo.author),
      p_license: nullIfTodo(photo.license),
      p_legal_posture: nullIfTodo(photo.legal_posture) ?? 'takedown',
      p_credit: nullIfTodo(photo.credit),
      p_r2_key: nullIfTodo(photo.asset),
      p_status: requestedStatus,
      p_fetched_at: photo.fetched_at ?? null,
      p_content_hash: nullIfTodo(photo.content_hash),
    })

    if (error) {
      console.error(`${red}✗${reset} upsert_card_asset(${id}) falló:`, error.message)
      failed++
      continue
    }

    // La RPC devuelve la fila resultante (incluso la preservada en takedown).
    const finalStatus = (data as { status?: string } | null)?.status ?? requestedStatus
    tally[finalStatus] = (tally[finalStatus] ?? 0) + 1
    // Pediste publicar/pending pero quedó en takedown → el guard preservó una baja.
    if (finalStatus === 'takedown' && requestedStatus !== 'takedown') preserved++
  }

  if (failed > 0) {
    warn(`${failed} upserts de card_assets fallaron (ver arriba)`)
  }
  ok(
    `card_assets: ${withPhoto.length} proyectados ` +
      `(${tally.published} published, ${tally.pending} pending, ${tally.takedown} takedown` +
      (preserved > 0 ? `; ${preserved} takedown preservados por el guard` : '') +
      ')',
  )
}

// ============================================================
// Step 4: Seed mission templates
// ============================================================

const MISSION_TEMPLATES = [
  {
    id: 'open_1_pack',
    type: 'open_pack',
    title: 'Abrí 1 sobre',
    description: 'Cualquier sobre vale. Diario, misión, lo que tengas.',
    config: { target_count: 1 },
    reward_pack_type: 'mission',
    reward_card_count: 4,
    reward_coins: 5,
    is_daily_pool: true,
    weight: 100,
  },
  {
    id: 'open_3_packs',
    type: 'open_pack',
    title: 'Abrí 3 sobres',
    description: 'Aceleramos el ritmo. 3 sobres en el día.',
    config: { target_count: 3 },
    reward_pack_type: 'mission',
    reward_card_count: 4,
    reward_coins: 10,
    is_daily_pool: true,
    weight: 60,
  },
  {
    id: 'collect_rare',
    type: 'collect_rarity',
    title: 'Conseguí una Rara o mejor',
    description: 'Saca una Rara, Épica o Legendaria. Las repetidas no cuentan.',
    config: { target_count: 1, min_rarity: 'rare', only_new: true },
    reward_pack_type: 'mission',
    reward_card_count: 4,
    reward_coins: 15,
    is_daily_pool: true,
    weight: 80,
  },
  {
    id: 'share_card',
    type: 'share_card',
    title: 'Compartí un cromo',
    description: 'Compartí cualquiera de tus cromos. WhatsApp, Twitter, lo que sea.',
    config: { target_count: 1 },
    reward_pack_type: 'mission',
    reward_card_count: 4,
    reward_coins: 5,
    is_daily_pool: true,
    weight: 100,
  },
  {
    id: 'pin_card',
    type: 'pin_card',
    title: 'Destacá un cromo en tu perfil',
    description: 'Elegí un cromo para destacar en tu perfil público.',
    config: { target_count: 1 },
    reward_pack_type: 'mission',
    reward_card_count: 4,
    reward_coins: 5,
    is_daily_pool: true,
    weight: 50,
  },
  {
    // OJO: type='collect_rarity', NO 'open_pack'. Con only_new=true el trigger
    // de open_pack (que avanza con contexto vacío) la rechaza siempre y la
    // misión nunca completa. El progress per-cromo lo da el trigger de
    // collect_rarity (user_cards INSERT con is_new=true). Ver migración
    // 20260604222239_fix_user_coins_total_earned.sql.
    id: 'new_5_cards',
    type: 'collect_rarity',
    title: 'Sumá 5 cromos nuevos',
    description: 'Pegá 5 cromos que todavía no tenías. Las repetidas no cuentan.',
    config: { target_count: 5, only_new: true },
    reward_pack_type: 'mission',
    reward_card_count: 4,
    reward_coins: 15,
    is_daily_pool: true,
    weight: 70,
  },
] as const

async function seedMissionTemplates() {
  log('missions', 'sembrando templates…')

  const { error } = await supabase
    .from('mission_templates')
    .upsert(MISSION_TEMPLATES as unknown as Record<string, unknown>[], { onConflict: 'id' })

  if (error) {
    console.error(`${red}✗${reset} mission_templates upsert failed:`, error)
    process.exit(1)
  }

  ok(`${MISSION_TEMPLATES.length} mission templates sembradas`)
}

// ============================================================
// Step 5: Seed badges
// ============================================================

const BADGES = [
  // Progreso
  {
    id: 'first_card',
    name: 'Primer cromo',
    description: 'Pegaste tu primer cromo. Empezó el viaje.',
    category: 'progress',
    rarity: 'common',
    icon_name: 'sparkle',
    unlock_condition: { type: 'card_count', threshold: 1 },
    display_order: 10,
  },
  {
    id: 'cards_10',
    name: '10 cromos',
    description: 'Diez cromos pegados. La cosa empieza a tomar forma.',
    category: 'progress',
    rarity: 'common',
    icon_name: 'stack',
    unlock_condition: { type: 'card_count', threshold: 10 },
    display_order: 20,
  },
  {
    id: 'cards_50',
    name: '50 cromos',
    description: 'La mitad del camino. Avanzando con paso firme.',
    category: 'progress',
    rarity: 'rare',
    icon_name: 'medal',
    unlock_condition: { type: 'card_count', threshold: 50 },
    display_order: 30,
  },
  {
    id: 'cards_100',
    name: '100 cromos',
    description: 'Cien cromos. Hay álbum.',
    category: 'progress',
    rarity: 'rare',
    icon_name: 'trophy',
    unlock_condition: { type: 'card_count', threshold: 100 },
    display_order: 40,
  },
  {
    id: 'cards_full',
    name: 'Álbum completo',
    description: 'Las 205 figuritas. Sos parte de la gloria eterna.',
    category: 'progress',
    rarity: 'legendary',
    icon_name: 'crown',
    unlock_condition: { type: 'card_count', threshold: 205 },
    display_order: 50,
  },

  // Rarity
  {
    id: 'first_rare',
    name: 'Primera Rara',
    description: 'Tu primera carta con foil prismático.',
    category: 'rarity',
    rarity: 'common',
    icon_name: 'gem',
    unlock_condition: { type: 'rarity_obtained', rarity: 'rare' },
    display_order: 100,
  },
  {
    id: 'first_epic',
    name: 'Primera Épica',
    description: 'Tu primera Épica con parallax.',
    category: 'rarity',
    rarity: 'rare',
    icon_name: 'star',
    unlock_condition: { type: 'rarity_obtained', rarity: 'epic' },
    display_order: 110,
  },
  {
    id: 'first_legendary',
    name: 'Primera Legendaria',
    description: 'El primer momento eterno entró a tu álbum.',
    category: 'rarity',
    rarity: 'epic',
    icon_name: 'crown',
    unlock_condition: { type: 'rarity_obtained', rarity: 'legendary' },
    display_order: 120,
  },
  {
    id: 'all_legendaries',
    name: 'Los 11 momentos',
    description: 'Las 11 Legendarias en tu álbum. Tenés todo.',
    category: 'rarity',
    rarity: 'legendary',
    icon_name: 'flame',
    unlock_condition: { type: 'all_legendaries' },
    display_order: 130,
  },

  // Engagement
  {
    id: 'streak_7',
    name: 'Una semana',
    description: '7 días seguidos abriendo el sobre.',
    category: 'engagement',
    rarity: 'common',
    icon_name: 'fire',
    unlock_condition: { type: 'streak', threshold: 7 },
    display_order: 200,
  },
  {
    id: 'streak_30',
    name: 'Un mes entero',
    description: '30 días seguidos. Eso es compromiso.',
    category: 'engagement',
    rarity: 'rare',
    icon_name: 'fire',
    unlock_condition: { type: 'streak', threshold: 30 },
    display_order: 210,
  },
  {
    id: 'streak_100',
    name: 'Cien días',
    description: '100 días consecutivos. Vivís en Cromiks.',
    category: 'engagement',
    rarity: 'epic',
    icon_name: 'fire',
    unlock_condition: { type: 'streak', threshold: 100 },
    display_order: 220,
  },

  // Social
  {
    id: 'first_share',
    name: 'Primer share',
    description: 'Compartiste tu primer cromo.',
    category: 'social',
    rarity: 'common',
    icon_name: 'share',
    unlock_condition: { type: 'share_count', threshold: 1 },
    display_order: 300,
  },
  {
    id: 'first_referral',
    name: 'Primer amigo',
    description: 'Un amigo se sumó por tu invitación.',
    category: 'social',
    rarity: 'rare',
    icon_name: 'users',
    unlock_condition: { type: 'referral_count', threshold: 1 },
    display_order: 310,
  },
  {
    id: 'referrals_10',
    name: '10 invitados',
    description: 'Diez personas se sumaron gracias a vos.',
    category: 'social',
    rarity: 'epic',
    icon_name: 'users',
    unlock_condition: { type: 'referral_count', threshold: 10 },
    display_order: 320,
  },
] as const

async function seedBadges() {
  log('badges', 'sembrando…')

  const { error } = await supabase
    .from('badges')
    .upsert(BADGES as unknown as Record<string, unknown>[], { onConflict: 'id' })

  if (error) {
    console.error(`${red}✗${reset} badges upsert failed:`, error)
    process.exit(1)
  }

  ok(`${BADGES.length} badges sembrados`)
}

// ============================================================
// Run
// ============================================================

async function main() {
  console.info('')
  console.info(`${cyan}━━━ Cromiks seed ━━━${reset}`)
  console.info('')

  const catalog = loadCatalog()

  await seedPages(catalog)
  await seedCards(catalog)
  await seedCardAssets(catalog)
  await seedMissionTemplates()
  await seedBadges()

  console.info('')
  ok('seed completo')
  console.info('')
}

main().catch((err) => {
  console.error(`${red}✗ seed falló:${reset}`, err)
  process.exit(1)
})
