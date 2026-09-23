import { AJUSTES_DEFECTO } from '../src/lib/ajustes-defecto'
import { textos } from '../src/lib/i18n'
import { calcularPaquete } from '../src/lib/precios'
import type { DatosPropuesta, ItemCatalogo } from '../src/lib/tipos'
import type { Documento } from '../src/server/documento'
import type { ResultadoAnalisis } from '../src/server/ia/esquema'

/** Un caso realista para probar las salidas sin base de datos ni IA. */

function item(
  p: Partial<ItemCatalogo> & Pick<ItemCatalogo, 'codigo' | 'tipo' | 'nombre_es'>,
): ItemCatalogo {
  return {
    id: p.codigo,
    categoria: 'x',
    nombre_en: p.nombre_es,
    descripcion_es: `Descripción de ${p.nombre_es}`,
    descripcion_en: `Description of ${p.nombre_es}`,
    caracteristicas_es: ['Primera ventaja', 'Segunda ventaja'],
    caracteristicas_en: ['First benefit', 'Second benefit'],
    resuelve: [],
    incluye: [],
    precio_setup: 0,
    precio_mensual: 0,
    costo_setup: 0,
    costo_mensual: 0,
    usuarios_incluidos: 0,
    volumen: null,
    semanas: 2,
    estado: 'listo',
    activo: true,
    orden: 0,
    ...p,
  }
}

export const CATALOGO = new Map(
  [
    item({
      codigo: 'IAGENTE_WA',
      tipo: 'paquete',
      nombre_es: 'iAgente WhatsApp + Chatwoot',
      precio_setup: 2500,
      precio_mensual: 190,
      costo_mensual: 40,
      usuarios_incluidos: 3,
      volumen: {
        unidad_es: 'conversaciones',
        unidad_en: 'conversations',
        incluido: 1000,
        precio_excedente: 0.15,
        costo_unitario: 0.04,
      },
    }),
    item({
      codigo: 'CRM_OPERATIVO',
      tipo: 'paquete',
      nombre_es: 'CRM IA · Operativo',
      precio_setup: 6500,
      precio_mensual: 390,
      costo_mensual: 140,
      usuarios_incluidos: 10,
      incluye: ['CITAS'],
      semanas: 6,
    }),
    item({
      codigo: 'CITAS',
      tipo: 'modulo',
      nombre_es: 'Citas + Calendar + recordatorios',
      precio_setup: 800,
      precio_mensual: 40,
      costo_mensual: 5,
    }),
    item({
      codigo: 'LLAMADAS',
      tipo: 'modulo',
      nombre_es: 'Llamadas con IA',
      precio_setup: 2000,
      precio_mensual: 150,
      costo_mensual: 45,
      volumen: {
        unidad_es: 'minutos',
        unidad_en: 'minutes',
        incluido: 200,
        precio_excedente: 0.35,
        costo_unitario: 0.18,
      },
    }),
    item({
      codigo: 'LEVANTAMIENTO',
      tipo: 'servicio',
      nombre_es: 'Levantamiento documental de procesos',
      precio_setup: 2800,
    }),
  ].map((i) => [i.codigo, i]),
)

