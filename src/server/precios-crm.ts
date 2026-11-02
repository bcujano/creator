import 'server-only'
import { env } from '@/lib/env'
import { type FilaPrecioCrm, mapaPreciosCrm, type PrecioCrm } from '@/lib/precios-crm'

// Lee la Lista de precios pública del CRM (GET /api/publico/precios?marca=AiUDA). Cinco minutos de caché, igual que el CRM.
// Si el CRM no responde, devuelve un mapa vacío y Creator sigue con su tabla (mejor un precio de respaldo que no poder reunirse).
const VIGENCIA_MS = 5 * 60 * 1000
let cache: { mapa: Map<string, PrecioCrm>; hasta: number } | null = null

/** Origen del CRM: CRM_URL o, si no está, el de CRM_WEBHOOK_URL. */
export function origenCrm(): string {
  const directo = process.env.CRM_URL
  if (directo) return directo.replace(/\/$/, '')
  try {
    return env.crmUrl ? new URL(env.crmUrl).origin : ''
  } catch {
    return ''
  }
}

export async function preciosCrm(): Promise<Map<string, PrecioCrm>> {
  if (cache && cache.hasta > Date.now()) return cache.mapa
  const origen = origenCrm()
  if (!origen) return new Map()
  try {
    const r = await fetch(`${origen}/api/publico/precios?marca=AiUDA`, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 300 },
    })
    if (!r.ok) throw new Error(String(r.status))
    const j = (await r.json()) as { filas?: FilaPrecioCrm[] }
    const mapa = mapaPreciosCrm(j.filas ?? [])
    cache = { mapa, hasta: Date.now() + VIGENCIA_MS }
    return mapa
  } catch {
    return cache?.mapa ?? new Map()
  }
}
