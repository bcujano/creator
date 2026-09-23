'use client'

import { Archive, Pencil, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Area,
  Aviso,
  api,
  Boton,
  Campo,
  cx,
  Etiqueta,
  Insignia,
  Selector,
} from '@/components/ui/primitivos'
import { formatoUSD, redondear } from '@/lib/precios'
import type { ItemCatalogo, ParametrosPrecio } from '@/lib/tipos'

type Borrador = Omit<ItemCatalogo, 'id'> & { id?: string }

const NUEVO: Borrador = {
  codigo: '',
  tipo: 'modulo',
  categoria: 'general',
  nombre_es: '',
  nombre_en: '',
  descripcion_es: '',
  descripcion_en: '',
  caracteristicas_es: [],
  caracteristicas_en: [],
  resuelve: [],
  incluye: [],
  precio_setup: 0,
  precio_mensual: 0,
  costo_setup: 0,
  costo_mensual: 0,
  usuarios_incluidos: 0,
  volumen: null,
  semanas: 2,
  estado: 'listo',
  activo: true,
  orden: 500,
}

const lineas = (v: string) =>
  v
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
const comas = (v: string) =>
  v
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

function Formulario({
  inicial,
  catalogo,
  alCerrar,
}: {
  inicial: Borrador
  catalogo: ItemCatalogo[]
  alCerrar: () => void
}) {
  const router = useRouter()
  const [b, setB] = useState<Borrador>(inicial)
  const [texto, setTexto] = useState({
    caracteristicas_es: inicial.caracteristicas_es.join('\n'),
    caracteristicas_en: inicial.caracteristicas_en.join('\n'),
    resuelve: inicial.resuelve.join(', '),
    incluye: inicial.incluye.join(', '),
  })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const num = (clave: keyof Borrador) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setB({ ...b, [clave]: e.target.value === '' ? 0 : Number(e.target.value) })

  async function guardar() {
    setGuardando(true)
    setError('')
    try {
      await api('/api/catalogo', {
        method: 'POST',
        json: {
          ...b,
          caracteristicas_es: lineas(texto.caracteristicas_es),
          caracteristicas_en: lineas(texto.caracteristicas_en),
          resuelve: comas(texto.resuelve),
          incluye: comas(texto.incluye).map((c) => c.toUpperCase()),
        },
      })
      router.refresh()
      alCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="aparecer rounded-2xl border border-marca/30 bg-superficie p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-titulo text-xl font-semibold">
          {b.id ? `Editar ${b.codigo}` : 'Nuevo producto'}
        </p>
        <button
          type="button"
          onClick={alCerrar}
          className="rounded-lg p-2 text-tenue hover:bg-superficie-2"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <Etiqueta>Código</Etiqueta>
          <Campo
            value={b.codigo}
            disabled={Boolean(b.id)}
            onChange={(e) => setB({ ...b, codigo: e.target.value.toUpperCase() })}
            placeholder="MI_MODULO"
          />
        </div>
        <div>
          <Etiqueta>Tipo</Etiqueta>
          <Selector
            value={b.tipo}
            onChange={(e) => setB({ ...b, tipo: e.target.value as Borrador['tipo'] })}
          >
            <option value="paquete">Paquete</option>
            <option value="modulo">Módulo</option>
            <option value="servicio">Servicio (pago único)</option>
          </Selector>
        </div>
        <div>
          <Etiqueta>Categoría</Etiqueta>
          <Campo value={b.categoria} onChange={(e) => setB({ ...b, categoria: e.target.value })} />
        </div>
        <div>
          <Etiqueta>Estado</Etiqueta>
          <Selector
            value={b.estado}
            onChange={(e) => setB({ ...b, estado: e.target.value as Borrador['estado'] })}
          >
            <option value="listo">Listo para vender</option>
            <option value="beta">Beta</option>
            <option value="proximamente">Próximamente (la IA no lo propone)</option>
          </Selector>
        </div>
        <div className="md:col-span-2">
          <Etiqueta>Nombre (español)</Etiqueta>
          <Campo value={b.nombre_es} onChange={(e) => setB({ ...b, nombre_es: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Etiqueta>Nombre (inglés)</Etiqueta>
          <Campo value={b.nombre_en} onChange={(e) => setB({ ...b, nombre_en: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Etiqueta>Descripción (español)</Etiqueta>
          <Area
            value={b.descripcion_es}
            onChange={(e) => setB({ ...b, descripcion_es: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Etiqueta>Descripción (inglés)</Etiqueta>
          <Area
            value={b.descripcion_en}
            onChange={(e) => setB({ ...b, descripcion_en: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Etiqueta>Qué incluye (una por línea, español)</Etiqueta>
          <Area
            value={texto.caracteristicas_es}
            onChange={(e) => setTexto({ ...texto, caracteristicas_es: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Etiqueta>Qué incluye (una por línea, inglés)</Etiqueta>
          <Area
            value={texto.caracteristicas_en}
            onChange={(e) => setTexto({ ...texto, caracteristicas_en: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Etiqueta>Señales para la IA (dolores que resuelve, separados por coma)</Etiqueta>
          <Campo
            value={texto.resuelve}
            onChange={(e) => setTexto({ ...texto, resuelve: e.target.value })}
          />
        </div>
        {b.tipo === 'paquete' ? (
          <div className="md:col-span-2">
            <Etiqueta>Módulos que contiene (códigos, separados por coma)</Etiqueta>
            <Campo
              value={texto.incluye}
              onChange={(e) => setTexto({ ...texto, incluye: e.target.value })}
              placeholder={catalogo
                .filter((c) => c.tipo === 'modulo')
                .slice(0, 3)
                .map((c) => c.codigo)
                .join(', ')}
            />
          </div>
        ) : null}
      </div>

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-tenue">
        Precio y costo (USD, sin IVA)
      </p>
      <div className="grid gap-4 md:grid-cols-6">
        <div>
          <Etiqueta>Setup</Etiqueta>
          <Campo type="number" min={0} value={b.precio_setup} onChange={num('precio_setup')} />
        </div>
        <div>
          <Etiqueta>Mensual</Etiqueta>
          <Campo type="number" min={0} value={b.precio_mensual} onChange={num('precio_mensual')} />
        </div>
        <div>
          <Etiqueta>Costo setup</Etiqueta>
          <Campo type="number" min={0} value={b.costo_setup} onChange={num('costo_setup')} />
        </div>
        <div>
          <Etiqueta>Costo mensual</Etiqueta>
          <Campo type="number" min={0} value={b.costo_mensual} onChange={num('costo_mensual')} />
        </div>
        <div>
          <Etiqueta>Usuarios incl.</Etiqueta>
          <Campo
            type="number"
            min={0}
            value={b.usuarios_incluidos}
            onChange={num('usuarios_incluidos')}
          />
        </div>
        <div>
          <Etiqueta>Semanas</Etiqueta>
          <Campo type="number" min={0} value={b.semanas} onChange={num('semanas')} />
        </div>
      </div>

      <label className="mt-5 flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="size-4 accent-[var(--marca)]"
          checked={Boolean(b.volumen)}
          onChange={(e) =>
            setB({
              ...b,
              volumen: e.target.checked
                ? {
                    unidad_es: 'minutos',
                    unidad_en: 'minutes',
                    incluido: 100,
                    precio_excedente: 0.3,
                    costo_unitario: 0.15,
                  }
                : null,
            })
          }
        />
        Cobra por volumen (minutos, conversaciones…)
      </label>
      {b.volumen ? (
        <div className="mt-3 grid gap-4 md:grid-cols-5">
          {(
            [
              ['unidad_es', 'Unidad (es)', 'text'],
              ['unidad_en', 'Unidad (en)', 'text'],
              ['incluido', 'Incluido al mes', 'number'],
              ['precio_excedente', 'Precio excedente', 'number'],
              ['costo_unitario', 'Tu costo por unidad', 'number'],
            ] as const
          ).map(([clave, etiqueta, tipo]) => (
            <div key={clave}>
              <Etiqueta>{etiqueta}</Etiqueta>
              <Campo
                type={tipo}
                step="any"
                value={b.volumen?.[clave] ?? ''}
                onChange={(e) =>
                  setB({
                    ...b,
                    volumen: {
                      ...(b.volumen as NonNullable<Borrador['volumen']>),
                      [clave]: tipo === 'number' ? Number(e.target.value) : e.target.value,
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={b.activo}
            onChange={(e) => setB({ ...b, activo: e.target.checked })}
          />
          Activo
        </label>
        <div className="flex gap-2">
          <Boton variante="fantasma" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton variante="primario" cargando={guardando} onClick={guardar}>
            Guardar
          </Boton>
        </div>
      </div>
      {error ? (
        <div className="mt-3">
          <Aviso>{error}</Aviso>
        </div>
      ) : null}
    </div>
  )
}

export function EditorCatalogo({
  catalogo,
  precios,
}: {
  catalogo: ItemCatalogo[]
  precios: ParametrosPrecio
}) {
  const router = useRouter()
  const [editando, setEditando] = useState<Borrador | null>(null)
  const grupos = (['paquete', 'modulo', 'servicio'] as const).map((tipo) => ({
    tipo,
    titulo: tipo === 'paquete' ? 'Paquetes' : tipo === 'modulo' ? 'Módulos' : 'Servicios',
    items: catalogo.filter((c) => c.tipo === tipo),
  }))

  async function archivar(item: ItemCatalogo) {
    if (!confirm(`¿Archivar ${item.nombre_es}? Las propuestas antiguas lo conservan.`)) return
    await api(`/api/catalogo?id=${item.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="aparecer space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titulo text-3xl font-bold tracking-tight">Catálogo y precios</h1>
          <p className="mt-1 text-tenue">
            Lo que la IA puede proponer y cuánto cuesta. Cada cambio de precio queda en el
            historial. Margen mínimo mensual: {formatoUSD(precios.margen_minimo_mensual)}.
          </p>
        </div>
        <Boton
          variante="primario"
          icono={<Plus className="size-4" />}
          onClick={() => setEditando({ ...NUEVO })}
        >
          Nuevo
        </Boton>
      </div>

      {editando ? (
        <Formulario
          key={editando.id ?? 'nuevo'}
          inicial={editando}
          catalogo={catalogo}
          alCerrar={() => setEditando(null)}
        />
      ) : null}

      {grupos.map((g) => (
        <section key={g.tipo}>
          <h2 className="mb-3 font-titulo text-xl font-semibold">{g.titulo}</h2>
          <div className="overflow-x-auto rounded-2xl border border-borde bg-superficie">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-tenue">
                  <th className="px-4 py-3 font-semibold">Producto</th>
                  <th className="px-3 py-3 text-right font-semibold">Setup</th>
                  <th className="px-3 py-3 text-right font-semibold">Mensual</th>
                  <th className="px-3 py-3 text-right font-semibold">Costo/mes</th>
                  <th className="px-3 py-3 text-right font-semibold">Margen/mes</th>
                  <th className="px-3 py-3 font-semibold">Volumen</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {g.items.map((c) => {
                  const margen = redondear(c.precio_mensual - c.costo_mensual)
                  // Solo los paquetes deben cubrir el mínimo solos; un módulo suma sobre un paquete.
                  const bajo = c.tipo === 'paquete' && margen < precios.margen_minimo_mensual
                  return (
                    <tr
                      key={c.id}
                      className={cx(
                        'border-b border-borde/60 last:border-0',
                        !c.activo && 'opacity-50',
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold">{c.nombre_es}</p>
                        <p className="text-xs text-tenue">
                          {c.codigo}
                          {c.incluye.length ? ` · contiene ${c.incluye.length} módulos` : ''}
                          {c.usuarios_incluidos ? ` · ${c.usuarios_incluidos} usuarios` : ''}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatoUSD(c.precio_setup)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {c.precio_mensual ? formatoUSD(c.precio_mensual) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-tenue">
                        {c.costo_mensual ? formatoUSD(c.costo_mensual) : '—'}
                      </td>
                      <td
                        className={cx(
                          'px-3 py-3 text-right font-semibold tabular-nums',
                          bajo ? 'text-peligro' : 'text-ok',
                        )}
                      >
                        {c.precio_mensual ? formatoUSD(margen) : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-tenue">
                        {c.volumen
                          ? `${c.volumen.incluido} ${c.volumen.unidad_es} · +${formatoUSD(c.volumen.precio_excedente)}`
                          : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          {c.estado !== 'listo' ? (
                            <Insignia tono="aviso">{c.estado}</Insignia>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              setEditando({ ...c })
                              window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            className="rounded-lg p-2 text-tenue hover:bg-superficie-2 hover:text-tinta"
                            title="Editar"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => archivar(c)}
                            className="rounded-lg p-2 text-tenue hover:bg-peligro/10 hover:text-peligro"
                            title="Archivar"
                          >
                            <Archive className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
