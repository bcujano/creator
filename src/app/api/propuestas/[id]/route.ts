import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  actualizarLevantamiento,
  actualizarPropuesta,
  leerPropuesta,
  registrarEvento,
} from '@/server/datos'
import { type Ctx, NoEncontrado, privada } from '@/server/http'

const Cambio = z.object({
  estado: z.enum(['borrador', 'presentada', 'enviada', 'aceptada', 'rechazada']),
})

// Estado del levantamiento que corresponde a cada estado de la propuesta.
const ESTADO_LEVANTAMIENTO = {
  enviada: 'enviada',
  presentada: 'enviada',
  aceptada: 'ganada',
  rechazada: 'perdida',
} as const

/** Solo cambia el estado: el contenido de una versión nunca se edita. */
export const PATCH = privada(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  const { estado } = Cambio.parse(await req.json())
  const propuesta = await leerPropuesta(id)
  if (!propuesta) throw new NoEncontrado('Propuesta')
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
