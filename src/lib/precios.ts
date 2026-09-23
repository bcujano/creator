import type {
  Idioma,
  ItemCatalogo,
  LineaPropuesta,
  PaquetePropuesta,
  ParametrosPrecio,
} from './tipos'

/**
 * Motor de precios. Es la única fuente de verdad de cuánto cuesta una
 * propuesta: la IA elige módulos, pero los números los calcula siempre este
 * archivo, con el catálogo y los parámetros vigentes.
 */

export const redondear = (valor: number) => Math.round(valor * 100) / 100

export type LineaCalculada = {
  codigo: string
  nombre: string
  tipo: ItemCatalogo['tipo']
  cantidad: number
  setup: number
  mensual: number
  costo_setup: number
  costo_mensual: number
  /** Código del paquete que ya incluye esta línea (entonces va a $0). */
  incluido_en: string | null
  a_medida: boolean
  volumen: {
    unidad: string
    incluido: number
    estimado: number
    excedente: number
    precio_unidad: number
    cargo: number
    costo: number
  } | null
  desconocido: boolean
}

export type Bloque = {
  subtotal: number
  descuento: number
  base: number
  iva: number
  total: number
}

export type PaqueteCalculado = {
  lineas: LineaCalculada[]
  usuarios: { solicitados: number; incluidos: number; extra: number; cargo: number }
  setup: Bloque
  mensual: Bloque
  costo: { setup: number; mensual: number; infra: number }
  margen: { setup: number; mensual: number; mensual_pct: number; cumple_minimo: boolean }
  primer_anio: number
  semanas: number
}

function bloque(subtotal: number, descuentoPct: number, ivaPct: number): Bloque {
  const descuento = redondear((subtotal * Math.min(Math.max(descuentoPct, 0), 100)) / 100)
  const base = redondear(subtotal - descuento)
  const iva = redondear((base * ivaPct) / 100)
  return { subtotal: redondear(subtotal), descuento, base, iva, total: redondear(base + iva) }
}

export function nombreItem(item: Pick<ItemCatalogo, 'nombre_es' | 'nombre_en'>, idioma: Idioma) {
  return idioma === 'en' ? item.nombre_en : item.nombre_es
}

/**
 * Un módulo a medida se comporta como un ítem de catálogo armado al vuelo.
 * El precio de implementación nunca pasa del tope configurado.
 */
export function itemAMedida(
  linea: LineaPropuesta,
  parametros: ParametrosPrecio,
): ItemCatalogo | undefined {
  const m = linea.a_medida
  if (!m) return undefined
  const setup = Math.min(Math.max(0, m.precio_setup), parametros.a_medida_tope)
  const mensual = Math.max(0, m.precio_mensual)
  return {
    id: linea.codigo,
    codigo: linea.codigo,
    tipo: mensual > 0 ? 'modulo' : 'servicio',
    categoria: 'a_medida',
    nombre_es: m.nombre,
    nombre_en: m.nombre,
    descripcion_es: m.descripcion,
    descripcion_en: m.descripcion,
    caracteristicas_es: m.entregables,
    caracteristicas_en: m.entregables,
    resuelve: [],
    incluye: [],
    precio_setup: setup,
    precio_mensual: mensual,
    costo_setup: redondear((setup * parametros.a_medida_costo_pct) / 100),
    costo_mensual: redondear((mensual * parametros.a_medida_costo_pct) / 100),
    usuarios_incluidos: 0,
    volumen: null,
    semanas: Math.max(0, Math.round(m.semanas)),
    estado: 'listo',
    activo: true,
    orden: 999,
  }
}

/** El ítem de una línea: del catálogo o, si es a medida, armado desde la línea. */
export function resolverItem(
  linea: LineaPropuesta,
  catalogo: Map<string, ItemCatalogo>,
  parametros: ParametrosPrecio,
) {
  return linea.a_medida ? itemAMedida(linea, parametros) : catalogo.get(linea.codigo)
}