export const ANALISIS: ResultadoAnalisis = {
  resumen_ejecutivo:
    'Clínica Sonrisa atiende 600 pacientes al mes y pierde citas por mensajes sin responder fuera de horario. Proponemos un agente de WhatsApp que agenda 24/7, recordatorios automáticos y un CRM que ordene el seguimiento de tratamientos.',
  negocio: {
    descripcion:
      'Clínica odontológica con tres sillones en Quito norte. Vende tratamientos de ortodoncia, estética y limpiezas.',
    industria: 'Salud · odontología',
    modelo_de_negocio: 'Servicios por cita con tratamientos de varias sesiones',
    clientes_objetivo: 'Familias y profesionales de 25 a 55 años',
    canales: ['WhatsApp', 'Instagram', 'Referidos'],
    tamano: '9 empleados · ~600 pacientes/mes · ticket promedio $85',
  },
  madurez_digital: {
    puntaje: 34,
    nivel: 'basico',
    areas: [
      {
        area: 'Ventas',
        puntaje: 2,
        tiene: ['WhatsApp Business'],
        falta: ['CRM', 'Seguimiento de presupuestos'],
      },
      {
        area: 'Atención',
        puntaje: 2,
        tiene: ['Recepcionista'],
        falta: ['Atención fuera de horario', 'Recordatorios'],
      },
      {
        area: 'Operación',
        puntaje: 3,
        tiene: ['Software clínico'],
        falta: ['Integración con agenda'],
      },
      { area: 'Dirección', puntaje: 1, tiene: [], falta: ['Indicadores', 'Reportes'] },
    ],
  },
  dolores: [
    {
      titulo: 'Mensajes sin responder fuera de horario',
      descripcion: 'Los mensajes de la noche se contestan al día siguiente.',
      tipo: 'explicito',
      area: 'Atención',
      severidad: 'alta',
      evidencia: 'La dueña dijo que “en la noche nadie contesta”.',
      impacto_mensual_usd: 1700,
      costo_de_no_actuar: 'Los pacientes agendan con la competencia.',
    },
    {
      titulo: 'Presupuestos que nadie sigue',
      descripcion: 'Se entregan presupuestos de ortodoncia y no se hace seguimiento.',
      tipo: 'oculto',
      area: 'Ventas',
      severidad: 'alta',
      evidencia: 'No hay registro de presupuestos entregados.',
      impacto_mensual_usd: 2400,
      costo_de_no_actuar: 'Tratamientos de alto valor que se enfrían.',
    },
    {
      titulo: 'Dependencia de la recepcionista',
      descripcion: 'La agenda vive en la cabeza de una persona.',
      tipo: 'oculto',
      area: 'Operación',
      severidad: 'media',
      evidencia: '“Si falta Carla, se cae todo.”',
      impacto_mensual_usd: null,
      costo_de_no_actuar: 'Riesgo operativo en vacaciones o renuncia.',
    },
  ],
  oportunidades: [
    {
      titulo: 'Reactivar pacientes inactivos',
      descripcion: 'Campañas a pacientes sin control en 6 meses.',
      impacto: 'media',
    },
  ],
  soluciones: [
    {
      titulo: 'Agente que agenda 24/7',
      descripcion: 'Responde, agenda y confirma por WhatsApp.',
      dolores_que_resuelve: ['Mensajes sin responder fuera de horario'],
      codigos_catalogo: ['IAGENTE_WA'],
      beneficio: 'Ninguna consulta sin respuesta.',
      indicador: 'Tiempo de primera respuesta < 1 min',
      a_medida: false,
    },
    {
      titulo: 'Seguimiento de presupuestos',
      descripcion: 'Pipeline y recordatorios para cada presupuesto.',
      dolores_que_resuelve: ['Presupuestos que nadie sigue'],
      codigos_catalogo: ['CRM_OPERATIVO'],
      beneficio: 'Más tratamientos cerrados.',
      indicador: 'Tasa de aceptación de presupuestos',
      a_medida: false,
    },
  ],
  arquitectura: {
    descripcion: 'WhatsApp conectado a un agente de IA que escribe en el CRM y en el calendario.',
    componentes: [
      { nombre: 'iAgente', funcion: 'Atiende WhatsApp', tecnologia: 'n8n + Claude' },
      { nombre: 'CRM', funcion: 'Pacientes y presupuestos', tecnologia: 'Next.js + Supabase' },
    ],
    integraciones: ['WhatsApp Cloud API', 'Google Calendar'],
    flujo: [
      'Paciente escribe',
      'El agente responde y califica',
      'Agenda en Calendar',
      'Registra en el CRM',
      'Recordatorio 24 h antes',
    ],
  },
  viabilidad: {
    tecnica: { puntaje: 9, justificacion: 'Componentes probados en producción.' },
    economica: {
      puntaje: 8,
      justificacion: 'El beneficio mensual supera la mensualidad varias veces.',
    },
    operativa: { puntaje: 7, justificacion: 'Requiere que recepción adopte el CRM.' },
    veredicto: 'viable',
    condiciones: [],
    riesgos: [
      {
        riesgo: 'Baja adopción del equipo',
        probabilidad: 'media',
        mitigacion: 'Capacitación y acompañamiento de 30 días',
      },
    ],
    supuestos: ['10% de conversaciones nocturnas se convierten en cita'],
  },
  roi: {
    ahorro_mensual_usd: 450,
    ingreso_adicional_mensual_usd: 1900,
    horas_ahorradas_mes: 60,
    explicacion:
      '20 citas extra × $85 + presupuestos recuperados; 2 h diarias de recepción liberadas.',
  },
  plan: [
    {
      fase: 1,
      nombre: 'Agente de WhatsApp',
      semanas: 3,
      entregables: ['Agente configurado', 'Conexión con Calendar'],
    },
    {
      fase: 2,
      nombre: 'CRM operativo',
      semanas: 4,
      entregables: ['Pipeline de presupuestos', 'Reportes'],
    },
  ],
  paquetes: [
    {
      nivel: 'esencial',
      nombre: 'Agenda 24/7',
      propuesta_valor: 'Nunca más un paciente sin respuesta.',
      codigos: ['IAGENTE_WA'],
      usuarios_estimados: 3,
      por_que: '',
    },
    {
      nivel: 'recomendado',
      nombre: 'Clínica conectada',
      propuesta_valor: 'Agenda 24/7 y seguimiento de cada presupuesto.',
      codigos: ['IAGENTE_WA', 'CRM_OPERATIVO', 'CITAS'],
      usuarios_estimados: 9,
      por_que: '',
    },
    {
      nivel: 'premium',
      nombre: 'Clínica inteligente',
      propuesta_valor: 'Todo lo anterior más llamadas con IA.',
      codigos: ['IAGENTE_WA', 'CRM_OPERATIVO', 'LLAMADAS', 'LEVANTAMIENTO'],
      usuarios_estimados: 12,
      por_que: '',
    },
  ],
  preguntas_pendientes: ['¿Cuántos presupuestos de ortodoncia entregan al mes?'],
  siguiente_paso: 'Firmar el anticipo esta semana para tener el agente atendiendo en 3 semanas.',
}

