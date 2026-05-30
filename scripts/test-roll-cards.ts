#!/usr/bin/env tsx
/**
 * Cromiks · Test de invariantes de roll_cards (T7 del plan curated-beta-pool)
 *
 * Test de REGRESIÓN del cambio de roll_cards a draw ponderado + filtro de
 * página activa. Llama al RPC ~1000 veces y verifica las dos invariantes que
 * el cambio tiene que garantizar:
 *
 *   1. NUNCA under-fill: cada sobre trae EXACTO p_count cromos.
 *   2. NUNCA inactivo: ningún cromo sale de una página con is_active = false.
 *
 * Además:
 *   - imprime el histograma de rareza (sanity check del knob de pesos).
 *   - verifica el guard: roll_cards sobre un álbum sin cromos activos lanza
 *     'no_active_cards' (no devuelve un sobre vacío en silencio).
 *
 * PRERREQUISITOS: aplicar las migrations 20260530120000/120100/120200 Y activar
 * la página héroe (UPDATE pages SET is_active = true ...) antes de correr esto.
 *
 * Uso:
 *   pnpm tsx scripts/test-roll-cards.ts
 */

import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('❌ Faltan env vars: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ALBUM_ID = 'eterno-diciembre'
const ROLLS = 1000
const PACK_COUNT = 4

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

let failures = 0
const fail = (msg: string) => {
  failures++
  console.error(`  ✗ ${msg}`)
}

async function buildActiveSet(): Promise<Map<string, Rarity>> {
  // Páginas activas
  const { data: pages, error: pagesErr } = await supabase
    .from('pages')
    .select('id')
    .eq('album_id', ALBUM_ID)
    .eq('is_active', true)
  if (pagesErr) throw pagesErr
  const pageIds = (pages ?? []).map((p) => p.id)
  if (pageIds.length === 0) {
    console.error(
      '❌ No hay páginas activas. Activá la página héroe antes de correr el test:\n' +
        "   UPDATE pages SET is_active = true WHERE album_id = 'eterno-diciembre' AND page_number = <N>;",
    )
    process.exit(1)
  }

  const { data: cards, error: cardsErr } = await supabase
    .from('cards')
    .select('id, rarity')
    .eq('album_id', ALBUM_ID)
    .in('page_id', pageIds)
  if (cardsErr) throw cardsErr

  const set = new Map<string, Rarity>()
  for (const c of cards ?? []) set.set(c.id, c.rarity as Rarity)
  return set
}

async function main() {
  console.log(`\nroll_cards invariants — ${ROLLS} rolls × ${PACK_COUNT} cromos\n`)

  const activeSet = await buildActiveSet()
  console.log(`Pool activo: ${activeSet.size} cromos`)

  const histogram: Record<string, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  }
  let totalCards = 0
  let underfills = 0
  let inactiveHits = 0

  for (let i = 0; i < ROLLS; i++) {
    const { data, error } = await supabase.rpc('roll_cards', {
      p_album_id: ALBUM_ID,
      p_count: PACK_COUNT,
    })
    if (error) {
      fail(`roll #${i} devolvió error: ${error.message}`)
      continue
    }
    const ids = (data ?? []) as string[]

    // Invariante 1: exacto p_count
    if (ids.length !== PACK_COUNT) underfills++

    // Invariante 2: nunca inactivo + histograma
    for (const id of ids) {
      totalCards++
      const rarity = activeSet.get(id)
      if (!rarity) {
        inactiveHits++
      } else {
        histogram[rarity]++
      }
    }
  }

  // Invariante 1
  if (underfills > 0)
    fail(`${underfills}/${ROLLS} sobres NO trajeron ${PACK_COUNT} cromos (under-fill)`)
  else console.log(`  ✓ Todos los ${ROLLS} sobres trajeron exacto ${PACK_COUNT} cromos`)

  // Invariante 2
  if (inactiveHits > 0)
    fail(`${inactiveHits} cromos salieron de páginas inactivas / fuera del pool`)
  else console.log(`  ✓ Ningún cromo salió fuera del pool activo (${totalCards} cromos chequeados)`)

  // Histograma (sanity del knob de pesos)
  console.log('\nDistribución de rareza:')
  for (const r of ['common', 'uncommon', 'rare', 'epic', 'legendary'] as Rarity[]) {
    const pct = totalCards ? ((histogram[r] / totalCards) * 100).toFixed(1) : '0.0'
    console.log(`  ${r.padEnd(10)} ${String(histogram[r]).padStart(5)}  (${pct}%)`)
  }

  // Guard: álbum sin cromos activos → no_active_cards
  console.log('\nGuard de pool vacío:')
  const { error: guardErr } = await supabase.rpc('roll_cards', {
    p_album_id: '__no_existe__',
    p_count: PACK_COUNT,
  })
  if (guardErr && /no_active_cards/.test(guardErr.message)) {
    console.log('  ✓ Álbum sin cromos activos lanza no_active_cards (no devuelve sobre vacío)')
  } else if (guardErr) {
    fail(`Se esperaba no_active_cards, llegó: ${guardErr.message}`)
  } else {
    fail('Se esperaba que roll_cards lance no_active_cards sobre un álbum vacío, no lanzó nada')
  }

  console.log('')
  if (failures > 0) {
    console.error(`❌ ${failures} invariante(s) violada(s)`)
    process.exit(1)
  }
  console.log('✅ Todas las invariantes de roll_cards pasaron')
}

main().catch((e) => {
  console.error('❌ Test falló con excepción:', e)
  process.exit(1)
})
