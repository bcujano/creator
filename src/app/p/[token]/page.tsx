import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { EstiloMarca } from '@/components/comun/marca-estilo'
import { PropuestaCliente } from '@/components/presentacion/presentacion'
import { autoservicioDe } from '@/server/autoservicio'
import { registrarEvento } from '@/server/datos'
import { documentoPorToken } from '@/server/documento'
import { documentoPublico } from '@/server/publico'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const doc = await documentoPorToken(token)
  return {
    title: doc ? `${doc.t.propuesta} · ${doc.cliente.nombre}` : 'Propuesta',
    robots: { index: false },
  }
}

export default async function PropuestaPublica({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ idioma?: string }>
}) {
  const { token } = await params
  const { idioma } = await searchParams
  const doc = await documentoPorToken(
    token,
    idioma === 'en' || idioma === 'es' ? idioma : undefined,
  )
  if (!doc) notFound()
  await registrarEvento('propuesta', doc.propuesta.id, 'vista_cliente', {
    levantamiento_id: doc.propuesta.levantamiento_id,
  })
  // Autodiagnóstico: el siguiente paso (pagar la sesión o el paquete) está en la página personal.
  const auto = await autoservicioDe(doc.propuesta.levantamiento_id)
  const siguiente = auto
    ? `${auto.retorno}${auto.retorno.includes('?') ? '&' : '?'}diagnostico=${encodeURIComponent(auto.ref)}`
    : null

  return (
    <>
      <EstiloMarca marca={doc.marca} />
      <Suspense>
        <PropuestaCliente doc={documentoPublico(doc)} siguiente={siguiente} />
      </Suspense>
    </>
  )
}
