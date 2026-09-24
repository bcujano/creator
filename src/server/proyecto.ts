import 'server-only'
import { cierreEfectivo, montosPagos, pctVisible } from '@/lib/pagos'
import { respuestasComoTexto } from '@/lib/preguntas'
import type { Insumo, ItemCatalogo, Levantamiento } from '@/lib/tipos'
import type { Documento } from './documento'
import { lineaCifra, usd } from './exportar/comun'

/**
 * Brief de arranque del proyecto: un .md para dárselo a Claude (o a quien
 * construya) cuando el cliente ya firmó. Reúne en un solo archivo lo vendido,
 * lo acordado y todo lo que se aprendió del cliente, para diseñar el sistema
 * sin volver a preguntar lo que ya se sabe. Es interno: no se publica.
 */

export type ContextoProyecto = {
  levantamiento: Pick<Levantamiento, 'titulo' | 'respuestas' | 'respuestas_cliente'>
  insumos: Pick<Insumo, 'titulo' | 'tipo' | 'origen' | 'contenido' | 'estado'>[]
  catalogo: Map<string, ItemCatalogo>
}

// Tope por material para que el archivo siga siendo manejable; el original queda en CREATOR.
const MAX_MATERIAL = 4000

const lista = (items: string[]) => items.filter(Boolean).map((x) => `- ${x}`)

