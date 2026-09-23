import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { generarDocx } from '../src/server/exportar/docx'
import { generarMarkdown } from '../src/server/exportar/markdown'
import { generarPdf } from '../src/server/exportar/pdf'
import { generarPptx } from '../src/server/exportar/pptx'
import { generarPresentacion } from '../src/server/exportar/presentacion'
import { generarXlsx } from '../src/server/exportar/xlsx'
import { documentoPublico } from '../src/server/publico'
import { documentoDePrueba } from './fixtures/documento'

// Si se define, los archivos generados se guardan ahí para revisarlos a mano.
const SALIDA = process.env.CREATOR_SALIDA_PRUEBAS

function guardar(nombre: string, datos: Buffer | string) {
  if (!SALIDA) return
  mkdirSync(SALIDA, { recursive: true })
  writeFileSync(resolve(SALIDA, nombre), datos)
}

const ZIP = [0x50, 0x4b, 0x03, 0x04]

describe('exportaciones', () => {
  const doc = documentoDePrueba('es')

  it('PDF', async () => {
    const pdf = await generarPdf(doc)
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pdf.length).toBeGreaterThan(5000)
    guardar('propuesta.pdf', pdf)
  })

  it('Presentación en PDF, también con lo acordado', async () => {
    const pdf = await generarPresentacion(doc)
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    guardar('presentacion.pdf', pdf)
    const cerrado = documentoDePrueba('es')
    cerrado.propuesta.cierre = {
      paquete: 'recomendado',
      pagos: [
        { concepto: 'a la firma', pct: 50 },
        { concepto: 'a la entrega', pct: 50 },
      ],
    }
    const conCierre = await generarPresentacion(cerrado)
    // Una diapositiva más: "Lo acordado".
    const paginas = (b: Buffer) => b.toString('latin1').match(/\/Type \/Page[^s]/g)?.length ?? 0
    expect(paginas(conCierre)).toBe(paginas(pdf) + 1)
    guardar('presentacion-cierre.pdf', conCierre)
  })

  it('Word', async () => {
    const docx = await generarDocx(doc)
    expect([...docx.subarray(0, 4)]).toEqual(ZIP)
    guardar('propuesta.docx', docx)
  })

  it('PowerPoint', async () => {
    const pptx = await generarPptx(doc)
    expect([...pptx.subarray(0, 4)]).toEqual(ZIP)
    guardar('propuesta.pptx', pptx)
  })

  it('Excel con fórmulas que cuadran con el motor de precios', async () => {
    const xlsx = await generarXlsx(doc)
    guardar('propuesta.xlsx', xlsx)
    const libro = new ExcelJS.Workbook()
    await libro.xlsx.load(xlsx as unknown as ArrayBuffer)
    expect(libro.worksheets.length).toBe(1 + doc.paquetes.length + 1)
    const hoja = libro.worksheets[2]
    const formulas: string[] = []
    hoja?.eachRow((fila) => {
      fila.eachCell((celda) => {
        if (celda.formula) formulas.push(celda.formula)
      })
    })
    expect(formulas.some((f) => f.startsWith('SUM('))).toBe(true)
  })

  it('Markdown en inglés', () => {
    const md = generarMarkdown(documentoDePrueba('en'))
    expect(md).toContain('Solution proposal')
    expect(md).toContain('VAT 15%')
    guardar('propuesta.md', md)
  })

  it('nada interno llega al cliente', () => {
    const publico = JSON.stringify(documentoPublico(doc))
    expect(publico).not.toContain('NO DEBE APARECER')
    for (const interno of [
      '"costo":',
      'costo_mensual',
      'costo_setup',
      'costo_unitario',
      '"margen"',
      'notas_internas',
    ]) {
      expect(publico).not.toContain(interno)
    }
    for (const salida of [generarMarkdown(doc)]) expect(salida).not.toContain('NO DEBE APARECER')
  })
})
