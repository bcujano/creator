'use client'

import {
  Check,
  ChevronDown,
  CloudOff,
  Lightbulb,
  PencilLine,
  Plus,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CampoRespuesta } from '@/components/comun/campo-respuesta'
import { Area, Aviso, api, Boton, cx, Insignia } from '@/components/ui/primitivos'
import { SECCIONES } from '@/lib/preguntas'
import type { Sugerencias } from '@/server/ia/esquema'
import type { PropsEspacio } from './espacio'

type EstadoGuardado = 'guardado' | 'pendiente' | 'guardando' | 'error'

/**
 * Guarda solo lo que cambió, 800 ms después de dejar de escribir. Si falla,
 * reintenta en el siguiente cambio y avisa: nunca se descarta lo escrito.
 */
function useAutoguardado(levantamientoId: string, inicial: Record<string, string>) {
  const [respuestas, setRespuestas] = useState(inicial)
  const [estado, setEstado] = useState<EstadoGuardado>('guardado')
  const pendientes = useRef<Record<string, string>>({})
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enviar = useCallback(async () => {
    const lote = pendientes.current
    if (Object.keys(lote).length === 0) return
    pendientes.current = {}
    setEstado('guardando')
    try {
      await api(`/api/levantamientos/${levantamientoId}`, {
        method: 'PATCH',
        json: { respuestas: lote },
      })
      setEstado(Object.keys(pendientes.current).length ? 'pendiente' : 'guardado')
    } catch {
      pendientes.current = { ...lote, ...pendientes.current }
      setEstado('error')
    }
  }, [levantamientoId])

  function cambiar(id: string, valor: string) {
    setRespuestas((r) => ({ ...r, [id]: valor }))
    pendientes.current[id] = valor
    setEstado('pendiente')
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(enviar, 800)
  }

  // Al salir de la pestaña o cerrar, se envía lo pendiente.
  useEffect(() => {
    const alSalir = () => {
      if (Object.keys(pendientes.current).length === 0) return
      navigator.sendBeacon?.(
        `/api/levantamientos/${levantamientoId}/beacon`,
        new Blob([JSON.stringify({ respuestas: pendientes.current })], {
          type: 'application/json',
        }),
      )
    }
    window.addEventListener('pagehide', alSalir)
    return () => {
      window.removeEventListener('pagehide', alSalir)
      if (temporizador.current) clearTimeout(temporizador.current)
      void enviar()
    }
  }, [levantamientoId, enviar])

  return { respuestas, cambiar, estado }
}

function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
  if (estado === 'error')
    return (
      <Insignia tono="peligro">
        <CloudOff className="size-3" /> Sin conexión: se reintenta
      </Insignia>
    )
  if (estado === 'guardado')
    return (
      <Insignia tono="ok">
        <Check className="size-3" /> Guardado
      </Insignia>
    )
  return <Insignia>Guardando…</Insignia>
}

function hace(fecha: string) {
  const minutos = Math.round((Date.now() - new Date(fecha).getTime()) / 60_000)
  if (minutos < 1) return 'hace un momento'
  if (minutos < 60) return `hace ${minutos} min`
  return new Date(fecha).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })
}

