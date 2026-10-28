import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/env'
import type { Idioma } from '@/lib/tipos'
import {
  crearCliente,
  crearLevantamiento,
  leerAjustes,
  leerEvento,
  leerLevantamiento,
  listarAnalisis,
  listarPropuestas,
  registrarEvento,
} from './datos'
import { ejecutarAnalisis } from './servicios'

/**
 * Diagnóstico de autoservicio: lo pide alguien desde la página personal de Byron (crm-321), sin
 * reunión. El CRM crea el levantamiento aquí, la persona llena su formulario en el celular y al
 * terminar el análisis corre solo; cuando la propuesta está lista se le avisa al CRM, que se la
 * entrega y le ofrece el siguiente paso (sesión con Byron o el paquete).
 *
 * La marca de autoservicio vive en la bitácora (`eventos`, acción «autoservicio»), sin cambiar el
 * esquema: guarda la referencia de la compra en el CRM y a dónde volver.
 */

export type Autoservicio = { ref: string; retorno: string }

/** La clave compartida con crm-321 (la misma de la integración CRM, en las dos direcciones). */
export function claveValida(clave: string | null) {
  const esperada = env.crmSecret
  if (!clave || !esperada) return false
  const a = Buffer.from(clave)
  const b = Buffer.from(esperada)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function crearAutoservicio(d: {
  nombre: string
  empresa: string
  telefono: string
  email: string
  idioma: Idioma
  ref: string
  retorno: string
  crm_lead_id: string | null
}) {
  const cliente = await crearCliente({
    nombre: d.empresa || d.nombre,
    contacto_nombre: d.nombre,
    telefono: d.telefono,
    email: d.email,
    crm_lead_id: d.crm_lead_id,
  })
  const levantamiento = await crearLevantamiento(
    cliente.id,
    `Autodiagnóstico ${cliente.nombre}`,
    d.idioma,
  )
  await registrarEvento('levantamiento', levantamiento.id, 'autoservicio', {
    ref: d.ref,
    retorno: d.retorno,
  } satisfies Autoservicio)
  return {
    levantamiento_id: levantamiento.id,
    formulario: `${env.appUrl}/f/${levantamiento.token_cliente}`,
  }
}

/** La marca de autoservicio de un levantamiento, si la tiene. */
export async function autoservicioDe(levantamientoId: string): Promise<Autoservicio | null> {
  return (await leerEvento('levantamiento', levantamientoId, 'autoservicio')) as Autoservicio | null
}

export type EstadoAutoservicio =
  | { estado: 'llenando' }
  | { estado: 'analizando' }
  | { estado: 'listo'; propuesta: string }
  | { estado: 'error' }

/** En qué va: el formulario, el análisis o la propuesta lista. */
export async function estadoAutoservicio(levantamientoId: string): Promise<EstadoAutoservicio> {
  const propuestas = await listarPropuestas(levantamientoId)
  const ultima = propuestas[0] // listarPropuestas ya excluye las archivadas, de la más nueva a la más vieja
  if (ultima) return { estado: 'listo', propuesta: `${env.appUrl}/p/${ultima.token_publico}` }
  const analisis = (await listarAnalisis(levantamientoId))[0]
  if (analisis?.estado === 'error') return { estado: 'error' }
  if (analisis) return { estado: 'analizando' }
  const l = await leerLevantamiento(levantamientoId)
  return l?.cliente_termino ? { estado: 'analizando' } : { estado: 'llenando' }
}

/** Respuesta del cliente a una pregunta de opción, tal cual la marcó (para el precio según su perfil, en el CRM). */
const respuesta = (r: Record<string, string> | null, id: string) => (r?.[id] ?? '').trim()

/**
 * Corre el análisis de un autodiagnóstico (una sola vez) y le avisa al CRM con lo que necesita para
 * ofrecer el siguiente paso: el enlace, los paquetes con su precio con IVA y el perfil que contó la
 * persona. Los montos son los que calculó el motor de precios; aquí no se inventa ninguno.
 */
export async function analizarAutoservicio(levantamientoId: string) {
  const marca = await autoservicioDe(levantamientoId)
  if (!marca) return
  // Una sola corrida: si ya hay un análisis (en curso, listo o con error), no se lanza otro.
  if ((await listarAnalisis(levantamientoId)).length) return
  let aviso: Record<string, unknown>
  try {
    const r = await ejecutarAnalisis(levantamientoId)
    const [l, ajustes, propuestas] = await Promise.all([
      leerLevantamiento(levantamientoId),
      leerAjustes(),
      listarPropuestas(levantamientoId),
    ])
    const p = propuestas.find((x) => x.id === r.propuestaId)
    if (!p || !l) throw new Error('La propuesta no quedó guardada')
    const totales = p.totales as Record<
      string,
      { setup: { total: number }; mensual: { total: number }; semanas: number }
    >
    aviso = {
      ref: marca.ref,
      ok: true,
      propuesta: `${env.appUrl}/p/${p.token_publico}`,
      numero: p.numero,
      recomendado: p.datos.seleccionado,
      anticipo_pct: ajustes.precios.anticipo_pct,
      paquetes: p.datos.paquetes.map((x) => ({
        nivel: x.nivel,
        nombre: x.nombre,
        setup_total: totales[x.nivel]?.setup.total ?? 0,
        mensual_total: totales[x.nivel]?.mensual.total ?? 0,
        semanas: totales[x.nivel]?.semanas ?? 0,
      })),
      perfil: {
        equipo: respuesta(l.respuestas_cliente, 'negocio_equipo'),
        inversion: respuesta(l.respuestas_cliente, 'inversion_monto'),
      },
    }
  } catch (error) {
    aviso = {
      ref: marca.ref,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
  await avisarCrmAutoservicio(levantamientoId, aviso)
}

async function avisarCrmAutoservicio(levantamientoId: string, aviso: Record<string, unknown>) {
  if (!env.crmUrl || !env.crmSecret) return
  const url = new URL('/api/webhook/creator', env.crmUrl).toString()
  let respuestaCrm: unknown = null
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-webhook-secret': env.crmSecret },
      body: JSON.stringify({ accion: 'diagnostico_listo', ...aviso }),
      signal: AbortSignal.timeout(30_000),
    })
    respuestaCrm = await r.json().catch(() => ({ status: r.status }))
  } catch (error) {
    respuestaCrm = { error: error instanceof Error ? error.message : String(error) }
  }
  await registrarEvento('levantamiento', levantamientoId, 'autoservicio_aviso_crm', {
    aviso,
    respuesta: respuestaCrm,
  })
}
