import { NextResponse } from 'next/server'
import { leerLevantamiento, listarInsumos, mapaCatalogo, registrarEvento } from '@/server/datos'
import { documentoPorId } from '@/server/documento'
import { type Ctx, Invalido, NoEncontrado, privada } from '@/server/http'
import { briefProyecto } from '@/server/proyecto'

/** Brief .md para arrancar el diseño del sistema aprobado. Solo con el cierre guardado. */
export const GET = privada(async (_req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  const doc = await documentoPorId(id, 'es')
  if (!doc) throw new NoEncontrado('Propuesta')
  if (!doc.propuesta.cierre) {
    throw new Invalido('Primero guarda el cierre: paquete elegido y forma de pago.')
  }
  const [levantamiento, insumos, catalogo] = await Promise.all([
    leerLevantamiento(doc.propuesta.levantamiento_id),
    listarInsumos(doc.propuesta.levantamiento_id),
    mapaCatalogo(),
  ])
  if (!levantamiento) throw new NoEncontrado('Levantamiento')

  const md = briefProyecto(doc, { levantamiento, insumos, catalogo })
  await registrarEvento('propuesta', id, 'brief_proyecto_generado', {
    levantamiento_id: doc.propuesta.levantamiento_id,
    numero: doc.propuesta.numero,
    version: doc.propuesta.version,
  })

  const cliente = doc.cliente.nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
  return new NextResponse(md, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="PROYECTO-${doc.propuesta.numero}-${cliente}.md"`,
      'cache-control': 'no-store',
    },
  })
})
