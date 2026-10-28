import { NextResponse } from 'next/server'
import { estadoAutoservicio } from '@/server/autoservicio'
import { leerLevantamientoPorToken } from '@/server/datos'
import { type Ctx, NoEncontrado, publica } from '@/server/http'

/** En qué va el autodiagnóstico (lo consulta la pantalla de espera del formulario cada pocos segundos). */
export const GET = publica(async (_req: Request, { params }: Ctx<{ token: string }>) => {
  const { token } = await params
  const l = await leerLevantamientoPorToken(token)
  if (!l) throw new NoEncontrado('Formulario')
  return NextResponse.json(await estadoAutoservicio(l.id))
})
