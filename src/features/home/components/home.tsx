import { BadgeToastListener } from '@/features/badges/components/badge-toast-listener'
import { getBadgesForUser } from '@/features/badges/queries'
import { assignDailyMissions } from '@/features/home/actions'
import { getHomeData } from '@/features/home/queries'
import { getMissionsForUser } from '@/features/missions/queries'
import { AlbumProgressCard } from './album-progress-card'
import { DailyPackCard } from './daily-pack-card'
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
  let data = await getHomeData()
  if (!data) {
    // Layout debería haber redirigido. Si llegamos acá, algo raro.
    return null
  }

  // Si no tiene misiones activas hoy, asignar 3 random.
  if (data.missions.length === 0) {
    await assignDailyMissions()
    const refreshed = await getHomeData()
    if (refreshed) data = refreshed
  }

  // Trae misiones con sus templates joineados + reward info.
  // Reemplaza el patrón viejo de 2 queries separadas.
  const missions = await getMissionsForUser()

  // Badges para el listener de notificaciones (toast cuando se desbloquea
  // una nueva). El listener compara contra localStorage en cliente.
  const badges = await getBadgesForUser(data.user.id)

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

      {/* Grid de stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StreakCard
          currentStreak={data.streak.current_streak}
          longestStreak={data.streak.longest_streak}
        />
        <AlbumProgressCard cardsOwned={data.cardsOwned} totalCards={data.totalCards} />
        <div className="sm:col-span-1 col-span-1">
          {/* Mini placeholder de balance de monedas — se va a usar más adelante */}
          <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6 h-full">
            <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted) mb-4">
              Próximamente
            </p>
            <div className="text-display text-2xl text-(--color-text-secondary) leading-tight">
              Trades
              <br />
              entre amigos
            </div>
            <p className="text-(--color-text-muted) text-sm mt-3">
              Pronto vas a poder intercambiar repetidas con tus amigos.
            </p>
          </div>
        </div>
      </div>

      {/* Misiones — ancho completo */}
      <MissionsCard missions={missions} />

      {/* Sobres extra pendientes (si hay más de daily) */}
      {data.pendingPacks.filter((p) => p.type !== 'daily').length > 0 && (
        <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6">
          <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted) mb-3">
            Otros sobres pendientes
          </p>
          <p className="text-(--color-text-secondary) text-sm">
            Tenés {data.pendingPacks.filter((p) => p.type !== 'daily').length} sobre(s) extra de
            misiones o referrals esperando.
          </p>
        </div>
      )}
    </div>
  )
}
