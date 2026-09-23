import { ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { formatoUSD } from '@/lib/precios'
import type { EstadoLevantamiento } from '@/lib/tipos'
import { listarLevantamientos } from '@/server/datos'

const ESTADOS: Record<EstadoLevantamiento, { texto: string; clase: string }> = {
  recolectando: { texto: 'Recolectando', clase: 'bg-superficie-2 text-tenue' },
  analizado: { texto: 'Analizado', clase: 'bg-marca/12 text-marca' },
  propuesta: { texto: 'Propuesta lista', clase: 'bg-marca/12 text-marca' },
  enviada: { texto: 'Enviada', clase: 'bg-aviso/12 text-aviso' },
  ganada: { texto: 'Ganada', clase: 'bg-ok/12 text-ok' },
  perdida: { texto: 'Perdida', clase: 'bg-peligro/12 text-peligro' },
}

export default async function Inicio() {
  const levantamientos = await listarLevantamientos()

  const conValor = levantamientos.map((l) => {
    const ultima = l.propuestas
      .filter((p) => !p.eliminado_en)
      .sort((a, b) => b.version - a.version)[0]
    const elegido = ultima
      ? (ultima.totales[ultima.seleccionado] ?? Object.values(ultima.totales)[0])
      : null
    return { l, setup: elegido?.setup.base ?? 0, mensual: elegido?.mensual.base ?? 0 }
  })

  const abiertos = conValor.filter((x) => !['ganada', 'perdida'].includes(x.l.estado))
  const ganados = conValor.filter((x) => x.l.estado === 'ganada')
  const kpis = [
    { nombre: 'En curso', valor: String(abiertos.length) },
    {
      nombre: 'Pipeline (implementación)',
      valor: formatoUSD(abiertos.reduce((s, x) => s + x.setup, 0)),
    },
    {
      nombre: 'Mensualidad propuesta',
      valor: formatoUSD(abiertos.reduce((s, x) => s + x.mensual, 0)),
    },
    { nombre: 'Recurrente ganado', valor: formatoUSD(ganados.reduce((s, x) => s + x.mensual, 0)) },
  ]

  return (
    <div className="aparecer space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titulo text-3xl font-bold tracking-tight">Levantamientos</h1>
          <p className="mt-1 text-tenue">
            Cada reunión con un cliente: lo que se recogió, el diagnóstico y la propuesta.
          </p>
        </div>
        <Link
          href="/nuevo"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-marca px-4 text-sm font-semibold text-white shadow-sm hover:brightness-110"
        >
          <Plus className="size-4" /> Nueva reunión
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.nombre} className="rounded-2xl border border-borde bg-superficie p-4">
            <p className="font-titulo text-2xl font-bold tabular-nums">{k.valor}</p>
            <p className="mt-0.5 text-xs text-tenue">{k.nombre}</p>
          </div>
        ))}
      </div>

      {conValor.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-borde px-6 py-16 text-center">
          <p className="font-titulo text-xl font-semibold">Todavía no hay reuniones</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-tenue">
            Crea la primera antes de visitar al cliente, o en la misma reunión: solo necesitas el
            nombre de la empresa.
          </p>
          <Link
            href="/nuevo"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-marca px-4 text-sm font-semibold text-white"
          >
            <Plus className="size-4" /> Empezar
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {conValor.map(({ l, setup, mensual }) => (
            <li key={l.id}>
              <Link
                href={`/l/${l.id}`}
                className="group flex h-full flex-col rounded-2xl border border-borde bg-superficie p-5 transition hover:border-marca/40 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-titulo text-lg font-semibold">
                      {l.clientes.nombre}
                    </p>
                    <p className="truncate text-sm text-tenue">
                      {[l.clientes.industria, l.clientes.ciudad].filter(Boolean).join(' · ') ||
                        'Sin datos todavía'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADOS[l.estado].clase}`}
                  >
                    {ESTADOS[l.estado].texto}
                  </span>
                </div>
                <div className="mt-auto flex items-end justify-between pt-5">
                  <div className="text-sm">
                    {setup > 0 ? (
                      <>
                        <span className="font-semibold tabular-nums">{formatoUSD(setup)}</span>
                        <span className="text-tenue"> + {formatoUSD(mensual)}/mes</span>
                      </>
                    ) : (
                      <span className="text-tenue">Sin propuesta</span>
                    )}
                  </div>
                  <ArrowRight className="size-4 text-tenue transition group-hover:translate-x-0.5 group-hover:text-marca" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
