import { NextResponse } from 'next/server'
import { urlTemporal } from '@/server/almacen'
import { archivarInsumo, leerAjustes, leerInsumo, leerLevantamiento } from '@/server/datos'
import { procesarInsumo } from '@/server/extraer'
import { type Ctx, NoEncontrado, privada } from '@/server/http'

export const maxDuration = 300

/** Abre el archivo original con una URL firmada de una hora. */
export const GET = privada(async (_req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  const insumo = await leerInsumo(id)
  if (!insumo?.ruta_archivo) throw new NoEncontrado('Archivo')
  return NextResponse.redirect(await urlTemporal(insumo.ruta_archivo))
})

/** Reintenta la extracción de texto. */
export const POST = privada(async (_req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  const insumo = await leerInsumo(id)
  if (!insumo) throw new NoEncontrado('Insumo')
  const levantamiento = await leerLevantamiento(insumo.levantamiento_id)
  const r = await procesarInsumo(await leerAjustes(), insumo, levantamiento?.idioma ?? 'es')
  return NextResponse.json(r)
})

export const DELETE = privada(async (_req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  await archivarInsumo(id)
  return NextResponse.json({ ok: true })
})
