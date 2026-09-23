import 'server-only'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type Cifra, etiquetaConfianza, formula } from '@/lib/analisis'
import { env } from '@/lib/env'
import { cierreEfectivo, montosPagos } from '@/lib/pagos'
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

/** "≈ $150/mes = 3 inquilinos atrasados × $250 renta × 20% … (Estimado: incluye un supuesto)" */
export function lineaCifra(c: Cifra, doc: Documento, horas = false) {
  const en = doc.idioma === 'en'
  if (c.valor === null) {
    return `${en ? 'To be quantified' : 'Por cuantificar'}${c.pregunta_para_cuantificar ? `: ${c.pregunta_para_cuantificar}` : ''}`
  }
  const valor = horas ? `${Math.round(c.valor)} h` : usd(c.valor, doc)
  const cuenta = c.factores.length ? ` = ${formula(c, doc.idioma)}` : ''
  return `≈ ${valor}/${en ? 'mo' : 'mes'}${cuenta} (${etiquetaConfianza(c, doc.idioma)})`
}

/** Componentes del retorno con su cuenta, para listas. */
export function lineasRoi(doc: Documento) {
  const a = doc.analisis
  if (!a) return []
  return [
    ...a.roi.componentes.map((c) => `${c.concepto}: ${lineaCifra(c.calculo, doc)}`),
    `${doc.t.horas_mes}: ${lineaCifra(a.roi.horas, doc, true)}`,
    ...(doc.recuperacion_meses
      ? [`${doc.t.recuperacion}: ${doc.recuperacion_meses} ${doc.t.meses}`]
      : []),
  ]
}

/**
 * Plan de pagos para las condiciones comerciales. Si ya se negoció el cierre,
 * se detallan los desembolsos con su monto; si no, el anticipo por defecto.
 */
export function lineasPago(doc: Documento) {
  const c = doc.propuesta.cierre
  if (!c) return [`${doc.precios.anticipo_pct}% ${doc.t.anticipo}`]
  const efectivo = cierreEfectivo(c, doc.propuesta.datos, doc.precios.anticipo_pct)
  const paquete = doc.paquetes.find((p) => p.definicion.nivel === efectivo.paquete)
  const total = paquete?.calculo.setup.total ?? 0
  const en = doc.idioma === 'en'
  return montosPagos(efectivo.pagos, total).map(
    (d, i) =>
      `${en ? 'Payment' : 'Desembolso'} ${i + 1}: ${d.pct}% (${usd(d.monto, doc)}) ${d.concepto}`,
  )
}
