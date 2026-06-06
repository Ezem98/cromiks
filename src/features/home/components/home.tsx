import { BadgeToastListener } from '@/features/badges/components/badge-toast-listener'
import { getBadgesForUser } from '@/features/badges/queries'
import { assignDailyMissions } from '@/features/home/actions'
import { getHomeData } from '@/features/home/queries'
import { getMissionsForUser } from '@/features/missions/queries'
import { AlbumProgressCard } from './album-progress-card'
import { DailyPackCard } from './daily-pack-card'
import { ExtraPacksCard } from './extra-packs-card'
import { MissionsCard } from './missions-card'
import { StreakCard } from './streak-card'

/**
 * Componente server del Home autenticado.
 *
 * Lo importa app/page.tsx cuando el user está logueado.
 *
 * Lógica:
 *  1. Trae home data (packs, streak, missions, cards)
 *  2. Si no hay misiones activas hoy → asigna 3 random
 *  3. Hidrata misiones con templates (title, description)
 *  4. Render
 */
export async function Home() {
  const data = await getHomeData()
  if (!data) {
    // Layout debería haber redirigido. Si llegamos acá, algo raro.
    return null
  }

  // Si no tiene misiones activas hoy, asignar 3 random. Best-effort: si la
  // asignación falla, la MissionsCard ofrece un reintento en cliente en vez de
  // dejar al user con "recargá la página".
  if (data.missions.length === 0) {
    await assignDailyMissions()
  }

  // Fuente de verdad de las misiones a renderizar. Corre DESPUÉS del assign, así
  // toma las recién creadas. (Antes se refetcheaba todo el home acá, pero el
  // assign solo toca misiones → ese segundo getHomeData era trabajo de más.)
  const missions = await getMissionsForUser()

  // ¿El usuario ya tiene las misiones de hoy asignadas? Con esto la MissionsCard
  // distingue "ya reclamaste todo" (estado done) de "no se asignaron" (reintento):
  // si hay claimables, sí; si no, miramos el conteo del ciclo (incluye claimed).
  const dailyAssigned = missions.length > 0 || data.dailyCycleCount > 0

  // Badges para el listener de notificaciones (toast cuando se desbloquea
  // una nueva). El listener compara contra localStorage en cliente.
  const badges = await getBadgesForUser(data.user.id)

  // Sobres extra (misiones, referidos, etc.). El diario tiene su propia card
  // protagonista arriba, así que lo excluimos de esta lista.
  const extraPacks = data.pendingPacks.filter((p) => p.type !== 'daily')

  return (
    <div className="space-y-8">
      <BadgeToastListener badges={badges} />

      {/* Hero — saludo */}
      <div>
        <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold) mb-1">
          Te estábamos esperando
        </p>
        <h1 className="text-display text-5xl leading-[0.9]">Tu álbum eterno</h1>
      </div>

      {/* Sobre diario — protagonista */}
      {data.dailyPack ? (
        <DailyPackCard
          mode="hasPending"
          packId={data.dailyPack.id}
          currentStreak={data.streak.current_streak}
        />
      ) : data.canClaimDaily ? (
        <DailyPackCard mode="canClaim" currentStreak={data.streak.current_streak} />
      ) : data.nextClaimAt ? (
        <DailyPackCard
          mode="waitingNext"
          nextClaimAt={data.nextClaimAt}
          currentStreak={data.streak.current_streak}
        />
      ) : null}

      {/* Grid de stats — dos datos reales del user (racha + álbum). El placeholder
          "Trades entre amigos" vivía acá ocupando un tercio sin dato; vuelve como
          card real cuando trades exista, no como teaser en la fila prime. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StreakCard
          currentStreak={data.streak.current_streak}
          longestStreak={data.streak.longest_streak}
        />
        <AlbumProgressCard cardsOwned={data.cardsOwned} totalCards={data.totalCards} />
      </div>

      {/* Misiones — ancho completo */}
      <MissionsCard missions={missions} dailyAssigned={dailyAssigned} />

      {/* Sobres extra pendientes (misiones, referidos, etc.) — accionables */}
      {extraPacks.length > 0 && <ExtraPacksCard packs={extraPacks} />}
    </div>
  )
}
