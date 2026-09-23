import 'server-only'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { Documento } from '../documento'
import {
  cargarLogo,
  etiquetaVeredicto,
  filasPaquete,
  hex,
  lineaCifra,
  lineasRoi,
  usd,
} from './comun'

const FUENTE = 'Calibri'

function p(
  texto: string,
  opciones: { negrita?: boolean; color?: string; tamano?: number; cursiva?: boolean } = {},
) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: texto,
        bold: opciones.negrita,
        italics: opciones.cursiva,
        color: opciones.color,
        size: opciones.tamano ?? 21,
        font: FUENTE,
      }),
    ],
  })
}

function vineta(texto: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text: texto, size: 21, font: FUENTE })],
  })
}

function h(texto: string, nivel: 1 | 2, color: string) {
  return new Paragraph({
    heading: nivel === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    spacing: { before: nivel === 1 ? 240 : 200, after: 120 },
    children: [
      new TextRun({
        text: texto,
        bold: true,
        color: nivel === 1 ? color : '1F2433',
        size: nivel === 1 ? 32 : 25,
        font: FUENTE,
      }),
    ],
  })
}

function celda(
  texto: string,
  opciones: { negrita?: boolean; fondo?: string; derecha?: boolean; ancho: number },
) {
  return new TableCell({
    width: { size: opciones.ancho, type: WidthType.PERCENTAGE },
    shading: opciones.fondo
      ? { type: ShadingType.CLEAR, color: 'auto', fill: opciones.fondo }
      : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opciones.derecha ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text: texto, bold: opciones.negrita, size: 19, font: FUENTE })],
      }),
    ],
  })
}

function tablaPaquete(doc: Documento, indice: number) {
  const pq = doc.paquetes[indice]
  if (!pq) return []
  const t = doc.t
  const c = pq.calculo
  const fila = (a: string, b: string, cc: string, negrita = false, fondo?: string) =>
    new TableRow({
      children: [
        celda(a, { ancho: 56, negrita, fondo }),
        celda(b, { ancho: 22, negrita, fondo, derecha: true }),
        celda(cc, { ancho: 22, negrita, fondo, derecha: true }),
      ],
    })
  const filas = [
    fila(t.concepto, t.setup, t.mensual, true, 'F4F5F9'),
    ...filasPaquete(doc, indice).map((f) => fila(f.concepto, f.setup, f.mensual)),
  ]
  if (c.setup.descuento > 0 || c.mensual.descuento > 0) {
    filas.push(
      fila(t.descuento, `-${usd(c.setup.descuento, doc)}`, `-${usd(c.mensual.descuento, doc)}`),
    )
  }
  filas.push(
    fila(t.subtotal, usd(c.setup.base, doc), usd(c.mensual.base, doc)),
    fila(`${t.iva} ${doc.precios.iva_pct}%`, usd(c.setup.iva, doc), usd(c.mensual.iva, doc)),
    fila(t.total, usd(c.setup.total, doc), usd(c.mensual.total, doc), true, 'F4F5F9'),
  )
  return [
    h(
      `${pq.definicion.nombre}${pq.recomendado ? ` · ${t.recomendado}` : ''}`,
      2,
      hex(doc.marca.color_primario),
    ),
    p(pq.definicion.propuesta_valor, { color: '626A7D' }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E5EE' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E5EE' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'EEF0F5' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: filas,
    }),
    p(
      `${c.usuarios.incluidos > 0 ? `${c.usuarios.incluidos} ${t.usuarios} · ` : ''}${c.semanas} ${t.semanas} · ${t.primer_anio}: ${usd(c.primer_anio, doc)}`,
      { color: '626A7D', tamano: 18 },
    ),
    ...pq.items.flatMap((item) => [
      p(item.nombre, { negrita: true, tamano: 20 }),
      ...item.caracteristicas.map(vineta),
    ]),
  ]
}

