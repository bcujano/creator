import { NextResponse } from 'next/server'
import { leerLevantamiento } from '@/server/datos'
import { type Ctx, NoEncontrado, privada } from '@/server/http'
import { iniciarSubida } from '@/server/subidas'

export const POST = privada(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  if (!(await leerLevantamiento(id))) throw new NoEncontrado('Levantamiento')
  return NextResponse.json(await iniciarSubida(id, await req.json()))
})
