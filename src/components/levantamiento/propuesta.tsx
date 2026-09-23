'use client'

import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Lock,
  Plus,
  Presentation,
  Save,
  Send,
  Star,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { calcularPaquete, compararModelos, formatoUSD, type PaqueteCalculado } from '@/lib/precios'
import type {
  DatosPropuesta,
  Idioma,
  ItemCatalogo,
  NivelPaquete,
  PaquetePropuesta,
} from '@/lib/tipos'
import { Area, Aviso, api, Boton, cx, Etiqueta, Insignia, Selector, Vacio } from '../ui'
import { CierreTrato } from './cierre'
import type { PropsEspacio } from './espacio'

const NIVELES: { nivel: NivelPaquete; texto: string }[] = [
  { nivel: 'esencial', texto: 'Esencial' },
  { nivel: 'recomendado', texto: 'Recomendado' },
  { nivel: 'premium', texto: 'Premium' },
]

const FORMATOS = [
  { f: 'pdf', texto: 'PDF' },
  { f: 'docx', texto: 'Word' },
  { f: 'pptx', texto: 'PowerPoint' },
  { f: 'xlsx', texto: 'Excel' },
  { f: 'md', texto: 'Markdown' },
]

function paqueteVacio(nivel: NivelPaquete): PaquetePropuesta {
  return {
    nivel,
    nombre: NIVELES.find((n) => n.nivel === nivel)?.texto ?? nivel,
    propuesta_valor: '',
    lineas: [],
    usuarios: 3,
    volumen: {},
    descuento_setup_pct: 0,
    descuento_mensual_pct: 0,
  }
}

function datosIniciales(p: PropsEspacio['propuestas'][number] | undefined): DatosPropuesta {
  if (p) return structuredClone(p.datos)
  return {
    paquetes: NIVELES.map((n) => paqueteVacio(n.nivel)),
    seleccionado: 'recomendado',
    condiciones: '',
    notas_internas: '',
  }
}

function Numero({
  valor,
  onChange,
  min = 0,
  paso = 1,
  className,
  placeholder,
}: {
  valor: number | null | undefined
  onChange: (v: number | null) => void
  min?: number
  paso?: number
  className?: string
  placeholder?: string
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={paso}
      placeholder={placeholder}
      value={valor ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={cx(
        'anillo-foco min-h-10 w-full rounded-lg border border-borde bg-superficie px-2.5 text-right text-sm tabular-nums',
        className,
      )}
    />
  )
}

/**
 * Precio que se puede negociar en la reunión: vacío = precio de lista. Si se
 * cambia, se ve el de lista tachado y un botón para volver a él.
 */
function PrecioNegociable({
  etiqueta,
  lista,
  valor,
  onChange,
}: {
  etiqueta: string
  lista: number
  valor: number | null | undefined
  onChange: (v: number | null) => void
}) {
  const ajustado = valor !== null && valor !== undefined && valor !== lista
  return (
    <div>
      <span className="flex items-center justify-between text-[11px] text-tenue">
        {etiqueta}
        {ajustado ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-marca"
            title="Volver al precio de lista"
          >
            <s>{formatoUSD(lista)}</s> ↺
          </button>
        ) : null}
      </span>
      <Numero
        valor={valor ?? lista}
        onChange={(v) => onChange(v === lista ? null : v)}
        className={ajustado ? 'border-aviso text-aviso' : undefined}
      />
    </div>
  )
}

