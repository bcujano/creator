import 'server-only'
import PptxGenJS from 'pptxgenjs'
import { formula } from '@/lib/analisis'
import type { Documento } from '../documento'
import { cargarLogo, etiquetaVeredicto, hex, lineaCifra, usd } from './comun'

const W = 13.33
const TINTA = '1F2433'
const TENUE = '626A7D'
const FONDO_SUAVE = 'F4F5F9'
const FUENTE = 'Calibri'

type Diapo = ReturnType<PptxGenJS['addSlide']>

export async function generarPptx(doc: Documento): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = doc.marca.nombre
  pptx.title = `${doc.t.propuesta} ${doc.propuesta.numero}`

  const t = doc.t
  const a = doc.analisis
  const primario = hex(doc.marca.color_primario)
  const acento = hex(doc.marca.color_acento)
  const logo = await cargarLogo(doc.marca.logo_url)
  const logoData = logo ? `data:${logo.mime};base64,${logo.buffer.toString('base64')}` : null

  function base(titulo: string): Diapo {
    const s = pptx.addSlide()
    s.background = { color: 'FFFFFF' }
    s.addShape('rect', { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: primario } })
    s.addText(titulo, {
      x: 0.6,
      y: 0.35,
      w: W - 2.6,
      h: 0.7,
      fontSize: 28,
      bold: true,
      color: TINTA,
      fontFace: FUENTE,
    })
    if (logoData)
      s.addImage({
        data: logoData,
        x: W - 1.9,
        y: 0.35,
        w: 1.4,
        h: 0.55,
        sizing: { type: 'contain', w: 1.4, h: 0.55 },
      })
    s.addText(`${doc.marca.nombre} · ${doc.propuesta.numero}`, {
      x: 0.6,
      y: 7.0,
      w: 6,
      h: 0.3,
      fontSize: 9,
      color: '8A91A3',
      fontFace: FUENTE,
    })
    return s
  }

  function vinetas(
    s: Diapo,
    items: string[],
    x: number,
    y: number,
    w: number,
    h: number,
    tamano = 15,
  ) {
    s.addText(
      items.map((texto) => ({
        text: texto,
        options: { bullet: { code: '25CF' }, breakLine: true },
      })),
      {
        x,
        y,
        w,
        h,
        fontSize: tamano,
        color: TINTA,
        fontFace: FUENTE,
        valign: 'top',
        paraSpaceAfter: 6,
      },
    )
  }

  function tarjeta(
    s: Diapo,
    x: number,
    y: number,
    w: number,
    h: number,
    borde = 'E2E5EE',
    grosor = 1,
  ) {
    s.addShape('roundRect', {
      x,
      y,
      w,
      h,
      fill: { color: 'FFFFFF' },
      line: { color: borde, width: grosor },
      rectRadius: 0.08,
    })
  }

  // Portada
  const portada = pptx.addSlide()
  portada.background = { color: primario }
  if (logoData)
    portada.addImage({
      data: logoData,
      x: 0.8,
      y: 0.7,
      w: 2.4,
      h: 0.9,
      sizing: { type: 'contain', w: 2.4, h: 0.9 },
    })
  else
    portada.addText(doc.marca.nombre, {
      x: 0.8,
      y: 0.7,
      w: 6,
      h: 0.9,
      fontSize: 30,
      bold: true,
      color: 'FFFFFF',
      fontFace: FUENTE,
    })
  portada.addText(doc.idioma === 'en' ? doc.marca.eslogan_en : doc.marca.eslogan_es, {
    x: 0.8,
    y: 2.6,
    w: 10,
    h: 0.5,
    fontSize: 16,
    color: 'E6E1FF',
    fontFace: FUENTE,
  })
  portada.addText(t.propuesta, {
    x: 0.8,
    y: 3.1,
    w: 11,
    h: 1.1,
    fontSize: 48,
    bold: true,
    color: 'FFFFFF',
    fontFace: FUENTE,
  })
  portada.addShape('rect', { x: 0.8, y: 4.35, w: 1.2, h: 0.1, fill: { color: acento } })
  portada.addText(`${t.preparado_para}: ${doc.cliente.nombre}`, {
    x: 0.8,
    y: 4.6,
    w: 11,
    h: 0.6,
    fontSize: 22,
    color: 'FFFFFF',
    fontFace: FUENTE,
  })
  portada.addText(`${t.numero} ${doc.propuesta.numero} · ${doc.fecha}`, {
    x: 0.8,
    y: 6.5,
    w: 11,
    h: 0.4,
    fontSize: 12,
    color: 'E6E1FF',
    fontFace: FUENTE,
  })

  if (a) {
    // Resumen + negocio
    const r = base(t.resumen)
    r.addText(a.resumen_ejecutivo, {
      x: 0.6,
      y: 1.3,
      w: 7.4,
      h: 3.2,
      fontSize: 18,
      color: TINTA,
      fontFace: FUENTE,
      valign: 'top',
    })
    tarjeta(r, 8.4, 1.3, 4.3, 5.3)
    r.addText(t.lo_que_entendimos, {
      x: 8.6,
      y: 1.45,
      w: 3.9,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: primario,
      fontFace: FUENTE,
    })
    r.addText(a.negocio.descripcion, {
      x: 8.6,
      y: 1.9,
      w: 3.9,
      h: 3.2,
      fontSize: 12,
      color: TINTA,
      fontFace: FUENTE,
      valign: 'top',
    })
    r.addText(`${a.negocio.industria}\n${a.negocio.tamano}`, {
      x: 8.6,
      y: 5.2,
      w: 3.9,
      h: 1.2,
      fontSize: 11,
      color: TENUE,
      fontFace: FUENTE,
      valign: 'top',
    })

    // Madurez digital
    const m = base(`${t.madurez}: ${Math.round(a.madurez_digital.puntaje)}/100`)
    a.madurez_digital.areas.slice(0, 6).forEach((area, i) => {
      const y = 1.35 + i * 0.9
      m.addText(area.area, {
        x: 0.6,
        y,
        w: 2.6,
        h: 0.4,
        fontSize: 14,
        bold: true,
        color: TINTA,
        fontFace: FUENTE,
      })
      m.addShape('roundRect', {
        x: 3.3,
        y: y + 0.1,
        w: 4,
        h: 0.22,
        fill: { color: 'E8EAF1' },
        rectRadius: 0.1,
      })
      m.addShape('roundRect', {
        x: 3.3,
        y: y + 0.1,
        w: Math.max(0.1, (4 * area.puntaje) / 5),
        h: 0.22,
        fill: { color: acento },
        rectRadius: 0.1,
      })
      m.addText(`${area.puntaje}/5`, {
        x: 7.4,
        y,
        w: 0.8,
        h: 0.4,
        fontSize: 12,
        color: TENUE,
        fontFace: FUENTE,
      })
      m.addText(area.falta.slice(0, 3).join(' · '), {
        x: 8.3,
        y,
        w: 4.5,
        h: 0.6,
        fontSize: 10,
        color: TENUE,
        fontFace: FUENTE,
        valign: 'top',
      })
    })

    // Dolores
    for (const tipo of ['explicito', 'oculto'] as const) {
      const lista = a.dolores.filter((d) => d.tipo === tipo).slice(0, 6)
      if (!lista.length) continue
      const s = base(tipo === 'explicito' ? t.dolores_explicitos : t.dolores_ocultos)
      lista.forEach((d, i) => {
        const col = i % 3
        const fila = Math.floor(i / 3)
        const x = 0.6 + col * 4.15
        const y = 1.3 + fila * 2.8
        tarjeta(
          s,
          x,
          y,
          3.95,
          2.6,
          d.severidad === 'alta' ? 'D6336C' : 'E2E5EE',
          d.severidad === 'alta' ? 1.5 : 1,
        )
        s.addText(d.titulo, {
          x: x + 0.15,
          y: y + 0.1,
          w: 3.65,
          h: 0.6,
          fontSize: 14,
          bold: true,
          color: TINTA,
          fontFace: FUENTE,
          valign: 'top',
        })
        s.addText(d.descripcion, {
          x: x + 0.15,
          y: y + 0.7,
          w: 3.65,
          h: 1.3,
          fontSize: 11,
          color: TINTA,
          fontFace: FUENTE,
          valign: 'top',
        })
        s.addText(lineaCifra(d.impacto, doc), {
          x: x + 0.15,
          y: y + 1.85,
          w: 3.65,
          h: 0.7,
          fontSize: 9,
          bold: d.impacto.valor !== null,
          color: d.impacto.valor !== null ? 'D6336C' : TENUE,
          fontFace: FUENTE,
          valign: 'top',
        })
      })
    }

    // Solución
    const sol = base(t.solucion)
    a.soluciones.slice(0, 6).forEach((s, i) => {
      const col = i % 2
      const fila = Math.floor(i / 2)
      const x = 0.6 + col * 6.2
      const y = 1.3 + fila * 1.85
      tarjeta(sol, x, y, 6, 1.7)
      sol.addText(s.titulo, {
        x: x + 0.15,
        y: y + 0.1,
        w: 5.7,
        h: 0.4,
        fontSize: 14,
        bold: true,
        color: primario,
        fontFace: FUENTE,
      })
      sol.addText(s.descripcion, {
        x: x + 0.15,
        y: y + 0.5,
        w: 5.7,
        h: 0.8,
        fontSize: 11,
        color: TINTA,
        fontFace: FUENTE,
        valign: 'top',
      })
      sol.addText(`${t.indicador}: ${s.indicador}`, {
        x: x + 0.15,
        y: y + 1.3,
        w: 5.7,
        h: 0.3,
        fontSize: 9,
        color: TENUE,
        fontFace: FUENTE,
      })
    })

    // Arquitectura
    const arq = base(t.arquitectura)
    arq.addText(a.arquitectura.descripcion, {
      x: 0.6,
      y: 1.2,
      w: 12,
      h: 0.8,
      fontSize: 14,
      color: TINTA,
      fontFace: FUENTE,
      valign: 'top',
    })
    const pasos = a.arquitectura.flujo.slice(0, 6)
    const anchoPaso = (W - 1.2 - (pasos.length - 1) * 0.25) / Math.max(1, pasos.length)
    pasos.forEach((paso, i) => {
      const x = 0.6 + i * (anchoPaso + 0.25)
      arq.addShape('roundRect', {
        x,
        y: 2.3,
        w: anchoPaso,
        h: 1.6,
        fill: { color: i % 2 ? FONDO_SUAVE : 'EFEBFF' },
        line: { color: 'E2E5EE' },
        rectRadius: 0.08,
      })
      arq.addText(`${i + 1}`, {
        x: x + 0.12,
        y: 2.38,
        w: 0.5,
        h: 0.4,
        fontSize: 16,
        bold: true,
        color: primario,
        fontFace: FUENTE,
      })
      arq.addText(paso, {
        x: x + 0.12,
        y: 2.8,
        w: anchoPaso - 0.24,
        h: 1.05,
        fontSize: 11,
        color: TINTA,
        fontFace: FUENTE,
        valign: 'top',
      })
    })
    vinetas(
      arq,
      a.arquitectura.componentes.slice(0, 6).map((c) => `${c.nombre}: ${c.funcion}`),
      0.6,
      4.2,
      7.5,
      2.7,
      12,
    )
    arq.addText(`${t.integraciones}:\n${a.arquitectura.integraciones.join(', ')}`, {
      x: 8.4,
      y: 4.2,
      w: 4.4,
      h: 2.5,
      fontSize: 12,
      color: TENUE,
      fontFace: FUENTE,
      valign: 'top',
    })

    // Viabilidad + ROI
    const v = base(t.viabilidad)
    ;(['tecnica', 'economica', 'operativa'] as const).forEach((k, i) => {
      const x = 0.6 + i * 2.2
      v.addShape('roundRect', {
        x,
        y: 1.3,
        w: 2,
        h: 1.3,
        fill: { color: FONDO_SUAVE },
        rectRadius: 0.08,
      })
      v.addText(`${a.viabilidad[k].puntaje}/10`, {
        x,
        y: 1.4,
        w: 2,
        h: 0.7,
        fontSize: 28,
        bold: true,
        color: primario,
        align: 'center',
        fontFace: FUENTE,
      })
      v.addText(t[k], {
        x,
        y: 2.1,
        w: 2,
        h: 0.4,
        fontSize: 12,
        color: TENUE,
        align: 'center',
        fontFace: FUENTE,
      })
    })
    v.addText(`${t.veredicto}: ${etiquetaVeredicto(doc)}`, {
      x: 0.6,
      y: 2.85,
      w: 6.4,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: TINTA,
      fontFace: FUENTE,
    })
    vinetas(
      v,
      a.viabilidad.riesgos.slice(0, 4).map((r) => `${r.riesgo} → ${r.mitigacion}`),
      0.6,
      3.45,
      6.4,
      3.4,
      12,
    )
    const mes = doc.idioma === 'en' ? 'mo' : 'mes'
    const kpis: [string, string][] = [
      ...a.roi.componentes
        .filter((c) => c.calculo.valor !== null)
        .slice(0, 3)
        .map((c): [string, string] => [
          `${usd(c.calculo.valor ?? 0, doc)}/${mes}`,
          `${c.concepto} = ${formula(c.calculo, doc.idioma)}`,
        ]),
      ...(a.roi.horas.valor !== null
        ? ([
            [
              `${Math.round(a.roi.horas.valor)} h`,
              `${t.horas_mes} = ${formula(a.roi.horas, doc.idioma)}`,
            ],
          ] as [string, string][])
        : []),
      ...(doc.recuperacion_meses
        ? ([[`${doc.recuperacion_meses} ${t.meses}`, t.recuperacion]] as [string, string][])
        : []),
    ]
    v.addText(t.roi, {
      x: 7.5,
      y: 1.3,
      w: 5.2,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: TINTA,
      fontFace: FUENTE,
    })
    kpis.forEach(([valor, nombre], i) => {
      const y = 1.9 + i * 1.15
      v.addShape('roundRect', {
        x: 7.5,
        y,
        w: 5.2,
        h: 1,
        fill: { color: 'EFEBFF' },
        rectRadius: 0.08,
      })
      v.addText(valor, {
        x: 7.7,
        y: y + 0.05,
        w: 4.8,
        h: 0.55,
        fontSize: 22,
        bold: true,
        color: primario,
        fontFace: FUENTE,
      })
      v.addText(nombre, {
        x: 7.7,
        y: y + 0.58,
        w: 4.8,
        h: 0.35,
        fontSize: 11,
        color: TENUE,
        fontFace: FUENTE,
      })
    })
  }

  // Paquetes
  const pq = base(t.paquetes)
  const n = Math.max(1, doc.paquetes.length)
  const ancho = (W - 1.2 - (n - 1) * 0.3) / n
  doc.paquetes.forEach((p, i) => {
    const x = 0.6 + i * (ancho + 0.3)
    const y = 1.25
    tarjeta(pq, x, y, ancho, 5.6, p.recomendado ? primario : 'E2E5EE', p.recomendado ? 2.5 : 1)
    if (p.recomendado) {
      pq.addShape('roundRect', {
        x: x + 0.15,
        y: y + 0.15,
        w: 1.7,
        h: 0.35,
        fill: { color: primario },
        rectRadius: 0.05,
      })
      pq.addText(t.recomendado.toUpperCase(), {
        x: x + 0.15,
        y: y + 0.15,
        w: 1.7,
        h: 0.35,
        fontSize: 9,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        fontFace: FUENTE,
      })
    }
    pq.addText(p.definicion.nombre, {
      x: x + 0.15,
      y: y + 0.55,
      w: ancho - 0.3,
      h: 0.5,
      fontSize: 17,
      bold: true,
      color: TINTA,
      fontFace: FUENTE,
    })
    pq.addText(p.definicion.propuesta_valor, {
      x: x + 0.15,
      y: y + 1.05,
      w: ancho - 0.3,
      h: 0.8,
      fontSize: 10,
      color: TENUE,
      fontFace: FUENTE,
      valign: 'top',
    })
    pq.addText(usd(p.calculo.setup.total, doc), {
      x: x + 0.15,
      y: y + 1.9,
      w: ancho - 0.3,
      h: 0.55,
      fontSize: 24,
      bold: true,
      color: primario,
      fontFace: FUENTE,
    })
    pq.addText(
      `${t.implementacion} ${t.con_iva} · ${usd(p.calculo.setup.base, doc)} ${t.sin_iva}`,
      {
        x: x + 0.15,
        y: y + 2.42,
        w: ancho - 0.3,
        h: 0.3,
        fontSize: 9,
        color: TENUE,
        fontFace: FUENTE,
      },
    )
    pq.addText(
      p.calculo.mensual.total
        ? `+ ${usd(p.calculo.mensual.total, doc)} / ${doc.idioma === 'en' ? 'month' : 'mes'} ${t.con_iva}`
        : t.pago_unico,
      {
        x: x + 0.15,
        y: y + 2.72,
        w: ancho - 0.3,
        h: 0.4,
        fontSize: 14,
        bold: true,
        color: TINTA,
        fontFace: FUENTE,
      },
    )
    vinetas(
      pq,
      p.items.map((it) => it.nombre),
      x + 0.15,
      y + 3.2,
      ancho - 0.3,
      2.3,
      11,
    )
  })
  const conIva = doc.idioma === 'en' ? 'included' : 'incluido'
  pq.addText(
    `${t.precios_iva} ${doc.precios.iva_pct}% ${conIva}. ${t.valida_hasta}: ${doc.valida_hasta}.`,
    {
      x: 0.6,
      y: 6.9,
      w: 10,
      h: 0.3,
      fontSize: 9,
      color: TENUE,
      fontFace: FUENTE,
    },
  )

  if (a) {
    // Plan
    const pl = base(t.plan)
    const fases = a.plan.slice(0, 5)
    const anchoFase = (W - 1.2 - (fases.length - 1) * 0.25) / Math.max(1, fases.length)
    fases.forEach((f, i) => {
      const x = 0.6 + i * (anchoFase + 0.25)
      pl.addShape('rect', {
        x,
        y: 1.3,
        w: anchoFase,
        h: 0.08,
        fill: { color: i === 0 ? acento : primario },
      })
      pl.addText(`${t.fase} ${f.fase} · ${f.semanas} ${t.semanas}`, {
        x,
        y: 1.45,
        w: anchoFase,
        h: 0.35,
        fontSize: 10,
        color: TENUE,
        fontFace: FUENTE,
      })
      pl.addText(f.nombre, {
        x,
        y: 1.8,
        w: anchoFase,
        h: 0.6,
        fontSize: 15,
        bold: true,
        color: TINTA,
        fontFace: FUENTE,
        valign: 'top',
      })
      vinetas(pl, f.entregables.slice(0, 5), x, 2.5, anchoFase, 3.5, 11)
    })

    // Cierre
    const cierre = pptx.addSlide()
    cierre.background = { color: primario }
    cierre.addText(t.siguiente_paso, {
      x: 0.8,
      y: 1.6,
      w: 11,
      h: 0.7,
      fontSize: 30,
      bold: true,
      color: 'FFFFFF',
      fontFace: FUENTE,
    })
    cierre.addText(a.siguiente_paso, {
      x: 0.8,
      y: 2.5,
      w: 11.5,
      h: 2,
      fontSize: 20,
      color: 'FFFFFF',
      fontFace: FUENTE,
      valign: 'top',
    })
    cierre.addText(
      [doc.marca.nombre, doc.marca.email, doc.marca.telefono, doc.marca.sitio_web]
        .filter(Boolean)
        .join('   ·   '),
      { x: 0.8, y: 6.3, w: 11.5, h: 0.5, fontSize: 14, color: 'E6E1FF', fontFace: FUENTE },
    )
  }

  const salida = await pptx.write({ outputType: 'nodebuffer' })
  return salida as Buffer
}
