import 'server-only'
import type { Documento } from '../documento'
import { etiquetaVeredicto, filasPaquete, usd } from './comun'

/** Markdown: para pegar en un correo, en Notion o pasarlo a otro sistema. */
export function generarMarkdown(doc: Documento): string {
  const t = doc.t
  const a = doc.analisis
  const l: string[] = []
  l.push(`# ${t.propuesta} · ${doc.cliente.nombre}`)
  l.push(
    `**${t.numero}** ${doc.propuesta.numero} · **${t.fecha}** ${doc.fecha} · **${t.valida_hasta}** ${doc.valida_hasta}`,
  )
  l.push(`_${doc.marca.nombre}_`)

  if (a) {
    l.push(`\n## ${t.resumen}\n\n${a.resumen_ejecutivo}`)
    l.push(`\n## ${t.lo_que_entendimos}\n\n${a.negocio.descripcion}`)
    l.push(`\n## ${t.madurez}: ${Math.round(a.madurez_digital.puntaje)}/100\n`)
    for (const area of a.madurez_digital.areas) {
      l.push(`- **${area.area}** ${area.puntaje}/5 — ${t.falta}: ${area.falta.join(', ') || '—'}`)
    }
    l.push(`\n## ${t.dolores}`)
    for (const tipo of ['explicito', 'oculto'] as const) {
      const lista = a.dolores.filter((d) => d.tipo === tipo)
      if (!lista.length) continue
      l.push(`\n### ${tipo === 'explicito' ? t.dolores_explicitos : t.dolores_ocultos}\n`)
      for (const d of lista) {
        const impacto = d.impacto_mensual_usd
          ? ` · ${t.impacto_mes}: ${usd(d.impacto_mensual_usd, doc)}`
          : ''
        l.push(`- **${d.titulo}** (${t[d.severidad]}${impacto}): ${d.descripcion}`)
      }
    }
    l.push(`\n## ${t.solucion}\n`)
    for (const s of a.soluciones)
      l.push(`- **${s.titulo}**: ${s.descripcion} _${t.indicador}: ${s.indicador}_`)
    l.push(`\n## ${t.arquitectura}\n\n${a.arquitectura.descripcion}\n`)
    a.arquitectura.flujo.forEach((paso, i) => {
      l.push(`${i + 1}. ${paso}`)
    })
    l.push(`\n## ${t.viabilidad}\n`)
    l.push(`**${t.veredicto}:** ${etiquetaVeredicto(doc)}\n`)
    for (const k of ['tecnica', 'economica', 'operativa'] as const) {
      l.push(`- **${t[k]} ${a.viabilidad[k].puntaje}/10**: ${a.viabilidad[k].justificacion}`)
    }
    l.push(`\n### ${t.riesgos}\n`)
    for (const r of a.viabilidad.riesgos) l.push(`- ${r.riesgo} → ${r.mitigacion}`)
    l.push(`\n## ${t.roi}\n`)
    l.push(`- ${t.ahorro_mes}: ${usd(a.roi.ahorro_mensual_usd, doc)}`)
    l.push(`- ${t.ingreso_mes}: ${usd(a.roi.ingreso_adicional_mensual_usd, doc)}`)
    l.push(`- ${t.horas_mes}: ${Math.round(a.roi.horas_ahorradas_mes)}`)
    if (doc.recuperacion_meses) l.push(`- ${t.recuperacion}: ${doc.recuperacion_meses} ${t.meses}`)
  }

  l.push(`\n## ${t.paquetes}`)
  doc.paquetes.forEach((p, i) => {
    l.push(`\n### ${p.definicion.nombre}${p.recomendado ? ` ⭐ ${t.recomendado}` : ''}\n`)
    l.push(`${p.definicion.propuesta_valor}\n`)
    l.push(`| ${t.concepto} | ${t.setup} | ${t.mensual} |`)
    l.push('|---|---:|---:|')
    for (const f of filasPaquete(doc, i)) l.push(`| ${f.concepto} | ${f.setup} | ${f.mensual} |`)
    l.push(
      `| ${t.subtotal} | ${usd(p.calculo.setup.base, doc)} | ${usd(p.calculo.mensual.base, doc)} |`,
    )
    l.push(
      `| ${t.iva} ${doc.precios.iva_pct}% | ${usd(p.calculo.setup.iva, doc)} | ${usd(p.calculo.mensual.iva, doc)} |`,
    )
    l.push(
      `| **${t.total}** | **${usd(p.calculo.setup.total, doc)}** | **${usd(p.calculo.mensual.total, doc)}** |`,
    )
  })

  if (a) {
    l.push(`\n## ${t.plan}\n`)
    for (const f of a.plan) {
      l.push(`**${t.fase} ${f.fase}: ${f.nombre}** (${f.semanas} ${t.semanas})`)
      for (const e of f.entregables) l.push(`- ${e}`)
      l.push('')
    }
    l.push(`## ${t.siguiente_paso}\n\n${a.siguiente_paso}`)
  }
  l.push(
    `\n---\n${doc.marca.nombre} · ${[doc.marca.email, doc.marca.telefono, doc.marca.sitio_web].filter(Boolean).join(' · ')}`,
  )
  return l.join('\n')
}
