import { createBrowserClient } from '@supabase/ssr'

/** Cliente del navegador: solo para iniciar y cerrar sesión. */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  )
}
