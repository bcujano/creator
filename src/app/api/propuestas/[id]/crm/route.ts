import { NextResponse } from 'next/server'
import { enviarAlCrm } from '@/server/crm'
import { leerAjustes, leerLevantamiento, leerPropuesta, registrarEvento } from '@/server/datos'
import { type Ctx, NoEncontrado, privada } from '@/server/http'

export const POST = privada(async (_req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params
  const propuesta = await leerPropuesta(id)
  if (!propuesta) throw new NoEncontrado('Propuesta')
  const levantamiento = await leerLevantamiento(propuesta.levantamiento_id)
  if (!levantamiento) throw new NoEncontrado('Levantamiento')
  const r = await enviarAlCrm(await leerAjustes(), levantamiento.clientes, propuesta)
  await registrarEvento('propuesta', id, r.ok ? 'crm_enviado' : 'crm_error', {
    levantamiento_id: propuesta.levantamiento_id,
    ...r,
  })
  return NextResponse.json(r, { status: r.ok ? 200 : 502 })
})
