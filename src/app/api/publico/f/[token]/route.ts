import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  actualizarCliente,
  actualizarLevantamiento,
  leerLevantamientoPorToken,
  registrarEvento,
} from '@/server/datos'
import { type Ctx, NoEncontrado, publica } from '@/server/http'

const texto = (max: number) => z.string().trim().max(max)

const Entrada = z.object({
  respuestas: z.record(z.string().max(80), z.string().max(8000)),
  datos: z
    .object({
      contacto_nombre: texto(200),
      contacto_cargo: texto(120),
      razon_social: texto(250),
      ruc: texto(20),
      cedula_representante: texto(20),
      email: texto(200),
      telefono: texto(40),
      direccion: texto(300),
      ciudad: texto(100),
    })
    .partial()
    .default({}),
  terminado: z.boolean().default(false),
})

/**
 * El cliente guarda desde su celular. Sus respuestas van a su propio campo
 * (no pisan las del consultor) y sus datos completan la ficha que usará el
 * acuerdo. Cada guardado queda en la bitácora.
 */
export const PUT = publica(async (req: Request, { params }: Ctx<{ token: string }>) => {
  const { token } = await params
  const l = await leerLevantamientoPorToken(token)
  if (!l?.formulario_activo) throw new NoEncontrado('Formulario')
  const { respuestas, datos, terminado } = Entrada.parse(await req.json())

  const limpias = Object.fromEntries(Object.entries(respuestas).filter(([, v]) => v.trim()))
  await actualizarLevantamiento(l.id, {
    respuestas_cliente: limpias,
    cliente_respondio_en: new Date().toISOString(),
    ...(terminado ? { cliente_termino: true } : {}),
  })

  // Solo se guardan los datos que el cliente escribió; lo vacío no borra lo que ya había.
  const cambios = Object.fromEntries(Object.entries(datos).filter(([, v]) => v))
  if (Object.keys(cambios).length > 0) await actualizarCliente(l.cliente_id, cambios)

  await registrarEvento('formulario', l.id, terminado ? 'terminado' : 'guardado', {
    levantamiento_id: l.id,
    respuestas: limpias,
    datos: cambios,
  })
  return NextResponse.json({ ok: true })
})
