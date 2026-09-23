import { NextResponse } from 'next/server'
import { z } from 'zod'
import { archivarItemCatalogo, guardarItemCatalogo, leerCatalogo } from '@/server/datos'
import { privada } from '@/server/http'

const Volumen = z.object({
  unidad_es: z.string().min(1),
  unidad_en: z.string().min(1),
  incluido: z.number().min(0),
  precio_excedente: z.number().min(0),
  costo_unitario: z.number().min(0),
})

const Item = z.object({
  id: z.string().uuid().optional(),
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_]+$/, 'Código: solo letras, números y guion bajo'),
  tipo: z.enum(['paquete', 'modulo', 'servicio']),
  categoria: z.string().default('general'),
  nombre_es: z.string().min(1),
  nombre_en: z.string().min(1),
  descripcion_es: z.string().default(''),
  descripcion_en: z.string().default(''),
  caracteristicas_es: z.array(z.string()).default([]),
  caracteristicas_en: z.array(z.string()).default([]),
  resuelve: z.array(z.string()).default([]),
  incluye: z.array(z.string()).default([]),
  precio_setup: z.number().min(0),
  precio_mensual: z.number().min(0),
  costo_setup: z.number().min(0),
  costo_mensual: z.number().min(0),
  usuarios_incluidos: z.number().int().min(0),
  volumen: Volumen.nullable(),
  semanas: z.number().int().min(0),
  estado: z.enum(['listo', 'beta', 'proximamente']),
  activo: z.boolean(),
  orden: z.number().int(),
})

export const GET = privada(async () => NextResponse.json(await leerCatalogo()))

export const POST = privada(async (req: Request) => {
  const item = Item.parse(await req.json())
  return NextResponse.json(await guardarItemCatalogo(item))
})

export const DELETE = privada(async (req: Request) => {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  await archivarItemCatalogo(id)
  return NextResponse.json({ ok: true })
})
