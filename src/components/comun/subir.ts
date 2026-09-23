'use client'

import { api } from '@/components/ui/primitivos'
import { supabaseBrowser } from '@/lib/supabase/browser'

/**
 * Sube un archivo en dos pasos: el servidor entrega una URL firmada, el
 * navegador sube directo a Storage (sin límite de tamaño de Vercel) y luego
 * el servidor registra el archivo y extrae su texto.
 */
export async function subirArchivo<T>(
  archivo: File,
  rutas: { preparar: string; registrar: string },
): Promise<T> {
  const mime = archivo.type || 'application/octet-stream'
  const preparado = await api<{ ruta: string; token: string }>(rutas.preparar, {
    method: 'POST',
    json: { nombre: archivo.name, mime, tamano: archivo.size },
  })
  const { error } = await supabaseBrowser()
    .storage.from('insumos')
    .uploadToSignedUrl(preparado.ruta, preparado.token, archivo, { contentType: mime })
  if (error) throw new Error(`No se pudo subir ${archivo.name}: ${error.message}`)
  return api<T>(rutas.registrar, {
    method: 'POST',
    json: { ruta: preparado.ruta, nombre: archivo.name, mime, tamano: archivo.size },
  })
}
