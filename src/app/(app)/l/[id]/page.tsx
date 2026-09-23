import { notFound } from 'next/navigation'
import { Espacio } from '@/components/levantamiento/espacio'
import { env } from '@/lib/env'
import { crmConfigurado } from '@/server/crm'
import {
  leerAjustes,
  leerCatalogo,
  leerLevantamiento,
  listarAnalisis,
  listarEventosLevantamiento,
  listarInsumos,
  listarPropuestas,
} from '@/server/datos'
import { hayIA } from '@/server/ia/motor'

export default async function PaginaLevantamiento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const levantamiento = await leerLevantamiento(id)
  if (!levantamiento) notFound()

  const [insumos, analisis, propuestas, catalogo, ajustes, eventos] = await Promise.all([
    listarInsumos(id),
    listarAnalisis(id),
    listarPropuestas(id),
    leerCatalogo(),
    leerAjustes(),
    listarEventosLevantamiento(id),
  ])

  return (
    <Espacio
      levantamiento={levantamiento}
      insumos={insumos}
      analisis={analisis}
      propuestas={propuestas}
      catalogo={catalogo}
      ajustes={ajustes}
      eventos={eventos}
      appUrl={env.appUrl}
      estado={{ ia: hayIA(), crm: crmConfigurado() }}
    />
  )
}
