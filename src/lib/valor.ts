import type { Cifra, ResultadoAnalisis } from './analisis'
import { formatoUSD, redondear } from './precios'
import type { Idioma, JustificacionPrecio, ParametrosPrecio } from './tipos'

/**
 * Precio de un módulo a medida por el valor que entrega, no por horas ni por una
 * tabla. Reglas, de la más sólida a la más débil:
 *
 * 1. Valor demostrado: lo que el módulo le recupera al cliente cada mes (suma de
 *    las cifras con fuente de los problemas que solo él resuelve) × los meses de
 *    valor de Ajustes. Sin tope: un módulo que vale mucho cuesta mucho.
 * 2. Sin valor demostrado: un % de la facturación mensual del cliente, solo como
 *    referencia mientras no dé los datos (se avisa y se dice qué preguntar).
 * 3. Piso de rentabilidad: nunca menos de N veces el costo directo del módulo.
 *
 * La IA no pone montos: aquí se calcula todo, igual que las cifras de impacto.
 */

const aDiez = (n: number) => Math.round(n / 10) * 10

/** Lo que cuesta construirlo: semanas de trabajo × costo semanal del equipo. */
export function costoDirecto(semanas: number, p: ParametrosPrecio) {
  return redondear(Math.max(0, semanas) * p.a_medida_costo_semana)
}

export type EntradaPrecio = {
  valor_mensual: number | null
  facturacion_mensual: number | null
  semanas: number
  dolores: string[]
  pregunta: string | null
}

export function precioPorValor(e: EntradaPrecio, p: ParametrosPrecio) {
  const piso = aDiez(costoDirecto(e.semanas, p) * p.a_medida_piso_veces)
  const porValor =
    e.valor_mensual && e.valor_mensual > 0 ? e.valor_mensual * p.a_medida_meses_valor : null
  const porReferencia =
    e.facturacion_mensual && e.facturacion_mensual > 0
      ? (e.facturacion_mensual * p.a_medida_referencia_pct) / 100
      : null

  let metodo: JustificacionPrecio['metodo'] = 'piso'
  let base = 0
  if (porValor !== null) {
    base = aDiez(porValor)
    if (base >= piso) metodo = 'valor'
  } else if (porReferencia !== null) {
    base = aDiez(porReferencia)
    if (base >= piso) metodo = 'referencia'
  }
  const sugerido = Math.max(piso, base)

  const justificacion: JustificacionPrecio = {
    metodo,
    valor_mensual: e.valor_mensual,
    meses: p.a_medida_meses_valor,
    facturacion_mensual: e.facturacion_mensual,
    piso,
    sugerido,
    dolores: e.dolores,
    // Si el precio no sale del valor demostrado, se dice qué preguntar para poder subirlo.
    pregunta: metodo === 'valor' ? null : e.pregunta,
  }
  return { precio: sugerido, justificacion }
}

/** Retorno que ve el cliente para un precio dado: recuperación en meses y veces el primer año. */
export function retornoDelModulo(precio: number, valorMensual: number | null) {
  if (!valorMensual || valorMensual <= 0 || precio <= 0) return null
  return {
    recuperacion_meses: Math.max(1, Math.ceil(precio / valorMensual)),
    retorno_anio: redondear((valorMensual * 12) / precio),
  }
}

export type RetornoModulo = {
  valor_mensual: number
  recuperacion_meses: number
  retorno_anio: number
}

/** "Recupera ~$3.360 al mes · se paga en 6 meses · 2× el primer año". Lo ve el cliente. */
export function fraseRetorno(r: RetornoModulo, idioma: Idioma = 'es') {
  const valor = formatoUSD(r.valor_mensual, idioma)
  const veces = r.retorno_anio.toLocaleString(idioma === 'en' ? 'en-US' : 'es-EC')
  return idioma === 'en'
    ? `Recovers ~${valor}/mo · pays for itself in ${r.recuperacion_meses} ${r.recuperacion_meses === 1 ? 'month' : 'months'} · ${veces}× in year one`
    : `Recupera ~${valor} al mes · se paga en ${r.recuperacion_meses} ${r.recuperacion_meses === 1 ? 'mes' : 'meses'} · ${veces}× el primer año`
}

const norma = (t: string) => t.trim().toLowerCase()

type ModuloIA = NonNullable<ResultadoAnalisis['modulos_a_medida']>[number] & {
  dolores_que_resuelve?: string[]
}

/**
 * Valor mensual de cada módulo a medida, sin cobrar dos veces lo mismo:
 * - un problema que ya resuelve un producto del catálogo no se le atribuye;
 * - un problema que comparten varios módulos se reparte en partes iguales;
 * - solo cuentan las cifras con fuente (los "por cuantificar" no suman).
 */
export function valorPorModulo(a: ResultadoAnalisis) {
  const dolores = new Map(a.dolores.map((d) => [norma(d.titulo), d]))
  const delCatalogo = new Set(
    a.soluciones
      .filter((s) => !s.a_medida && s.codigos_catalogo.length > 0)
      .flatMap((s) => s.dolores_que_resuelve.map(norma)),
  )
  const modulos = (a.modulos_a_medida ?? []) as ModuloIA[]
  const reclamos = new Map<string, number>()
  for (const m of modulos) {
    for (const t of new Set((m.dolores_que_resuelve ?? []).map(norma))) {
      reclamos.set(t, (reclamos.get(t) ?? 0) + 1)
    }
  }

  const salida = new Map<
    string,
    { valor_mensual: number | null; dolores: string[]; pregunta: string | null }
  >()
  for (const m of modulos) {
    let total = 0
    let hayCifra = false
    const titulos: string[] = []
    const preguntas: string[] = []
    for (const t of new Set((m.dolores_que_resuelve ?? []).map(norma))) {
      const dolor = dolores.get(t)
      if (!dolor) continue
      titulos.push(dolor.titulo)
      if (delCatalogo.has(t)) continue
      const cifra: Cifra = dolor.impacto
      if (cifra.valor !== null && cifra.valor > 0) {
        total += cifra.valor / (reclamos.get(t) ?? 1)
        hayCifra = true
      } else if (cifra.pregunta_para_cuantificar) {
        preguntas.push(cifra.pregunta_para_cuantificar)
      }
    }
    salida.set(m.codigo, {
      valor_mensual: hayCifra ? Math.round(total) : null,
      dolores: titulos,
      pregunta: preguntas[0] ?? null,
    })
  }
  return salida
}
