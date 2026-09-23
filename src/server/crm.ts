import 'server-only'
import { env } from '@/lib/env'
import { formatoUSD } from '@/lib/precios'
import type { Ajustes, Cliente } from '@/lib/tipos'
import {
  actualizarCliente,
  actualizarPropuesta,
  type FilaPropuesta,
  registrarEnvioCrm,
} from './datos'

/**
 * Integración con crm-321 por su webhook (POST /api/webhook, cabecera
 * x-webhook-secret). Dos pasos:
 *   1. new_lead: crea o actualiza el lead (por teléfono si lo hay).
 *   2. log_activity tipo "cotizacion": deja la propuesta en el timeline.
 * Cada llamada queda en crm_envios, con lo enviado y lo respondido.
 */

type Resultado = { ok: true; lead_id: string } | { ok: false; error: string }

async function llamar(propuestaId: string | null, accion: string, data: Record<string, unknown>) {
  const solicitud = { action: accion, data }
  let respuesta: unknown = null
  let ok = false
  try {
    const r = await fetch(env.crmUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-webhook-secret': env.crmSecret },
      body: JSON.stringify(solicitud),
      signal: AbortSignal.timeout(20_000),
    })
    respuesta = await r.json().catch(() => ({ status: r.status }))
    ok = r.ok
  } catch (error) {
    respuesta = { error: error instanceof Error ? error.message : String(error) }
  }
  await registrarEnvioCrm({ propuesta_id: propuestaId, accion, solicitud, respuesta, ok })
  return { ok, respuesta: respuesta as Record<string, unknown> }
}

export function crmConfigurado() {
  return Boolean(env.crmUrl && env.crmSecret)
}

export async function enviarAlCrm(
  ajustes: Ajustes,
  cliente: Cliente,
  propuesta: FilaPropuesta,
): Promise<Resultado> {
  if (!crmConfigurado()) return { ok: false, error: 'Falta CRM_WEBHOOK_URL o CRM_WEBHOOK_SECRET.' }
  if (!ajustes.crm.activo)
    return { ok: false, error: 'La integración con el CRM está desactivada en Ajustes.' }

  const totales = propuesta.totales as Record<
    string,
    { setup?: { total: number }; mensual?: { total: number } }
  >
  const elegido = totales[propuesta.datos.seleccionado]
  const setup = elegido?.setup?.total ?? 0
  const mensual = elegido?.mensual?.total ?? 0
  const enlace = `${env.appUrl}/p/${propuesta.token_publico}`

  const lead: Record<string, unknown> = {
    nombre: cliente.contacto_nombre
      ? `${cliente.contacto_nombre} · ${cliente.nombre}`
      : cliente.nombre,
    email: cliente.email || undefined,
    cedula_ruc: cliente.ruc || undefined,
    source: ajustes.crm.source,
    service_type: ajustes.crm.service_type,
    servicio_detalle: `Propuesta ${ajustes.marca.nombre} ${propuesta.numero}: sistemas con IA`,
    presupuesto_estimado: setup,
    cotizacion_numero: propuesta.numero,
    cotizacion_monto: setup,
    cotizacion_fecha: new Date().toISOString(),
    notas: [
      cliente.industria && `Industria: ${cliente.industria}`,
      cliente.ciudad && `Ciudad: ${cliente.ciudad}`,
      `Mensualidad propuesta: ${formatoUSD(mensual)} (con IVA)`,
      `Propuesta: ${enlace}`,
    ]
      .filter(Boolean)
      .join('\n'),
    tags: ['creator', 'aiuda'],
    activity_description: `Propuesta ${propuesta.numero} generada en CREATOR`,
  }
  if (cliente.telefono) lead.telefono = cliente.telefono

  const alta = await llamar(propuesta.id, 'new_lead', lead)
  const leadId = (alta.respuesta?.lead_id as string | undefined) ?? cliente.crm_lead_id ?? null
  if (!alta.ok || !leadId) {
    return {
      ok: false,
      error: `El CRM no aceptó el lead: ${JSON.stringify(alta.respuesta).slice(0, 300)}`,
    }
  }

  await llamar(propuesta.id, 'log_activity', {
    lead_id: leadId,
    type: 'cotizacion',
    description: `Propuesta ${propuesta.numero} · setup ${formatoUSD(setup)} + ${formatoUSD(mensual)}/mes (IVA incluido)`,
    metadata: {
      origen: 'creator',
      propuesta_id: propuesta.id,
      numero: propuesta.numero,
      version: propuesta.version,
      paquete: propuesta.datos.seleccionado,
      url: enlace,
      setup_total: setup,
      mensual_total: mensual,
    },
  })

  if (cliente.crm_lead_id !== leadId) await actualizarCliente(cliente.id, { crm_lead_id: leadId })
  await actualizarPropuesta(propuesta.id, { crm_sincronizado_en: new Date().toISOString() })
  return { ok: true, lead_id: leadId }
}
