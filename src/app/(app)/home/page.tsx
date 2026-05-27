import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { assignDailyMissions } from '@/features/home/actions'
import { AlbumProgressCard } from '@/features/home/components/album-progress-card'
import { DailyPackCard } from '@/features/home/components/daily-pack-card'
import { MissionsCard } from '@/features/home/components/missions-card'
import { StreakCard } from '@/features/home/components/streak-card'
import { getHomeData } from '@/features/home/queries'
import { getMissionsForUser } from '@/features/missions/queries'

export const metadata: Metadata = {
  title: 'Inicio',
}

export default async function HomePage() {
  let data = await getHomeData()

  if (!data) {
    redirect('/signin')
  }

  // Si no tiene misiones activas hoy, asignar 3 random.
  // El render del componente las muestra una vez que están en DB.
  if (data.missions.length === 0) {
    await assignDailyMissions()
    const refreshed = await getHomeData()
    if (refreshed) data = refreshed
  }

  const missions = await getMissionsForUser()

  return <HomeContent data={data} missions={missions} />
}

async function HomeContent({
  data,
  missions,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getHomeData>>>
  missions: Awaited<ReturnType<typeof getMissionsForUser>>
}) {
  return (
    <div className="space-y-8">
      {/* Hero — saludo */}
      <div>
        <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-gold mb-1">
          Bienvenido de vuelta
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
          <div className="rounded-[16px] bg-surface-raised border border-white/6 p-6 h-full">
            <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted) mb-4">
              Próximamente
            </p>
            <div className="text-display text-2xl text-text-secondary leading-tight">
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
        <div className="rounded-[16px] bg-surface-raised border border-white/6 p-6">
          <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted) mb-3">
            Otros sobres pendientes
          </p>
          <p className="text-text-secondary text-sm">
            Tenés {data.pendingPacks.filter((p) => p.type !== 'daily').length} sobre(s) extra de
            misiones o referrals esperando.
          </p>
        </div>
      )}
    </div>
  )
}