export function Entrevista({
  levantamiento,
  analisis,
  estado: estadoSistema,
  alTerminar,
}: PropsEspacio & { alTerminar: () => void }) {
  const { respuestas, cambiar, estado } = useAutoguardado(
    levantamiento.id,
    levantamiento.respuestas,
  )
  const delCliente = levantamiento.respuestas_cliente ?? {}
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({})
  const [complementando, setComplementando] = useState<Record<string, boolean>>({})
  const [verCliente, setVerCliente] = useState(true)
  const [sugerencias, setSugerencias] = useState<Sugerencias | null>(null)
  const [pensando, setPensando] = useState(false)
  const [error, setError] = useState('')
  const [nuevaPregunta, setNuevaPregunta] = useState('')

  const clienteRespondio = (id: string) => Boolean(delCliente[id]?.trim())
  const respondida = (id: string) => clienteRespondio(id) || Boolean(respuestas[id]?.trim())
  const extras = Object.keys(respuestas).filter((k) => k.startsWith('extra:'))
  const totalCliente = Object.values(delCliente).filter((v) => v.trim()).length

  // Se abre sola la primera sección que todavía tiene algo por preguntar.
  const primeraPendiente = SECCIONES.find((s) =>
    s.preguntas.some((p) => !clienteRespondio(p.id)),
  )?.id
  const abierta = (id: string) => abiertas[id] ?? id === primeraPendiente

  async function sugerir() {
    setPensando(true)
    setError('')
    try {
      setSugerencias(
        await api<Sugerencias>(`/api/levantamientos/${levantamiento.id}/sugerir`, {
          method: 'POST',
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPensando(false)
    }
  }

  function agregarPregunta(texto: string) {
    const limpio = texto.trim()
    if (!limpio) return
    const id = `extra:${limpio}`
    if (!(id in respuestas)) cambiar(id, ' ')
    setNuevaPregunta('')
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-tenue">Pregunta solo lo que falta. Todo se guarda solo.</p>
          <IndicadorGuardado estado={estado} />
        </div>

        {totalCliente > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-acento/40 bg-acento/5">
            <button
              type="button"
              onClick={() => setVerCliente(!verCliente)}
              className="anillo-foco flex min-h-14 w-full items-center justify-between gap-3 px-5 text-left"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="size-5 text-acento" />
                <span className="font-titulo text-lg font-semibold">
                  El cliente respondió {totalCliente}
                </span>
                {levantamiento.cliente_termino ? (
                  <Insignia tono="ok">terminó</Insignia>
                ) : (
                  <Insignia tono="aviso">en curso</Insignia>
                )}
              </span>
              <span className="flex items-center gap-2 text-xs text-tenue">
                {levantamiento.cliente_respondio_en ? hace(levantamiento.cliente_respondio_en) : ''}
                <ChevronDown className={cx('size-5 transition', verCliente && 'rotate-180')} />
              </span>
            </button>
            {verCliente ? (
              <div className="space-y-4 border-t border-acento/20 px-5 py-4">
                {SECCIONES.map((s) => {
                  const suyas = s.preguntas.filter((p) => clienteRespondio(p.id))
                  if (suyas.length === 0) return null
                  return (
                    <div key={s.id}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tenue">
                        {s.es}
                      </p>
                      <div className="space-y-3">
                        {suyas.map((p) => (
                          <div key={p.id} className="rounded-xl bg-superficie p-3">
                            <p className="text-sm text-tenue">{p.es}</p>
                            <p className="mt-1 whitespace-pre-wrap font-medium">
                              {delCliente[p.id]}
                            </p>
                            {complementando[p.id] || respuestas[p.id]?.trim() ? (
                              <div className="mt-2">
                                <Area
                                  rows={2}
                                  placeholder="Tu complemento de la conversación…"
                                  value={respuestas[p.id] ?? ''}
                                  onChange={(e) => cambiar(p.id, e.target.value)}
                                />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setComplementando({ ...complementando, [p.id]: true })
                                }
                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-marca"
                              >
                                <PencilLine className="size-3.5" /> Complementar
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {SECCIONES.map((s) => {
          const pendientes = s.preguntas.filter((p) => !clienteRespondio(p.id))
          if (pendientes.length === 0) return null
          const hechas = s.preguntas.filter((p) => respondida(p.id)).length
          const abiertaSeccion = abierta(s.id)
          return (
            <div
              key={s.id}
              className="overflow-hidden rounded-2xl border border-borde bg-superficie"
            >
              <button
                type="button"
                onClick={() => setAbiertas({ ...abiertas, [s.id]: !abiertaSeccion })}
                className="anillo-foco flex min-h-14 w-full items-center justify-between gap-3 px-5 text-left"
              >
                <span>
                  <span className="font-titulo text-lg font-semibold">{s.es}</span>
                  {s.id === 'consultor' ? (
                    <span className="ml-2 text-xs text-tenue">solo tú</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-tenue">
                    {hechas}/{s.preguntas.length}
                  </span>
                  <ChevronDown
                    className={cx('size-5 text-tenue transition', abiertaSeccion && 'rotate-180')}
                  />
                </span>
              </button>
              {abiertaSeccion ? (
                <div className="space-y-6 border-t border-borde px-5 py-5">
                  {pendientes.map((p) => (
                    <div key={p.id}>
                      <p
                        id={`${p.id}-titulo`}
                        className="mb-2 flex flex-wrap items-center gap-2 font-medium"
                      >
                        <label htmlFor={p.id}>{p.es}</label>
                        {p.sondeo ? <Insignia tono="marca">dolor oculto</Insignia> : null}
                      </p>
                      <CampoRespuesta
                        pregunta={p}
                        idioma="es"
                        valor={respuestas[p.id] ?? ''}
                        onChange={(v) => cambiar(p.id, v)}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}

        <div className="rounded-2xl border border-borde bg-superficie p-5">
          <p className="font-titulo text-lg font-semibold">Preguntas de seguimiento</p>
          <p className="mb-4 text-sm text-tenue">
            Las que surgen en la conversación o las que sugiere el copiloto.
          </p>
          <div className="space-y-5">
            {extras.map((id) => (
              <div key={id}>
                <label htmlFor={id} className="mb-1.5 block font-medium">
                  {id.slice(6)}
                </label>
                <Area
                  id={id}
                  rows={2}
                  value={respuestas[id]?.trim() ? respuestas[id] : ''}
                  onChange={(e) => cambiar(id, e.target.value || ' ')}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={nuevaPregunta}
              onChange={(e) => setNuevaPregunta(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && agregarPregunta(nuevaPregunta)}
              placeholder="Escribe otra pregunta…"
              className="anillo-foco min-h-11 flex-1 rounded-xl border border-borde bg-superficie px-3.5 text-[15px]"
            />
            <Boton
              onClick={() => agregarPregunta(nuevaPregunta)}
              icono={<Plus className="size-4" />}
            >
              Agregar
            </Boton>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-marca p-5 text-white">
          <div>
            <p className="font-titulo text-lg font-semibold">¿Terminaste la conversación?</p>
            <p className="text-sm opacity-85">
              La IA arma el diagnóstico, la solución y los tres paquetes con precio. Toma de 1 a 4
              minutos.
            </p>
          </div>
          <button
            type="button"
            onClick={alTerminar}
            disabled={!estadoSistema.ia}
            className="anillo-foco inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-marca shadow-sm hover:bg-white/90 disabled:opacity-50"
          >
            <Sparkles className="size-4" />
            {analisis.some((a) => a.estado === 'listo')
              ? 'Volver a analizar'
              : 'Listo: analizar y diseñar'}{' '}
            →
          </button>
        </div>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-36 lg:self-start">
        <div className="rounded-2xl border border-marca/25 bg-marca/5 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-marca" />
            <p className="font-titulo text-lg font-semibold">Copiloto</p>
          </div>
          <p className="mt-1 text-sm text-tenue">
            Lee lo que respondió el cliente y lo conversado, y te dice qué preguntar ahora para
            destapar dolores ocultos.
          </p>
          <Boton
            variante="primario"
            className="mt-4 w-full"
            cargando={pensando}
            disabled={!estadoSistema.ia}
            onClick={sugerir}
            icono={<Lightbulb className="size-4" />}
          >
            {pensando ? 'Pensando…' : 'Sugerir siguientes preguntas'}
          </Boton>
          {!estadoSistema.ia ? (
            <p className="mt-2 text-xs text-peligro">Falta configurar la llave de IA.</p>
          ) : null}
          {error ? (
            <div className="mt-3">
              <Aviso>{error}</Aviso>
            </div>
          ) : null}
        </div>

        {sugerencias ? (
          <div className="aparecer space-y-3 rounded-2xl border border-borde bg-superficie p-5">
            {sugerencias.preguntas.map((s) => (
              <div key={s.pregunta} className="rounded-xl bg-superficie-2 p-3">
                <p className="font-medium">{s.pregunta}</p>
                <p className="mt-1 text-xs text-tenue">{s.por_que}</p>
                <button
                  type="button"
                  onClick={() => agregarPregunta(s.pregunta)}
                  className="mt-2 text-xs font-semibold text-marca hover:underline"
                >
                  + Usar esta pregunta
                </button>
              </div>
            ))}
            {sugerencias.dolores_sospechados.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-tenue">
                  Dolores que se asoman
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {sugerencias.dolores_sospechados.map((d) => (
                    <li key={d} className="flex gap-2">
                      <span className="text-peligro">•</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  )
}
