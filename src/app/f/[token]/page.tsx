import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FormularioCliente } from '@/components/formulario-cliente'
import { EstiloMarca } from '@/components/marca-estilo'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { leerAjustes, leerLevantamientoPorToken } from '@/server/datos'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Cuéntanos de tu negocio', robots: { index: false } }

export default async function Formulario({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const levantamiento = await leerLevantamientoPorToken(token)
  if (!levantamiento?.formulario_activo) notFound()

  const [ajustes, previo] = await Promise.all([
    leerAjustes(),
    supabaseAdmin()
      .from('insumos')
      .select('meta')
      .eq('levantamiento_id', levantamiento.id)
      .eq('tipo', 'formulario')
      .eq('origen', 'cliente')
      .is('eliminado_en', null)
      .maybeSingle(),
  ])
  const meta = (previo.data?.meta ?? {}) as { respuestas?: Record<string, string>; nombre?: string }

  return (
    <>
      <EstiloMarca marca={ajustes.marca} />
      <FormularioCliente
        token={token}
        empresa={levantamiento.clientes.nombre}
        marca={{ nombre: ajustes.marca.nombre, logo_url: ajustes.marca.logo_url }}
        idiomaInicial={levantamiento.idioma}
        respuestasIniciales={meta.respuestas ?? {}}
        nombreInicial={meta.nombre ?? levantamiento.clientes.contacto_nombre}
      />
    </>
  )
}
