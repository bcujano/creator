import 'server-only'
import { AJUSTES_DEFECTO } from '@/lib/ajustes-defecto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type {
  Ajustes,
  Cliente,
  DatosPropuesta,
  Insumo,
  ItemCatalogo,
  Levantamiento,
} from '@/lib/tipos'

/**
 * Acceso a datos. Todo pasa por aquí con service_role; las rutas ya
 * verificaron la sesión (o el token público) antes de llamar.
 */

function db() {
  return supabaseAdmin()
}

function falla(contexto: string, error: { message: string } | null): never {
  throw new Error(`${contexto}: ${error?.message ?? 'sin datos'}`)
}

export async function registrarEvento(
  entidad: string,
  entidadId: string,
  accion: string,
  datos: Record<string, unknown> = {},
) {
  // La bitácora nunca debe tumbar la operación principal.
  const { error } = await db()
    .from('eventos')
    .insert({ entidad, entidad_id: entidadId, accion, datos })
  if (error) console.error('[eventos]', error.message)
}

// ------------------------------- Ajustes -----------------------------------

export async function leerAjustes(): Promise<Ajustes> {
  const { data, error } = await db().from('ajustes').select('*').eq('id', 1).maybeSingle()
  if (error) falla('leerAjustes', error)
  return {
    marca: { ...AJUSTES_DEFECTO.marca, ...(data?.marca ?? {}) },
    precios: { ...AJUSTES_DEFECTO.precios, ...(data?.precios ?? {}) },
    ia: { ...AJUSTES_DEFECTO.ia, ...(data?.ia ?? {}) },
    crm: { ...AJUSTES_DEFECTO.crm, ...(data?.crm ?? {}) },
  }
}

export async function guardarAjustes(
  parcial: {
    [K in keyof Ajustes]?: Partial<Ajustes[K]>
  },
): Promise<Ajustes> {
  const actuales = await leerAjustes()
  const nuevos: Ajustes = {
    marca: { ...actuales.marca, ...(parcial.marca ?? {}) },
    precios: { ...actuales.precios, ...(parcial.precios ?? {}) },
    ia: { ...actuales.ia, ...(parcial.ia ?? {}) },
    crm: { ...actuales.crm, ...(parcial.crm ?? {}) },
  }
  const { error } = await db()
    .from('ajustes')
    .upsert({ id: 1, ...nuevos })
  if (error) falla('guardarAjustes', error)
  await registrarEvento('ajustes', '1', 'actualizado', { antes: actuales, despues: nuevos })
  return nuevos
}

// ------------------------------- Catálogo ----------------------------------

function normalizarItem(fila: Record<string, unknown>): ItemCatalogo {
  const f = fila as unknown as ItemCatalogo
  return {
    ...f,
    precio_setup: Number(f.precio_setup),
    precio_mensual: Number(f.precio_mensual),
    costo_setup: Number(f.costo_setup),
    costo_mensual: Number(f.costo_mensual),
  }
}

export async function leerCatalogo(
  opciones: { soloActivos?: boolean } = {},
): Promise<ItemCatalogo[]> {
  let consulta = db().from('catalogo').select('*').is('eliminado_en', null).order('orden')
  if (opciones.soloActivos) consulta = consulta.eq('activo', true)
  const { data, error } = await consulta
  if (error) falla('leerCatalogo', error)
  return (data ?? []).map(normalizarItem)
}

export async function mapaCatalogo(): Promise<Map<string, ItemCatalogo>> {
  // Incluye inactivos: una propuesta vieja debe seguir calculándose.
  const { data, error } = await db().from('catalogo').select('*')
  if (error) falla('mapaCatalogo', error)
  const items = (data ?? []).map(normalizarItem)
  return new Map(items.map((i) => [i.codigo, i]))
}

export async function guardarItemCatalogo(item: Partial<ItemCatalogo> & { codigo: string }) {
  const { id, ...resto } = item
  const consulta = id
    ? db().from('catalogo').update(resto).eq('id', id).select().single()
    : db().from('catalogo').insert(resto).select().single()
  const { data, error } = await consulta
  if (error) falla('guardarItemCatalogo', error)
  await registrarEvento('catalogo', data.id, id ? 'actualizado' : 'creado', {
    codigo: item.codigo,
  })
  return normalizarItem(data)
}

export async function archivarItemCatalogo(id: string) {
  const { error } = await db()
    .from('catalogo')
    .update({ eliminado_en: new Date().toISOString(), activo: false })
    .eq('id', id)
  if (error) falla('archivarItemCatalogo', error)
  await registrarEvento('catalogo', id, 'archivado')
}

// ------------------------------- Clientes ----------------------------------

export async function crearCliente(datos: Partial<Cliente> & { nombre: string }) {
  const { data, error } = await db().from('clientes').insert(datos).select().single()
  if (error) falla('crearCliente', error)
  await registrarEvento('cliente', data.id, 'creado', datos)
  return data as Cliente
}

