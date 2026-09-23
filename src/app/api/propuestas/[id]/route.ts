import { NextResponse } from 'next/server'
import { z } from 'zod'
import { MAX_DESEMBOLSOS, validarPagos } from '@/lib/pagos'
import {
  actualizarLevantamiento,
  actualizarPropuesta,
  leerPropuesta,
  registrarEvento,
} from '@/server/datos'
import { type Ctx, Invalido, NoEncontrado, privada } from '@/server/http'

const Cierre = z.object({
  paquete: z.enum(['esencial', 'recomendado', 'premium']),
  pagos: z
    .array(
      z.object({
        concepto: z.string().trim().min(1).max(200),
        pct: z.number().positive().max(100),
      }),
    )
    .min(1)
    .max(MAX_DESEMBOLSOS),
})

const Cambio = z.object({
  estado: z.enum(['borrador', 'presentada', 'enviada', 'aceptada', 'rechazada']).optional(),
  cierre: Cierre.optional(),
})

// Estado del levantamiento que corresponde a cada estado de la propuesta.
const ESTADO_LEVANTAMIENTO = {
  enviada: 'enviada',
  presentada: 'enviada',
  aceptada: 'ganada',
  rechazada: 'perdida',
} as const

/**
 * Cambia el estado o las condiciones de cierre (paquete elegido y desembolsos).
 * El contenido de una versión nunca se edita.
 */
export const PATCH = privada(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  const { estado, cierre } = Cambio.parse(await req.json())
  const propuesta = await leerPropuesta(id)
  if (!propuesta) throw new NoEncontrado('Propuesta')

  if (cierre) {
    const error = validarPagos(cierre.pagos)
    if (error) throw new Invalido(error)
    if (!propuesta.datos.paquetes.some((p) => p.nivel === cierre.paquete && p.lineas.length > 0)) {
      throw new Invalido('Ese paquete no existe en esta versión.')
    }
    await actualizarPropuesta(id, { cierre })
    await registrarEvento('propuesta', id, 'cierre', {
      levantamiento_id: propuesta.levantamiento_id,
      antes: propuesta.cierre,
      despues: cierre,
    })
  }
  if (!estado) return NextResponse.json({ ok: true })

  await actualizarPropuesta(id, { estado })
  const nuevo = ESTADO_LEVANTAMIENTO[estado as keyof typeof ESTADO_LEVANTAMIENTO]
  if (nuevo) await actualizarLevantamiento(propuesta.levantamiento_id, { estado: nuevo })
  await registrarEvento('propuesta', id, 'estado', {
    levantamiento_id: propuesta.levantamiento_id,
    de: propuesta.estado,
    a: estado,
  })
  return NextResponse.json({ ok: true })
})
