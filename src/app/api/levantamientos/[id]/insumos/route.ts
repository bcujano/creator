import { NextResponse } from 'next/server'
import { z } from 'zod'
import { crearInsumo, leerLevantamiento, listarInsumos } from '@/server/datos'
import { type Ctx, NoEncontrado, privada } from '@/server/http'

const Nota = z.object({
  tipo: z.enum(['nota', 'texto']),
  titulo: z.string().default(''),
  contenido: z.string().trim().min(1, 'La nota está vacía'),
})

export const GET = privada(async (_req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  return NextResponse.json(await listarInsumos(id))
})

export const POST = privada(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  if (!(await leerLevantamiento(id))) throw new NoEncontrado('Levantamiento')
  const datos = Nota.parse(await req.json())
  const insumo = await crearInsumo({
    levantamiento_id: id,
    origen: 'consultor',
    estado: 'listo',
    ...datos,
  })
  return NextResponse.json(insumo)
})