export async function actualizarCliente(id: string, datos: Partial<Cliente>) {
  const { data, error } = await db().from('clientes').update(datos).eq('id', id).select().single()
  if (error) falla('actualizarCliente', error)
  await registrarEvento('cliente', id, 'actualizado', datos)
  return data as Cliente
}

// ---------------------------- Levantamientos -------------------------------

export type LevantamientoResumen = Levantamiento & {
  clientes: Pick<Cliente, 'id' | 'nombre' | 'industria' | 'ciudad'>
  propuestas: {
    id: string
    version: number
    totales: Record<string, { setup: { base: number }; mensual: { base: number } }>
    seleccionado: string
    estado: string
    creado_en: string
    eliminado_en: string | null
  }[]
}

export async function listarLevantamientos(): Promise<LevantamientoResumen[]> {
  const { data, error } = await db()
    .from('levantamientos')
    .select(
      '*, clientes(id, nombre, industria, ciudad), propuestas(id, version, totales, estado, creado_en, eliminado_en, seleccionado:datos->>seleccionado)',
    )
    .is('eliminado_en', null)
    .order('actualizado_en', { ascending: false })
  if (error) falla('listarLevantamientos', error)
  return (data ?? []) as LevantamientoResumen[]
}

export async function crearLevantamiento(clienteId: string, titulo: string, idioma: 'es' | 'en') {
  const { data, error } = await db()
    .from('levantamientos')
    .insert({ cliente_id: clienteId, titulo, idioma })
    .select()
    .single()
  if (error) falla('crearLevantamiento', error)
  await registrarEvento('levantamiento', data.id, 'creado', { clienteId, titulo })
  return data as Levantamiento
}

export type LevantamientoCompleto = Levantamiento & { clientes: Cliente }

export async function leerLevantamiento(id: string) {
  const { data, error } = await db()
    .from('levantamientos')
    .select('*, clientes(*)')
    .eq('id', id)
    .is('eliminado_en', null)
    .maybeSingle()
  if (error) falla('leerLevantamiento', error)
  return data as LevantamientoCompleto | null
}

export async function leerLevantamientoPorToken(token: string) {
  const { data, error } = await db()
    .from('levantamientos')
    .select('*, clientes(*)')
    .eq('token_cliente', token)
    .is('eliminado_en', null)
    .maybeSingle()
  if (error) falla('leerLevantamientoPorToken', error)
  return data as LevantamientoCompleto | null
}

export async function actualizarLevantamiento(
  id: string,
  datos: Partial<Levantamiento> & { eliminado_en?: string },
) {
  const { data, error } = await db()
    .from('levantamientos')
    .update(datos)
    .eq('id', id)
    .select()
    .single()
  if (error) falla('actualizarLevantamiento', error)
  return data as Levantamiento
}

export async function archivarLevantamiento(id: string) {
  await actualizarLevantamiento(id, { eliminado_en: new Date().toISOString() })
  await registrarEvento('levantamiento', id, 'archivado')
}

// -------------------------------- Insumos ----------------------------------

export async function listarInsumos(levantamientoId: string) {
  const { data, error } = await db()
    .from('insumos')
    .select('*')
    .eq('levantamiento_id', levantamientoId)
    .is('eliminado_en', null)
    .order('creado_en')
  if (error) falla('listarInsumos', error)
  return (data ?? []) as Insumo[]
}

export async function leerInsumo(id: string) {
  const { data, error } = await db().from('insumos').select('*').eq('id', id).maybeSingle()
  if (error) falla('leerInsumo', error)
  return data as Insumo | null
}

export async function crearInsumo(
  datos: Partial<Insumo> & { levantamiento_id: string; tipo: Insumo['tipo'] },
) {
  const { data, error } = await db().from('insumos').insert(datos).select().single()
  if (error) falla('crearInsumo', error)
  await registrarEvento('insumo', data.id, 'creado', {
    levantamiento_id: datos.levantamiento_id,
    tipo: datos.tipo,
    origen: datos.origen,
  })
  return data as Insumo
}

export async function actualizarInsumo(id: string, datos: Partial<Insumo>) {
  const { data, error } = await db().from('insumos').update(datos).eq('id', id).select().single()
  if (error) falla('actualizarInsumo', error)
  return data as Insumo
}

export async function archivarInsumo(id: string) {
  const { error } = await db()
    .from('insumos')
    .update({ eliminado_en: new Date().toISOString() })
    .eq('id', id)
  if (error) falla('archivarInsumo', error)
  await registrarEvento('insumo', id, 'archivado')
}

// -------------------------------- Análisis ---------------------------------

export type FilaAnalisis = {
  id: string
  levantamiento_id: string
  version: number
  proveedor: string
  modelo: string
  resultado: unknown
  uso: Record<string, unknown>
  estado: 'procesando' | 'listo' | 'error'
  error: string | null
  creado_en: string
}

