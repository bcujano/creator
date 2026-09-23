import { NextResponse } from 'next/server'
import { leerAjustes, leerLevantamiento, listarInsumos } from '@/server/datos'
import { type Ctx, NoEncontrado, privada } from '@/server/http'
import { sugerirPreguntas } from '@/server/ia/analizar'

export const maxDuration = 120

export const POST = privada(async (_req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  const [ajustes, levantamiento, insumos] = await Promise.all([
    leerAjustes(),
    leerLevantamiento(id),
    listarInsumos(id),
  ])
  if (!levantamiento) throw new NoEncontrado('Levantamiento')
  const r = await sugerirPreguntas(ajustes, levantamiento, insumos)
  return NextResponse.json(r.datos)
})
