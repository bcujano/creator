'use client'

import { Check, ChevronDown, CloudOff, Lightbulb, Plus, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SECCIONES } from '@/lib/preguntas'
import type { Sugerencias } from '@/server/ia/esquema'
import { Area, Aviso, api, Boton, cx, Insignia } from '../ui'
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

export function Entrevista({ levantamiento, insumos, estado: estadoSistema }: PropsEspacio) {
  const { respuestas, cambiar, estado } = useAutoguardado(
    levantamiento.id,
    levantamiento.respuestas,
  )
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({ negocio: true })
  const [sugerencias, setSugerencias] = useState<Sugerencias | null>(null)
  const [pensando, setPensando] = useState(false)
  const [error, setError] = useState('')
  const [nuevaPregunta, setNuevaPregunta] = useState('')

  const extras = Object.keys(respuestas).filter((k) => k.startsWith('extra:'))
  const formularioCliente = insumos.find((i) => i.tipo === 'formulario' && i.origen === 'cliente')

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

  const respondidas = (ids: string[]) => ids.filter((id) => respuestas[id]?.trim()).length

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-tenue">
            Escribe mientras el cliente habla. Todo se guarda solo.
          </p>
          <IndicadorGuardado estado={estado} />
        </div>

        {formularioCliente ? (
          <Aviso tono="ok">
            El cliente ya respondió el formulario desde su celular. Lo verás en Material y entra al
            diagnóstico.
          </Aviso>
        ) : null}

        {SECCIONES.map((s) => {
          const abierta = abiertas[s.id] ?? false
          const hechas = respondidas(s.preguntas.map((p) => p.id))
          return (
            <div
              key={s.id}
              className="overflow-hidden rounded-2xl border border-borde bg-superficie"
            >
              <button
                type="button"
                onClick={() => setAbiertas({ ...abiertas, [s.id]: !abierta })}
                className="anillo-foco flex min-h-14 w-full items-center justify-between gap-3 px-5 text-left"
              >
                <span className="font-titulo text-lg font-semibold">{s.es}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-tenue">
                    {hechas}/{s.preguntas.length}
                  </span>
                  <ChevronDown
                    className={cx('size-5 text-tenue transition', abierta && 'rotate-180')}
                  />
                </span>
              </button>
              {abierta ? (
                <div className="space-y-5 border-t border-borde px-5 py-5">
                  {s.preguntas.map((p) => (
                    <div key={p.id}>
                      <label
                        htmlFor={p.id}
                        className="mb-1.5 flex flex-wrap items-center gap-2 font-medium"
                      >
                        {p.es}
                        {p.sondeo ? <Insignia tono="marca">dolor oculto</Insignia> : null}
                        {p.solo_consultor ? <Insignia>solo consultor</Insignia> : null}
                      </label>
                      {p.ayuda_es ? (
                        <p className="mb-1.5 text-xs text-tenue">{p.ayuda_es}</p>
                      ) : null}
                      <Area
                        id={p.id}
                        rows={2}
                        value={respuestas[p.id] ?? ''}
                        onChange={(e) => cambiar(p.id, e.target.value)}
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
            Las que surgen en la conversación o las que sugiere la IA.
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
      </div>

      <aside className="space-y-3 lg:sticky lg:top-36 lg:self-start">
        <div className="rounded-2xl border border-marca/25 bg-marca/5 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-marca" />
            <p className="font-titulo text-lg font-semibold">Copiloto</p>
          </div>
          <p className="mt-1 text-sm text-tenue">
            Según lo conversado, te sugiere qué preguntar ahora para destapar dolores ocultos.
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
