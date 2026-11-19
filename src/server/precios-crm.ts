import 'server-only'
import { env } from '@/lib/env'
import {
  type CondicionCrm,
  type FilaPrecioCrm,
  mapaPreciosCrm,
  type PrecioCrm,
  pautaMinima,
} from '@/lib/precios-crm'

// Lee la Lista de precios pública del CRM (GET /api/publico/precios?marca=AiUDA). Cinco minutos de caché, igual que el CRM.
// Si el CRM no responde, devuelve un mapa vacío y Creator sigue con su tabla (mejor un precio de respaldo que no poder reunirse).
const VIGENCIA_MS = 5 * 60 * 1000
// Una sola lectura trae precios y condiciones (pauta mínima): ambos comparten la caché.
type Lista = { mapa: Map<string, PrecioCrm>; pauta_minima: number | null }
let cache: (Lista & { hasta: number }) | null = null
const VACIA: Lista = { mapa: new Map(), pauta_minima: null }

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

async function listaCrm(): Promise<Lista> {
  if (cache && cache.hasta > Date.now()) return cache
  const origen = origenCrm()
  if (!origen) return VACIA
  try {
    const r = await fetch(`${origen}/api/publico/precios?marca=AiUDA`, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 300 },
    })
    if (!r.ok) throw new Error(String(r.status))
    const j = (await r.json()) as { filas?: FilaPrecioCrm[]; condiciones?: CondicionCrm[] }
    const lista = { mapa: mapaPreciosCrm(j.filas ?? []), pauta_minima: pautaMinima(j.condiciones) }
    cache = { ...lista, hasta: Date.now() + VIGENCIA_MS }
    return lista
  } catch {
    return cache ?? VACIA
  }
}

export async function preciosCrm(): Promise<Map<string, PrecioCrm>> {
  return (await listaCrm()).mapa
}

/** Inversión mínima mensual en anuncios que exige AiUDA (del CRM), o null si el CRM no respondió nunca. */
export async function pautaMinimaCrm(): Promise<number | null> {
  return (await listaCrm()).pauta_minima
}
