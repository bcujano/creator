// Precios de AiUDA: la única fuente es el Catálogo de AiUDA del CRM (tabla catalogo_aiuda), que lee la página personal,
// el sitio y la Lista de precios. Creator no edita precios: los lee de ahí en vivo (Byron, 2026-11-02: «un precio se edita en un
// solo lugar»). Su tabla `catalogo` sigue guardando lo propio de Creator (costos, módulos, volumen) y queda de respaldo si el CRM no
// responde. Puro e isomórfico: la lectura HTTP vive en server/precios-crm.ts.
import type { ItemCatalogo } from '@/lib/tipos'

/** Una fila de GET /api/publico/precios del CRM (solo lo que Creator usa). */
export type FilaPrecioCrm = {
  codigo: string
  marca: string
  modalidad: string
  valor: number
  mensual: number | null
}

export type PrecioCrm = { setup: number; mensual: number }

/** codigo → instalación y mensualidad, solo de AiUDA. Una mensualidad sola (sin instalación) llega como modalidad «mensual». */
export function mapaPreciosCrm(filas: FilaPrecioCrm[]): Map<string, PrecioCrm> {
  const m = new Map<string, PrecioCrm>()
  for (const f of filas) {
    if (f.marca !== 'AiUDA' || !f.codigo || !(Number(f.valor) > 0)) continue
    m.set(
      f.codigo,
      f.modalidad === 'mensual'
        ? { setup: 0, mensual: Number(f.valor) }
        : { setup: Number(f.valor), mensual: Number(f.mensual) || 0 },
    )
  }
  return m
}

/** El ítem con el precio del CRM, si el CRM lo tiene; si no, tal cual (respaldo de la tabla propia). */
export function conPrecioCrm(item: ItemCatalogo, precios: Map<string, PrecioCrm>): ItemCatalogo {
  const p = precios.get(item.codigo)
  return p
    ? { ...item, precio_setup: p.setup, precio_mensual: p.mensual, precio_del_crm: true }
    : item
}
