import 'server-only'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { env } from '@/lib/env'
import { formatoUSD } from '@/lib/precios'
import type { Documento } from '../documento'

export type Logo = { buffer: Buffer; formato: 'png' | 'jpg'; mime: string } | null

/** Logo de marca como bytes. Solo PNG/JPG: los formatos que aceptan todos los exportadores. */
export async function cargarLogo(url: string): Promise<Logo> {
  if (!url) return null
  const ext = url.split('?')[0]?.toLowerCase().split('.').pop()
  const formato = ext === 'png' ? 'png' : ext === 'jpg' || ext === 'jpeg' ? 'jpg' : null
  if (!formato) return null
  const mime = formato === 'png' ? 'image/png' : 'image/jpeg'
  try {
    if (url.startsWith('/')) {
      try {
        return { buffer: await readFile(join(process.cwd(), 'public', url)), formato, mime }
      } catch {
        // En Vercel los archivos públicos viven en la CDN, no en la función.
        url = `${env.appUrl}${url}`
      }
    }
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return null
    return { buffer: Buffer.from(await r.arrayBuffer()), formato, mime }
  } catch {
    return null
  }
}

export const usd = (valor: number, doc: Documento) => formatoUSD(valor, doc.idioma)

export function hex(color: string) {
  return color.replace('#', '').toUpperCase()
}

export function nombreArchivo(doc: Documento, extension: string) {
  const cliente = doc.cliente.nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${doc.propuesta.numero}-${cliente || 'propuesta'}.${extension}`
}

export function etiquetaVeredicto(doc: Documento) {
  const v = doc.analisis?.viabilidad.veredicto
  return v ? doc.t[v] : ''
}

/** Filas de detalle de un paquete, iguales para Word, Excel y PDF. */
export function filasPaquete(doc: Documento, indice: number) {
  const p = doc.paquetes[indice]
  if (!p) return []
  const t = doc.t
  const filas: { concepto: string; setup: string; mensual: string }[] = p.calculo.lineas
    .filter((l) => !l.desconocido)
    .map((l) => ({
      concepto: l.incluido_en
        ? `${l.nombre} (${t.incluido})`
        : l.cantidad > 1
          ? `${l.nombre} × ${l.cantidad}`
          : l.nombre,
      setup: l.incluido_en ? '—' : usd(l.setup, doc),
      mensual: l.incluido_en ? '—' : l.mensual ? usd(l.mensual, doc) : '—',
    }))
  for (const l of p.calculo.lineas) {
    if (l.volumen && l.volumen.excedente > 0) {
      filas.push({
        concepto: `${t.excedente}: ${l.volumen.excedente} ${l.volumen.unidad}`,
        setup: '—',
        mensual: usd(l.volumen.cargo, doc),
      })
    }
  }
  if (p.calculo.usuarios.extra > 0) {
    filas.push({
      concepto: `${t.usuarios_extra}: ${p.calculo.usuarios.extra}`,
      setup: '—',
      mensual: usd(p.calculo.usuarios.cargo, doc),
    })
  }
  return filas
}