export function documentoDePrueba(idioma: 'es' | 'en' = 'es'): Documento {
  const datos: DatosPropuesta = {
    paquetes: ANALISIS.paquetes.map((p) => ({
      nivel: p.nivel,
      nombre: p.nombre,
      propuesta_valor: p.propuesta_valor,
      lineas: p.codigos.map((codigo) => ({ codigo, cantidad: 1 })),
      usuarios: p.usuarios_estimados,
      volumen: (p.nivel === 'premium' ? { LLAMADAS: 400 } : {}) as Record<string, number>,
      descuento_setup_pct: p.nivel === 'premium' ? 10 : 0,
      descuento_mensual_pct: 0,
    })),
    seleccionado: 'recomendado',
    condiciones: 'Incluye 30 días de acompañamiento.',
    notas_internas: 'NO DEBE APARECER',
  }
  const ajustes = { ...AJUSTES_DEFECTO, marca: { ...AJUSTES_DEFECTO.marca, logo_url: '' } }
  return {
    idioma,
    t: textos(idioma),
    marca: ajustes.marca,
    precios: ajustes.precios,
    cliente: {
      id: 'c1',
      nombre: 'Clínica Sonrisa',
      industria: 'Odontología',
      ruc: '',
      contacto_nombre: 'Dra. Paula Mena',
      contacto_cargo: 'Gerente',
      telefono: '',
      email: '',
      ciudad: 'Quito',
      sitio_web: '',
      empleados: '9',
      notas: '',
      crm_lead_id: null,
      creado_en: new Date().toISOString(),
    },
    propuesta: {
      id: 'p1',
      levantamiento_id: 'l1',
      analisis_id: 'a1',
      version: 1,
      numero: 'AIU-2026-0001',
      idioma,
      datos,
      totales: {},
      estado: 'borrador',
      token_publico: 'tok',
      crm_sincronizado_en: null,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    },
    analisis: ANALISIS,
    paquetes: datos.paquetes.map((definicion) => ({
      definicion,
      calculo: calcularPaquete(definicion, CATALOGO, ajustes.precios, idioma),
      items: definicion.lineas.map((l) => {
        const i = CATALOGO.get(l.codigo) as ItemCatalogo
        return {
          codigo: i.codigo,
          nombre: i.nombre_es,
          descripcion: i.descripcion_es,
          caracteristicas: i.caracteristicas_es,
        }
      }),
      recomendado: definicion.nivel === 'recomendado',
    })),
    fecha: '23 de septiembre de 2026',
    valida_hasta: '8 de octubre de 2026',
    recuperacion_meses: 4,
  }
}
