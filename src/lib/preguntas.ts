import type { Idioma } from './tipos'

/**
 * Guía de la primera reunión. La misma pregunta vive en el celular del
 * cliente y en el iPad del consultor (misma clave), así lo que el cliente
 * responde ya no se vuelve a preguntar.
 *
 * Diseño para cero resistencia y mínimo esfuerzo:
 * - Primero lo fácil (qué vende, cuánto), al final lo sensible (inversión).
 * - Lo que se puede tocar se toca (opciones); se escribe solo lo que aporta.
 * - Las de "sondeo" destapan dolores ocultos sin preguntar por el dolor:
 *   tiempos, noches, ausencias, visibilidad. Son las que más revelan.
 */

export type Opcion = { es: string; en: string }

export type Pregunta = {
  id: string
  es: string
  en: string
  tipo: 'texto' | 'unica' | 'multiple'
  opciones?: Opcion[]
  ejemplo_es?: string
  ejemplo_en?: string
  /** Aparece en el formulario del celular del cliente. */
  cliente: boolean
  sondeo?: boolean
}

export type Seccion = {
  id: string
  es: string
  en: string
  intro_es: string
  intro_en: string
  preguntas: Pregunta[]
}

const o = (es: string, en: string): Opcion => ({ es, en })

export const SECCIONES: Seccion[] = [
  {
    id: 'negocio',
    es: 'Tu negocio',
    en: 'Your business',
    intro_es: 'Para entender a qué te dedicas.',
    intro_en: 'So we understand what you do.',
    preguntas: [
      {
        id: 'negocio_que_hace',
        es: '¿Qué vende tu negocio y quién es tu cliente típico?',
        en: 'What does your business sell and who is your typical customer?',
        ejemplo_es: 'Ej.: tratamientos dentales para familias de Quito norte',
        ejemplo_en: 'E.g.: dental treatments for families in north Quito',
        tipo: 'texto',
        cliente: true,
      },
      {
        id: 'negocio_equipo',
        es: '¿Cuántas personas trabajan contigo?',
        en: 'How many people work with you?',
        tipo: 'unica',
        opciones: [
          o('Solo yo', 'Just me'),
          o('2 a 5', '2 to 5'),
          o('6 a 15', '6 to 15'),
          o('16 a 50', '16 to 50'),
          o('Más de 50', 'More than 50'),
        ],
        cliente: true,
      },
      {
        id: 'negocio_volumen',
        es: 'Más o menos, ¿cuántos clientes o pedidos atienden al mes y cuánto deja cada uno en promedio?',
        en: 'Roughly, how many customers or orders do you handle per month and how much does each one bring on average?',
        ejemplo_es: 'Ej.: unos 300 al mes, $80 en promedio',
        ejemplo_en: 'E.g.: about 300 a month, $80 on average',
        tipo: 'texto',
        cliente: true,
      },
      {
        id: 'negocio_canales',
        es: '¿Por dónde te llegan los clientes?',
        en: 'Where do your customers come from?',
        tipo: 'multiple',
        opciones: [
          o('WhatsApp', 'WhatsApp'),
          o('Instagram / Facebook', 'Instagram / Facebook'),
          o('Llamadas', 'Phone calls'),
          o('Local físico', 'Walk-ins'),
          o('Página web', 'Website'),
          o('Referidos', 'Referrals'),
          o('Portales o marketplaces', 'Portals or marketplaces'),
          o('Visitas o ventas en campo', 'Field sales'),
        ],
        cliente: true,
      },
    ],
  },
  {
    id: 'hoy',
    es: 'Cómo trabajan hoy',
    en: 'How you work today',
    intro_es: 'Sin juicios: así funciona casi todo negocio que crece.',
    intro_en: 'No judgment: this is how most growing businesses work.',
    preguntas: [
      {
        id: 'ventas_proceso',
        es: 'Cuéntanos qué pasa desde que alguien te escribe hasta que te compra.',
        en: 'Tell us what happens from the moment someone contacts you until they buy.',
        ejemplo_es: 'Ej.: escriben por WhatsApp, les mando precios, agendo una visita…',
        ejemplo_en: 'E.g.: they message on WhatsApp, I send prices, we book a visit…',
        tipo: 'texto',
        cliente: true,
      },
      {
        id: 'tecnologia_herramientas',
        es: '¿Con qué herramientas trabajan?',
        en: 'Which tools do you use?',
        tipo: 'multiple',
        opciones: [
          o('WhatsApp Business', 'WhatsApp Business'),
          o('Excel o Google Sheets', 'Excel or Google Sheets'),
          o('Cuaderno o papel', 'Notebook or paper'),
          o('Sistema de facturación', 'Billing system'),
          o('Un CRM', 'A CRM'),
          o('Software de mi industria', 'Industry software'),
          o('Ninguna en especial', 'Nothing in particular'),
        ],
        cliente: true,
      },
      {
        id: 'ventas_tiempo_respuesta',
        es: 'Cuando llega un mensaje nuevo, ¿en cuánto tiempo lo responden?',
        en: 'When a new message arrives, how soon do you reply?',
        tipo: 'unica',
        opciones: [
          o('En minutos', 'Within minutes'),
          o('En una o dos horas', 'In an hour or two'),
          o('El mismo día', 'Same day'),
          o('Al día siguiente', 'Next day'),
          o('Depende de quién esté', 'Depends on who is around'),
        ],
        cliente: true,
        sondeo: true,
      },
      {
        id: 'atencion_fuera_horario',
        es: '¿Y si te escriben de noche o el fin de semana?',
        en: 'And if they write at night or on weekends?',
        tipo: 'unica',
        opciones: [
          o('Respondemos igual', 'We still reply'),
          o('Esperan al siguiente día hábil', 'They wait until the next business day'),
          o('Muchos se pierden', 'Many are lost'),
          o('No lo sé', "I don't know"),
        ],
        cliente: true,
        sondeo: true,
      },
      {
        id: 'operacion_dependencia',
        es: 'Si la persona que más sabe del día a día falta una semana, ¿qué se complica?',
        en: 'If the person who knows the day-to-day best is away for a week, what gets harder?',
        tipo: 'texto',
        cliente: true,
        sondeo: true,
      },
    ],
  },
  {
    id: 'necesidad',
    es: 'Lo que necesitas',
    en: 'What you need',
    intro_es: 'Aquí está lo más valioso para diseñar tu solución.',
    intro_en: 'This is the most valuable part for designing your solution.',
    preguntas: [
      {
        id: 'necesidad_momento',
        es: '¿Qué sientes que necesita tu negocio en este momento?',
        en: 'What do you feel your business needs right now?',
        tipo: 'texto',
        cliente: true,
      },
      {
        id: 'necesidad_preocupa',
        es: '¿Qué es lo que más tiempo te quita o más te preocupa hoy?',
        en: 'What takes up most of your time or worries you most today?',
        tipo: 'texto',
        cliente: true,
      },
      {
        id: 'ventas_perdidos',
        es: '¿Sientes que se te escapan clientes?',
        en: 'Do you feel customers slip away?',
        tipo: 'unica',
        opciones: [
          o('Casi nunca', 'Hardly ever'),
          o('A veces', 'Sometimes'),
          o('Seguido', 'Often'),
          o('No sé cuántos', "I don't know how many"),
        ],
        cliente: true,
        sondeo: true,
      },
      {
        id: 'ventas_perdidos_donde',
        es: 'Si pasa, ¿en qué momento se pierden?',
        en: 'If it happens, at what point are they lost?',
        ejemplo_es: 'Ej.: después de enviar la cotización nadie les vuelve a escribir',
        ejemplo_en: 'E.g.: after we send the quote nobody follows up',
        tipo: 'texto',
        cliente: true,
        sondeo: true,
      },
      {
        id: 'direccion_visibilidad',
        es: '¿Sabes cada semana cuánto vendiste, qué está pendiente y quién está rindiendo?',
        en: 'Do you know every week what you sold, what is pending and who is performing?',
        tipo: 'unica',
        opciones: [
          o('Sí, al instante', 'Yes, instantly'),
          o('Más o menos', 'More or less'),
          o('Solo a fin de mes', 'Only at month end'),
          o('La verdad, no', 'Honestly, no'),
        ],
        cliente: true,
        sondeo: true,
      },
    ],
  },
  {
    id: 'vision',
    es: 'El sistema que imaginas',
    en: 'The system you imagine',
    intro_es: 'Tu visión guía el diseño. Escribe como te salga.',
    intro_en: 'Your vision guides the design. Write it however it comes.',
    preguntas: [
      {
        id: 'vision_ayuda',
        es: '¿Cómo crees que te podemos ayudar?',
        en: 'How do you think we can help you?',
        tipo: 'texto',
        cliente: true,
      },
      {
        id: 'vision_dia',
        es: 'Imagina que el sistema ya está funcionando: ¿cómo sería un día normal en tu negocio?',
        en: 'Imagine the system is already running: what would a normal day at your business look like?',
        tipo: 'texto',
        cliente: true,
      },
      {
        id: 'vision_porque',
        es: '¿Por qué crees que nosotros te podemos ayudar?',
        en: 'Why do you think we are the ones who can help you?',
        tipo: 'texto',
        cliente: true,
      },
      {
        id: 'inversion_monto',
        es: '¿Cuánto has pensado invertir en esta etapa de tu negocio?',
        en: 'How much have you considered investing at this stage of your business?',
        tipo: 'unica',
        opciones: [
          o('Menos de $3.000', 'Under $3,000'),
          o('$3.000 a $6.000', '$3,000 to $6,000'),
          o('$6.000 a $12.000', '$6,000 to $12,000'),
          o('Más de $12.000', 'Over $12,000'),
          o('Prefiero que me recomienden', "I'd rather get a recommendation"),
        ],
        cliente: true,
      },
      {
        id: 'inversion_plazo',
        es: '¿Para cuándo te gustaría verlo funcionando?',
        en: 'When would you like to see it running?',
        tipo: 'unica',
        opciones: [
          o('Este mes', 'This month'),
          o('En 1 a 3 meses', 'In 1 to 3 months'),
          o('En 3 a 6 meses', 'In 3 to 6 months'),
          o('Sin apuro', 'No rush'),
        ],
        cliente: true,
      },
    ],
  },
  {
    id: 'consultor',
    es: 'Para profundizar en la reunión',
    en: 'To dig deeper in the meeting',
    intro_es: 'Solo las ves tú. Úsalas si la conversación da pie.',
    intro_en: 'Only you see these. Use them if the conversation allows.',
    preguntas: [
      {
        id: 'sondeo_cotizar',
        es: '¿Cómo cotizan y cuánto tarda una cotización?',
        en: 'How do you quote and how long does a quote take?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
      {
        id: 'sondeo_ausentismo',
        es: '¿Agendan citas, visitas o entregas? ¿Cuántas fallan de cada 10?',
        en: 'Do you book appointments, visits or deliveries? How many out of 10 fall through?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
      {
        id: 'sondeo_errores',
        es: '¿Qué error se repite y cuánto cuesta cuando pasa?',
        en: 'Which mistake keeps happening and what does it cost?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
      {
        id: 'sondeo_reportes',
        es: '¿Quién arma los reportes o cuadra los números, y cuántas horas le toma?',
        en: 'Who builds reports or reconciles numbers, and how many hours does it take?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
      {
        id: 'sondeo_marketing',
        es: '¿Invierten en publicidad? ¿Cuánto al mes y saben qué les devuelve?',
        en: 'Do you invest in ads? How much per month and do you know the return?',
        tipo: 'texto',
        cliente: false,
      },
      {
        id: 'sondeo_intentos',
        es: '¿Han probado otro sistema antes? ¿Qué pasó?',
        en: 'Have you tried another system before? What happened?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
      {
        id: 'sondeo_decision',
        es: '¿Quién toma la decisión y quién más debe aprobarla?',
        en: 'Who makes the decision and who else must approve it?',
        tipo: 'texto',
        cliente: false,
      },
    ],
  },
]

/** Separador de opciones marcadas dentro de una respuesta de opción múltiple. */
export const SEPARADOR = ' · '

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

export function seccionesCliente() {
  return SECCIONES.map((s) => ({ ...s, preguntas: s.preguntas.filter((p) => p.cliente) })).filter(
    (s) => s.preguntas.length > 0,
  )
}

const humanizar = (id: string) => id.replace(/_/g, ' ')

/** Respuestas en texto legible para el análisis. */
export function respuestasComoTexto(respuestas: Record<string, string>, idioma: Idioma = 'es') {
  const mapa = mapaPreguntas()
  const lineas: string[] = []
  for (const [id, valor] of Object.entries(respuestas)) {
    if (!valor?.trim()) continue
    const conocida = mapa.get(id)
    if (conocida) {
      const seccion = idioma === 'en' ? conocida.seccion.en : conocida.seccion.es
      lineas.push(`[${seccion}] ${textoPregunta(conocida.pregunta, idioma)}\n→ ${valor.trim()}`)
    } else if (id.startsWith('extra:')) {
      lineas.push(`[Seguimiento] ${id.slice(6)}\n→ ${valor.trim()}`)
    } else {
      // Preguntas de versiones anteriores de la guía: se conservan con su clave.
      lineas.push(`[Otras] ${humanizar(id)}\n→ ${valor.trim()}`)
    }
  }
  return lineas.join('\n\n')
}
