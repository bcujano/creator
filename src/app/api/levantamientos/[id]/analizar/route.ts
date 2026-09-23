import { NextResponse } from 'next/server'
import { type Ctx, privada } from '@/server/http'
import { ejecutarAnalisis } from '@/server/servicios'

// Un análisis a fondo con razonamiento puede tardar varios minutos.
export const maxDuration = 300

export const POST = privada(async (_req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  return NextResponse.json(await ejecutarAnalisis(id))
})
