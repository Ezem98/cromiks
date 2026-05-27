import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { assignDailyMissions } from '@/features/home/actions'
import { AlbumProgressCard } from '@/features/home/components/album-progress-card'
import { DailyPackCard } from '@/features/home/components/daily-pack-card'
import { ErrorToast } from '@/features/home/components/error-toast'
import { MissionsCard } from '@/features/home/components/missions-card'
import { StreakCard } from '@/features/home/components/streak-card'
import { getHomeData } from '@/features/home/queries'
import { getMissionsForUser } from '@/features/missions/queries'

export const metadata: Metadata = {
  title: 'Inicio',
}

type HomePageProps = {
  searchParams: Promise<{ error?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { error } = await searchParams
  const data = await getHomeData()

  if (!data) {
    redirect('/signin')
  }

  // Si no tiene misiones activas hoy, asignar 3 random.
  // El refetch antes era `getHomeData()` completo, pero esos campos ya no se
  // re-leen — el único consumidor real de las misiones es getMissionsForUser
  // que se llama abajo. Por eso solo necesitamos llamar al assign y dejar que
  // getMissionsForUser traiga las recién creadas (B-06).
  if (data.missions.length === 0) {
    await assignDailyMissions()
  }

  const missions = await getMissionsForUser()

  return <HomeContent data={data} missions={missions} errorCode={error ?? null} />
}

async function HomeContent({
  data,
  missions,
  errorCode,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getHomeData>>>
  missions: Awaited<ReturnType<typeof getMissionsForUser>>
  errorCode: string | null
}) {
  return (
    <div className="space-y-8">
      <ErrorToast code={errorCode} />
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
        <div>
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
