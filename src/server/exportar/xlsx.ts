import 'server-only'
import ExcelJS from 'exceljs'
import type { Documento } from '../documento'
import { hex } from './comun'

const FORMATO_USD = '"$"#,##0.00'

/**
 * Excel con fórmulas vivas: si el cliente cambia una cantidad o un precio,
 * subtotal, IVA y total se recalculan solos.
 */
export async function generarXlsx(doc: Documento): Promise<Buffer> {
  const t = doc.t
  const libro = new ExcelJS.Workbook()
  libro.creator = doc.marca.nombre
  const primario = `FF${hex(doc.marca.color_primario)}`

  const resumen = libro.addWorksheet(doc.idioma === 'en' ? 'Summary' : 'Resumen')
  resumen.columns = [{ width: 38 }, { width: 20 }, { width: 20 }, { width: 20 }]
  resumen.addRow([`${t.propuesta} ${doc.propuesta.numero}`]).font = {
    bold: true,
    size: 16,
    color: { argb: primario },
  }
  resumen.addRow([`${t.preparado_para}: ${doc.cliente.nombre}`])
  resumen.addRow([`${t.fecha}: ${doc.fecha} · ${t.valida_hasta}: ${doc.valida_hasta}`])
  resumen.addRow([])
  const cabecera = resumen.addRow(['', t.implementacion, t.mensualidad, t.primer_anio])
  cabecera.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  cabecera.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primario } }
  })

  const filasResumen: { nombre: string; hoja: string }[] = []

  doc.paquetes.forEach((p, i) => {
    const nombreHoja = `${i + 1}. ${p.definicion.nombre}`.replace(/[\\/?*[\]:]/g, '').slice(0, 31)
    const hoja = libro.addWorksheet(nombreHoja)
    hoja.columns = [
      { width: 46 },
      { width: 10 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
    ]
    hoja.addRow([p.definicion.nombre + (p.recomendado ? ` · ${t.recomendado}` : '')]).font = {
      bold: true,
      size: 14,
      color: { argb: primario },
    }
    hoja.addRow([p.definicion.propuesta_valor]).font = { italic: true, color: { argb: 'FF626A7D' } }
    hoja.addRow([])
    const cab = hoja.addRow([
      t.concepto,
      doc.idioma === 'en' ? 'Qty' : 'Cant.',
      `${t.setup} (${doc.idioma === 'en' ? 'unit' : 'unit.'})`,
      `${t.mensual} (${doc.idioma === 'en' ? 'unit' : 'unit.'})`,
      `${t.setup} ${t.total}`,
      `${t.mensual} ${t.total}`,
    ])
    cab.font = { bold: true }
    cab.eachCell((c) => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F5F9' } }
    })

    const primera = hoja.rowCount + 1
    for (const l of p.calculo.lineas) {
      if (l.desconocido) continue
      const nombre = l.incluido_en ? `${l.nombre} (${t.incluido})` : l.nombre
      const unitSetup = l.incluido_en ? 0 : l.setup / l.cantidad
      const unitMensual = l.incluido_en ? 0 : l.mensual / l.cantidad
      const fila = hoja.addRow([nombre, l.cantidad, unitSetup, unitMensual])
      const r = fila.number
      fila.getCell(5).value = { formula: `B${r}*C${r}` }
      fila.getCell(6).value = { formula: `B${r}*D${r}` }
      if (l.volumen && l.volumen.excedente > 0) {
        const ex = hoja.addRow([
          `${t.excedente}: ${l.volumen.unidad}`,
          l.volumen.excedente,
          0,
          l.volumen.precio_unidad,
        ])
        const re = ex.number
        ex.getCell(5).value = { formula: `B${re}*C${re}` }
        ex.getCell(6).value = { formula: `B${re}*D${re}` }
      }
    }
    if (p.calculo.usuarios.extra > 0) {
      const u = hoja.addRow([
        t.usuarios_extra,
        p.calculo.usuarios.extra,
        0,
        doc.precios.precio_usuario_extra,
      ])
      const ru = u.number
      u.getCell(5).value = { formula: `B${ru}*C${ru}` }
      u.getCell(6).value = { formula: `B${ru}*D${ru}` }
    }
    const ultima = hoja.rowCount

    hoja.addRow([])
    const sub = hoja.addRow([t.subtotal, '', '', ''])
    sub.getCell(5).value = { formula: `SUM(E${primera}:E${ultima})` }
    sub.getCell(6).value = { formula: `SUM(F${primera}:F${ultima})` }
    const desc = hoja.addRow([
      `${t.descuento} (%)`,
      '',
      '',
      '',
      p.definicion.descuento_setup_pct / 100,
      p.definicion.descuento_mensual_pct / 100,
    ])
    desc.getCell(5).numFmt = '0%'
    desc.getCell(6).numFmt = '0%'
    const base = hoja.addRow([`${t.subtotal} − ${t.descuento}`, '', '', ''])
    base.getCell(5).value = { formula: `E${sub.number}*(1-E${desc.number})` }
    base.getCell(6).value = { formula: `F${sub.number}*(1-F${desc.number})` }
    const iva = hoja.addRow([`${t.iva} ${doc.precios.iva_pct}%`, '', '', ''])
    iva.getCell(5).value = { formula: `ROUND(E${base.number}*${doc.precios.iva_pct / 100},2)` }
    iva.getCell(6).value = { formula: `ROUND(F${base.number}*${doc.precios.iva_pct / 100},2)` }
    const total = hoja.addRow([t.total, '', '', ''])
    total.getCell(5).value = { formula: `E${base.number}+E${iva.number}` }
    total.getCell(6).value = { formula: `F${base.number}+F${iva.number}` }
    total.font = { bold: true }

    hoja.eachRow((fila, n) => {
      if (n > 4)
        for (const c of [3, 4, 5, 6])
          if (fila.getCell(c).numFmt !== '0%') fila.getCell(c).numFmt = FORMATO_USD
    })

    filasResumen.push({ nombre: p.definicion.nombre, hoja: `'${nombreHoja.replace(/'/g, "''")}'!` })
    const totalFila = total.number
    const fr = resumen.addRow([p.definicion.nombre + (p.recomendado ? ` · ${t.recomendado}` : '')])
    const rr = fr.number
    fr.getCell(2).value = { formula: `${filasResumen.at(-1)?.hoja}E${totalFila}` }
    fr.getCell(3).value = { formula: `${filasResumen.at(-1)?.hoja}F${totalFila}` }
    fr.getCell(4).value = { formula: `B${rr}+C${rr}*12` }
    for (const c of [2, 3, 4]) fr.getCell(c).numFmt = FORMATO_USD
    if (p.recomendado) fr.font = { bold: true }
  })

  resumen.addRow([])
  resumen.addRow([
    `${t.precios_iva} ${doc.precios.iva_pct}% ${doc.idioma === 'en' ? 'included' : 'incluido'}.`,
  ]).font = {
    italic: true,
    color: { argb: 'FF626A7D' },
  }

  if (doc.analisis) {
    const a = doc.analisis
    const d = libro.addWorksheet(doc.idioma === 'en' ? 'Pain points' : 'Dolores')
    d.columns = [{ width: 34 }, { width: 12 }, { width: 12 }, { width: 60 }, { width: 18 }]
    const c = d.addRow([
      t.dolores,
      doc.idioma === 'en' ? 'Type' : 'Tipo',
      doc.idioma === 'en' ? 'Severity' : 'Severidad',
      t.detalle,
      t.impacto_mes,
    ])
    c.font = { bold: true }
    for (const x of a.dolores) {
      const f = d.addRow([
        x.titulo,
        x.tipo === 'oculto' ? t.dolores_ocultos : t.dolores_explicitos,
        t[x.severidad],
        x.descripcion,
        x.impacto_mensual_usd ?? '',
      ])
      f.getCell(5).numFmt = FORMATO_USD
      f.alignment = { wrapText: true, vertical: 'top' }
    }
  }

  const salida = await libro.xlsx.writeBuffer()
  return Buffer.from(salida as ArrayBuffer)
}
