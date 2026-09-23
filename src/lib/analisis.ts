import type { FactorIA, ResultadoIA } from '@/server/ia/esquema'
import type { Idioma } from './tipos'

/**
 * Las cifras de impacto y retorno las calcula este archivo, no la IA. La IA
 * solo aporta factores con su fuente; aquí se multiplican y se aplican las
 * reglas para no inventar nada:
 *
 * 1. Sin factores, no hay cifra: queda "por cuantificar" con la pregunta que falta.
 * 2. Al menos un factor debe venir del cliente o del consultor.
 * 3. Nunca un monto en dólares supuesto: precios, tickets y costos se preguntan.
 * 4. Como máximo un supuesto por cálculo, y debe estar justificado.
 */

export type Factor = FactorIA

export type Confianza = 'dato' | 'estimado' | 'sin_desglose'

export type Cifra = {
  factores: Factor[]
  valor: number | null
  confianza: Confianza | null
  pregunta_para_cuantificar: string | null
  /** Por qué no se calculó, si no se calculó. */
  descartado: string | null
}

type Calculo = { factores: Factor[]; pregunta_para_cuantificar: string | null }

type DolorIA = ResultadoIA['dolores'][number]

export type Dolor = Omit<DolorIA, 'impacto'> & {
  impacto: Cifra
  /** Atajo para renderizar: el valor calculado o null. */
  impacto_mensual_usd: number | null
}

export type ComponenteRoi = { concepto: string; tipo: 'ahorro' | 'ingreso'; calculo: Cifra }

export type ResultadoAnalisis = Omit<ResultadoIA, 'dolores' | 'roi'> & {
  dolores: Dolor[]
  roi: {
    componentes: ComponenteRoi[]
    horas: Cifra
    explicacion: string
    ahorro_mensual_usd: number
    ingreso_adicional_mensual_usd: number
    horas_ahorradas_mes: number
  }
}

/** Porcentajes siempre como fracción, aunque la IA mande 20 en vez de 0.2. */
function valorReal(f: Factor) {
  return f.unidad === 'porcentaje' && f.valor > 1 ? f.valor / 100 : f.valor
}

export function calcular(c: Calculo | null | undefined, redondeo = 1): Cifra {
  const factores = c?.factores ?? []
  const pregunta = c?.pregunta_para_cuantificar ?? null
  const vacio = (descartado: string | null): Cifra => ({
    factores,
    valor: null,
    confianza: null,
    pregunta_para_cuantificar: pregunta,
    descartado,
  })

  if (factores.length === 0) return vacio(null)
  if (!factores.some((f) => f.fuente !== 'supuesto')) {
    return vacio('Ningún factor viene de lo que dijo el cliente.')
  }
  const dineroSupuesto = factores.find((f) => f.fuente === 'supuesto' && f.unidad === 'usd')
  if (dineroSupuesto) {
    return vacio(`No se supone dinero: falta el dato real de "${dineroSupuesto.concepto}".`)
  }
  const supuestos = factores.filter((f) => f.fuente === 'supuesto')
  if (supuestos.length > 1) {
    return vacio(`Demasiados supuestos (${supuestos.map((s) => s.concepto).join(', ')}).`)
  }
  if (factores.some((f) => !Number.isFinite(f.valor) || f.valor < 0)) {
    return vacio('Hay un factor con un valor no válido.')
  }

  const producto = factores.reduce((acc, f) => acc * valorReal(f), 1)
  return {
    factores,
    valor: Math.round(producto / redondeo) * redondeo,
    confianza: supuestos.length ? 'estimado' : 'dato',
    pregunta_para_cuantificar: pregunta,
    descartado: null,
  }
}

type Legado = { impacto_mensual_usd?: number | null }
type RoiLegado = {
  ahorro_mensual_usd?: number
  ingreso_adicional_mensual_usd?: number
  horas_ahorradas_mes?: number
  explicacion?: string
}

/** Cifra de un análisis anterior, que no traía desglose. */
function legado(valor: number | null | undefined): Cifra {
  return {
    factores: [],
    valor: valor ?? null,
    confianza: valor ? 'sin_desglose' : null,
    pregunta_para_cuantificar: null,
    descartado: null,
  }
}

