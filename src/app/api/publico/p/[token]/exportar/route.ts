import { documentoPorToken } from '@/server/documento'
import { leerFormato, responderExportacion } from '@/server/exportar'
import { type Ctx, NoEncontrado, publica } from '@/server/http'

export const maxDuration = 60

/** Descarga para el cliente desde su enlace. Nunca incluye costos ni márgenes. */
export const GET = publica(async (req: Request, { params }: Ctx<{ token: string }>) => {
  const { token } = await params
  const url = new URL(req.url)
  const formato = leerFormato(url.searchParams.get('formato'))
  const idioma = url.searchParams.get('idioma')
  const doc = await documentoPorToken(
    token,
    idioma === 'en' || idioma === 'es' ? idioma : undefined,
  )
  if (!doc) throw new NoEncontrado('Propuesta')
  return responderExportacion(doc, formato)
})
