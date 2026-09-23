import { NextResponse } from 'next/server'
import { z } from 'zod'
import { respuestasComoTexto } from '@/lib/preguntas'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { crearInsumo, leerLevantamientoPorToken, registrarEvento } from '@/server/datos'
import { type Ctx, NoEncontrado, publica } from '@/server/http'

const Entrada = z.object({
  respuestas: z.record(z.string().max(80), z.string().max(8000)),
  nombre: z.string().max(200).default(''),
})

async function levantamientoAbierto(token: string) {
  const l = await leerLevantamientoPorToken(token)
  if (!l?.formulario_activo) throw new NoEncontrado('Formulario')
  return l
}

/**
 * El cliente guarda sus respuestas desde el celular. Se guardan en un único
 * insumo "formulario" que se actualiza con cada guardado; cada guardado queda
 * además en la bitácora, así no se pierde ninguna versión.
 */
export const PUT = publica(async (req: Request, { params }: Ctx<{ token: string }>) => {
  const { token } = await params
  const l = await levantamientoAbierto(token)
  const { respuestas, nombre } = Entrada.parse(await req.json())
  const contenido = [
    nombre && `Respondido por: ${nombre}`,
    respuestasComoTexto(respuestas, l.idioma),
  ]
    .filter(Boolean)
    .join('\n\n')

  const db = supabaseAdmin()
  const { data: existente } = await db
    .from('insumos')
    .select('id')
    .eq('levantamiento_id', l.id)
    .eq('tipo', 'formulario')
    .eq('origen', 'cliente')
    .is('eliminado_en', null)
    .maybeSingle()

  if (existente) {
    const { error } = await db
      .from('insumos')
      .update({ contenido, meta: { respuestas, nombre } })
      .eq('id', existente.id)
    if (error) throw new Error(error.message)
  } else {
    await crearInsumo({
      levantamiento_id: l.id,
      tipo: 'formulario',
      origen: 'cliente',
      titulo: 'Formulario del cliente',
      contenido,
      estado: 'listo',
      meta: { respuestas, nombre },
    })
  }
  await registrarEvento('formulario', l.id, 'guardado', {
    levantamiento_id: l.id,
    respuestas,
    nombre,
  })
  return NextResponse.json({ ok: true })
})
