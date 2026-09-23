import { NextResponse } from 'next/server'
import { construirAcuerdo } from '@/server/acuerdo/contenido'
import { leerAjustes, registrarEvento } from '@/server/datos'
import { documentoPorId } from '@/server/documento'
import { type Ctx, Invalido, NoEncontrado, privada } from '@/server/http'

export const maxDuration = 60

/** Acuerdo listo para firmar, a partir de una versión guardada de la propuesta. Siempre en español. */
export const GET = privada(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  const formato = new URL(req.url).searchParams.get('formato') ?? 'pdf'
  if (formato !== 'pdf' && formato !== 'docx') throw new Invalido('Formato: pdf o docx')

  const [doc, ajustes] = await Promise.all([documentoPorId(id, 'es'), leerAjustes()])
  if (!doc) throw new NoEncontrado('Propuesta')
  const acuerdo = construirAcuerdo(doc, ajustes.legal)

  const cuerpo =
    formato === 'pdf'
      ? await (await import('@/server/acuerdo/pdf')).acuerdoPdf(acuerdo)
      : await (await import('@/server/acuerdo/docx')).acuerdoDocx(acuerdo)

  await registrarEvento('propuesta', id, 'acuerdo_generado', {
    levantamiento_id: doc.propuesta.levantamiento_id,
    numero: acuerdo.numero,
    formato,
    faltantes: acuerdo.faltantes,
  })

  const cliente = (doc.cliente.razon_social || doc.cliente.nombre).replace(/[^a-zA-Z0-9]+/g, '-')
  return new NextResponse(new Uint8Array(cuerpo), {
    headers: {
      'content-type':
        formato === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'content-disposition': `attachment; filename="${acuerdo.numero}-${cliente}.${formato}"`,
      'cache-control': 'no-store',
    },
  })
})