export function calcularPaquete(
  paquete: PaquetePropuesta,
  catalogo: Map<string, ItemCatalogo>,
  parametros: ParametrosPrecio,
  idioma: Idioma = 'es',
): PaqueteCalculado {
  // Qué módulos ya vienen dentro de algún paquete de esta misma propuesta.
  const incluidoPor = new Map<string, string>()
  for (const linea of paquete.lineas) {
    const item = resolverItem(linea, catalogo, parametros)
    if (item?.tipo === 'paquete') {
      for (const codigo of item.incluye)
        if (!incluidoPor.has(codigo)) incluidoPor.set(codigo, item.codigo)
    }
  }

  const lineas: LineaCalculada[] = paquete.lineas.map((linea) => {
    const item = resolverItem(linea, catalogo, parametros)
    const cantidad = Math.max(1, Math.round(linea.cantidad || 1))
    if (!item) {
      return {
        codigo: linea.codigo,
        nombre: linea.codigo,
        tipo: 'modulo',
        cantidad,
        setup: 0,
        mensual: 0,
        costo_setup: 0,
        costo_mensual: 0,
        incluido_en: null,
        a_medida: false,
        volumen: null,
        desconocido: true,
      }
    }

    const incluido_en = incluidoPor.get(item.codigo) ?? null
    // El tope de un desarrollo a medida también aplica al negociar el precio.
    const precioSetup = linea.a_medida
      ? Math.min(linea.precio_setup ?? item.precio_setup, parametros.a_medida_tope)
      : (linea.precio_setup ?? item.precio_setup)
    const precioMensual = linea.precio_mensual ?? item.precio_mensual

    let volumen: LineaCalculada['volumen'] = null
    if (item.volumen && !incluido_en) {
      const v = item.volumen
      const estimado = Math.max(0, paquete.volumen[item.codigo] ?? v.incluido)
      const excedente = Math.max(0, estimado - v.incluido * cantidad)
      volumen = {
        unidad: idioma === 'en' ? v.unidad_en : v.unidad_es,
        incluido: v.incluido * cantidad,
        estimado,
        excedente,
        precio_unidad: v.precio_excedente,
        cargo: redondear(excedente * v.precio_excedente),
        costo: redondear(excedente * v.costo_unitario),
      }
    }

    return {
      codigo: item.codigo,
      nombre: nombreItem(item, idioma),
      tipo: item.tipo,
      cantidad,
      setup: incluido_en ? 0 : redondear(precioSetup * cantidad),
      mensual: incluido_en ? 0 : redondear(precioMensual * cantidad),
      costo_setup: incluido_en ? 0 : redondear(item.costo_setup * cantidad),
      costo_mensual: incluido_en ? 0 : redondear(item.costo_mensual * cantidad),
      incluido_en,
      a_medida: Boolean(linea.a_medida),
      volumen,
      desconocido: false,
    }
  })

  const items = paquete.lineas
    .map((l) => resolverItem(l, catalogo, parametros))
    .filter((i): i is ItemCatalogo => Boolean(i))

  // Usuarios: los incluye el paquete más grande; los módulos sueltos no cobran por usuario.
  const incluidos = Math.max(
    0,
    ...items.map((i) => (i.tipo === 'paquete' ? i.usuarios_incluidos : 0)),
  )
  const solicitados = Math.max(0, Math.round(paquete.usuarios || 0))
  const extra = incluidos > 0 ? Math.max(0, solicitados - incluidos) : 0
  const cargoUsuarios = redondear(extra * parametros.precio_usuario_extra)

  const setupSubtotal = lineas.reduce((s, l) => s + l.setup, 0)
  const mensualSubtotal =
    lineas.reduce((s, l) => s + l.mensual + (l.volumen?.cargo ?? 0), 0) + cargoUsuarios

  // Sin un paquete que ya cubra la plataforma, la infraestructura base es costo propio.
  const hayMensual = mensualSubtotal > 0
  const tienePaquete = items.some((i) => i.tipo === 'paquete')
  const infra = hayMensual && !tienePaquete ? parametros.costo_infra_base : 0

  const costoSetup = redondear(lineas.reduce((s, l) => s + l.costo_setup, 0))
  const costoMensual = redondear(
    lineas.reduce((s, l) => s + l.costo_mensual + (l.volumen?.costo ?? 0), 0) + infra,
  )

  const setup = bloque(setupSubtotal, paquete.descuento_setup_pct, parametros.iva_pct)
  const mensual = bloque(mensualSubtotal, paquete.descuento_mensual_pct, parametros.iva_pct)

  const margenMensual = redondear(mensual.base - costoMensual)

  return {
    lineas,
    usuarios: { solicitados, incluidos, extra, cargo: cargoUsuarios },
    setup,
    mensual,
    costo: { setup: costoSetup, mensual: costoMensual, infra },
    margen: {
      setup: redondear(setup.base - costoSetup),
      mensual: margenMensual,
      mensual_pct: mensual.base > 0 ? redondear((margenMensual / mensual.base) * 100) : 0,
      cumple_minimo: !hayMensual || margenMensual >= parametros.margen_minimo_mensual,
    },
    primer_anio: redondear(setup.base + mensual.base * 12),
    // Las líneas incluidas corren en paralelo con su paquete: manda la más larga.
    semanas: Math.max(0, ...items.map((i) => i.semanas)),
  }
}

