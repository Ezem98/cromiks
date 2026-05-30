import { redirect } from 'next/navigation'

/**
 * El home real vive en "/" (src/app/page.tsx → features/home/components/home.tsx).
 *
 * Esta ruta `/home` quedó como copia huérfana que driftaba del home real. La
 * dejamos como un redirect permanente a "/" para no romper links viejos
 * (router.push('/home'), <Link href="/home">, bookmarks, etc).
 */
export default function HomePage() {
  redirect('/')
}
