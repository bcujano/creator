import { NextResponse } from 'next/server'
import { z } from 'zod'
import { claveValida, crearAutoservicio } from '@/server/autoservicio'
import { publica } from '@/server/http'

const texto = (max: number) => z.string().trim().max(max).default('')

const Entrada = z.object({
  nombre: z.string().trim().min(1).max(200),
  empresa: texto(250),
  telefono: texto(40),
  email: texto(200),
  idioma: z.enum(['es', 'en']).default('es'),
  ref: z.string().trim().min(1).max(80),
  retorno: z.url().max(500),
  crm_lead_id: z.string().max(80).nullable().default(null),
})

/**
 * Autodiagnóstico pedido desde la página personal (crm-321). Solo lo llama el servidor del CRM con
 * la clave compartida (x-webhook-secret); devuelve el enlace del formulario para la persona.
 */
export const POST = publica(async (req: Request) => {
  if (!claveValida(req.headers.get('x-webhook-secret')))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json(await crearAutoservicio(Entrada.parse(await req.json())))
})
