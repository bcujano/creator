import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { EstiloMarca } from '@/components/marca-estilo'
import { Presentacion } from '@/components/presentacion'
import { verificarSesion } from '@/lib/auth'
import { actualizarPropuesta } from '@/server/datos'
import { documentoPorId } from '@/server/documento'
import { documentoPublico } from '@/server/publico'

export const dynamic = 'force-dynamic'

export default async function Presentar({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ idioma?: string }>
}) {
  if (!(await verificarSesion())) redirect('/login')
  const { id } = await params
  const { idioma } = await searchParams
  const doc = await documentoPorId(id, idioma === 'en' || idioma === 'es' ? idioma : undefined)
  if (!doc) notFound()
  if (doc.propuesta.estado === 'borrador') await actualizarPropuesta(id, { estado: 'presentada' })

  return (
    <>
      <EstiloMarca marca={doc.marca} />
      <Suspense>
        <Presentacion doc={documentoPublico(doc)} volver={`/l/${doc.propuesta.levantamiento_id}`} />
      </Suspense>
    </>
  )
}
