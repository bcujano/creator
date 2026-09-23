'use client'

import { Brain, ClipboardList, FileStack, History, Package, Smartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Ajustes, Insumo, ItemCatalogo } from '@/lib/tipos'
import type { FilaAnalisis, FilaPropuesta, LevantamientoCompleto } from '@/server/datos'
import { cx } from '../ui'
import { PanelAnalisis } from './analisis'
import { Cabecera } from './cabecera'
import { Entrevista } from './entrevista'
import { Historial } from './historial'
import { Material } from './material'
import { EditorPropuesta } from './propuesta'

export type Evento = {
  id: number
  entidad: string
  accion: string
  datos: Record<string, unknown>
  creado_en: string
}

export type PropsEspacio = {
  levantamiento: LevantamientoCompleto
  insumos: Insumo[]
  analisis: FilaAnalisis[]
  propuestas: FilaPropuesta[]
  catalogo: ItemCatalogo[]
  ajustes: Ajustes
  eventos: Evento[]
  appUrl: string
  estado: { ia: boolean; crm: boolean }
}

const PESTANAS = [
  { id: 'entrevista', texto: 'Entrevista', icono: ClipboardList },
  { id: 'material', texto: 'Material', icono: FileStack },
  { id: 'analisis', texto: 'Diagnóstico', icono: Brain },
  { id: 'propuesta', texto: 'Propuesta', icono: Package },
  { id: 'historial', texto: 'Historial', icono: History },
] as const

type Pestana = (typeof PESTANAS)[number]['id']

export function Espacio(props: PropsEspacio) {
  const inicial: Pestana = props.propuestas.length > 0 ? 'propuesta' : 'entrevista'
  const [pestana, setPestana] = useState<Pestana>(inicial)

  // Recordar la pestaña por levantamiento (conveniencia; si falla, no pasa nada).
  useEffect(() => {
    try {
      const guardada = localStorage.getItem(
        `creator:pestana:${props.levantamiento.id}`,
      ) as Pestana | null
      if (guardada && PESTANAS.some((p) => p.id === guardada)) setPestana(guardada)
    } catch {}
  }, [props.levantamiento.id])

  const aviso = usePulsoCliente(props.levantamiento.id)

  function cambiar(p: Pestana) {
    setPestana(p)
    try {
      localStorage.setItem(`creator:pestana:${props.levantamiento.id}`, p)
    } catch {}
  }

  const conteo: Partial<Record<Pestana, number>> = {
    entrevista: new Set(
      [
        ...Object.entries(props.levantamiento.respuestas),
        ...Object.entries(props.levantamiento.respuestas_cliente ?? {}),
      ]
        .filter(([, v]) => v.trim())
        .map(([k]) => k),
    ).size,
    material: props.insumos.length,
    analisis: props.analisis.length,
    propuesta: props.propuestas.length,
  }

  return (
    <div className="aparecer space-y-5">
      <Cabecera {...props} irA={(p) => cambiar(p as Pestana)} />

      {aviso ? (
        <div className="aparecer no-imprimir fixed right-4 bottom-4 z-40 flex items-center gap-3 rounded-2xl bg-tinta px-4 py-3 text-sm text-fondo shadow-lg">
          <Smartphone className="size-4 text-acento" />
          {aviso}
        </div>
      ) : null}

      <div className="no-imprimir sticky top-16 z-20 -mx-4 border-b border-borde bg-fondo/90 px-4 backdrop-blur">
        <div className="flex gap-1 overflow-x-auto py-2">
          {PESTANAS.map(({ id, texto, icono: Icono }) => (
            <button
              key={id}
              type="button"
              onClick={() => cambiar(id)}
              className={cx(
                'anillo-foco inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition',
                pestana === id
                  ? 'bg-superficie text-tinta shadow-sm ring-1 ring-borde'
                  : 'text-tenue hover:text-tinta',
              )}
            >
              <Icono className={cx('size-4', pestana === id && 'text-marca')} />
              {texto}
              {conteo[id] ? (
                <span className="rounded-full bg-superficie-2 px-1.5 text-xs tabular-nums text-tenue">
                  {conteo[id]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {pestana === 'entrevista' ? <Entrevista {...props} /> : null}
      {pestana === 'material' ? <Material {...props} /> : null}
      {pestana === 'analisis' ? (
        <PanelAnalisis {...props} irAPropuesta={() => cambiar('propuesta')} />
      ) : null}
      {pestana === 'propuesta' ? (
        <EditorPropuesta {...props} irAAnalisis={() => cambiar('analisis')} />
      ) : null}
      {pestana === 'historial' ? <Historial {...props} /> : null}
    </div>
  )
}

/**
 * Mientras la reunión está abierta, consulta cada 5 s si el cliente respondió
 * algo desde su celular; si cambió, recarga los datos del servidor sin perder
 * lo que el consultor está escribiendo.
 */
function usePulsoCliente(levantamientoId: string) {
  const router = useRouter()
  const firma = useRef<string | null>(null)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    let vivo = true
    let ocultar: ReturnType<typeof setTimeout> | undefined
    async function revisar() {
      if (document.visibilityState !== 'visible') return
      try {
        const r = await fetch(`/api/levantamientos/${levantamientoId}/pulso`, { cache: 'no-store' })
        if (!r.ok || !vivo) return
        const { firma: nueva, cliente_termino } = (await r.json()) as {
          firma: string
          cliente_termino: boolean
        }
        if (firma.current !== null && firma.current !== nueva) {
          router.refresh()
          setAviso(
            cliente_termino
              ? 'El cliente terminó el formulario'
              : 'El cliente actualizó sus respuestas',
          )
          clearTimeout(ocultar)
          ocultar = setTimeout(() => setAviso(''), 5000)
        }
        firma.current = nueva
      } catch {
        // Sin conexión: se reintenta en el siguiente ciclo.
      }
    }
    void revisar()
    const t = setInterval(revisar, 5000)
    return () => {
      vivo = false
      clearInterval(t)
      clearTimeout(ocultar)
    }
  }, [levantamientoId, router])

  return aviso
}
