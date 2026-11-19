// Precios de AiUDA: la única fuente es el Catálogo de AiUDA del CRM (tabla catalogo_aiuda), que lee la página personal,
// el sitio y la Lista de precios. Creator no edita precios: los lee de ahí en vivo (Byron, 2026-11-02: «un precio se edita en un
// solo lugar»). Su tabla `catalogo` sigue guardando lo propio de Creator (costos, módulos, volumen) y queda de respaldo si el CRM no
// responde. Puro e isomórfico: la lectura HTTP vive en server/precios-crm.ts.
import { formatoUSD } from '@/lib/precios'
import type { Idioma, ItemCatalogo } from '@/lib/tipos'

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

/** Solo lo que AiUDA vende hoy según su catálogo del CRM. Sin respuesta del CRM (mapa vacío) se muestra todo lo de la tabla propia. */
export function soloDeAiuda(
  items: ItemCatalogo[],
  precios: Map<string, PrecioCrm>,
): ItemCatalogo[] {
  return precios.size ? items.filter((i) => precios.has(i.codigo)) : items
}

/** Una fila de `condiciones` de GET /api/publico/precios: lo que el cliente se compromete a hacer, no lo que paga a AiUDA. */
export type CondicionCrm = {
  codigo: string
  nombre?: string
  monto: number
  unidad?: string
  descripcion?: string
}

/**
 * Inversión mínima mensual en anuncios (fila PAUTA_MINIMA del CRM), o null si el CRM no la trae.
 * Regla de dirección general (2026-11-19): sin pauta mínima no se instala; sin anuncios el sistema no recibe pedidos.
 * El monto vive solo en el CRM: aquí nunca se escribe una cifra.
 */
export function pautaMinima(condiciones: CondicionCrm[] | undefined): number | null {
  const fila = (condiciones ?? []).find((c) => c.codigo === 'PAUTA_MINIMA')
  const monto = Number(fila?.monto)
  return monto > 0 ? monto : null
}

/** Pauta mínima congelada al aceptar la propuesta: el monto que regía ese día y la fecha (evento `pauta_minima`). */
export type PautaCongelada = { monto: number; fecha: string }

/**
 * Qué pauta mínima lleva una propuesta. Dirección general (2026-11-19): una propuesta aceptada no cambia sus condiciones al
 * regenerarse. Si se aceptó con la pauta, queda el monto congelado ese día; si se aceptó antes de que existiera (p. ej. Tech
 * Montes, AIU-2026-0130), no la lleva. Las nuevas o no aceptadas usan el monto vigente del CRM.
 */
export function pautaQueAplica(
  estado: string,
  congelada: PautaCongelada | null,
  vigente: number | null,
): PautaCongelada | { monto: number; fecha: null } | null {
  if (estado === 'aceptada') return congelada && congelada.monto > 0 ? congelada : null
  return vigente ? { monto: vigente, fecha: null } : null
}

/**
 * Cómo se le cuenta al cliente la inversión mínima en anuncios: una línea para el resumen de la propuesta y el texto
 * completo para las condiciones. Escrito para el cliente, sin jerga («pauta» se dice «anuncios»).
 */
export function textosPautaMinima(monto: number, idioma: Idioma) {
  const m = formatoUSD(monto, idioma)
  return idioma === 'en'
    ? {
        titulo: 'Minimum monthly ad spend',
        corto: `Minimum ad spend: ${m} a month, from your own ad account`,
        resumen: `For the system to bring you customers, you invest at least ${m} a month in ads, from your own ad account. Your dashboard shows you every month what you invested and what it brought in.`,
        condicion: `Minimum ad spend: ${m} a month. You pay it directly from your own ad account (Meta, Google or another); we do not receive it and it is not included in these prices. The system's results depend on this investment: without ads, few or no new customers arrive. Every month, your dashboard shows you how much you invested and what it brought in.`,
      }
    : {
        titulo: 'Inversión mínima mensual en anuncios',
        corto: `Inversión mínima en anuncios: ${m} al mes, desde su propia cuenta`,
        resumen: `Para que el sistema le traiga clientes, usted invierte al menos ${m} al mes en anuncios, desde su propia cuenta. Su panel le muestra cada mes lo invertido frente a lo que le trajo.`,
        condicion: `Inversión mínima en anuncios: ${m} al mes. La paga usted directamente en su propia cuenta de anuncios (Meta, Google u otra); no la recibimos nosotros ni está incluida en estos precios. Los resultados del sistema dependen de esa inversión: sin anuncios llegan pocos o ningún cliente nuevo. Cada mes, su panel le muestra cuánto invirtió frente a lo que le trajo.`,
      }
}
