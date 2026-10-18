import type { Opcion, Pregunta, Seccion } from './preguntas'

/**
 * En qué se enfoca el sistema que vamos a diseñar. Antes todo apuntaba a ventas;
 * ahora el consultor (o el cliente desde su celular) elige hasta tres áreas y de
 * ahí sale todo: las preguntas de la entrevista, el copiloto, el análisis y los
 * paquetes. Las preguntas de ventas conservan sus claves de siempre para que las
 * respuestas guardadas sigan valiendo.
 */

export type IdEnfoque =
  | 'ventas'
  | 'atencion'
  | 'operacion'
  | 'inventario'
  | 'finanzas'
  | 'equipo'
  | 'direccion'
  | 'marketing'

export type Enfoque = {
  id: IdEnfoque
  es: string
  en: string
  resumen_es: string
  resumen_en: string
  /** Sistemas típicos, para que el cliente reconozca su caso. */
  ejemplos_es: string
  ejemplos_en: string
  /** Qué buscar y cómo diseñar cuando este es el foco (va en el prompt del análisis). */
  guia_ia: string
  /** Categorías del catálogo que suelen resolverlo; si no alcanza, módulos a medida. */
  categorias: string[]
  preguntas: Pregunta[]
}

export const MAX_ENFOQUES = 3

const o = (es: string, en: string): Opcion => ({ es, en })

