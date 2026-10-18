import 'server-only'
import { normalizarAnalisis } from '@/lib/analisis'
import { enfoquesDe, nombreEnfoque } from '@/lib/enfoques'
import { fechaLarga, textos } from '@/lib/i18n'
import { calcularPaquete, type PaqueteCalculado, resolverItem } from '@/lib/precios'
import type {
  Ajustes,
  Cliente,
  DatosPropuesta,
  Idioma,
  ItemCatalogo,
  PaquetePropuesta,
} from '@/lib/tipos'
import { type RetornoModulo, retornoDelModulo } from '@/lib/valor'
import {
  type FilaPropuesta,
  leerAjustes,
  leerAnalisis,
  leerLevantamiento,
  leerPropuesta,
  leerPropuestaPorToken,
  mapaCatalogo,
} from './datos'
import type { ResultadoAnalisis } from './ia/esquema'

/**
 * Todo lo que necesita cualquier salida de la propuesta (presentación,
 * enlace público, PDF, Word, PowerPoint, Excel). Una sola función arma los
 * números para que todos los formatos digan exactamente lo mismo.
 */

export type ItemVisible = {
  codigo: string
  nombre: string
  descripcion: string
  caracteristicas: string[]
  a_medida: boolean
  /** Solo módulos a medida con valor demostrado: lo que recupera el cliente con el precio final. */
  retorno?: RetornoModulo
}

export type PaqueteDocumento = {
  definicion: PaquetePropuesta
  calculo: PaqueteCalculado
  items: ItemVisible[]
  recomendado: boolean
}

export type Documento = {
  idioma: Idioma
  t: ReturnType<typeof textos>
  marca: Ajustes['marca']
  precios: Ajustes['precios']
  cliente: Cliente
  propuesta: FilaPropuesta
  analisis: ResultadoAnalisis | null
  paquetes: PaqueteDocumento[]
  fecha: string
  valida_hasta: string
  recuperacion_meses: number | null
  /** Áreas en que se enfoca el sistema, con su nombre en el idioma del documento. */
  enfoques: string[]
}

export function calcularTodos(
  datos: DatosPropuesta,
  catalogo: Map<string, ItemCatalogo>,
  ajustes: Ajustes,
  idioma: Idioma,
) {
  const totales: Record<string, PaqueteCalculado> = {}
  for (const p of datos.paquetes)
    totales[p.nivel] = calcularPaquete(p, catalogo, ajustes.precios, idioma)
  return totales
}

function itemVisible(item: ItemCatalogo, idioma: Idioma): ItemVisible {
  return {
    codigo: item.codigo,
    nombre: idioma === 'en' ? item.nombre_en : item.nombre_es,
    descripcion: idioma === 'en' ? item.descripcion_en : item.descripcion_es,
    caracteristicas: idioma === 'en' ? item.caracteristicas_en : item.caracteristicas_es,
    a_medida: item.categoria === 'a_medida',
  }
}

async function armar(propuesta: FilaPropuesta, idiomaForzado?: Idioma): Promise<Documento | null> {
  const [ajustes, catalogo, levantamiento, analisis] = await Promise.all([
    leerAjustes(),
    mapaCatalogo(),
    leerLevantamiento(propuesta.levantamiento_id),
    propuesta.analisis_id ? leerAnalisis(propuesta.analisis_id) : Promise.resolve(null),
  ])
  if (!levantamiento) return null
  const idioma = idiomaForzado ?? propuesta.idioma

  const paquetes = propuesta.datos.paquetes
    .filter((p) => p.lineas.length > 0)
    .map((definicion) => ({
      definicion,
      calculo: calcularPaquete(definicion, catalogo, ajustes.precios, idioma),
      items: definicion.lineas.flatMap((l) => {
        const item = resolverItem(l, catalogo, ajustes.precios)
        if (!item) return []
        const visible = itemVisible(item, idioma)
        const justificacion = l.a_medida?.valor
        if (l.a_medida && justificacion?.metodo === 'valor' && justificacion.valor_mensual) {
          const r = retornoDelModulo(
            l.precio_setup ?? l.a_medida.precio_setup,
            justificacion.valor_mensual,
          )
          if (r) visible.retorno = { valor_mensual: justificacion.valor_mensual, ...r }
        }
        return [visible]
      }),
      recomendado: definicion.nivel === propuesta.datos.seleccionado,
    }))

  const resultado: ResultadoAnalisis | null =
    analisis?.estado === 'listo' && analisis.resultado
      ? normalizarAnalisis(analisis.resultado)
      : null
  const elegido = paquetes.find((p) => p.recomendado) ?? paquetes[0]
  const beneficio = resultado
    ? resultado.roi.ahorro_mensual_usd + resultado.roi.ingreso_adicional_mensual_usd
    : 0
  const neto = elegido ? beneficio - elegido.calculo.mensual.total : 0
  const recuperacion =
    elegido && neto > 0 ? Math.max(1, Math.ceil(elegido.calculo.setup.total / neto)) : null

  const creada = new Date(propuesta.creado_en)
  const vence = new Date(creada.getTime() + ajustes.marca.validez_dias * 86_400_000)

  return {
    idioma,
    t: textos(idioma),
    marca: ajustes.marca,
    precios: ajustes.precios,
    cliente: levantamiento.clientes,
    propuesta,
    analisis: resultado,
    paquetes,
    fecha: fechaLarga(creada, idioma),
    valida_hasta: fechaLarga(vence, idioma),
    recuperacion_meses: recuperacion,
    enfoques: enfoquesDe(levantamiento).map((id) => nombreEnfoque(id, idioma)),
  }
}

export async function documentoPorId(id: string, idioma?: Idioma) {
  const propuesta = await leerPropuesta(id)
  return propuesta ? armar(propuesta, idioma) : null
}

export async function documentoPorToken(token: string, idioma?: Idioma) {
  const propuesta = await leerPropuestaPorToken(token)
  return propuesta ? armar(propuesta, idioma) : null
}