export function briefProyecto(doc: Documento, ctx: ContextoProyecto): string {
  const c = doc.cliente
  const a = doc.analisis
  const p = doc.propuesta
  const cierre = cierreEfectivo(p.cierre, p.datos, doc.precios.anticipo_pct)
  const elegido = doc.paquetes.find((x) => x.definicion.nivel === cierre.paquete)
  if (!elegido) throw new Error('La propuesta no tiene el paquete elegido.')
  const calc = elegido.calculo
  const L: string[] = []

  L.push(`# Proyecto aprobado · ${c.nombre}`)
  L.push('')
  L.push(
    `> Propuesta **${p.numero} v${p.version}** · paquete **${elegido.definicion.nombre}** · estado: ${p.estado} · generado el ${new Date().toISOString().slice(0, 10)} desde CREATOR (${doc.marca.nombre}).`,
  )
  L.push('')
  L.push('## Cómo usar este documento')
  L.push('')
  L.push(
    ...lista([
      'Eres el equipo técnico que va a diseñar y construir el sistema que el cliente ya aprobó y firmó. Este archivo es la fuente de verdad del alcance.',
      'Primero lee todo. Luego propone: arquitectura, modelo de datos, integraciones, plan por hitos alineado con el plazo y con las fechas de pago, y criterios de aceptación por entregable.',
      'El alcance es exactamente lo listado en "Alcance contratado". Lo que no esté ahí es adicional: anótalo como fase 2, no lo metas en el plan.',
      'No inventes datos del cliente. Si algo falta, usa "Preguntas abiertas" y agrega las tuyas antes de decidir.',
      `Productos del catálogo de ${doc.marca.nombre}: se implementan y configuran sobre la plataforma existente; los marcados "a medida" se construyen nuevos.`,
    ]),
  )

  L.push('', '## Cliente', '')
  L.push(
    ...lista([
      `Nombre comercial: ${c.nombre}`,
      c.razon_social ? `Razón social: ${c.razon_social}` : '',
      c.ruc ? `RUC: ${c.ruc}` : '',
      c.industria ? `Industria: ${c.industria}` : '',
      c.ciudad ? `Ciudad: ${c.ciudad}` : '',
      c.empleados ? `Empleados: ${c.empleados}` : '',
      c.sitio_web ? `Sitio web: ${c.sitio_web}` : '',
      c.contacto_nombre
        ? `Contacto: ${c.contacto_nombre}${c.contacto_cargo ? ` (${c.contacto_cargo})` : ''}${c.email ? ` · ${c.email}` : ''}${c.telefono ? ` · ${c.telefono}` : ''}`
        : '',
    ]),
  )
  if (a) {
    L.push('', a.negocio.descripcion)
    L.push(
      '',
      ...lista([
        `Modelo de negocio: ${a.negocio.modelo_de_negocio}`,
        `Clientes objetivo: ${a.negocio.clientes_objetivo}`,
        `Canales: ${a.negocio.canales.join(', ')}`,
        `Tamaño: ${a.negocio.tamano}`,
        `Madurez digital: ${Math.round(a.madurez_digital.puntaje)}/100 (${a.madurez_digital.nivel})`,
      ]),
    )
  }

  L.push('', `## Alcance contratado: ${elegido.definicion.nombre}`, '')
  if (elegido.definicion.propuesta_valor) L.push(elegido.definicion.propuesta_valor, '')
  const aMedida = new Map((a?.modulos_a_medida ?? []).map((m) => [m.codigo, m]))
  for (const linea of elegido.definicion.lineas) {
    const item = linea.a_medida ? null : ctx.catalogo.get(linea.codigo)
    const visible = elegido.items.find((i) => i.codigo === linea.codigo)
    if (!visible) continue
    L.push(`### ${visible.nombre}${visible.a_medida ? ' (desarrollo a medida)' : ''}`)
    L.push('')
    if (visible.descripcion) L.push(visible.descripcion, '')
    if (visible.caracteristicas.length) L.push('Entregables:', ...lista(visible.caracteristicas))
    const incluidos = (item?.incluye ?? [])
      .map((cod) => ctx.catalogo.get(cod)?.nombre_es)
      .filter((n): n is string => Boolean(n))
    if (incluidos.length) L.push('', `Incluye los módulos: ${incluidos.join(', ')}.`)
    const medida = aMedida.get(linea.codigo)
    if (medida) {
      L.push(
        '',
        `Necesidad que cubre: ${medida.necesidad}`,
        `Complejidad estimada: ${medida.complejidad}, ${medida.semanas} semanas. ${medida.por_que_complejidad}`,
      )
    }
    const semanas = linea.a_medida?.semanas ?? item?.semanas
    if (semanas)
      L.push('', `Plazo de referencia: ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}.`)
    L.push('')
  }
  L.push(
    ...lista([
      `Usuarios incluidos: ${calc.usuarios.incluidos || calc.usuarios.solicitados}${calc.usuarios.extra ? ` (+${calc.usuarios.extra} extra)` : ''}`,
      ...calc.lineas
        .filter((l) => l.volumen)
        .map((l) => `Volumen incluido: ${l.volumen?.incluido} ${l.volumen?.unidad} al mes`),
      `Plazo total estimado: ${calc.semanas} semanas`,
    ]),
  )

  const otros = doc.paquetes
    .filter((x) => x !== elegido)
    .flatMap((x) => x.items.map((i) => i.nombre))
    .filter((n) => !elegido.items.some((i) => i.nombre === n))
  if (otros.length) {
    L.push('', '### Fuera de alcance (se ofrecieron, no se contrataron)', '')
    L.push(...lista([...new Set(otros)]))
  }

  L.push('', '## Condiciones acordadas', '')
  L.push('Montos con IVA incluido (lo que paga el cliente):', '')
  L.push(
    ...lista([
      `Implementación: **${usd(calc.setup.total, doc)}** (${usd(calc.setup.base, doc)} + IVA ${usd(calc.setup.iva, doc)})`,
      calc.mensual.total
        ? `Mensualidad: **${usd(calc.mensual.total, doc)}** (${usd(calc.mensual.base, doc)} + IVA ${usd(calc.mensual.iva, doc)})`
        : 'Sin mensualidad',
    ]),
  )
  L.push('', 'Plan de pagos de la implementación:', '')
  for (const [i, d] of montosPagos(cierre.pagos, calc.setup.total).entries()) {
    L.push(
      `${i + 1}. ${usd(d.monto, doc)} (${pctVisible(d.pct).toLocaleString('es-EC')} %) ${d.concepto}`,
    )
  }
  if (p.datos.condiciones) L.push('', `Condiciones particulares: ${p.datos.condiciones}`)

  if (a) {
    const dolores = (tipo: 'explicito' | 'oculto') =>
      a.dolores
        .filter((d) => d.tipo === tipo)
        .map(
          (d) =>
            `**${d.titulo}** (${d.severidad}, ${d.area}): ${d.descripcion} Evidencia: ${d.evidencia} Impacto: ${lineaCifra(d.impacto, doc)}`,
        )
    L.push('', '## Problemas que hay que resolver', '')
    L.push('Lo que contó el cliente:', ...lista(dolores('explicito')))
    L.push('', 'Lo que descubrimos:', ...lista(dolores('oculto')))

    const codigos = new Set(elegido.definicion.lineas.map((l) => l.codigo))
    // Solo lo contratado: una solución a medida entra si el paquete trae algún módulo a medida.
    const conAMedida = elegido.definicion.lineas.some((l) => l.a_medida)
    const soluciones = a.soluciones.filter(
      (s) =>
        s.codigos_catalogo.some((cod) => codigos.has(cod)) ||
        (s.a_medida && conAMedida && !s.codigos_catalogo.length),
    )
    if (soluciones.length) {
      L.push('', '## Soluciones y cómo se mide el éxito', '')
      for (const s of soluciones) {
        // Una solución puede apoyarse en productos que el cliente no contrató: se avisa.
        const fuera = s.codigos_catalogo
          .filter((cod) => !codigos.has(cod))
          .map((cod) => ctx.catalogo.get(cod)?.nombre_es ?? cod)
        L.push(
          `- **${s.titulo}**: ${s.descripcion} Resuelve: ${s.dolores_que_resuelve.join('; ')}. Indicador: ${s.indicador.replace(/\.+$/, '')}.${fuera.length ? ` ⚠️ Usa partes no contratadas: ${fuera.join(', ')}.` : ''}`,
        )
      }
    }

    L.push('', '## Arquitectura propuesta en la venta (punto de partida)', '')
    L.push(a.arquitectura.descripcion, '')
    L.push('Flujo principal:', ...a.arquitectura.flujo.map((f, i) => `${i + 1}. ${f}`))
    L.push(
      '',
      'Componentes:',
      ...lista(
        a.arquitectura.componentes.map((k) => `${k.nombre} (${k.tecnologia}): ${k.funcion}`),
      ),
    )
    L.push('', `Integraciones: ${a.arquitectura.integraciones.join(', ')}.`)

    L.push('', '## Plan presentado al cliente', '')
    L.push(
      '> Se armó para los tres paquetes: quita lo que no esté en "Alcance contratado" y ajusta los hitos a ese alcance.',
      '',
    )
    for (const f of a.plan) {
      L.push(`**Fase ${f.fase} · ${f.nombre}** (${f.semanas} semanas)`, ...lista(f.entregables), '')
    }

    L.push('## Riesgos, supuestos y condiciones', '')
    L.push(
      ...lista(
        a.viabilidad.riesgos.map(
          (r) => `Riesgo (${r.probabilidad}): ${r.riesgo} → ${r.mitigacion}`,
        ),
      ),
    )
    L.push(...lista(a.viabilidad.supuestos.map((s) => `Supuesto: ${s}`)))
    L.push(...lista(a.viabilidad.condiciones.map((s) => `Condición: ${s}`)))

    L.push('', '## Retorno esperado (para medir después)', '')
    L.push(
      ...lista([
        ...a.roi.componentes.map((k) => `${k.concepto}: ${lineaCifra(k.calculo, doc)}`),
        `Horas liberadas al mes: ${lineaCifra(a.roi.horas, doc, true)}`,
      ]),
    )

    const abiertas = [
      ...a.preguntas_pendientes,
      ...a.dolores
        .filter((d) => d.impacto.valor === null && d.impacto.pregunta_para_cuantificar)
        .map((d) => d.impacto.pregunta_para_cuantificar as string),
    ]
    if (abiertas.length) L.push('', '## Preguntas abiertas', '', ...lista([...new Set(abiertas)]))
  }

  const cliente = respuestasComoTexto(ctx.levantamiento.respuestas_cliente ?? {}, 'es')
  const consultor = respuestasComoTexto(ctx.levantamiento.respuestas ?? {}, 'es')
  if (cliente || consultor) {
    L.push('', '## Entrevista (textual)', '')
    if (cliente) L.push('### Lo que respondió el cliente en su formulario', '', cliente, '')
    if (consultor) L.push('### Lo que anotó el consultor en la reunión', '', consultor, '')
  }

  const material = ctx.insumos.filter((i) => i.estado === 'listo' && i.contenido.trim())
  if (material.length) {
    L.push('', '## Material del levantamiento', '')
    for (const m of material) {
      const texto = m.contenido.trim()
      L.push(
        `### ${m.titulo} (${m.tipo}, de ${m.origen})`,
        '',
        texto.length > MAX_MATERIAL
          ? `${texto.slice(0, MAX_MATERIAL)}\n\n[… recortado; el archivo completo está en CREATOR]`
          : texto,
        '',
      )
    }
  }

  if (p.datos.notas_internas) L.push('', '## Notas internas', '', p.datos.notas_internas)

  return `${L.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`
}
