'use client'

import { AlertTriangle, Brain, CheckCircle2, Eye, EyeOff, HelpCircle, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { formatoUSD } from '@/lib/precios'
import type { ResultadoAnalisis } from '@/server/ia/esquema'
import { Aviso, api, Boton, cx, Insignia, Selector, Vacio } from '../ui'
import type { PropsEspacio } from './espacio'

const MENSAJES = [
  'Leyendo la entrevista y el material…',
  'Entendiendo el modelo de negocio…',
  'Buscando dolores que el cliente no mencionó…',
  'Estimando el impacto en dólares…',
  'Cruzando con el catálogo de soluciones…',
  'Diseñando la arquitectura…',
  'Evaluando viabilidad técnica, económica y operativa…',
  'Armando los tres paquetes…',
]

const SEVERIDAD = { alta: 'peligro', media: 'aviso', baja: 'ok' } as const
const VEREDICTO = {
  viable: { texto: 'Viable', tono: 'ok' },
  viable_con_condiciones: { texto: 'Viable con condiciones', tono: 'aviso' },
  no_viable: { texto: 'No viable por ahora', tono: 'peligro' },
} as const

function Titulo({ children }: { children: React.ReactNode }) {
  return <h3 className="font-titulo text-xl font-semibold">{children}</h3>
}

export function VistaDiagnostico({
  r,
  catalogo,
}: {
  r: ResultadoAnalisis
  catalogo: PropsEspacio['catalogo']
}) {
  const nombres = new Map(catalogo.map((c) => [c.codigo, c.nombre_es]))
  const explicitos = r.dolores.filter((d) => d.tipo === 'explicito')
  const ocultos = r.dolores.filter((d) => d.tipo === 'oculto')
  const impactoTotal = r.dolores.reduce((s, d) => s + (d.impacto_mensual_usd ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-marca p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
          Resumen ejecutivo
        </p>
        <p className="mt-2 font-titulo text-xl leading-snug">{r.resumen_ejecutivo}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            v: `${Math.round(r.madurez_digital.puntaje)}/100`,
            n: `Madurez digital · ${r.madurez_digital.nivel}`,
          },
          { v: String(r.dolores.length), n: `Dolores (${ocultos.length} ocultos)` },
          { v: impactoTotal ? formatoUSD(impactoTotal) : '—', n: 'Impacto estimado al mes' },
          {
            v: formatoUSD(r.roi.ahorro_mensual_usd + r.roi.ingreso_adicional_mensual_usd),
            n: 'Beneficio mensual estimado',
          },
        ].map((k) => (
          <div key={k.n} className="rounded-2xl border border-borde bg-superficie p-4">
            <p className="font-titulo text-2xl font-bold tabular-nums">{k.v}</p>
            <p className="text-xs text-tenue">{k.n}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <Titulo>El negocio</Titulo>
        <p>{r.negocio.descripcion}</p>
        <p className="text-sm text-tenue">
          {r.negocio.modelo_de_negocio} · Clientes: {r.negocio.clientes_objetivo} · Canales:{' '}
          {r.negocio.canales.join(', ')}
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {r.madurez_digital.areas.map((a) => (
            <div key={a.area} className="rounded-2xl border border-borde bg-superficie p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{a.area}</p>
                <span className="text-sm tabular-nums text-tenue">{a.puntaje}/5</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-superficie-2">
                <div
                  className="h-2 rounded-full bg-acento"
                  style={{ width: `${Math.min(100, (a.puntaje / 5) * 100)}%` }}
                />
              </div>
              {a.tiene.length ? (
                <p className="mt-2 text-xs text-tenue">Tiene: {a.tiene.join(', ')}</p>
              ) : null}
              {a.falta.length ? (
                <p className="mt-1 text-xs text-peligro/90">Falta: {a.falta.join(', ')}</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {[
        { titulo: 'Lo que el cliente dijo', lista: explicitos, icono: Eye },
        { titulo: 'Dolores ocultos', lista: ocultos, icono: EyeOff },
      ].map(({ titulo, lista, icono: Icono }) =>
        lista.length ? (
          <section key={titulo} className="space-y-3">
            <Titulo>
              <span className="inline-flex items-center gap-2">
                <Icono className="size-5 text-marca" /> {titulo}
              </span>
            </Titulo>
            <div className="grid gap-3 md:grid-cols-2">
              {lista.map((d) => (
                <div key={d.titulo} className="rounded-2xl border border-borde bg-superficie p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{d.titulo}</p>
                    <Insignia tono={SEVERIDAD[d.severidad]}>{d.severidad}</Insignia>
                  </div>
                  <p className="mt-1 text-sm">{d.descripcion}</p>
                  <p className="mt-2 text-xs text-tenue">
                    <strong>Evidencia:</strong> {d.evidencia}
                  </p>
                  {d.impacto_mensual_usd ? (
                    <p className="mt-1 text-sm font-semibold text-peligro">
                      ≈ {formatoUSD(d.impacto_mensual_usd)} / mes
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-tenue">Si no se actúa: {d.costo_de_no_actuar}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null,
      )}

      <section className="space-y-3">
        <Titulo>Soluciones</Titulo>
        <div className="grid gap-3 md:grid-cols-2">
          {r.soluciones.map((s) => (
            <div key={s.titulo} className="rounded-2xl border border-borde bg-superficie p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{s.titulo}</p>
                {s.a_medida ? <Insignia tono="aviso">a medida</Insignia> : null}
              </div>
              <p className="mt-1 text-sm">{s.descripcion}</p>
              <p className="mt-2 text-sm text-ok">{s.beneficio}</p>
              <p className="mt-1 text-xs text-tenue">KPI: {s.indicador}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.codigos_catalogo.map((c) => (
                  <Insignia key={c} tono="marca">
                    {nombres.get(c) ?? c}
                  </Insignia>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <Titulo>Arquitectura</Titulo>
          <p className="text-sm">{r.arquitectura.descripcion}</p>
          <ol className="space-y-2">
            {r.arquitectura.flujo.map((paso, i) => (
              <li key={paso} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-marca/12 text-xs font-bold text-marca">
                  {i + 1}
                </span>
                {paso}
              </li>
            ))}
          </ol>
          <p className="text-xs text-tenue">
            Integraciones: {r.arquitectura.integraciones.join(', ')}
          </p>
        </div>
        <div className="space-y-3">
          <Titulo>Viabilidad y factibilidad</Titulo>
          <Insignia tono={VEREDICTO[r.viabilidad.veredicto].tono}>
            {VEREDICTO[r.viabilidad.veredicto].texto}
          </Insignia>
          {(['tecnica', 'economica', 'operativa'] as const).map((k) => (
            <div key={k}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold capitalize">
                  {k === 'tecnica' ? 'Técnica' : k === 'economica' ? 'Económica' : 'Operativa'}
                </span>
                <span className="tabular-nums text-tenue">{r.viabilidad[k].puntaje}/10</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-superficie-2">
                <div
                  className="h-2 rounded-full bg-marca"
                  style={{ width: `${r.viabilidad[k].puntaje * 10}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-tenue">{r.viabilidad[k].justificacion}</p>
            </div>
          ))}
          <ul className="space-y-1 text-sm">
            {r.viabilidad.riesgos.map((x) => (
              <li key={x.riesgo}>
                <AlertTriangle className="mr-1 inline size-3.5 text-aviso" />
                {x.riesgo} → <span className="text-tenue">{x.mitigacion}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <Titulo>Retorno</Titulo>
        <p className="text-sm">{r.roi.explicacion}</p>
      </section>

      {r.preguntas_pendientes.length ? (
        <section className="rounded-2xl border border-aviso/30 bg-aviso/5 p-5">
          <p className="flex items-center gap-2 font-semibold">
            <HelpCircle className="size-4 text-aviso" /> Para afinar, falta preguntar
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {r.preguntas_pendientes.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

export function PanelAnalisis({
  levantamiento,
  analisis,
  insumos,
  catalogo,
  estado,
  irAPropuesta,
}: PropsEspacio & { irAPropuesta: () => void }) {
  const router = useRouter()
  const [corriendo, setCorriendo] = useState(false)
  const [mensaje, setMensaje] = useState(0)
  const [error, setError] = useState('')
  const listos = analisis.filter((a) => a.estado === 'listo')
  const [elegido, setElegido] = useState(listos[0]?.id ?? '')
  const actual = analisis.find((a) => a.id === elegido) ?? listos[0]

  useEffect(() => {
    if (!corriendo) return
    const t = setInterval(() => setMensaje((m) => (m + 1) % MENSAJES.length), 6000)
    return () => clearInterval(t)
  }, [corriendo])

  const respuestas = Object.values(levantamiento.respuestas).filter((v) => v.trim()).length
  const poco = respuestas + insumos.length < 3

  async function ejecutar() {
    setCorriendo(true)
    setError('')
    setMensaje(0)
    try {
      const r = await api<{ analisisId: string }>(
        `/api/levantamientos/${levantamiento.id}/analizar`,
        { method: 'POST' },
      )
      setElegido(r.analisisId)
      router.refresh()
      irAPropuesta()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      router.refresh()
    } finally {
      setCorriendo(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-borde bg-superficie p-5">
        <div>
          <p className="font-titulo text-xl font-semibold">Diagnóstico con IA</p>
          <p className="text-sm text-tenue">
            {respuestas} respuestas · {insumos.length} materiales. Cada corrida queda guardada como
            versión.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {listos.length > 1 ? (
            <Selector
              value={actual?.id ?? ''}
              onChange={(e) => setElegido(e.target.value)}
              className="w-auto"
            >
              {listos.map((a) => (
                <option key={a.id} value={a.id}>
                  Versión {a.version} ·{' '}
                  {new Date(a.creado_en).toLocaleString('es-EC', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </option>
              ))}
            </Selector>
          ) : null}
          <Boton
            variante="primario"
            cargando={corriendo}
            disabled={!estado.ia}
            onClick={ejecutar}
            icono={<Sparkles className="size-4" />}
          >
            {listos.length ? 'Volver a analizar' : 'Analizar y diseñar'}
          </Boton>
        </div>
      </div>

      {!estado.ia ? <Aviso>Falta ANTHROPIC_API_KEY u OPENAI_API_KEY en el servidor.</Aviso> : null}
      {poco && !corriendo ? (
        <Aviso tono="aviso">
          Hay poca información todavía. El diagnóstico sale mejor con más respuestas o material.
        </Aviso>
      ) : null}
      {error ? <Aviso>{error}</Aviso> : null}

      {corriendo ? (
        <div className="grid place-items-center rounded-2xl border border-borde bg-superficie px-6 py-16 text-center">
          <Brain className="size-10 animate-pulse text-marca" />
          <p className="mt-4 font-titulo text-xl font-semibold">{MENSAJES[mensaje]}</p>
          <p className="mt-1 text-sm text-tenue">
            Un análisis a fondo toma de 1 a 4 minutos. Puedes seguir conversando con el cliente.
          </p>
        </div>
      ) : actual?.resultado ? (
        <div className="aparecer">
          <p className="mb-4 flex items-center gap-2 text-xs text-tenue">
            <CheckCircle2 className="size-3.5 text-ok" />
            Versión {actual.version} · {actual.proveedor} · {actual.modelo}
          </p>
          <VistaDiagnostico r={actual.resultado as ResultadoAnalisis} catalogo={catalogo} />
        </div>
      ) : (
        <Vacio
          titulo="Aún no hay diagnóstico"
          texto="Cuando tengas la conversación avanzada, pulsa Analizar y diseñar: saldrán los dolores, la solución, la viabilidad y tres paquetes con precio."
        />
      )}

      {analisis.some((a) => a.estado === 'error') ? (
        <details className="text-xs text-tenue">
          <summary className="cursor-pointer">Corridas con error</summary>
          <ul className="mt-2 space-y-1">
            {analisis
              .filter((a) => a.estado === 'error')
              .map((a) => (
                <li key={a.id} className={cx('rounded-lg bg-superficie-2 px-3 py-2')}>
                  v{a.version}: {a.error}
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}
