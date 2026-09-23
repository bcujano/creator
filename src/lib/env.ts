/**
 * Variables de entorno leídas bajo demanda: si falta una, el error dice cuál
 * y dónde se pidió, en vez de tumbar el build entero.
 */
function exigir(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor)
    throw new Error(`Falta la variable de entorno ${nombre}. Revisa .env.local (ver .env.example).`)
  return valor
}

export const env = {
  get supabaseUrl() {
    return exigir('NEXT_PUBLIC_SUPABASE_URL')
  },
  get supabaseAnon() {
    return exigir('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  },
  get supabaseServiceRole() {
    return exigir('SUPABASE_SERVICE_ROLE_KEY')
  },
  get adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  },
  get appUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  },
  get anthropicKey() {
    return process.env.ANTHROPIC_API_KEY ?? ''
  },
  get anthropicWorkspace() {
    return process.env.ANTHROPIC_WORKSPACE_ID ?? ''
  },
  get openaiKey() {
    return process.env.OPENAI_API_KEY ?? ''
  },
  get crmUrl() {
    return process.env.CRM_WEBHOOK_URL ?? ''
  },
  get crmSecret() {
    return process.env.CRM_WEBHOOK_SECRET ?? ''
  },
}
