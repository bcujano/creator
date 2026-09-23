import 'server-only'
import { z } from 'zod'
import { prepararSubida } from './almacen'
import { crearInsumo, leerAjustes } from './datos'
import { clasificar, procesarInsumo, tipoInsumo } from './extraer'
import { Invalido } from './http'

/** 50 MB: alcanza para audios de una reunión larga y PDFs pesados. */
export const TAMANO_MAXIMO = 50 * 1024 * 1024

export const SolicitudSubida = z.object({
  nombre: z.string().min(1).max(200),
  mime: z.string().max(120).default('application/octet-stream'),
  tamano: z.number().int().positive(),
})

export const ArchivoSubido = z.object({
  ruta: z.string().min(1),
  nombre: z.string().min(1).max(200),
  mime: z.string().max(120).default('application/octet-stream'),
  tamano: z.number().int().positive(),
})

export async function iniciarSubida(levantamientoId: string, cuerpo: unknown) {
  const s = SolicitudSubida.parse(cuerpo)
  if (s.tamano > TAMANO_MAXIMO) throw new Invalido('El archivo supera los 50 MB.')
  return prepararSubida(levantamientoId, s.nombre)
}

/** Registra un archivo ya subido a Storage y extrae su texto. */
export async function registrarArchivo(
  levantamientoId: string,
  cuerpo: unknown,
  origen: 'consultor' | 'cliente',
  idioma: 'es' | 'en',
) {
  const a = ArchivoSubido.parse(cuerpo)
  // La ruta la generó el servidor dentro de la carpeta del levantamiento: no se aceptan otras.
  if (!a.ruta.startsWith(`${levantamientoId}/`) || a.ruta.includes('..')) {
    throw new Invalido('Ruta de archivo inválida.')
  }
  const insumo = await crearInsumo({
    levantamiento_id: levantamientoId,
    tipo: tipoInsumo(clasificar(a.mime, a.nombre)),
    origen,
    titulo: a.nombre,
    ruta_archivo: a.ruta,
    mime: a.mime,
    tamano: a.tamano,
    estado: 'procesando',
  })
  const ajustes = await leerAjustes()
  return procesarInsumo(ajustes, insumo, idioma)
}
