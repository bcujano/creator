import { NextResponse } from 'next/server'
import { leerLevantamientoPorToken } from '@/server/datos'
import { type Ctx, NoEncontrado, publica } from '@/server/http'
import { registrarArchivo } from '@/server/subidas'

export const maxDuration = 300

export const POST = publica(async (req: Request, { params }: Ctx<{ token: string }>) => {
  const { token } = await params
  const l = await leerLevantamientoPorToken(token)
  if (!l?.formulario_activo) throw new NoEncontrado('Formulario')
  const insumo = await registrarArchivo(l.id, await req.json(), 'cliente', l.idioma)
  // Al cliente solo se le confirma; el texto extraído es para el consultor.
  return NextResponse.json({ ok: insumo.estado !== 'error', nombre: insumo.titulo })
})
