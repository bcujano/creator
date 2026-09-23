import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

/** Cliente ligado a las cookies: solo sirve para saber quién inició sesión. */
export async function supabaseServer() {
  const almacen = await cookies()
  return createServerClient(env.supabaseUrl, env.supabaseAnon, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (cookiesNuevas) => {
        try {
          for (const { name, value, options } of cookiesNuevas) almacen.set(name, value, options)
        } catch {
          // Un Server Component no puede escribir cookies; el refresco lo hace el proxy.
        }
      },
    },
  })
}
