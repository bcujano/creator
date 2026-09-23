import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { type Ctx, NoEncontrado, privada } from '@/server/http'

/**
 * Firma liviana de lo que puede cambiar desde fuera (el celular del cliente).
 * El panel la consulta cada pocos segundos y solo recarga si cambió.
 */
export const GET = privada(async (_req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  const db = supabaseAdmin()
  const [l, i] = await Promise.all([
    db
      .from('levantamientos')
      .select('cliente_respondio_en, cliente_termino')
      .eq('id', id)
      .maybeSingle(),
    db
      .from('insumos')
      .select('creado_en, estado', { count: 'exact' })
      .eq('levantamiento_id', id)
      .is('eliminado_en', null)
      .order('creado_en', { ascending: false })
      .limit(1),
  ])
  if (!l.data) throw new NoEncontrado('Levantamiento')
  const ultimo = i.data?.[0]
  return NextResponse.json({
    firma: [
      l.data.cliente_respondio_en,
      l.data.cliente_termino,
      i.count,
      ultimo?.creado_en,
      ultimo?.estado,
    ].join('|'),
    cliente_termino: l.data.cliente_termino,
  })
})
