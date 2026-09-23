import { NextResponse } from 'next/server'
import {
  leerLevantamiento,
  listarAnalisis,
  listarEventosLevantamiento,
  listarInsumos,
  listarPropuestas,
} from '@/server/datos'
import { type Ctx, NoEncontrado, privada } from '@/server/http'

/** Respaldo completo en JSON: todo lo que se sabe del cliente, en un archivo. */
export const GET = privada(async (_req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  const levantamiento = await leerLevantamiento(id)
  if (!levantamiento) throw new NoEncontrado('Levantamiento')
  const [insumos, analisis, propuestas, eventos] = await Promise.all([
    listarInsumos(id),
    listarAnalisis(id),
    listarPropuestas(id),
    listarEventosLevantamiento(id),
  ])
  const cuerpo = JSON.stringify(
    {
      exportado_en: new Date().toISOString(),
      levantamiento,
      insumos,
      analisis,
      propuestas,
      eventos,
    },
    null,
    2,
  )
  const nombre = `respaldo-${levantamiento.clientes.nombre.replace(/[^a-zA-Z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`
  return new NextResponse(cuerpo, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${nombre}"`,
    },
  })
})
