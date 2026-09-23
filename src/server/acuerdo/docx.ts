import 'server-only'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { Acuerdo } from './contenido'

const FUENTE = 'Arial'
const TAM = 21

const sinBorde = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }

function texto(t: string, negrita = false) {
  return new TextRun({ text: t, bold: negrita, font: FUENTE, size: TAM })
}

export async function acuerdoDocx(a: Acuerdo): Promise<Buffer> {
  const hijos: (Paragraph | Table)[] = []
  for (const b of a.bloques) {
    if (b.tipo === 'titulo') {
      hijos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: b.texto, bold: true, font: FUENTE, size: 26 })],
        }),
      )
    } else if (b.tipo === 'subtitulo') {
      hijos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [texto(b.texto)],
        }),
      )
    } else if (b.tipo === 'clausula') {
      hijos.push(
        new Paragraph({
          spacing: { before: 240, after: 100 },
          keepNext: true,
          children: [texto(b.texto, true)],
        }),
      )
    } else if (b.tipo === 'parrafo') {
      hijos.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120, line: 300 },
          children: [texto(b.texto)],
        }),
      )
    } else if (b.tipo === 'vinetas') {
      for (const item of b.items) {
        hijos.push(
          new Paragraph({
            bullet: { level: 0 },
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 60 },
            children: [texto(item)],
          }),
        )
      }
    } else if (b.tipo === 'tabla') {
      hijos.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' },
            left: sinBorde,
            right: sinBorde,
            insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'DDDDDD' },
            insideVertical: sinBorde,
          },
          rows: b.filas.map(
            ([concepto, valor], i) =>
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 72, type: WidthType.PERCENTAGE },
                    margins: { top: 50, bottom: 50, left: 80, right: 80 },
                    children: [
                      new Paragraph({
                        children: [texto(concepto, b.ultimaNegrita && i === b.filas.length - 1)],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 28, type: WidthType.PERCENTAGE },
                    margins: { top: 50, bottom: 50, left: 80, right: 80 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [texto(valor, b.ultimaNegrita && i === b.filas.length - 1)],
                      }),
                    ],
                  }),
                ],
              }),
          ),
        }),
        new Paragraph({ spacing: { after: 120 }, children: [] }),
      )
    } else if (b.tipo === 'firmas') {
      const columna = (titulo: string, lineas: string[]) =>
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde },
          children: [
            new Paragraph({
              spacing: { before: 1200 },
              children: [texto('_______________________________')],
            }),
            ...lineas.map((l, i) => new Paragraph({ children: [texto(l, i === 0)] })),
            new Paragraph({ spacing: { before: 80 }, children: [texto(titulo, true)] }),
          ],
        })
      hijos.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: sinBorde,
            bottom: sinBorde,
            left: sinBorde,
            right: sinBorde,
            insideHorizontal: sinBorde,
            insideVertical: sinBorde,
          },
          rows: [
            new TableRow({
              children: [columna('EL PROVEEDOR', b.proveedor), columna('EL CLIENTE', b.cliente)],
            }),
          ],
        }),
      )
    }
  }

  const documento = new Document({
    creator: '321 SOLUCIONES INMOBILIARIAS S.A.S.',
    title: `Acuerdo ${a.numero}`,
    styles: { default: { document: { run: { font: FUENTE, size: TAM } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1300, bottom: 1300, left: 1400, right: 1400 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `Acuerdo ${a.numero} · Página `,
                    size: 16,
                    color: '888888',
                    font: FUENTE,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '888888',
                    font: FUENTE,
                  }),
                ],
              }),
            ],
          }),
        },
        children: hijos,
      },
    ],
  })
  return Packer.toBuffer(documento)
}