function EditorPaquete({
  paquete,
  calculo,
  catalogo,
  seleccionado,
  onChange,
  onElegir,
  margenMinimo,
}: {
  paquete: PaquetePropuesta
  calculo: PaqueteCalculado
  catalogo: ItemCatalogo[]
  seleccionado: boolean
  onChange: (p: PaquetePropuesta) => void
  onElegir: () => void
  margenMinimo: number
}) {
  const mapa = new Map(catalogo.map((c) => [c.codigo, c]))
  const disponibles = catalogo.filter(
    (c) => c.activo && !paquete.lineas.some((l) => l.codigo === c.codigo),
  )
  const conVolumen = calculo.lineas.filter((l) => l.volumen)

  function linea(i: number, cambios: Partial<PaquetePropuesta['lineas'][number]>) {
    onChange({
      ...paquete,
      lineas: paquete.lineas.map((l, j) => (j === i ? { ...l, ...cambios } : l)),
    })
  }

  return (
    <div
      className={cx(
        'flex flex-col rounded-2xl border bg-superficie p-4 transition',
        seleccionado ? 'border-marca shadow-[0_0_0_1px_var(--marca)]' : 'border-borde',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Insignia tono={seleccionado ? 'marca' : 'neutro'}>
          {NIVELES.find((n) => n.nivel === paquete.nivel)?.texto}
        </Insignia>
        <button
          type="button"
          onClick={onElegir}
          className={cx(
            'inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold',
            seleccionado ? 'text-marca' : 'text-tenue hover:text-tinta',
          )}
        >
          <Star className={cx('size-3.5', seleccionado && 'fill-current')} />
          {seleccionado ? 'Recomendado' : 'Marcar recomendado'}
        </button>
      </div>
      <input
        value={paquete.nombre}
        onChange={(e) => onChange({ ...paquete, nombre: e.target.value })}
        className="anillo-foco mt-2 rounded-lg bg-transparent font-titulo text-xl font-semibold"
        aria-label="Nombre del paquete"
      />
      <textarea
        value={paquete.propuesta_valor}
        onChange={(e) => onChange({ ...paquete, propuesta_valor: e.target.value })}
        placeholder="Propuesta de valor en una frase"
        rows={2}
        className="anillo-foco mt-1 resize-none rounded-lg bg-transparent text-sm text-tenue"
      />

      <div className="mt-3 space-y-2">
        {paquete.lineas.map((l, i) => {
          const item = mapa.get(l.codigo)
          const calc = calculo.lineas[i]
          return (
            <div key={l.codigo} className="rounded-xl bg-superficie-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">
                    {item?.nombre_es ?? l.codigo}
                  </p>
                  {calc?.incluido_en ? (
                    <p className="text-xs text-ok">
                      Incluido en {mapa.get(calc.incluido_en)?.nombre_es}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...paquete, lineas: paquete.lineas.filter((_, j) => j !== i) })
                  }
                  className="rounded-md p-1.5 text-tenue hover:bg-peligro/10 hover:text-peligro"
                  title="Quitar"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {!calc?.incluido_en && item ? (
                <div className="mt-2 grid grid-cols-[56px_1fr_1fr] gap-2">
                  <div>
                    <span className="text-[11px] text-tenue">Cant.</span>
                    <Numero
                      valor={l.cantidad}
                      min={1}
                      onChange={(v) => linea(i, { cantidad: Math.max(1, v ?? 1) })}
                    />
                  </div>
                  <PrecioNegociable
                    etiqueta="Setup"
                    lista={item.precio_setup}
                    valor={l.precio_setup}
                    onChange={(v) => linea(i, { precio_setup: v })}
                  />
                  {item.precio_mensual > 0 || l.precio_mensual ? (
                    <PrecioNegociable
                      etiqueta="Mensual"
                      lista={item.precio_mensual}
                      valor={l.precio_mensual}
                      onChange={(v) => linea(i, { precio_mensual: v })}
                    />
                  ) : (
                    <span className="self-end pb-2 text-xs text-tenue">pago único</span>
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
        <Selector
          value=""
          onChange={(e) => {
            if (e.target.value)
              onChange({
                ...paquete,
                lineas: [...paquete.lineas, { codigo: e.target.value, cantidad: 1 }],
              })
          }}
          className="text-sm"
        >
          <option value="">+ Agregar del catálogo…</option>
          {(['paquete', 'modulo', 'servicio'] as const).map((tipo) => (
            <optgroup
              key={tipo}
              label={tipo === 'paquete' ? 'Paquetes' : tipo === 'modulo' ? 'Módulos' : 'Servicios'}
            >
              {disponibles
                .filter((c) => c.tipo === tipo)
                .map((c) => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.nombre_es} · {formatoUSD(c.precio_setup)}
                    {c.precio_mensual ? ` + ${formatoUSD(c.precio_mensual)}/mes` : ''}
                  </option>
                ))}
            </optgroup>
          ))}
        </Selector>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <span className="text-[11px] text-tenue">Usuarios</span>
          <Numero
            valor={paquete.usuarios}
            onChange={(v) => onChange({ ...paquete, usuarios: v ?? 0 })}
          />
        </div>
        <div>
          <span className="text-[11px] text-tenue">Desc. setup %</span>
          <Numero
            valor={paquete.descuento_setup_pct}
            onChange={(v) => onChange({ ...paquete, descuento_setup_pct: Math.min(100, v ?? 0) })}
          />
        </div>
        <div>
          <span className="text-[11px] text-tenue">Desc. mes %</span>
          <Numero
            valor={paquete.descuento_mensual_pct}
            onChange={(v) => onChange({ ...paquete, descuento_mensual_pct: Math.min(100, v ?? 0) })}
          />
        </div>
      </div>
      {conVolumen.map((l) => (
        <div key={l.codigo} className="mt-2">
          <span className="text-[11px] text-tenue">
            Uso mensual estimado · {l.volumen?.unidad} (incluye {l.volumen?.incluido})
          </span>
          <Numero
            valor={paquete.volumen[l.codigo] ?? l.volumen?.incluido}
            onChange={(v) =>
              onChange({ ...paquete, volumen: { ...paquete.volumen, [l.codigo]: v ?? 0 } })
            }
          />
        </div>
      ))}

      <div className="mt-auto space-y-1 border-t border-borde pt-3 text-sm">
        {calculo.usuarios.extra > 0 ? (
          <div className="flex justify-between text-tenue">
            <span>{calculo.usuarios.extra} usuarios extra</span>
            <span className="tabular-nums">{formatoUSD(calculo.usuarios.cargo)}/mes</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span className="text-tenue">Implementación</span>
          <span className="font-titulo text-lg font-bold tabular-nums">
            {formatoUSD(calculo.setup.base)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-tenue">Mensualidad</span>
          <span className="font-titulo text-lg font-bold tabular-nums">
            {formatoUSD(calculo.mensual.base)}
          </span>
        </div>
        <div className="flex justify-between text-xs text-tenue">
          <span>Con IVA</span>
          <span className="tabular-nums">
            {formatoUSD(calculo.setup.total)} · {formatoUSD(calculo.mensual.total)}/mes
          </span>
        </div>
        <div
          className={cx(
            'mt-2 flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs',
            calculo.margen.cumple_minimo ? 'bg-ok/10 text-ok' : 'bg-peligro/10 text-peligro',
          )}
          title="Solo tú lo ves: no aparece en la presentación ni en los archivos"
        >
          <span className="inline-flex items-center gap-1">
            <Lock className="size-3" /> Margen mensual
          </span>
          <span className="font-semibold tabular-nums">
            {formatoUSD(calculo.margen.mensual)} ({calculo.margen.mensual_pct}%)
            {!calculo.margen.cumple_minimo ? ` · mín. ${formatoUSD(margenMinimo)}` : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

export function EditorPropuesta({
  levantamiento,
  propuestas,
  analisis,
  catalogo,
  ajustes,
  appUrl,
  estado,
  irAAnalisis,
}: PropsEspacio & { irAAnalisis: () => void }) {
  const router = useRouter()
  const [versionId, setVersionId] = useState(propuestas[0]?.id ?? '')
  const base = propuestas.find((p) => p.id === versionId) ?? propuestas[0]
  const [datos, setDatos] = useState<DatosPropuesta>(() => datosIniciales(base))
  const [idioma, setIdioma] = useState<Idioma>(base?.idioma ?? levantamiento.idioma)
  const [sucio, setSucio] = useState(false)

  // Si llega una versión nueva desde el servidor (p. ej. al terminar el análisis) y no hay
  // cambios sin guardar, se carga; así la pantalla nunca se queda con un borrador vacío.
  // biome-ignore lint/correctness/useExhaustiveDependencies: solo reacciona a la lista de versiones
  useEffect(() => {
    const ultima = propuestas[0]
    if (!ultima || sucio || propuestas.some((p) => p.id === versionId)) return
    setVersionId(ultima.id)
    setDatos(datosIniciales(ultima))
    setIdioma(ultima.idioma)
  }, [propuestas])
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState<{ tono: 'ok' | 'peligro' | 'aviso'; texto: string } | null>(
    null,
  )
  const [enviandoCrm, setEnviandoCrm] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const mapa = useMemo(() => new Map(catalogo.map((c) => [c.codigo, c])), [catalogo])
  const calculos = useMemo(
    () => datos.paquetes.map((p) => calcularPaquete(p, mapa, ajustes.precios, 'es')),
    [datos, mapa, ajustes.precios],
  )
  const indiceElegido = Math.max(
    0,
    datos.paquetes.findIndex((p) => p.nivel === datos.seleccionado),
  )
  const elegido = calculos[indiceElegido]
  const modelos = elegido ? compararModelos(elegido, ajustes.precios) : []

  function cargarVersion(id: string) {
    if (sucio && !confirm('Hay cambios sin guardar. ¿Descartarlos?')) return
    const p = propuestas.find((x) => x.id === id)
    setVersionId(id)
    setDatos(datosIniciales(p))
    setIdioma(p?.idioma ?? levantamiento.idioma)
    setSucio(false)
  }

  function cambiar(d: DatosPropuesta) {
    setDatos(d)
    setSucio(true)
  }

  async function guardar() {
    setGuardando(true)
    setAviso(null)
    try {
      const r = await api<{
        id: string
        version: number
        numero: string
        crm: { ok: boolean; error?: string } | null
      }>(`/api/levantamientos/${levantamiento.id}/propuestas`, {
        method: 'POST',
        json: {
          analisis_id: base?.analisis_id ?? analisis.find((a) => a.estado === 'listo')?.id ?? null,
          idioma,
          datos,
        },
      })
      setVersionId(r.id)
      setSucio(false)
      setAviso({
        tono: r.crm && !r.crm.ok ? 'aviso' : 'ok',
        texto: `Guardada la versión ${r.version} (${r.numero}).${r.crm ? (r.crm.ok ? ' Enviada al CRM.' : ` CRM: ${r.crm.error}`) : ''}`,
      })
      router.refresh()
    } catch (e) {
      setAviso({ tono: 'peligro', texto: e instanceof Error ? e.message : String(e) })
    } finally {
      setGuardando(false)
    }
  }

  async function enviarCrm() {
    if (!base) return
    setEnviandoCrm(true)
    setAviso(null)
    try {
      const r = await api<{ ok: boolean; lead_id?: string; error?: string }>(
        `/api/propuestas/${base.id}/crm`,
        { method: 'POST' },
      )
      setAviso({ tono: 'ok', texto: `Lead actualizado en el CRM (${r.lead_id}).` })
      router.refresh()
    } catch (e) {
      setAviso({ tono: 'peligro', texto: e instanceof Error ? e.message : String(e) })
    } finally {
      setEnviandoCrm(false)
    }
  }

  async function marcar(estadoPropuesta: string) {
    if (!base) return
    await api(`/api/propuestas/${base.id}`, { method: 'PATCH', json: { estado: estadoPropuesta } })
    router.refresh()
  }

  async function copiarEnlace() {
    if (!base) return
    await navigator.clipboard.writeText(`${appUrl}/p/${base.token_publico}`)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1800)
  }

  if (propuestas.length === 0 && !sucio && datos.paquetes.every((p) => p.lineas.length === 0)) {
    return (
      <Vacio
        titulo="Sin propuesta todavía"
        texto="Lo normal es generarla desde el diagnóstico con IA. También puedes armarla a mano con el catálogo."
        accion={
          <div className="flex flex-wrap justify-center gap-2">
            <Boton variante="primario" onClick={irAAnalisis}>
              Ir al diagnóstico
            </Boton>
            <Boton onClick={() => setSucio(true)}>Armar a mano</Boton>
          </div>
        }
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-borde bg-superficie p-4">
        <div className="flex flex-wrap items-center gap-2">
          {propuestas.length > 0 ? (
            <Selector
              value={versionId}
              onChange={(e) => cargarVersion(e.target.value)}
              className="w-auto"
            >
              {propuestas.map((p) => (
                <option key={p.id} value={p.id}>
                  v{p.version} · {p.numero} · {p.estado}
                </option>
              ))}
            </Selector>
          ) : null}
          <Selector
            value={idioma}
            onChange={(e) => {
              setIdioma(e.target.value as Idioma)
              setSucio(true)
            }}
            className="w-auto"
            aria-label="Idioma"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </Selector>
          {sucio ? <Insignia tono="aviso">Cambios sin guardar</Insignia> : null}
          {base?.crm_sincronizado_en && !sucio ? <Insignia tono="ok">En el CRM</Insignia> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton
            variante="primario"
            cargando={guardando}
            onClick={guardar}
            icono={<Save className="size-4" />}
          >
            {sucio ? 'Guardar versión nueva' : 'Guardar copia'}
          </Boton>
          {base && !sucio ? (
            <Link
              href={`/presentar/${base.id}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-tinta px-4 text-sm font-semibold text-fondo hover:opacity-90"
            >
              <Presentation className="size-4" /> Presentar
            </Link>
          ) : null}
        </div>
      </div>

      {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {datos.paquetes.map((p, i) => (
          <EditorPaquete
            key={p.nivel}
            paquete={p}
            calculo={calculos[i] as PaqueteCalculado}
            catalogo={catalogo}
            seleccionado={p.nivel === datos.seleccionado}
            margenMinimo={ajustes.precios.margen_minimo_mensual}
            onElegir={() => cambiar({ ...datos, seleccionado: p.nivel })}
            onChange={(nuevo) =>
              cambiar({ ...datos, paquetes: datos.paquetes.map((x, j) => (j === i ? nuevo : x)) })
            }
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-borde bg-superficie p-5">
          <Etiqueta htmlFor="condiciones">Condiciones adicionales (las ve el cliente)</Etiqueta>
          <Area
            id="condiciones"
            value={datos.condiciones}
            onChange={(e) => cambiar({ ...datos, condiciones: e.target.value })}
            placeholder="Ej.: incluye 3 meses de acompañamiento; el cliente provee el número de WhatsApp…"
          />
          <div className="mt-4">
            <Etiqueta htmlFor="notas">Notas internas (solo tú)</Etiqueta>
            <Area
              id="notas"
              value={datos.notas_internas}
              onChange={(e) => cambiar({ ...datos, notas_internas: e.target.value })}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-borde bg-superficie p-5">
          <p className="flex items-center gap-2 font-titulo text-lg font-semibold">
            <TrendingUp className="size-5 text-marca" /> Rentabilidad del recomendado
            <Lock className="size-3.5 text-tenue" />
          </p>
          {elegido ? (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-superficie-2 p-3">
                  <p className="font-titulo text-lg font-bold tabular-nums">
                    {formatoUSD(elegido.costo.mensual)}
                  </p>
                  <p className="text-[11px] text-tenue">Costo operativo/mes</p>
                </div>
                <div className="rounded-xl bg-superficie-2 p-3">
                  <p className="font-titulo text-lg font-bold tabular-nums">
                    {formatoUSD(elegido.margen.setup)}
                  </p>
                  <p className="text-[11px] text-tenue">Margen implementación</p>
                </div>
                <div className="rounded-xl bg-superficie-2 p-3">
                  <p className="font-titulo text-lg font-bold tabular-nums">
                    {formatoUSD(elegido.primer_anio)}
                  </p>
                  <p className="text-[11px] text-tenue">Valor primer año</p>
                </div>
              </div>
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-tenue">
                Si cobraras con otro modelo
              </p>
              <div className="space-y-1.5">
                {modelos.map((m) => (
                  <div
                    key={m.clave}
                    className="flex items-center justify-between gap-3 rounded-lg bg-superficie-2 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{m.nombre}</p>
                      <p className="truncate text-[11px] text-tenue">{m.explicacion}</p>
                    </div>
                    <div className="text-right">
                      <p className="tabular-nums">{formatoUSD(m.ingreso_mensual)}/mes</p>
                      <p
                        className={cx(
                          'text-[11px] font-semibold tabular-nums',
                          m.cumple_minimo ? 'text-ok' : 'text-peligro',
                        )}
                      >
                        margen {formatoUSD(m.margen_mensual)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {base && !sucio ? (
        <CierreTrato
          key={base.id}
          levantamientoId={levantamiento.id}
          cliente={levantamiento.clientes}
          propuesta={base}
          anticipoPct={ajustes.precios.anticipo_pct}
        />
      ) : null}

      {base && !sucio ? (
        <div className="rounded-2xl border border-borde bg-superficie p-5">
          <p className="font-titulo text-lg font-semibold">Entregar al cliente</p>
          <p className="text-sm text-tenue">
            Versión {base.version} · {base.numero}. Los archivos nunca incluyen costos ni márgenes.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {FORMATOS.map(({ f, texto }) => (
              <a
                key={f}
                href={`/api/propuestas/${base.id}/exportar?formato=${f}&idioma=${idioma}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-borde bg-superficie px-4 text-sm font-semibold hover:bg-superficie-2"
              >
                <Download className="size-4" /> {texto}
              </a>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-borde pt-4">
            <Boton
              onClick={copiarEnlace}
              icono={copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            >
              {copiado ? 'Enlace copiado' : 'Copiar enlace para el cliente'}
            </Boton>
            <a
              href={`/p/${base.token_publico}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-borde bg-superficie px-4 text-sm font-semibold hover:bg-superficie-2"
            >
              <ExternalLink className="size-4" /> Ver como cliente
            </a>
            <Boton
              onClick={enviarCrm}
              cargando={enviandoCrm}
              disabled={!estado.crm}
              icono={<Send className="size-4" />}
              title={estado.crm ? '' : 'Configura CRM_WEBHOOK_URL y CRM_WEBHOOK_SECRET'}
            >
              Enviar al CRM
            </Boton>
            <Selector
              value={base.estado}
              onChange={(e) => marcar(e.target.value)}
              className="w-auto"
              aria-label="Estado de la propuesta"
            >
              <option value="borrador">Borrador</option>
              <option value="presentada">Presentada</option>
              <option value="enviada">Enviada</option>
              <option value="aceptada">Aceptada ✓</option>
              <option value="rechazada">Rechazada</option>
            </Selector>
          </div>
        </div>
      ) : null}

      {propuestas.length === 0 ? (
        <Boton
          variante="fantasma"
          icono={<Plus className="size-4" />}
          onClick={() => cambiar({ ...datos, paquetes: NIVELES.map((n) => paqueteVacio(n.nivel)) })}
        >
          Reiniciar paquetes
        </Boton>
      ) : null}
    </div>
  )
}
