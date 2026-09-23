import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  actualizarCliente,
  actualizarLevantamiento,
  archivarLevantamiento,
  leerLevantamiento,
  registrarEvento,
} from '@/server/datos'
import { type Ctx, NoEncontrado, privada } from '@/server/http'

const Cambios = z.object({
  titulo: z.string().min(1).optional(),
  estado: z
    .enum(['recolectando', 'analizado', 'propuesta', 'enviada', 'ganada', 'perdida'])
    .optional(),
  idioma: z.enum(['es', 'en']).optional(),
  formulario_activo: z.boolean().optional(),
  /** Respuestas a fusionar (no reemplaza las demás). Un valor vacío borra la respuesta. */
  respuestas: z.record(z.string(), z.string()).optional(),
  cliente: z
    .object({
      nombre: z.string().min(1),
      industria: z.string(),
      contacto_nombre: z.string(),
      contacto_cargo: z.string(),
      telefono: z.string(),
      email: z.string(),
      ciudad: z.string(),
      sitio_web: z.string(),
      empleados: z.string(),
      ruc: z.string(),
      notas: z.string(),
      razon_social: z.string(),
      direccion: z.string(),
      cedula_representante: z.string(),
    })
    .partial()
    .optional(),
})

export const PATCH = privada(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  const cambios = Cambios.parse(await req.json())
  const actual = await leerLevantamiento(id)
  if (!actual) throw new NoEncontrado('Levantamiento')

  if (cambios.cliente) await actualizarCliente(actual.cliente_id, cambios.cliente)

  const { cliente: _, respuestas, ...resto } = cambios
  const datos: Record<string, unknown> = { ...resto }
  if (respuestas) {
    const fusion = { ...actual.respuestas }
    for (const [k, v] of Object.entries(respuestas)) {
      // Las preguntas de seguimiento se conservan aunque aún no tengan respuesta.
      if (v.trim() || k.startsWith('extra:')) fusion[k] = v
      else delete fusion[k]
    }
    datos.respuestas = fusion
  }
  if (Object.keys(datos).length > 0) await actualizarLevantamiento(id, datos)
  if (resto.estado && resto.estado !== actual.estado) {
    await registrarEvento('levantamiento', id, 'estado', { de: actual.estado, a: resto.estado })
  }
  return NextResponse.json({ ok: true })
})

export const DELETE = privada(async (_req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  await archivarLevantamiento(id)
  return NextResponse.json({ ok: true })
})
