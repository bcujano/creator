import type { Idioma } from './tipos'

/**
 * Guía de entrevista. La usan el consultor (en el iPad) y el cliente (en su
 * celular). Las preguntas marcadas "sondeo" buscan dolores ocultos: el cliente
 * rara vez los nombra, pero aparecen al preguntar por tiempos, dependencias y
 * lo que pasa cuando algo falla.
 */

export type Pregunta = {
  id: string
  es: string
  en: string
  ayuda_es?: string
  ayuda_en?: string
  /** Solo la ve el consultor (preguntas de sondeo que no se entregan tal cual al cliente). */
  solo_consultor?: boolean
  sondeo?: boolean
}

export type Seccion = {
  id: string
  es: string
  en: string
  preguntas: Pregunta[]
}

export const SECCIONES: Seccion[] = [
  {
    id: 'negocio',
    es: 'El negocio',
    en: 'The business',
    preguntas: [
      {
        id: 'negocio_que_hace',
        es: '¿Qué vende tu negocio y a quién?',
        en: 'What does your business sell and to whom?',
        ayuda_es: 'Productos o servicios principales y el tipo de cliente.',
        ayuda_en: 'Main products or services and the type of customer.',
      },
      {
        id: 'negocio_tamano',
        es: '¿Cuántas personas trabajan y en qué áreas?',
        en: 'How many people work there and in which areas?',
      },
      {
        id: 'negocio_volumen',
        es: '¿Cuántos clientes o pedidos atienden al mes? ¿Cuál es el ticket promedio?',
        en: 'How many customers or orders do you handle per month? What is the average ticket?',
      },
      {
        id: 'negocio_meta',
        es: '¿Qué quieres lograr en los próximos 12 meses?',
        en: 'What do you want to achieve in the next 12 months?',
      },
    ],
  },
  {
    id: 'ventas',
    es: 'Ventas y clientes',
    en: 'Sales and customers',
    preguntas: [
      {
        id: 'ventas_origen',
        es: '¿Por dónde llegan tus clientes? (WhatsApp, redes, referidos, local, web…)',
        en: 'Where do your customers come from? (WhatsApp, social, referrals, store, web…)',
      },
      {
        id: 'ventas_proceso',
        es: 'Cuéntame paso a paso qué pasa desde que alguien pregunta hasta que compra.',
        en: 'Walk me through what happens from the first inquiry to the purchase.',
      },
      {
        id: 'ventas_registro',
        es: '¿Dónde anotan los clientes y los seguimientos? (CRM, Excel, cuaderno, memoria)',
        en: 'Where do you record customers and follow-ups? (CRM, Excel, notebook, memory)',
      },
      {
        id: 'ventas_tiempo_respuesta',
        es: '¿Cuánto tardan en responder un mensaje nuevo? ¿Y fuera de horario?',
        en: 'How long does it take to reply to a new message? And after hours?',
        sondeo: true,
      },
      {
        id: 'ventas_perdidos',
        es: '¿Cuántos interesados crees que se pierden sin que nadie les vuelva a escribir?',
        en: 'How many prospects do you think are lost because nobody follows up?',
        sondeo: true,
      },
      {
        id: 'ventas_cotizar',
        es: '¿Cómo cotizan y cuánto tiempo toma hacer una cotización?',
        en: 'How do you prepare quotes and how long does each one take?',
      },
    ],
  },
  {
    id: 'atencion',
    es: 'Atención y comunicación',
    en: 'Service and communication',
    preguntas: [
      {
        id: 'atencion_canales',
        es: '¿Por qué canales atienden y quién responde cada uno?',
        en: 'Which channels do you serve customers on and who answers each one?',
      },
      {
        id: 'atencion_repetitivas',
        es: '¿Qué preguntas les hacen una y otra vez?',
        en: 'Which questions do customers ask over and over?',
      },
      {
        id: 'atencion_llamadas',
        es: '¿Reciben o hacen llamadas? ¿Se pierden llamadas?',
        en: 'Do you make or receive calls? Are calls missed?',
      },
      {
        id: 'atencion_citas',
        es: '¿Agendan citas, visitas o entregas? ¿La gente falta o se olvida?',
        en: 'Do you schedule appointments, visits or deliveries? Do people no-show or forget?',
      },
    ],
  },
  {
    id: 'operacion',
    es: 'Operación',
    en: 'Operations',
    preguntas: [
      {
        id: 'operacion_tareas',
        es: '¿Qué tareas repetitivas le quitan más tiempo al equipo cada semana?',
        en: 'Which repetitive tasks take the most team time each week?',
      },
      {
        id: 'operacion_documentos',
        es: '¿Qué documentos preparan a mano? (contratos, informes, facturas, actas)',
        en: 'Which documents do you prepare by hand? (contracts, reports, invoices, minutes)',
      },
      {
        id: 'operacion_dependencia',
        es: 'Si la persona clave se enferma una semana, ¿qué se detiene?',
        en: 'If the key person is sick for a week, what stops?',
        sondeo: true,
      },
      {
        id: 'operacion_errores',
        es: '¿Qué errores se repiten y cuánto cuestan cuando pasan?',
        en: 'Which mistakes keep happening and what do they cost?',
        sondeo: true,
      },
      {
        id: 'operacion_procesos',
        es: '¿Los procesos están escritos o viven en la cabeza de las personas?',
        en: 'Are processes documented or do they live in people’s heads?',
      },
    ],
  },
  {
    id: 'marketing',
    es: 'Marketing',
    en: 'Marketing',
    preguntas: [
      {
        id: 'marketing_redes',
        es: '¿Publican en redes? ¿Quién lo hace y con qué frecuencia?',
        en: 'Do you post on social media? Who does it and how often?',
      },
      {
        id: 'marketing_pauta',
        es: '¿Invierten en publicidad? ¿Cuánto al mes y saben qué resultado les da?',
        en: 'Do you invest in ads? How much per month and do you know the return?',
      },
    ],
  },
  {
    id: 'direccion',
    es: 'Dirección y datos',
    en: 'Management and data',
    preguntas: [
      {
        id: 'direccion_visibilidad',
        es: '¿Cómo sabes hoy cuánto vendiste, qué está pendiente y quién está rindiendo?',
        en: 'How do you know today what you sold, what is pending and who is performing?',
        sondeo: true,
      },
      {
        id: 'direccion_reportes',
        es: '¿Quién arma los reportes y cuánto tiempo le toma?',
        en: 'Who builds reports and how long does it take?',
      },
      {
        id: 'direccion_insomnio',
        es: '¿Qué es lo que más te preocupa del negocio hoy?',
        en: 'What worries you most about the business today?',
      },
    ],
  },
  {
    id: 'tecnologia',
    es: 'Herramientas actuales',
    en: 'Current tools',
    preguntas: [
      {
        id: 'tecnologia_herramientas',
        es: '¿Qué sistemas y herramientas usan? (facturación, contabilidad, CRM, Excel, WhatsApp Business…)',
        en: 'Which systems and tools do you use? (billing, accounting, CRM, Excel, WhatsApp Business…)',
      },
      {
        id: 'tecnologia_intentos',
        es: '¿Han intentado implementar algún sistema antes? ¿Qué pasó?',
        en: 'Have you tried implementing a system before? What happened?',
        sondeo: true,
      },
      {
        id: 'tecnologia_presupuesto',
        es: '¿Qué inversión tienen en mente para resolver esto?',
        en: 'What investment do you have in mind to solve this?',
        solo_consultor: true,
      },
      {
        id: 'tecnologia_decision',
        es: '¿Quién toma la decisión y para cuándo necesitan resultados?',
        en: 'Who makes the decision and when do you need results?',
        solo_consultor: true,
      },
    ],
  },
]

export function textoPregunta(p: Pregunta, idioma: Idioma) {
  return idioma === 'en' ? p.en : p.es
}

export function mapaPreguntas() {
  const mapa = new Map<string, { pregunta: Pregunta; seccion: Seccion }>()
  for (const seccion of SECCIONES) {
    for (const pregunta of seccion.preguntas) mapa.set(pregunta.id, { pregunta, seccion })
  }
  return mapa
}

/** Respuestas en texto legible para el análisis. Incluye preguntas sugeridas por la IA. */
export function respuestasComoTexto(respuestas: Record<string, string>, idioma: Idioma = 'es') {
  const mapa = mapaPreguntas()
  const lineas: string[] = []
  for (const [id, valor] of Object.entries(respuestas)) {
    if (!valor?.trim()) continue
    const conocida = mapa.get(id)
    if (conocida) {
      lineas.push(
        `[${idioma === 'en' ? conocida.seccion.en : conocida.seccion.es}] ${textoPregunta(conocida.pregunta, idioma)}\n→ ${valor.trim()}`,
      )
    } else if (id.startsWith('extra:')) {
      lineas.push(`[Seguimiento] ${id.slice(6)}\n→ ${valor.trim()}`)
    }
  }
  return lineas.join('\n\n')
}
