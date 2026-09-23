import 'server-only'
import { NextResponse } from 'next/server'
import type { Documento } from '../documento'
import { Invalido } from '../http'
import { nombreArchivo } from './comun'

export const FORMATOS = ['presentacion', 'pdf', 'docx', 'pptx', 'xlsx', 'md'] as const
export type Formato = (typeof FORMATOS)[number]

const MIME: Record<Formato, string> = {
  presentacion: 'application/pdf',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  md: 'text/markdown; charset=utf-8',
}

export function leerFormato(valor: string | null): Formato {
  if (valor && (FORMATOS as readonly string[]).includes(valor)) return valor as Formato
  throw new Invalido(`Formato no soportado. Usa: ${FORMATOS.join(', ')}`)
}

export async function responderExportacion(doc: Documento, formato: Formato) {
  // Cada formato se carga solo cuando se pide: si una librería falla, las demás siguen.
  let cuerpo: Buffer | string
  if (formato === 'presentacion')
    cuerpo = await (await import('./presentacion')).generarPresentacion(doc)
  else if (formato === 'pdf') cuerpo = await (await import('./pdf')).generarPdf(doc)
  else if (formato === 'docx') cuerpo = await (await import('./docx')).generarDocx(doc)
  else if (formato === 'pptx') cuerpo = await (await import('./pptx')).generarPptx(doc)
  else if (formato === 'xlsx') cuerpo = await (await import('./xlsx')).generarXlsx(doc)
  else cuerpo = (await import('./markdown')).generarMarkdown(doc)

  return new NextResponse(typeof cuerpo === 'string' ? cuerpo : new Uint8Array(cuerpo), {
    headers: {
      'content-type': MIME[formato],
      'content-disposition': `attachment; filename="${nombreArchivo(doc, formato === 'presentacion' ? 'presentacion.pdf' : formato)}"`,
      'cache-control': 'no-store',
    },
  })
}