export async function listarAnalisis(levantamientoId: string) {
  const { data, error } = await db()
    .from('analisis')
    .select(
      'id, levantamiento_id, version, proveedor, modelo, resultado, uso, estado, error, creado_en',
    )
    .eq('levantamiento_id', levantamientoId)
    .order('version', { ascending: false })
  if (error) falla('listarAnalisis', error)
  return (data ?? []) as FilaAnalisis[]
}

export async function leerAnalisis(id: string) {
  const { data, error } = await db().from('analisis').select('*').eq('id', id).maybeSingle()
  if (error) falla('leerAnalisis', error)
  return data as (FilaAnalisis & { entrada: string }) | null
}

async function siguienteVersion(tabla: 'analisis' | 'propuestas', levantamientoId: string) {
  const { data, error } = await db()
    .from(tabla)
    .select('version')
    .eq('levantamiento_id', levantamientoId)
    .order('version', { ascending: false })
    .limit(1)
  if (error) falla('siguienteVersion', error)
  return ((data?.[0]?.version as number | undefined) ?? 0) + 1
}

export async function crearAnalisis(datos: {
  levantamiento_id: string
  proveedor: string
  modelo: string
  entrada: string
}) {
  const version = await siguienteVersion('analisis', datos.levantamiento_id)
  const { data, error } = await db()
    .from('analisis')
    .insert({ ...datos, version, estado: 'procesando' })
    .select('id, version')
    .single()
  if (error) falla('crearAnalisis', error)
  return data as { id: string; version: number }
}

export async function cerrarAnalisis(
  id: string,
  datos: {
    resultado?: unknown
    uso?: unknown
    estado: 'listo' | 'error'
    error?: string
    modelo?: string
    proveedor?: string
  },
) {
  const { error } = await db().from('analisis').update(datos).eq('id', id)
  if (error) falla('cerrarAnalisis', error)
}

// ------------------------------- Propuestas --------------------------------

export type FilaPropuesta = {
  id: string
  levantamiento_id: string
  analisis_id: string | null
  version: number
  numero: string
  idioma: 'es' | 'en'
  datos: DatosPropuesta
  totales: Record<string, unknown>
  estado: string
  token_publico: string
  crm_sincronizado_en: string | null
  creado_en: string
  actualizado_en: string
}

export async function listarPropuestas(levantamientoId: string) {
  const { data, error } = await db()
    .from('propuestas')
    .select('*')
    .eq('levantamiento_id', levantamientoId)
    .is('eliminado_en', null)
    .order('version', { ascending: false })
  if (error) falla('listarPropuestas', error)
  return (data ?? []) as FilaPropuesta[]
}

export async function leerPropuesta(id: string) {
  const { data, error } = await db().from('propuestas').select('*').eq('id', id).maybeSingle()
  if (error) falla('leerPropuesta', error)
  return data as FilaPropuesta | null
}

export async function leerPropuestaPorToken(token: string) {
  const { data, error } = await db()
    .from('propuestas')
    .select('*')
    .eq('token_publico', token)
    .is('eliminado_en', null)
    .maybeSingle()
  if (error) falla('leerPropuestaPorToken', error)
  return data as FilaPropuesta | null
}

/**
 * Cada guardado crea una versión nueva: la anterior queda intacta, así nunca
 * se pierde lo que se le mostró al cliente.
 */
export async function crearPropuesta(datos: {
  levantamiento_id: string
  analisis_id: string | null
  idioma: 'es' | 'en'
  datos: DatosPropuesta
  totales: Record<string, unknown>
}) {
  const version = await siguienteVersion('propuestas', datos.levantamiento_id)
  const { data: numero, error: errorNumero } = await db().rpc('siguiente_numero_propuesta')
  if (errorNumero) falla('numeroPropuesta', errorNumero)
  const { data, error } = await db()
    .from('propuestas')
    .insert({ ...datos, version, numero })
    .select()
    .single()
  if (error) falla('crearPropuesta', error)
  await registrarEvento('propuesta', data.id, 'creada', { version, numero: data.numero })
  return data as FilaPropuesta
}

export async function actualizarPropuesta(id: string, datos: Partial<FilaPropuesta>) {
  const { data, error } = await db().from('propuestas').update(datos).eq('id', id).select().single()
  if (error) falla('actualizarPropuesta', error)
  return data as FilaPropuesta
}

export async function registrarEnvioCrm(datos: {
  propuesta_id: string | null
  accion: string
  solicitud: unknown
  respuesta: unknown
  ok: boolean
}) {
  const { error } = await db().from('crm_envios').insert(datos)
  if (error) console.error('[crm_envios]', error.message)
}

export async function listarEventosLevantamiento(levantamientoId: string) {
  const { data, error } = await db()
    .from('eventos')
    .select('*')
    .or(`entidad_id.eq.${levantamientoId},datos->>levantamiento_id.eq.${levantamientoId}`)
    .order('creado_en', { ascending: false })
    .limit(100)
  if (error) falla('listarEventos', error)
  return (data ?? []) as {
    id: number
    entidad: string
    accion: string
    datos: Record<string, unknown>
    creado_en: string
  }[]
}
