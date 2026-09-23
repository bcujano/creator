import 'server-only'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

const BUCKET = 'insumos'

/** Nombre de archivo seguro para Storage (sin tildes, espacios ni rutas). */
export function nombreSeguro(nombre: string) {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(-80)
  return limpio || 'archivo'
}

/**
 * URL firmada para que el navegador suba directo a Storage: así un video o
 * un PDF grande no pasa por la función de Vercel (límite de ~4.5 MB).
 */
export async function prepararSubida(levantamientoId: string, nombre: string) {
  const ruta = `${levantamientoId}/${randomUUID()}-${nombreSeguro(nombre)}`
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(ruta)
  if (error) throw new Error(`prepararSubida: ${error.message}`)
  return { ruta, token: data.token, url: data.signedUrl }
}

export async function descargar(ruta: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(ruta)
  if (error) throw new Error(`descargar: ${error.message}`)
  return Buffer.from(await data.arrayBuffer())
}

export async function urlTemporal(ruta: string, segundos = 3600) {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUrl(ruta, segundos)
  if (error) throw new Error(`urlTemporal: ${error.message}`)
  return data.signedUrl
}

export async function subirMarca(nombre: string, contenido: Buffer, mime: string) {
  const ruta = `logo-${Date.now()}-${nombreSeguro(nombre)}`
  const almacen = supabaseAdmin().storage.from('marca')
  const { error } = await almacen.upload(ruta, contenido, { contentType: mime, upsert: false })
  if (error) throw new Error(`subirMarca: ${error.message}`)
  return almacen.getPublicUrl(ruta).data.publicUrl
}
