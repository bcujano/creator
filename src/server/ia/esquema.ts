import { z } from 'zod'

/**
 * Forma exacta del análisis. Sin campos opcionales (solo nullable): así el
 * mismo esquema sirve para las salidas estructuradas de Anthropic y de OpenAI.
 */

const Severidad = z.enum(['alta', 'media', 'baja'])

/**
 * Un factor de un cálculo. El monto final NO lo da la IA: lo calcula el
 * código multiplicando los factores (src/lib/analisis.ts), y cada factor
 * dice de dónde sale.
 */
const Factor = z.object({
  concepto: z.string().describe('Qué es, en pocas palabras: "inquilinos atrasados al mes".'),
  valor: z.number().describe('El número. Porcentajes como fracción: 20% = 0.2.'),
  unidad: z.enum(['usd', 'cantidad', 'porcentaje', 'horas', 'meses']),
  fuente: z
    .enum(['cliente', 'consultor', 'supuesto'])
    .describe('cliente/consultor: lo dijeron en la reunión. supuesto: no lo dijeron.'),
  evidencia: z
    .string()
    .describe(
      'Si es dato: cita textual de la respuesta. Si es supuesto: por qué es razonable y conservador.',
    ),
})

const Calculo = z.object({
  factores: z
    .array(Factor)
    .describe('Se multiplican entre sí. Vacío si no hay datos suficientes para cuantificar.'),
  pregunta_para_cuantificar: z
    .string()
    .nullable()
    .describe(
      'Si falta un dato, la pregunta exacta para obtenerlo del cliente. null si está completo.',
    ),
})

