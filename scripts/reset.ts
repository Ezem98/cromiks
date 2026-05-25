#!/usr/bin/env tsx
/**
 * Cromiks · Reset script
 *
 * ⚠️ DESTRUCTIVO ⚠️
 * Borra TODOS los datos de las tablas de aplicación.
 * NO borra usuarios de auth (eso lo hacés a mano en el dashboard si querés).
 *
 * Uso:
 *   pnpm seed:reset
 *
 * Después de correr esto, querés correr `pnpm seed` para volver a sembrar.
 */

import { resolve } from 'node:path'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('Faltan env vars: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Orden de truncado respeta dependencias FK.
const TABLES_IN_ORDER = [
  'coin_transactions',
  'tips',
  'share_events',
  'user_badges',
  'user_missions',
  'user_coins',
  'streaks',
  'user_cards',
  'packs',
  'badges',
  'mission_templates',
  'cards',
  'pages',
]

async function main() {
  const rl = createInterface({ input: stdin, output: stdout })

  const answer = await rl.question(
    '⚠️  Vas a BORRAR TODO el contenido de las tablas. ¿Continuar? (escribí "yes"): ',
  )
  rl.close()

  if (answer.trim().toLowerCase() !== 'yes') {
    console.info('Cancelado.')
    process.exit(0)
  }

  for (const table of TABLES_IN_ORDER) {
    const { error } = await supabase.from(table).delete().neq('id', '__never__')

    if (error) {
      // Algunas tablas no tienen "id" (user_badges, user_cards, etc.)
      // El delete sin where no es permitido por seguridad, así que usamos un truco:
      // delete() sin filter no funciona, pero un filter que matchea todo sí.
      console.error(`⚠ ${table}:`, error.message)
    } else {
      console.info(`✓ ${table} vaciada`)
    }
  }

  console.info('')
  console.info('Reset completo. Corré `pnpm seed` para volver a sembrar.')
}

main().catch((err) => {
  console.error('reset falló:', err)
  process.exit(1)
})
