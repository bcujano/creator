import { NextResponse } from 'next/server'
import { z } from 'zod'
import { subirMarca } from '@/server/almacen'
import { guardarAjustes, leerAjustes } from '@/server/datos'
import { Invalido, privada } from '@/server/http'

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color en formato #RRGGBB')

const Ajustes = z.object({
  marca: z
    .object({
      nombre: z.string().min(1),
      eslogan_es: z.string(),
      eslogan_en: z.string(),
      logo_url: z.string(),
      color_primario: color,
      color_acento: color,
      email: z.string(),
      telefono: z.string(),
      sitio_web: z.string(),
      direccion: z.string(),
      validez_dias: z.number().int().min(1).max(365),
    })
    .partial()
    .optional(),
  precios: z
    .object({
      iva_pct: z.number().min(0).max(100),
      margen_minimo_mensual: z.number().min(0),
      precio_usuario_extra: z.number().min(0),
      costo_infra_base: z.number().min(0),
      anticipo_pct: z.number().min(0).max(100),
      modelo_por_usuario: z.number().min(0),
      modelo_volumen_base: z.number().min(0),
      a_medida_tope: z.number().min(0),
      a_medida_costo_pct: z.number().min(0).max(100),
    })
    .partial()
    .optional(),
  ia: z
    .object({
      proveedor: z.enum(['anthropic', 'openai']),
      modelo_anthropic: z.string().min(1),
      modelo_openai: z.string().min(1),
      modelo_transcripcion: z.string().min(1),
      esfuerzo: z.enum(['low', 'medium', 'high', 'xhigh', 'max']),
    })
    .partial()
    .optional(),
  legal: z
    .object({
      razon_social: z.string().min(1),
      ruc: z.string().min(1),
      linea_negocio: z.string(),
      descripcion_linea: z.string(),
      representante: z.string().min(1),
      cargo: z.string().min(1),
      ciudad: z.string().min(1),
      direccion: z.string(),
      plazo_minimo_meses: z.number().int().min(0).max(60),
      dias_preaviso: z.number().int().min(0).max(365),
      garantia_dias: z.number().int().min(0).max(365),
    })
    .partial()
    .optional(),
  crm: z
    .object({
      activo: z.boolean(),
      enviar_al_crear_propuesta: z.boolean(),
      service_type: z.string().min(1),
      source: z.string().min(1),
    })
    .partial()
    .optional(),
})

export const GET = privada(async () => NextResponse.json(await leerAjustes()))

export const PUT = privada(async (req: Request) => {
  return NextResponse.json(await guardarAjustes(Ajustes.parse(await req.json())))
})

/** Sube el logo (PNG o JPG, máx. 2 MB) y lo deja como logo de la marca. */
export const POST = privada(async (req: Request) => {
  const form = await req.formData()
  const archivo = form.get('logo')
  if (!(archivo instanceof File)) throw new Invalido('Falta el archivo del logo.')
  if (!['image/png', 'image/jpeg'].includes(archivo.type)) {
    throw new Invalido('El logo debe ser PNG o JPG (se usa en PDF, Word y PowerPoint).')
  }
  if (archivo.size > 2 * 1024 * 1024) throw new Invalido('El logo no debe pasar de 2 MB.')
  const url = await subirMarca(archivo.name, Buffer.from(await archivo.arrayBuffer()), archivo.type)
  return NextResponse.json(await guardarAjustes({ marca: { logo_url: url } }))
})
