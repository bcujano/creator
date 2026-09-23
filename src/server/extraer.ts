import 'server-only'
import { z } from 'zod'
import type { Ajustes, Insumo } from '@/lib/tipos'
import { descargar } from './almacen'
import { actualizarInsumo } from './datos'
import { generarEstructurado, transcribirAudio } from './ia/motor'

/** Tope por insumo: suficiente para un manual largo sin ahogar el análisis. */
const MAX_CARACTERES = 60_000

type Clase = 'pdf' | 'word' | 'excel' | 'texto' | 'imagen' | 'audio' | 'desconocido'

export function clasificar(mime: string, nombre: string): Clase {
  const ext = nombre.toLowerCase().split('.').pop() ?? ''
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (mime.includes('wordprocessingml') || ext === 'docx') return 'word'
  if (mime.includes('spreadsheetml') || ext === 'xlsx') return 'excel'
  if (mime.startsWith('image/')) return 'imagen'
  if (
    mime.startsWith('audio/') ||
    mime.startsWith('video/') ||
    ['mp3', 'm4a', 'wav', 'ogg', 'opus', 'webm', 'mp4'].includes(ext)
  )
    return 'audio'
  if (mime.startsWith('text/') || ['txt', 'md', 'csv', 'json'].includes(ext)) return 'texto'
  return 'desconocido'
}

export function tipoInsumo(clase: Clase): Insumo['tipo'] {
  if (clase === 'imagen') return 'imagen'
  if (clase === 'audio') return 'audio'
  return 'archivo'
}

async function textoPdf(buffer: Buffer) {
  const { extractText, getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: true })
  return text
}

async function textoWord(buffer: Buffer) {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ buffer })
  return value
}

async function textoExcel(buffer: Buffer) {
  const ExcelJS = (await import('exceljs')).default
  const libro = new ExcelJS.Workbook()
  await libro.xlsx.load(buffer as unknown as ArrayBuffer)
  const partes: string[] = []
  libro.eachSheet((hoja) => {
    partes.push(`## Hoja: ${hoja.name}`)
    hoja.eachRow({ includeEmpty: false }, (fila) => {
      const valores = (fila.values as unknown[]).slice(1).map((v) => {
        if (v === null || v === undefined) return ''
        if (typeof v === 'object' && v && 'result' in v)
          return String((v as { result: unknown }).result)
        if (typeof v === 'object' && v && 'text' in v) return String((v as { text: unknown }).text)
        return String(v)
      })
      partes.push(valores.join(' | '))
    })
  })
  return partes.join('\n')
}

const EsquemaImagen = z.object({
  descripcion: z.string(),
  texto_visible: z.string(),
  hallazgos: z
    .array(z.string())
    .describe('Lo que revela del negocio: procesos, herramientas, problemas.'),
})

async function textoImagen(ajustes: Ajustes, buffer: Buffer, mime: string) {
  const r = await generarEstructurado(ajustes.ia, {
    esquema: EsquemaImagen,
    nombre: 'imagen',
    sistema:
      'Eres consultor de procesos. Describe la imagen que el cliente compartió (captura de pantalla, foto del local, documento, pizarra, Excel) y extrae lo que revela sobre cómo funciona su negocio.',
    usuario: 'Describe esta imagen y transcribe el texto visible.',
    imagenes: [{ mime, base64: buffer.toString('base64') }],
    esfuerzo: 'low',
    maxTokens: 8000,
  })
  const d = r.datos
  return [
    d.descripcion,
    d.texto_visible && `Texto visible: ${d.texto_visible}`,
    d.hallazgos.length > 0 && `Hallazgos:\n- ${d.hallazgos.join('\n- ')}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Extrae el texto de un insumo con archivo y lo deja listo para el análisis.
 * Nunca lanza: si algo falla, el insumo queda en estado "error" con el motivo,
 * y el archivo original sigue a salvo en Storage.
 */
export async function procesarInsumo(ajustes: Ajustes, insumo: Insumo, idioma: 'es' | 'en') {
  try {
    if (!insumo.ruta_archivo) return await actualizarInsumo(insumo.id, { estado: 'listo' })
    const buffer = await descargar(insumo.ruta_archivo)
    const mime = insumo.mime ?? 'application/octet-stream'
    const clase = clasificar(mime, insumo.titulo)

    let texto = ''
    if (clase === 'pdf') texto = await textoPdf(buffer)
    else if (clase === 'word') texto = await textoWord(buffer)
    else if (clase === 'excel') texto = await textoExcel(buffer)
    else if (clase === 'texto') texto = buffer.toString('utf8')
    else if (clase === 'imagen') texto = await textoImagen(ajustes, buffer, mime)
    else if (clase === 'audio') {
      const archivo = new File([new Uint8Array(buffer)], insumo.titulo || 'audio.webm', {
        type: mime,
      })
      texto = await transcribirAudio(ajustes.ia, archivo, idioma)
    } else {
      return await actualizarInsumo(insumo.id, {
        estado: 'error',
        error: 'Formato no soportado para lectura automática. El archivo quedó guardado.',
      })
    }

    const recortado = texto.length > MAX_CARACTERES
    return await actualizarInsumo(insumo.id, {
      contenido: recortado
        ? `${texto.slice(0, MAX_CARACTERES)}\n\n[… recortado: el documento sigue]`
        : texto,
      estado: 'listo',
      error: recortado
        ? `Documento largo: se usaron los primeros ${MAX_CARACTERES} caracteres.`
        : null,
    })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    console.error('[extraer]', insumo.id, mensaje)
    return await actualizarInsumo(insumo.id, { estado: 'error', error: mensaje.slice(0, 500) })
  }
}
