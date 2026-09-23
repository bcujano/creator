import { redirect } from 'next/navigation'
import { EstiloMarca } from '@/components/comun/marca-estilo'
import { Navegacion } from '@/components/comun/navegacion'
import { verificarSesion } from '@/lib/auth'
import { leerAjustes } from '@/server/datos'

export const dynamic = 'force-dynamic'

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sesion = await verificarSesion()
  if (!sesion) redirect('/login')

  let ajustes: Awaited<ReturnType<typeof leerAjustes>> | null = null
  let problema = ''
  try {
    ajustes = await leerAjustes()
  } catch (error) {
    problema = error instanceof Error ? error.message : String(error)
  }

  return (
    <>
      {ajustes ? <EstiloMarca marca={ajustes.marca} /> : null}
      <Navegacion marca={ajustes?.marca.nombre ?? 'AiUDA'} />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6">
        {problema ? (
          <div className="rounded-2xl border border-peligro/30 bg-peligro/5 p-6 text-sm">
            <p className="font-semibold text-peligro">La base de datos no responde.</p>
            <p className="mt-1 text-tenue">{problema}</p>
            <p className="mt-3 text-tenue">
              Revisa las variables de Supabase en <code>.env.local</code> y que las migraciones
              estén aplicadas (<code>pnpm db:migrate</code>).
            </p>
          </div>
        ) : (
          children
        )}
      </main>
    </>
  )
}