/**
 * Convierte la salida de la IA (o un análisis guardado, incluso de versiones
 * anteriores) en el formato que muestran todas las pantallas y archivos.
 */
export function normalizarAnalisis(bruto: unknown): ResultadoAnalisis {
  const r = bruto as ResultadoIA & {
    dolores: (DolorIA & Legado)[]
    roi: ResultadoIA['roi'] & RoiLegado
  }

  const dolores: Dolor[] = r.dolores.map((original) => {
    const d = original as DolorIA & Legado
    const impacto = d.impacto ? calcular(d.impacto) : legado(d.impacto_mensual_usd)
    return { ...d, impacto, impacto_mensual_usd: impacto.valor }
  })

  let componentes: ComponenteRoi[]
  let horas: Cifra
  if (Array.isArray(r.roi.componentes)) {
    componentes = r.roi.componentes.map((c) => ({
      concepto: c.concepto,
      tipo: c.tipo,
      calculo: calcular(c.calculo as unknown as Calculo),
    }))
    // Ya normalizado (leído de la base): las horas viven en roi.horas.
    horas = calcular(r.roi.horas_liberadas ?? (r.roi as unknown as { horas?: Calculo }).horas, 1)
  } else {
    componentes = [
      { concepto: 'Ahorro', tipo: 'ahorro', calculo: legado(r.roi.ahorro_mensual_usd) },
      {
        concepto: 'Ingreso adicional',
        tipo: 'ingreso',
        calculo: legado(r.roi.ingreso_adicional_mensual_usd),
      },
    ]
    horas = legado(r.roi.horas_ahorradas_mes)
  }

  const suma = (tipo: 'ahorro' | 'ingreso') =>
    componentes.filter((c) => c.tipo === tipo).reduce((s, c) => s + (c.calculo.valor ?? 0), 0)

  return {
    ...r,
    dolores,
    roi: {
      componentes,
      horas,
      explicacion: r.roi.explicacion ?? '',
      ahorro_mensual_usd: suma('ahorro'),
      ingreso_adicional_mensual_usd: suma('ingreso'),
      horas_ahorradas_mes: horas.valor ?? 0,
    },
  }
}

// ---------------------------------------------------------------------------
// Presentación de la cuenta
// ---------------------------------------------------------------------------

function numero(n: number, idioma: Idioma) {
  return n.toLocaleString(idioma === 'en' ? 'en-US' : 'es-EC', { maximumFractionDigits: 2 })
}

export function factorTexto(f: Factor, idioma: Idioma = 'es') {
  const v = valorReal(f)
  if (f.unidad === 'usd') return `$${numero(v, idioma)} ${f.concepto}`
  if (f.unidad === 'porcentaje')
    return `${numero(Math.round(v * 1000) / 10, idioma)}% ${f.concepto}`
  if (f.unidad === 'horas') {
    return /hora|hour/i.test(f.concepto)
      ? `${numero(v, idioma)} ${f.concepto}`
      : `${numero(v, idioma)} h ${f.concepto}`
  }
  if (f.unidad === 'meses')
    return `${numero(v, idioma)} ${idioma === 'en' ? 'mo' : 'meses'} ${f.concepto}`
  return `${numero(v, idioma)} ${f.concepto}`
}

/** "3 inquilinos atrasados × $250 renta promedio × 20% que no se recupera" */
export function formula(c: Cifra, idioma: Idioma = 'es') {
  return c.factores.map((f) => factorTexto(f, idioma)).join(' × ')
}

export function etiquetaConfianza(c: Cifra, idioma: Idioma = 'es') {
  const es = {
    dato: 'Con tus datos',
    estimado: 'Estimado: incluye un supuesto',
    sin_desglose: 'Estimación sin desglose',
  }
  const en = {
    dato: 'Based on your data',
    estimado: 'Estimate: includes one assumption',
    sin_desglose: 'Estimate without breakdown',
  }
  return c.confianza ? (idioma === 'en' ? en : es)[c.confianza] : ''
}