export const EsquemaAnalisis = z.object({
  resumen_ejecutivo: z
    .string()
    .describe('3 a 5 frases para el dueño: qué entendimos, qué duele y qué proponemos.'),
  negocio: z.object({
    descripcion: z.string(),
    industria: z.string(),
    modelo_de_negocio: z.string(),
    clientes_objetivo: z.string(),
    canales: z.array(z.string()),
    tamano: z.string().describe('Empleados, volumen y facturación estimada si se conoce.'),
  }),
  madurez_digital: z.object({
    puntaje: z.number().describe('0 a 100.'),
    nivel: z.enum(['inicial', 'basico', 'intermedio', 'avanzado']),
    areas: z.array(
      z.object({
        area: z
          .string()
          .describe('Ventas, Atención, Operación, Marketing, Dirección o Tecnología.'),
        puntaje: z.number().describe('0 a 5.'),
        tiene: z.array(z.string()),
        falta: z.array(z.string()),
      }),
    ),
  }),
  dolores: z.array(
    z.object({
      titulo: z.string(),
      descripcion: z.string(),
      tipo: z.enum(['explicito', 'oculto']),
      area: z.string(),
      severidad: Severidad,
      evidencia: z.string().describe('Qué dijo o mostró el cliente que lo revela.'),
      impacto: Calculo.describe('Pérdida o costo mensual en USD, como producto de factores.'),
      costo_de_no_actuar: z.string(),
    }),
  ),
  oportunidades: z.array(
    z.object({ titulo: z.string(), descripcion: z.string(), impacto: Severidad }),
  ),
  soluciones: z.array(
    z.object({
      titulo: z.string(),
      descripcion: z.string(),
      dolores_que_resuelve: z.array(z.string()).describe('Títulos exactos de los dolores.'),
      codigos_catalogo: z.array(z.string()).describe('Solo códigos que existen en el catálogo.'),
      beneficio: z.string(),
      indicador: z.string().describe('KPI concreto para medir el resultado.'),
      a_medida: z.boolean().describe('true si requiere desarrollo que no está en el catálogo.'),
    }),
  ),
  arquitectura: z.object({
    descripcion: z.string(),
    componentes: z.array(
      z.object({ nombre: z.string(), funcion: z.string(), tecnologia: z.string() }),
    ),
    integraciones: z.array(z.string()),
    flujo: z.array(z.string()).describe('Pasos del flujo principal, de inicio a fin.'),
  }),
  viabilidad: z.object({
    tecnica: z.object({ puntaje: z.number().describe('0 a 10.'), justificacion: z.string() }),
    economica: z.object({ puntaje: z.number().describe('0 a 10.'), justificacion: z.string() }),
    operativa: z.object({ puntaje: z.number().describe('0 a 10.'), justificacion: z.string() }),
    veredicto: z.enum(['viable', 'viable_con_condiciones', 'no_viable']),
    condiciones: z.array(z.string()),
    riesgos: z.array(
      z.object({ riesgo: z.string(), probabilidad: Severidad, mitigacion: z.string() }),
    ),
    supuestos: z.array(z.string()),
  }),
  roi: z.object({
    componentes: z.array(
      z.object({
        concepto: z.string(),
        tipo: z.enum(['ahorro', 'ingreso']),
        calculo: Calculo.describe('Monto mensual en USD que la solución recupera o genera.'),
      }),
    ),
    horas_liberadas: Calculo.describe('Horas de trabajo por mes que la solución libera.'),
    explicacion: z.string().describe('Resumen en una o dos frases, sin cifras nuevas.'),
  }),
  plan: z.array(
    z.object({
      fase: z.number(),
      nombre: z.string(),
      semanas: z.number(),
      entregables: z.array(z.string()),
    }),
  ),
  modulos_a_medida: z
    .array(
      z.object({
        codigo: z
          .string()
          .describe('Identificador corto en mayúsculas, p. ej. MEDIDA_AGENTE_RUTAS.'),
        nombre: z
          .string()
          .describe(
            'Lo que ES, en palabras simples: "Agente de seguimiento y reactivación de pacientes".',
          ),
        descripcion: z
          .string()
          .describe(
            'Empieza con "Es un agente / asistente / sistema que…" y di qué problema resuelve.',
          ),
        necesidad: z.string().describe('Qué necesidad del diagnóstico no cubre el catálogo.'),
        entregables: z.array(z.string()).describe('Entregables concretos y verificables.'),
        complejidad: z
          .enum(['simple', 'media', 'compleja'])
          .describe('Define el precio con la tabla de la empresa; no pongas montos.'),
        por_que_complejidad: z
          .string()
          .describe('Qué hay que construir que justifica esa complejidad.'),
        semanas: z.number(),
      }),
    )
    .describe('Solo para necesidades que el catálogo no cubre. Vacío si todo está en el catálogo.'),
  paquetes: z
    .array(
      z.object({
        nivel: z.enum(['esencial', 'recomendado', 'premium']),
        nombre: z.string(),
        propuesta_valor: z.string(),
        codigos: z
          .array(z.string())
          .describe('Códigos del catálogo y de modulos_a_medida que incluye este paquete.'),
        usuarios_estimados: z.number(),
        por_que: z.string(),
      }),
    )
    .describe('Exactamente tres: esencial, recomendado y premium, en ese orden.'),
  preguntas_pendientes: z
    .array(z.string())
    .describe('Lo que falta saber para afinar la propuesta.'),
  siguiente_paso: z.string(),
})

/** Lo que devuelve la IA. Para mostrar, usar siempre ResultadoAnalisis (normalizado). */
export type ResultadoIA = z.infer<typeof EsquemaAnalisis>
export type FactorIA = z.infer<typeof Factor>
export type { ResultadoAnalisis } from '@/lib/analisis'

export const EsquemaSugerencias = z.object({
  preguntas: z.array(
    z.object({
      pregunta: z.string(),
      por_que: z.string().describe('Qué dolor oculto u oportunidad busca descubrir.'),
    }),
  ),
  dolores_sospechados: z.array(z.string()),
})

export type Sugerencias = z.infer<typeof EsquemaSugerencias>