export const ENFOQUES: Enfoque[] = [
  {
    id: 'ventas',
    es: 'Ventas y comercial',
    en: 'Sales',
    resumen_es: 'Conseguir más clientes, responder rápido, dar seguimiento y cerrar más ventas.',
    resumen_en: 'Win more customers, reply fast, follow up and close more deals.',
    ejemplos_es: 'CRM con agente de WhatsApp, cotizador, seguimientos automáticos',
    ejemplos_en: 'CRM with a WhatsApp agent, quoting tool, automatic follow-ups',
    guia_ia:
      'Busca prospectos que se pierden sin respuesta o sin seguimiento, tiempos de respuesta, cotizaciones manuales, clientes que no vuelven y falta de embudo. Indicadores: tiempo de respuesta, conversión, recompra, ticket promedio.',
    categorias: ['ventas', 'crm', 'atencion', 'vertical', 'voz'],
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
        id: 'sondeo_cotizar',
        es: '¿Cómo cotizan y cuánto tarda una cotización?',
        en: 'How do you quote and how long does a quote take?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
    ],
  },
  {
    id: 'atencion',
    es: 'Atención al cliente y servicio',
    en: 'Customer service',
    resumen_es:
      'Responder dudas, atender reclamos, agendar citas y cuidar al cliente después de la venta.',
    resumen_en:
      'Answer questions, handle complaints, book appointments and care for customers after the sale.',
    ejemplos_es: 'Agente que responde 24/7, citas con recordatorios, seguimiento de casos',
    ejemplos_en: '24/7 answering agent, appointments with reminders, case tracking',
    guia_ia:
      'Busca preguntas repetidas que consumen al equipo, reclamos sin registro ni dueño, citas que fallan, clientes sin respuesta fuera de horario y falta de medición de satisfacción. Indicadores: tiempo de respuesta, casos resueltos al primer contacto, ausentismo, satisfacción.',
    categorias: ['atencion', 'voz', 'crm'],
    preguntas: [
      {
        id: 'atencion_consultas',
        es: '¿Qué te preguntan o piden más seguido tus clientes?',
        en: 'What do your customers ask or request most often?',
        ejemplo_es: 'Ej.: horarios, estado de su pedido, precios, cambiar una cita',
        ejemplo_en: 'E.g.: opening hours, order status, prices, rescheduling',
        tipo: 'texto',
        cliente: true,
      },
      {
        id: 'atencion_volumen',
        es: 'Más o menos, ¿cuántos mensajes, llamadas o reclamos de clientes reciben al día?',
        en: 'Roughly, how many customer messages, calls or complaints do you get per day?',
        tipo: 'unica',
        opciones: [
          o('Menos de 10', 'Fewer than 10'),
          o('10 a 30', '10 to 30'),
          o('30 a 100', '30 to 100'),
          o('Más de 100', 'More than 100'),
          o('No lo sé', "I don't know"),
        ],
        cliente: true,
        sondeo: true,
      },
      {
        id: 'atencion_reclamos',
        es: 'Cuando un cliente tiene un problema o un reclamo, ¿qué pasa?',
        en: 'When a customer has a problem or complaint, what happens?',
        ejemplo_es: 'Ej.: lo atiende quien esté, a veces se olvida, no queda registrado',
        ejemplo_en:
          "E.g.: whoever is around handles it, sometimes it's forgotten, nothing is logged",
        tipo: 'texto',
        cliente: true,
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
        id: 'sondeo_satisfaccion',
        es: '¿Miden si sus clientes quedan satisfechos o vuelven? ¿Cómo?',
        en: 'Do you measure whether customers are satisfied or come back? How?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
    ],
  },
  {
    id: 'operacion',
    es: 'Operación y procesos',
    en: 'Operations and processes',
    resumen_es:
      'Ordenar pedidos, trabajos y tareas del equipo para que todo salga a tiempo y sin errores.',
    resumen_en:
      'Organize orders, jobs and team tasks so everything ships on time and without errors.',
    ejemplos_es: 'Órdenes de trabajo, tablero de tareas, control de calidad, procesos documentados',
    ejemplos_en: 'Work orders, task board, quality control, documented processes',
    guia_ia:
      'Busca cuellos de botella, retrabajos y errores repetidos, dependencia de personas clave, tareas que se coordinan por WhatsApp o de palabra, falta de trazabilidad de pedidos y capacidad que no escala. Indicadores: tiempo de ciclo, entregas a tiempo, retrabajo, horas manuales. El catálogo cubre poco aquí: usa el levantamiento de procesos y módulos a medida para lo específico.',
    categorias: ['operacion', 'consultoria', 'crm', 'direccion'],
    preguntas: [
      {
        id: 'operacion_flujo',
        es: 'Cuéntanos qué pasa desde que entra un pedido o un trabajo hasta que se entrega.',
        en: 'Tell us what happens from the moment an order or job comes in until it is delivered.',
        ejemplo_es: 'Ej.: llega por WhatsApp, lo anoto, lo paso a producción, lo despachamos…',
        ejemplo_en:
          'E.g.: it comes via WhatsApp, I write it down, pass it to production, we ship it…',
        tipo: 'texto',
        cliente: true,
      },
      {
        id: 'operacion_coordinacion',
        es: '¿Cómo se reparten y controlan las tareas del equipo?',
        en: 'How are team tasks assigned and tracked?',
        tipo: 'multiple',
        opciones: [
          o('Por WhatsApp', 'Over WhatsApp'),
          o('De palabra', 'Verbally'),
          o('En una pizarra o papel', 'On a whiteboard or paper'),
          o('En Excel o Google Sheets', 'In Excel or Google Sheets'),
          o('Con un sistema', 'With a system'),
        ],
        cliente: true,
      },
      {
        id: 'operacion_cuellos',
        es: '¿Dónde se atrasa o se traba el trabajo más seguido?',
        en: 'Where does work get delayed or stuck most often?',
        tipo: 'texto',
        cliente: true,
        sondeo: true,
      },
      {
        id: 'sondeo_retrabajo',
        es: '¿Cuántas veces al mes hay que rehacer un trabajo o corregir un pedido, y cuánto cuesta?',
        en: 'How many times a month do you redo a job or fix an order, and what does it cost?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
      {
        id: 'sondeo_capacidad',
        es: 'Si mañana les llegara el doble de trabajo, ¿qué se rompe primero?',
        en: 'If you got twice the work tomorrow, what would break first?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
    ],
  },
  {
    id: 'inventario',
    es: 'Inventario, compras y logística',
    en: 'Inventory, purchasing and logistics',
    resumen_es: 'Saber qué hay en bodega, comprar a tiempo y entregar sin errores.',
    resumen_en: 'Know what is in stock, buy on time and deliver without errors.',
    ejemplos_es: 'Control de stock con alertas, pedidos a proveedores, rutas de entrega',
    ejemplos_en: 'Stock control with alerts, supplier orders, delivery routes',
    guia_ia:
      'Busca quiebres de stock y sobrestock, dinero parado en inventario, mermas o productos vencidos, compras de último minuto, entregas tardías o con error y conteos manuales. Indicadores: rotación, quiebres por mes, merma, entregas a tiempo. El catálogo casi no lo cubre: diseña módulos a medida (control de inventario, compras, rutas) y conecta con lo que ya usan.',
    categorias: ['operacion'],
    preguntas: [
      {
        id: 'inventario_control',
        es: '¿Cómo controlan lo que tienen en bodega?',
        en: 'How do you keep track of what is in stock?',
        tipo: 'unica',
        opciones: [
          o('No lo controlamos', "We don't"),
          o('En un cuaderno', 'In a notebook'),
          o('En Excel o Google Sheets', 'In Excel or Google Sheets'),
          o('Con un sistema', 'With a system'),
          o('Contamos de vez en cuando', 'We count once in a while'),
        ],
        cliente: true,
      },
      {
        id: 'inventario_quiebres',
        es: '¿Les pasa que se acaba un producto o que sobra demasiado?',
        en: 'Do you run out of products or end up with too much?',
        tipo: 'unica',
        opciones: [
          o('Casi nunca', 'Hardly ever'),
          o('A veces', 'Sometimes'),
          o('Seguido', 'Often'),
        ],
        cliente: true,
        sondeo: true,
      },
      {
        id: 'inventario_entregas',
        es: '¿Cómo organizan las compras a proveedores y las entregas a clientes?',
        en: 'How do you organize supplier purchases and customer deliveries?',
        tipo: 'texto',
        cliente: true,
      },
      {
        id: 'sondeo_inventario_valor',
        es: '¿Cuánto dinero tienen parado en inventario y cuánto se pierde al mes por vencido, dañado o faltante?',
        en: 'How much money is tied up in inventory and how much is lost monthly to expired, damaged or missing stock?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
      {
        id: 'sondeo_entregas',
        es: '¿Cuántas entregas hacen al día y cuántas salen tarde o con error?',
        en: 'How many deliveries do you make per day and how many are late or wrong?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
    ],
  },
  {
    id: 'finanzas',
    es: 'Administración y finanzas',
    en: 'Administration and finance',
    resumen_es:
      'Facturar, cobrar a tiempo, pagar en orden y saber cuánta plata habrá el próximo mes.',
    resumen_en:
      'Invoice, collect on time, pay in order and know how much cash you will have next month.',
    ejemplos_es: 'Cobranza automática por WhatsApp, flujo de caja, conciliación, facturación',
    ejemplos_en: 'Automatic WhatsApp collections, cash flow, reconciliation, invoicing',
    guia_ia:
      'Busca cartera vencida, cobros que dependen de que alguien se acuerde, horas en facturar y conciliar, pagos atrasados a proveedores con recargos y falta de visibilidad del flujo de caja. Indicadores: días de cobro, cartera vencida, horas administrativas, costo de recargos. Integra con su sistema de facturación o contable (incluido, no se cobra aparte); lo que el catálogo no cubra va como módulo a medida.',
    categorias: ['operacion', 'direccion'],
    preguntas: [
      {
        id: 'finanzas_cobranza',
        es: '¿Les cuesta cobrar a tiempo?',
        en: 'Is it hard to get paid on time?',
        tipo: 'unica',
        opciones: [
          o('No, cobramos al contado', 'No, we get paid upfront'),
          o('A veces', 'Sometimes'),
          o('Seguido', 'Often'),
          o('Tenemos mucha cartera vencida', 'We have a lot of overdue receivables'),
        ],
        cliente: true,
        sondeo: true,
      },
      {
        id: 'finanzas_flujo',
        es: '¿Sabes hoy cuánto dinero tendrás disponible el próximo mes?',
        en: 'Do you know today how much cash you will have next month?',
        tipo: 'unica',
        opciones: [o('Sí', 'Yes'), o('Más o menos', 'More or less'), o('No', 'No')],
        cliente: true,
        sondeo: true,
      },
      {
        id: 'finanzas_tareas',
        es: '¿Qué tareas administrativas les quitan más tiempo?',
        en: 'Which administrative tasks take the most time?',
        ejemplo_es: 'Ej.: facturar, cuadrar el banco, pagar proveedores, cerrar caja',
        ejemplo_en: 'E.g.: invoicing, bank reconciliation, paying suppliers, closing the till',
        tipo: 'texto',
        cliente: true,
      },
      {
        id: 'sondeo_cartera',
        es: '¿Cuánto les deben hoy sus clientes y cuánto de eso tiene más de 30 días?',
        en: 'How much do customers owe you today and how much is over 30 days old?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
      {
        id: 'sondeo_contabilidad',
        es: '¿Quién lleva la contabilidad y cuántas horas al mes se van en facturar y cuadrar?',
        en: 'Who does the bookkeeping and how many hours a month go into invoicing and reconciling?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
    ],
  },
  {
    id: 'equipo',
    es: 'Equipo y personas',
    en: 'Team and people',
    resumen_es: 'Controlar turnos y asistencia, calcular pagos, capacitar y saber quién rinde.',
    resumen_en: 'Manage shifts and attendance, calculate pay, train people and know who performs.',
    ejemplos_es:
      'Control de asistencia, cálculo de comisiones, inducción con IA, evaluación del equipo',
    ejemplos_en: 'Attendance tracking, commission calculation, AI onboarding, team evaluation',
    guia_ia:
      'Busca horas en calcular turnos, nómina o comisiones, rotación alta, inducciones largas que dependen de una persona, tareas sin responsable y falta de medición del desempeño. Indicadores: horas administrativas de personal, tiempo hasta que un nuevo rinde, rotación. Respeta la Ley Orgánica de Protección de Datos Personales con los datos del personal.',
    categorias: ['consultoria', 'direccion'],
    preguntas: [
      {
        id: 'equipo_control',
        es: '¿Cómo controlan horarios, asistencia y tareas de cada persona?',
        en: "How do you track each person's schedule, attendance and tasks?",
        tipo: 'texto',
        cliente: true,
      },
      {
        id: 'equipo_rotacion',
        es: '¿Les cuesta conseguir o mantener personal?',
        en: 'Is it hard to hire or keep staff?',
        tipo: 'unica',
        opciones: [o('No', 'No'), o('A veces', 'Sometimes'), o('Mucho', 'A lot')],
        cliente: true,
        sondeo: true,
      },
      {
        id: 'equipo_induccion',
        es: 'Cuando entra alguien nuevo, ¿cómo aprende el trabajo y cuánto se demora en rendir?',
        en: 'When someone new joins, how do they learn the job and how long until they perform?',
        tipo: 'texto',
        cliente: true,
        sondeo: true,
      },
      {
        id: 'sondeo_nomina',
        es: '¿Cuántas horas al mes se van en calcular pagos, comisiones o turnos?',
        en: 'How many hours a month go into calculating pay, commissions or shifts?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
      {
        id: 'sondeo_desempeno',
        es: '¿Cómo saben quién está rindiendo y quién no?',
        en: 'How do you know who is performing and who is not?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
    ],
  },
  {
    id: 'direccion',
    es: 'Dirección y datos',
    en: 'Management and data',
    resumen_es: 'Ver los números del negocio a diario y decidir con datos, no a ciegas.',
    resumen_en: 'See your business numbers daily and decide with data, not blindly.',
    ejemplos_es:
      'Panel de indicadores, alertas diarias, asistente que responde con los datos del negocio',
    ejemplos_en: 'KPI dashboard, daily alerts, assistant that answers with business data',
    guia_ia:
      'Busca información dispersa en varios lugares, reportes que se arman a mano, decisiones tomadas por intuición y problemas que el dueño descubre tarde. Indicadores: horas en reportes, tiempo para detectar un problema, decisiones con datos.',
    categorias: ['direccion', 'crm'],
    preguntas: [
      {
        id: 'direccion_decisiones',
        es: '¿Qué decisión importante tomas hoy a ciegas o por intuición?',
        en: 'Which important decision do you make today blindly or by gut feeling?',
        tipo: 'texto',
        cliente: true,
        sondeo: true,
      },
      {
        id: 'direccion_indicadores',
        es: '¿Qué números te gustaría ver cada mañana en tu celular?',
        en: 'Which numbers would you like to see on your phone every morning?',
        ejemplo_es: 'Ej.: ventas del día, cobros pendientes, pedidos atrasados',
        ejemplo_en: 'E.g.: daily sales, pending collections, late orders',
        tipo: 'texto',
        cliente: true,
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
        id: 'sondeo_fuentes',
        es: '¿En cuántos lugares está la información (sistemas, Excel, WhatsApp) y quién la junta?',
        en: 'In how many places does information live (systems, Excel, WhatsApp) and who pulls it together?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
    ],
  },
  {
    id: 'marketing',
    es: 'Marketing y presencia digital',
    en: 'Marketing and online presence',
    resumen_es: 'Publicar con constancia, atraer clientes nuevos y saber qué publicidad funciona.',
    resumen_en: 'Post consistently, attract new customers and know which ads work.',
    ejemplos_es: 'Contenido con IA, campañas en Meta, medición del retorno de la publicidad',
    ejemplos_en: 'AI content, Meta campaigns, ad return tracking',
    guia_ia:
      'Busca publicación irregular, contenido que depende de una sola persona, publicidad sin medición del retorno y clientes nuevos que llegan solo por referidos. Indicadores: frecuencia de publicación, costo por cliente nuevo, retorno de la publicidad.',
    categorias: ['marketing', 'ventas'],
    preguntas: [
      {
        id: 'marketing_redes',
        es: '¿Con qué frecuencia publican en redes?',
        en: 'How often do you post on social media?',
        tipo: 'unica',
        opciones: [
          o('Casi nunca', 'Hardly ever'),
          o('Cada semana', 'Weekly'),
          o('Varias veces por semana', 'Several times a week'),
          o('A diario', 'Daily'),
        ],
        cliente: true,
      },
      {
        id: 'marketing_contenido',
        es: '¿Quién hace el contenido y cuánto tiempo le toma?',
        en: 'Who creates the content and how long does it take?',
        tipo: 'texto',
        cliente: true,
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
        id: 'sondeo_costo_cliente',
        es: '¿Saben de dónde vienen sus mejores clientes y cuánto les cuesta conseguir uno?',
        en: 'Do you know where your best customers come from and what it costs to get one?',
        tipo: 'texto',
        cliente: false,
        sondeo: true,
      },
    ],
  },
]

/** Para validar en las rutas (zod necesita una tupla). */
export const IDS_ENFOQUE = [
  'ventas',
  'atencion',
  'operacion',
  'inventario',
  'finanzas',
  'equipo',
  'direccion',
  'marketing',
] as const satisfies readonly IdEnfoque[]

const POR_ID = new Map(ENFOQUES.map((e) => [e.id, e]))

export function enfoque(id: string) {
  return POR_ID.get(id as IdEnfoque)
}

export function nombreEnfoque(id: string, idioma: 'es' | 'en' = 'es') {
  const e = enfoque(id)
  return e ? (idioma === 'en' ? e.en : e.es) : id
}

/** Clave de la pregunta del cliente "¿en qué área necesitas más ayuda?". */
export const PREGUNTA_AREAS = 'necesidad_areas'

/** Lo que marcó el cliente (o el consultor) en esa pregunta, traducido a enfoques. */
function enfoquesDeRespuesta(valor: string | undefined): IdEnfoque[] {
  if (!valor?.trim()) return []
  const marcadas = valor.split(' · ').map((v) => v.trim().toLowerCase())
  return ENFOQUES.filter((e) =>
    marcadas.some((m) => m === e.es.toLowerCase() || m === e.en.toLowerCase()),
  ).map((e) => e.id)
}

/**
 * Enfoque vigente de una reunión: lo que eligió el consultor y, si no eligió,
 * lo que marcó el cliente en su formulario. Vacío significa "por definir".
 */
export function enfoquesDe(l: {
  enfoques?: string[] | null
  respuestas_cliente?: Record<string, string> | null
  respuestas?: Record<string, string> | null
}): IdEnfoque[] {
  const elegidos = (l.enfoques ?? []).filter((id): id is IdEnfoque => POR_ID.has(id as IdEnfoque))
  if (elegidos.length) return elegidos.slice(0, MAX_ENFOQUES)
  const delCliente = enfoquesDeRespuesta(l.respuestas_cliente?.[PREGUNTA_AREAS])
  if (delCliente.length) return delCliente.slice(0, MAX_ENFOQUES)
  return enfoquesDeRespuesta(l.respuestas?.[PREGUNTA_AREAS]).slice(0, MAX_ENFOQUES)
}

/** Una sección de la entrevista por cada enfoque elegido. */
export function seccionesDeEnfoques(ids: IdEnfoque[]): Seccion[] {
  return ids
    .map((id) => POR_ID.get(id))
    .filter((e): e is Enfoque => Boolean(e))
    .map((e) => ({
      id: `enfoque:${e.id}`,
      es: e.es,
      en: e.en,
      intro_es: e.resumen_es,
      intro_en: e.resumen_en,
      preguntas: e.preguntas,
    }))
}