export async function generarDocx(doc: Documento): Promise<Buffer> {
  const t = doc.t
  const a = doc.analisis
  const primario = hex(doc.marca.color_primario)
  const logo = await cargarLogo(doc.marca.logo_url)

  const portada = [
    ...(logo
      ? [
          new Paragraph({
            children: [
              new ImageRun({
                type: logo.formato,
                data: logo.buffer,
                transformation: { width: 180, height: 70 },
              }),
            ],
          }),
        ]
      : [p(doc.marca.nombre, { negrita: true, tamano: 40, color: primario })]),
    new Paragraph({ spacing: { before: 1800 }, children: [] }),
    p(t.propuesta, { negrita: true, tamano: 56, color: primario }),
    p(`${t.preparado_para}: ${doc.cliente.nombre}`, { tamano: 30 }),
    p(`${t.numero} ${doc.propuesta.numero} · ${t.fecha}: ${doc.fecha}`, { color: '626A7D' }),
    p(`${t.valida_hasta}: ${doc.valida_hasta}`, { color: '626A7D' }),
    new Paragraph({ children: [new PageBreak()] }),
  ]

  const diagnostico = a
    ? [
        h(t.resumen, 1, primario),
        p(a.resumen_ejecutivo),
        h(t.lo_que_entendimos, 2, primario),
        p(a.negocio.descripcion),
        p(`${a.negocio.industria} · ${a.negocio.modelo_de_negocio} · ${a.negocio.tamano}`, {
          color: '626A7D',
        }),
        h(`${t.madurez}: ${Math.round(a.madurez_digital.puntaje)}/100`, 2, primario),
        ...a.madurez_digital.areas.flatMap((area) => [
          p(`${area.area} · ${area.puntaje}/5`, { negrita: true }),
          ...(area.falta.length
            ? [p(`${t.falta}: ${area.falta.join(', ')}`, { color: '626A7D', tamano: 19 })]
            : []),
        ]),
        h(t.dolores, 1, primario),
        ...(['explicito', 'oculto'] as const).flatMap((tipo) => {
          const lista = a.dolores.filter((d) => d.tipo === tipo)
          if (!lista.length) return []
          return [
            h(tipo === 'explicito' ? t.dolores_explicitos : t.dolores_ocultos, 2, primario),
            ...lista.flatMap((d) => [
              p(`${d.titulo} (${t[d.severidad]})`, { negrita: true }),
              p(d.descripcion),
              p(`${t.impacto_mes}: ${lineaCifra(d.impacto, doc)}`, { color: '626A7D' }),
              p(`${t.costo_no_actuar}: ${d.costo_de_no_actuar}`, { color: '626A7D', tamano: 19 }),
            ]),
          ]
        }),
        h(t.solucion, 1, primario),
        ...a.soluciones.flatMap((s) => [
          p(`${s.titulo}${s.a_medida ? ` · ${t.a_medida}` : ''}`, { negrita: true }),
          p(s.descripcion),
          p(`${s.beneficio} — ${t.indicador}: ${s.indicador}`, { color: '626A7D', tamano: 19 }),
        ]),
        h(t.arquitectura, 2, primario),
        p(a.arquitectura.descripcion),
        ...a.arquitectura.componentes.map((c) =>
          vineta(`${c.nombre}: ${c.funcion} (${c.tecnologia})`),
        ),
        h(t.flujo, 2, primario),
        ...a.arquitectura.flujo.map((paso, i) => vineta(`${i + 1}. ${paso}`)),
        h(t.viabilidad, 1, primario),
        p(`${t.veredicto}: ${etiquetaVeredicto(doc)}`, { negrita: true }),
        ...(['tecnica', 'economica', 'operativa'] as const).map((k) =>
          p(`${t[k]} (${a.viabilidad[k].puntaje}/10): ${a.viabilidad[k].justificacion}`),
        ),
        ...(a.viabilidad.condiciones.length
          ? [h(t.condiciones, 2, primario), ...a.viabilidad.condiciones.map(vineta)]
          : []),
        h(t.riesgos, 2, primario),
        ...a.viabilidad.riesgos.map((r) => vineta(`${r.riesgo} → ${r.mitigacion}`)),
        h(t.roi, 2, primario),
        ...lineasRoi(doc).map(vineta),
        p(a.roi.explicacion, { color: '626A7D', tamano: 19, cursiva: true }),
        new Paragraph({ children: [new PageBreak()] }),
      ]
    : []

  const inversion = [
    h(t.paquetes, 1, primario),
    ...doc.paquetes.flatMap((_, i) => tablaPaquete(doc, i)),
    h(t.condiciones_comerciales, 2, primario),
    vineta(`${doc.precios.anticipo_pct}% ${t.anticipo}`),
    vineta(t.mensualidad_nota),
    vineta(`${t.precios_iva} ${doc.precios.iva_pct}%.`),
    vineta(`${t.valida_hasta}: ${doc.valida_hasta}.`),
    ...(doc.propuesta.datos.condiciones ? [vineta(doc.propuesta.datos.condiciones)] : []),
  ]

  const plan = a
    ? [
        h(t.plan, 1, primario),
        ...a.plan.flatMap((f) => [
          p(`${t.fase} ${f.fase}: ${f.nombre} · ${f.semanas} ${t.semanas}`, { negrita: true }),
          ...f.entregables.map(vineta),
        ]),
        h(t.siguiente_paso, 2, primario),
        p(a.siguiente_paso),
      ]
    : []

  const contacto = [
    h(t.contacto, 2, primario),
    p(doc.marca.nombre, { negrita: true }),
    p(
      [doc.marca.email, doc.marca.telefono, doc.marca.sitio_web, doc.marca.direccion]
        .filter(Boolean)
        .join(' · '),
      {
        color: '626A7D',
      },
    ),
  ]

  const documento = new Document({
    creator: doc.marca.nombre,
    title: `${t.propuesta} ${doc.propuesta.numero}`,
    styles: { default: { document: { run: { font: FUENTE } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1100, bottom: 1100, left: 1100, right: 1100 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${doc.marca.nombre} · ${doc.propuesta.numero} · `,
                    size: 16,
                    color: '8A91A3',
                  }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '8A91A3' }),
                ],
              }),
            ],
          }),
        },
        children: [...portada, ...diagnostico, ...inversion, ...plan, ...contacto],
      },
    ],
  })
  return Packer.toBuffer(documento)
}
