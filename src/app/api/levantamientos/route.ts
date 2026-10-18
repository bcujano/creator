import { NextResponse } from 'next/server'
import { z } from 'zod'
import { IDS_ENFOQUE, MAX_ENFOQUES } from '@/lib/enfoques'
import { crearCliente, crearLevantamiento } from '@/server/datos'
import { privada } from '@/server/http'

const Entrada = z.object({
  cliente: z.object({
    nombre: z.string().trim().min(1, 'El nombre de la empresa es obligatorio'),
    industria: z.string().default(''),
    contacto_nombre: z.string().default(''),
    contacto_cargo: z.string().default(''),
    telefono: z.string().default(''),
    email: z.string().default(''),
    ciudad: z.string().default(''),
    sitio_web: z.string().default(''),
    empleados: z.string().default(''),
    ruc: z.string().default(''),
  }),
  idioma: z.enum(['es', 'en']).default('es'),
  enfoques: z.array(z.enum(IDS_ENFOQUE)).max(MAX_ENFOQUES).default([]),
})

export const POST = privada(async (req: Request) => {
  const datos = Entrada.parse(await req.json())
  const cliente = await crearCliente(datos.cliente)
  const levantamiento = await crearLevantamiento(
    cliente.id,
    `Diagnóstico ${cliente.nombre}`,
    datos.idioma,
    datos.enfoques,
  )
  return NextResponse.json({ id: levantamiento.id })
})
