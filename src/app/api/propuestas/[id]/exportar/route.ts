import { documentoPorId } from '@/server/documento'
import { leerFormato, responderExportacion } from '@/server/exportar'
import { type Ctx, NoEncontrado, privada } from '@/server/http'

export const maxDuration = 60

export const GET = privada(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  const url = new URL(req.url)
  const formato = leerFormato(url.searchParams.get('formato'))
  const idioma = url.searchParams.get('idioma')
  const doc = await documentoPorId(id, idioma === 'en' || idioma === 'es' ? idioma : undefined)
  if (!doc) throw new NoEncontrado('Propuesta')
  return responderExportacion(doc, formato)
})
