import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Rutas públicas: el login, el formulario del cliente (/f), la propuesta
 * compartida (/p) y sus APIs, que se autentican con su propio token.
 */
const PUBLICAS = ['/login', '/f/', '/p/', '/api/publico/', '/brand/']

function cookiesDeSesion(peticion: NextRequest): string[] {
  return peticion.cookies
    .getAll()
    .map((c) => c.name)
    .filter((n) => n.startsWith('sb-'))
}

export async function proxy(peticion: NextRequest) {
  const ruta = peticion.nextUrl.pathname
  if (PUBLICAS.some((p) => ruta === p || ruta.startsWith(p))) return NextResponse.next()

  const respuesta = NextResponse.next({ request: peticion })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll: () => peticion.cookies.getAll(),
        setAll: (nuevas) => {
          for (const { name, value, options } of nuevas) respuesta.cookies.set(name, value, options)
        },
      },
    },
  )

  let haySesion = false
  try {
    const { data, error } = await supabase.auth.getUser()
    haySesion = !error && data.user !== null
  } catch {
    haySesion = false
  }

  if (haySesion) return respuesta

  // Las APIs privadas responden 401; las páginas mandan al login.
  if (ruta.startsWith('/api/')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  // Cookies rotas (token caducado o de otro proyecto): se tiran para no crear bucles.
  const destino = NextResponse.redirect(new URL('/login', peticion.url))
  for (const nombre of cookiesDeSesion(peticion)) destino.cookies.delete(nombre)
  return destino
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*.(?:png|svg|jpg|jpeg|webp|ico)$).*)'],
}
