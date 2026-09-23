import { z } from 'zod'

/**
 * Forma exacta del análisis. Sin campos opcionales (solo nullable): así el
 * mismo esquema sirve para las salidas estructuradas de Anthropic y de OpenAI.
 */

const Severidad = z.enum(['alta', 'media', 'baja'])

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
      impacto_mensual_usd: z
        .number()
        .nullable()
        .describe('Pérdida o costo mensual estimado. null si no hay base para estimarlo.'),
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
    ahorro_mensual_usd: z.number(),
    ingreso_adicional_mensual_usd: z.number(),
    horas_ahorradas_mes: z.number(),
    explicacion: z.string().describe('De dónde salen los números, con supuestos explícitos.'),
  }),
  plan: z.array(
    z.object({
      fase: z.number(),
      nombre: z.string(),
      semanas: z.number(),
      entregables: z.array(z.string()),
    }),
  ),
  paquetes: z
    .array(
      z.object({
        nivel: z.enum(['esencial', 'recomendado', 'premium']),
        nombre: z.string(),
        propuesta_valor: z.string(),
        codigos: z.array(z.string()),
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

export type ResultadoAnalisis = z.infer<typeof EsquemaAnalisis>

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
