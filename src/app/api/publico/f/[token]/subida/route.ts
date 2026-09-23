import { NextResponse } from 'next/server'
import { leerLevantamientoPorToken } from '@/server/datos'
import { type Ctx, NoEncontrado, publica } from '@/server/http'
import { iniciarSubida } from '@/server/subidas'

export const POST = publica(async (req: Request, { params }: Ctx<{ token: string }>) => {
  const { token } = await params
  const l = await leerLevantamientoPorToken(token)
  if (!l?.formulario_activo) throw new NoEncontrado('Formulario')
  return NextResponse.json(await iniciarSubida(l.id, await req.json()))
})
