import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { avisarCrm } from '@/server/crm'
import { type Ctx, privada } from '@/server/http'
import { guardarPropuesta } from '@/server/servicios'

// Cómo se calculó el precio de un módulo a medida. Si no se declara aquí, zod lo descarta
// al guardar la versión y la justificación se pierde.
const Justificacion = z.object({
  metodo: z.enum(['valor', 'referencia', 'piso']),
  valor_mensual: z.number().nullable(),
  meses: z.number(),
  facturacion_mensual: z.number().nullable(),
  piso: z.number(),
  sugerido: z.number(),
  dolores: z.array(z.string()),
  pregunta: z.string().nullable(),
})

const AMedida = z.object({
  nombre: z.string().trim().min(1).max(200),
  descripcion: z.string().max(2000),
  entregables: z.array(z.string().max(300)).max(20),
  precio_setup: z.number().min(0),
  precio_mensual: z.number().min(0),
  semanas: z.number().min(0).max(52),
  valor: Justificacion.nullable().optional(),
})

const Linea = z.object({
  codigo: z.string().min(1),
  a_medida: AMedida.nullable().optional(),
  cantidad: z.number().int().min(1).max(999),
  precio_setup: z.number().min(0).nullable().optional(),
  precio_mensual: z.number().min(0).nullable().optional(),
})

const Paquete = z.object({
  nivel: z.enum(['esencial', 'recomendado', 'premium']),
  nombre: z.string().min(1),
  propuesta_valor: z.string(),
  lineas: z.array(Linea),
  usuarios: z.number().int().min(0).max(100000),
  volumen: z.record(z.string(), z.number().min(0)),
  descuento_setup_pct: z.number().min(0).max(100),
  descuento_mensual_pct: z.number().min(0).max(100),
})

const Entrada = z.object({
  analisis_id: z.string().uuid().nullable(),
  idioma: z.enum(['es', 'en']),
  datos: z.object({
    paquetes: z.array(Paquete).min(1).max(3),
    seleccionado: z.enum(['esencial', 'recomendado', 'premium']),
    condiciones: z.string(),
    notas_internas: z.string(),
  }),
})

export const POST = privada(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  const e = Entrada.parse(await req.json())
  const { propuesta, crm } = await guardarPropuesta(id, e.datos, e.analisis_id, e.idioma)
  // Si el cliente ya está en el CRM y no se acaba de enviar, la nueva versión queda en su línea de tiempo.
  if (!crm) after(() => avisarCrm(propuesta.id, 'Nueva versión de la propuesta'))
  return NextResponse.json({
    id: propuesta.id,
    version: propuesta.version,
    numero: propuesta.numero,
    crm,
  })
})
