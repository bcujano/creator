'use client'

import { BookOpen, Calculator, LayoutGrid, LogOut, Plus, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { cx } from './ui'

const ENLACES = [
  { href: '/', texto: 'Levantamientos', icono: LayoutGrid },
  { href: '/admin/catalogo', texto: 'Catálogo', icono: BookOpen },
  { href: '/admin/rentabilidad', texto: 'Rentabilidad', icono: Calculator },
  { href: '/admin/ajustes', texto: 'Ajustes', icono: Settings },
]

export function Navegacion({ marca }: { marca: string }) {
  const ruta = usePathname()
  const router = useRouter()

  async function salir() {
    await supabaseBrowser().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <header className="no-imprimir sticky top-0 z-30 border-b border-borde bg-superficie/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4">
        <Link href="/" className="mr-3 flex items-baseline gap-2">
          <span className="font-titulo text-xl font-extrabold tracking-tight">
            CREATOR<span className="text-marca">.</span>
          </span>
          <span className="hidden text-xs font-medium text-tenue sm:inline">{marca}</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {ENLACES.map(({ href, texto, icono: Icono }) => {
            const activo =
              href === '/' ? ruta === '/' || ruta.startsWith('/l/') : ruta.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cx(
                  'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition',
                  activo
                    ? 'bg-marca/10 text-marca'
                    : 'text-tenue hover:bg-superficie-2 hover:text-tinta',
                )}
              >
                <Icono className="size-4" />
                <span className="hidden md:inline">{texto}</span>
              </Link>
            )
          })}
        </nav>
        <Link
          href="/nuevo"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-marca px-3.5 text-sm font-semibold text-white shadow-sm hover:brightness-110"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nueva reunión</span>
        </Link>
        <button
          type="button"
          onClick={salir}
          title="Cerrar sesión"
          className="anillo-foco inline-flex size-10 items-center justify-center rounded-xl text-tenue hover:bg-superficie-2 hover:text-tinta"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  )
}
