import { env } from '@/lib/env'
import { supabaseServer } from '@/lib/supabase/server'

export type Sesion = { userId: string; email: string }

/**
 * Devuelve la sesión solo si el usuario es válido y su correo está en
 * ADMIN_EMAILS. Nunca lanza: ante cualquier duda, es un anónimo.
 */
export async function verificarSesion(): Promise<Sesion | null> {
  try {
    const supabase = await supabaseServer()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user?.email) return null
    const email = data.user.email.toLowerCase()
    if (!env.adminEmails.includes(email)) return null
    return { userId: data.user.id, email }
  } catch {
    return null
  }
}

export class NoAutorizado extends Error {
  constructor() {
    super('No autorizado')
  }
}

export async function exigirSesion(): Promise<Sesion> {
  const sesion = await verificarSesion()
  if (!sesion) throw new NoAutorizado()
  return sesion
}
