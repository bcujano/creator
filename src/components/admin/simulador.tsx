'use client'

import { Minus, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { calcularPaquete, compararModelos, formatoUSD, redondear } from '@/lib/precios'
import type { ItemCatalogo, ParametrosPrecio } from '@/lib/tipos'
import { cx } from '../ui'

type Fila = { id: string; codigo: string; clientes: number; usuarios: number; uso: number | null }

/**
 * Simulador de cartera: cuántos clientes de cada producto, con cuántos
 * usuarios y cuánto uso, y qué deja cada modelo de cobro al mes.
 */
export function Simulador({
  catalogo,
  precios,
}: {
  catalogo: ItemCatalogo[]
  precios: ParametrosPrecio
}) {
  const mapa = useMemo(() => new Map(catalogo.map((c) => [c.codigo, c])), [catalogo])
  const vendibles = catalogo.filter((c) => c.precio_mensual > 0)
  const [filas, setFilas] = useState<Fila[]>(() =>
    ['IAGENTE_WA', 'CRM_BASICO', 'CRM_OPERATIVO', 'CRM_GERENCIAL']
      .filter((c) => mapa.has(c))
      .map((codigo, i) => ({
        id: codigo,
        codigo,
        clientes: [4, 3, 2, 1][i] ?? 1,
        usuarios: [3, 5, 10, 20][i] ?? 5,
        uso: null,
      })),
  )

  const resultados = filas.map((f) => {
    const item = mapa.get(f.codigo)
    const calc = calcularPaquete(
      {
        nivel: 'recomendado',
        nombre: '',
        propuesta_valor: '',
        lineas: [{ codigo: f.codigo, cantidad: 1 }],
        usuarios: f.usuarios,
        volumen: f.uso === null ? {} : { [f.codigo]: f.uso },
        descuento_setup_pct: 0,
        descuento_mensual_pct: 0,
      },
      mapa,
      precios,
    )
    return { f, item, calc, modelos: compararModelos(calc, precios) }
  })

  const totales = (['modulos', 'usuario', 'volumen'] as const).map((clave) => {
    const ingreso = resultados.reduce(
      (s, r) => s + (r.modelos.find((m) => m.clave === clave)?.ingreso_mensual ?? 0) * r.f.clientes,
      0,
    )
    const margen = resultados.reduce(
      (s, r) => s + (r.modelos.find((m) => m.clave === clave)?.margen_mensual ?? 0) * r.f.clientes,
      0,
    )
    const bajoMinimo = resultados.reduce(
      (s, r) => s + (r.modelos.find((m) => m.clave === clave)?.cumple_minimo ? 0 : r.f.clientes),
      0,
    )
    return { clave, ingreso: redondear(ingreso), margen: redondear(margen), bajoMinimo }
  })
  const mejor = [...totales].sort((a, b) => b.margen - a.margen)[0]
  const setupTotal = resultados.reduce((s, r) => s + r.calc.setup.base * r.f.clientes, 0)
  const margenSetup = resultados.reduce((s, r) => s + r.calc.margen.setup * r.f.clientes, 0)
  const clientes = filas.reduce((s, f) => s + f.clientes, 0)

  const NOMBRES = {
    modulos: 'Módulos + volumen (híbrido)',
    usuario: 'Solo por usuario',
    volumen: 'Solo por volumen',
  }

  function actualizar(i: number, cambios: Partial<Fila>) {
    setFilas(filas.map((f, j) => (j === i ? { ...f, ...cambios } : f)))
  }

  return (
    <div className="aparecer space-y-6">
      <div>
        <h1 className="font-titulo text-3xl font-bold tracking-tight">
          ¿Qué modelo de cobro me deja más?
        </h1>
        <p className="mt-1 max-w-3xl text-tenue">
          Arma una cartera de clientes y compara cuánto ganas al mes cobrando por módulos, por
          usuario o por volumen. Los costos salen del catálogo; las tarifas de los modelos
          alternativos, de Ajustes.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {totales.map((t) => (
          <div
            key={t.clave}
            className={cx(
              'rounded-2xl border bg-superficie p-5',
              t.clave === mejor?.clave
                ? 'border-marca shadow-[0_0_0_1px_var(--marca)]'
                : 'border-borde',
            )}
          >
            <p className="text-sm font-semibold">{NOMBRES[t.clave]}</p>
            <p className="mt-2 font-titulo text-3xl font-bold tabular-nums">
              {formatoUSD(t.margen)}
            </p>
            <p className="text-xs text-tenue">margen al mes · ingreso {formatoUSD(t.ingreso)}</p>
            {t.bajoMinimo ? (
              <p className="mt-2 text-xs font-semibold text-peligro">
                {t.bajoMinimo} cliente(s) bajo tu margen mínimo
              </p>
            ) : (
              <p className="mt-2 text-xs font-semibold text-ok">Todos cubren el margen mínimo</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-superficie-2 p-4">
          <p className="font-titulo text-2xl font-bold tabular-nums">{clientes}</p>
          <p className="text-xs text-tenue">Clientes en la cartera</p>
        </div>
        <div className="rounded-2xl bg-superficie-2 p-4">
          <p className="font-titulo text-2xl font-bold tabular-nums">{formatoUSD(setupTotal)}</p>
          <p className="text-xs text-tenue">Implementaciones · margen {formatoUSD(margenSetup)}</p>
        </div>
        <div className="rounded-2xl bg-superficie-2 p-4">
          <p className="font-titulo text-2xl font-bold tabular-nums">
            {formatoUSD((totales[0]?.margen ?? 0) * 12)}
          </p>
          <p className="text-xs text-tenue">Margen recurrente al año (híbrido)</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-borde bg-superficie">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-tenue">
              <th className="px-4 py-3">Producto</th>
              <th className="px-3 py-3">Clientes</th>
              <th className="px-3 py-3">Usuarios c/u</th>
              <th className="px-3 py-3">Uso c/u</th>
              <th className="px-3 py-3 text-right">Costo/mes</th>
              <th className="px-3 py-3 text-right">Híbrido</th>
              <th className="px-3 py-3 text-right">Por usuario</th>
              <th className="px-3 py-3 text-right">Por volumen</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {resultados.map(({ f, item, calc, modelos }, i) => (
              <tr key={f.id} className="border-b border-borde/60 last:border-0">
                <td className="px-4 py-2">
                  <select
                    value={f.codigo}
                    onChange={(e) => actualizar(i, { codigo: e.target.value, uso: null })}
                    className="anillo-foco min-h-10 w-full rounded-lg border border-borde bg-superficie px-2"
                  >
                    {vendibles.map((c) => (
                      <option key={c.codigo} value={c.codigo}>
                        {c.nombre_es}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-md p-1.5 hover:bg-superficie-2"
                      onClick={() => actualizar(i, { clientes: Math.max(0, f.clientes - 1) })}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-6 text-center tabular-nums">{f.clientes}</span>
                    <button
                      type="button"
                      className="rounded-md p-1.5 hover:bg-superficie-2"
                      onClick={() => actualizar(i, { clientes: f.clientes + 1 })}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    value={f.usuarios}
                    onChange={(e) => actualizar(i, { usuarios: Number(e.target.value) })}
                    className="anillo-foco min-h-10 w-20 rounded-lg border border-borde bg-superficie px-2 text-right"
                  />
                </td>
                <td className="px-3 py-2">
                  {item?.volumen ? (
                    <input
                      type="number"
                      min={0}
                      value={f.uso ?? item.volumen.incluido}
                      onChange={(e) => actualizar(i, { uso: Number(e.target.value) })}
                      className="anillo-foco min-h-10 w-24 rounded-lg border border-borde bg-superficie px-2 text-right"
                      title={item.volumen.unidad_es}
                    />
                  ) : (
                    <span className="text-tenue">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-tenue">
                  {formatoUSD(calc.costo.mensual)}
                </td>
                {modelos.map((m) => (
                  <td key={m.clave} className="px-3 py-2 text-right tabular-nums">
                    <p>{formatoUSD(m.ingreso_mensual)}</p>
                    <p
                      className={cx(
                        'text-xs font-semibold',
                        m.cumple_minimo ? 'text-ok' : 'text-peligro',
                      )}
                    >
                      {formatoUSD(m.margen_mensual)}
                    </p>
                  </td>
                ))}
                <td className="px-2">
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-tenue hover:text-peligro"
                    onClick={() => setFilas(filas.filter((_, j) => j !== i))}
                  >
                    <Minus className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-borde p-3">
          <button
            type="button"
            onClick={() =>
              setFilas([
                ...filas,
                {
                  id: crypto.randomUUID(),
                  codigo: vendibles[0]?.codigo ?? '',
                  clientes: 1,
                  usuarios: 5,
                  uso: null,
                },
              ])
            }
            className="inline-flex items-center gap-1 text-sm font-semibold text-marca"
          >
            <Plus className="size-4" /> Agregar producto
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-borde bg-superficie p-5 text-sm leading-relaxed">
        <p className="font-titulo text-lg font-semibold">Cómo leerlo</p>
        <ul className="mt-2 space-y-1.5 text-tenue">
          <li>
            <strong className="text-tinta">Híbrido (módulos + volumen)</strong>: cada dolor resuelto
            es un módulo con mensualidad; lo que varía (minutos, conversaciones) se cobra con
            excedente. Protege tu margen cuando un cliente usa mucho y facilita vender más módulos
            después.
          </li>
          <li>
            <strong className="text-tinta">Por usuario</strong>: rinde con equipos grandes, pero tu
            costo no depende de los usuarios sino de la IA y la voz. Con equipos chicos no cubre la
            infraestructura.
          </li>
          <li>
            <strong className="text-tinta">Por volumen</strong>: justo con el uso, pero el ingreso
            es impredecible y los clientes de poco uso no pagan el soporte.
          </li>
        </ul>
      </div>
    </div>
  )
}
