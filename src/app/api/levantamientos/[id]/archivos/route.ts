import { NextResponse } from 'next/server'
import { leerLevantamiento } from '@/server/datos'
import { type Ctx, NoEncontrado, privada } from '@/server/http'
import { registrarArchivo } from '@/server/subidas'

// Transcribir un audio largo o leer un PDF grande puede tardar.
export const maxDuration = 300

export const POST = privada(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  const levantamiento = await leerLevantamiento(id)
  if (!levantamiento) throw new NoEncontrado('Levantamiento')
  const insumo = await registrarArchivo(id, await req.json(), 'consultor', levantamiento.idioma)
  return NextResponse.json(insumo)
})
