'use client'

import { Vacio } from '../ui'
import type { PropsEspacio } from './espacio'

const TEXTOS: Record<string, string> = {
  'levantamiento:creado': 'Se creó el levantamiento',
  'levantamiento:estado': 'Cambió el estado',
  'levantamiento:archivado': 'Se archivó el levantamiento',
  'insumo:creado': 'Se agregó material',
  'insumo:archivado': 'Se quitó material',
  'analisis:completado': 'Diagnóstico completado',
  'analisis:error': 'El diagnóstico falló',
  'propuesta:creada': 'Nueva versión de propuesta',
  'propuesta:estado': 'Cambió el estado de la propuesta',
  'propuesta:crm_enviado': 'Enviada al CRM',
  'propuesta:crm_error': 'Error al enviar al CRM',
  'formulario:guardado': 'El cliente guardó el formulario',
  'propuesta:vista_cliente': 'El cliente abrió la propuesta',
}

function detalle(datos: Record<string, unknown>) {
  if (typeof datos.de === 'string' && typeof datos.a === 'string') return `${datos.de} → ${datos.a}`
  if (typeof datos.numero === 'string') return `${datos.numero} (v${datos.version})`
  if (typeof datos.tipo === 'string')
    return `${datos.tipo}${datos.origen === 'cliente' ? ' · del cliente' : ''}`
  if (typeof datos.error === 'string') return datos.error
  if (typeof datos.mensaje === 'string') return datos.mensaje
  return ''
}

export function Historial({ eventos }: PropsEspacio) {
  if (eventos.length === 0) return <Vacio titulo="Sin movimientos" />
  return (
    <ol className="relative space-y-4 border-l border-borde pl-6">
      {eventos.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[29px] top-1.5 size-2.5 rounded-full bg-marca" />
          <p className="text-sm font-medium">
            {TEXTOS[`${e.entidad}:${e.accion}`] ?? `${e.entidad} · ${e.accion}`}
          </p>
          <p className="text-xs text-tenue">
            {new Date(e.creado_en).toLocaleString('es-EC', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
            {detalle(e.datos) ? ` · ${detalle(e.datos)}` : ''}
          </p>
        </li>
      ))}
    </ol>
  )
}
