import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

/**
 * Cliente con service_role: ignora RLS por diseño. Solo servidor.
 * Las tablas no tienen políticas, así que este es el único camino a los datos.
 */
let cliente: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin() no puede usarse en el navegador: expondría el service_role.')
  }
  if (!cliente) {
    cliente = createClient(env.supabaseUrl, env.supabaseServiceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cliente
}