// ---------------------------------------------------------------------------
// Simulador: ¿cuánto ganaría con cada modelo de cobro?
// ---------------------------------------------------------------------------

export type ModeloCobro = {
  clave: 'modulos' | 'usuario' | 'volumen'
  nombre: string
  explicacion: string
  ingreso_mensual: number
  margen_mensual: number
  cumple_minimo: boolean
}

export function compararModelos(
  calculado: PaqueteCalculado,
  parametros: ParametrosPrecio,
): ModeloCobro[] {
  const costo = calculado.costo.mensual
  const usuarios = Math.max(1, calculado.usuarios.solicitados)

  // Por volumen: cuota base + todo el uso cobrado desde la primera unidad.
  const usoTotal = calculado.lineas.reduce((s, l) => {
    if (!l.volumen) return s
    return s + l.volumen.estimado * l.volumen.precio_unidad
  }, 0)
  const tarifaVolumen = calculado.lineas.some((l) => l.volumen)
    ? parametros.modelo_volumen_base + usoTotal
    : parametros.modelo_volumen_base

  const modelos: Omit<ModeloCobro, 'margen_mensual' | 'cumple_minimo'>[] = [
    {
      clave: 'modulos',
      nombre: 'Por módulos + volumen (híbrido)',
      explicacion: 'Mensualidad por cada módulo, usuarios extra y excedentes de uso.',
      ingreso_mensual: calculado.mensual.base,
    },
    {
      clave: 'usuario',
      nombre: 'Solo por usuario',
      explicacion: `${usuarios} usuario(s) × $${parametros.modelo_por_usuario}/mes. El costo de IA y voz no se recupera si usan mucho.`,
      ingreso_mensual: redondear(usuarios * parametros.modelo_por_usuario),
    },
    {
      clave: 'volumen',
      nombre: 'Solo por volumen',
      explicacion: `Cuota base $${parametros.modelo_volumen_base} + cada minuto o conversación cobrado desde el primero.`,
      ingreso_mensual: redondear(tarifaVolumen),
    },
  ]

  return modelos.map((m) => {
    const margen = redondear(m.ingreso_mensual - costo)
    return {
      ...m,
      margen_mensual: margen,
      cumple_minimo: margen >= parametros.margen_minimo_mensual,
    }
  })
}

export function formatoUSD(valor: number, idioma: Idioma = 'es') {
  return new Intl.NumberFormat(idioma === 'en' ? 'en-US' : 'es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: valor % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(valor)
}
