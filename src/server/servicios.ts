import 'server-only'
import { normalizarAnalisis } from '@/lib/analisis'
import type { DatosPropuesta, Idioma } from '@/lib/tipos'
import { enviarAlCrm } from './crm'
import {
  actualizarLevantamiento,
  cerrarAnalisis,
  crearAnalisis,
  crearPropuesta,
  leerAjustes,
  leerCatalogo,
  leerLevantamiento,
  listarInsumos,
  mapaCatalogo,
  registrarEvento,
} from './datos'
import { calcularTodos } from './documento'
import { NoEncontrado } from './http'
import { analizar, construirEntrada, propuestaDesdeAnalisis } from './ia/analizar'

/** Guarda una versión nueva de la propuesta con los totales congelados. */
export async function guardarPropuesta(
  levantamientoId: string,
  datos: DatosPropuesta,
  analisisId: string | null,
  idioma: Idioma,
) {
  const [ajustes, catalogo, levantamiento] = await Promise.all([
    leerAjustes(),
    mapaCatalogo(),
    leerLevantamiento(levantamientoId),
  ])
  if (!levantamiento) throw new NoEncontrado('Levantamiento')
  const totales = calcularTodos(datos, catalogo, ajustes, idioma)
  const propuesta = await crearPropuesta({
    levantamiento_id: levantamientoId,
    analisis_id: analisisId,
    idioma,
    datos,
    totales,
  })
  if (levantamiento.estado === 'recolectando' || levantamiento.estado === 'analizado') {
    await actualizarLevantamiento(levantamientoId, { estado: 'propuesta' })
  }

  let crm: Awaited<ReturnType<typeof enviarAlCrm>> | null = null
  if (ajustes.crm.activo && ajustes.crm.enviar_al_crear_propuesta) {
    crm = await enviarAlCrm(ajustes, levantamiento.clientes, propuesta)
  }
  return { propuesta, crm }
}

/**
 * Corre el análisis completo: congela la entrada, llama a la IA, guarda el
 * resultado como versión nueva y arma el primer borrador de propuesta.
 */
export async function ejecutarAnalisis(levantamientoId: string) {
  const [ajustes, catalogo, levantamiento, insumos] = await Promise.all([
    leerAjustes(),
    leerCatalogo({ soloActivos: true }),
    leerLevantamiento(levantamientoId),
    listarInsumos(levantamientoId),
  ])
  if (!levantamiento) throw new NoEncontrado('Levantamiento')

  const entrada = construirEntrada(levantamiento, insumos, catalogo)
  const modelo =
    ajustes.ia.proveedor === 'openai' ? ajustes.ia.modelo_openai : ajustes.ia.modelo_anthropic
  const fila = await crearAnalisis({
    levantamiento_id: levantamientoId,
    proveedor: ajustes.ia.proveedor,
    modelo,
    entrada,
  })

  try {
    const r = await analizar(ajustes, levantamiento, entrada)
    await cerrarAnalisis(fila.id, {
      resultado: normalizarAnalisis(r.datos),
      uso: r.uso,
      estado: 'listo',
      modelo: r.modelo,
      proveedor: r.proveedor,
    })
    await actualizarLevantamiento(levantamientoId, { estado: 'analizado' })
    await registrarEvento('analisis', fila.id, 'completado', {
      levantamiento_id: levantamientoId,
      version: fila.version,
      proveedor: r.proveedor,
    })
    const mapa = await mapaCatalogo()
    const datos = propuestaDesdeAnalisis(r.datos, mapa, ajustes.precios)
    const { propuesta } = await guardarPropuesta(
      levantamientoId,
      datos,
      fila.id,
      levantamiento.idioma,
    )
    return { analisisId: fila.id, version: fila.version, propuestaId: propuesta.id }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    await cerrarAnalisis(fila.id, { estado: 'error', error: mensaje.slice(0, 2000) })
    await registrarEvento('analisis', fila.id, 'error', {
      levantamiento_id: levantamientoId,
      mensaje,
    })
    throw error
  }
}
