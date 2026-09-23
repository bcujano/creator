import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FormularioCliente } from '@/components/formulario-cliente'
import { EstiloMarca } from '@/components/marca-estilo'
import { leerAjustes, leerLevantamientoPorToken } from '@/server/datos'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Cuéntanos de tu negocio', robots: { index: false } }

export default async function Formulario({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const levantamiento = await leerLevantamientoPorToken(token)
  if (!levantamiento?.formulario_activo) notFound()
  const ajustes = await leerAjustes()
  const c = levantamiento.clientes

  return (
    <>
      <EstiloMarca marca={ajustes.marca} />
      <FormularioCliente
        token={token}
        empresa={c.nombre}
        marca={{ nombre: ajustes.marca.nombre, logo_url: ajustes.marca.logo_url }}
        idiomaInicial={levantamiento.idioma}
        respuestasIniciales={levantamiento.respuestas_cliente ?? {}}
        terminado={levantamiento.cliente_termino}
        datosIniciales={{
          contacto_nombre: c.contacto_nombre,
          contacto_cargo: c.contacto_cargo,
          razon_social: c.razon_social,
          ruc: c.ruc,
          cedula_representante: c.cedula_representante,
          email: c.email,
          telefono: c.telefono,
          direccion: c.direccion,
          ciudad: c.ciudad,
        }}
      />
    </>
  )
}
