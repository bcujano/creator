'use client'

import {
  AlertTriangle,
  Camera,
  ExternalLink,
  FileAudio,
  FileText,
  Image as ImageIcon,
  Loader2,
  NotebookPen,
  RefreshCw,
  Trash2,
  Upload,
  User,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import type { Insumo } from '@/lib/tipos'
import { Grabadora } from '../grabadora'
import { subirArchivo } from '../subir'
import { Area, Aviso, api, Boton, Campo, cx, Insignia, Vacio } from '../ui'
import type { PropsEspacio } from './espacio'

const ICONOS: Record<Insumo['tipo'], typeof FileText> = {
  nota: NotebookPen,
  texto: FileText,
  archivo: FileText,
  audio: FileAudio,
  imagen: ImageIcon,
  formulario: User,
}

type Cola = { nombre: string; estado: 'subiendo' | 'error'; error?: string }

export function Material({ levantamiento, insumos }: PropsEspacio) {
  const router = useRouter()
  const [nota, setNota] = useState({ titulo: '', contenido: '' })
  const [guardandoNota, setGuardandoNota] = useState(false)
  const [cola, setCola] = useState<Cola[]>([])
  const [abierto, setAbierto] = useState<string | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [error, setError] = useState('')
  const entrada = useRef<HTMLInputElement>(null)
  const camara = useRef<HTMLInputElement>(null)

  const rutas = {
    preparar: `/api/levantamientos/${levantamiento.id}/subida`,
    registrar: `/api/levantamientos/${levantamiento.id}/archivos`,
  }

  async function subir(archivos: File[]) {
    setError('')
    // De a uno: en una conexión móvil, subir en paralelo satura y falla todo junto.
    for (const archivo of archivos) {
      setCola((c) => [...c, { nombre: archivo.name, estado: 'subiendo' }])
      try {
        await subirArchivo(archivo, rutas)
        setCola((c) => c.filter((x) => x.nombre !== archivo.name))
        router.refresh()
      } catch (e) {
        const mensaje = e instanceof Error ? e.message : String(e)
        setCola((c) =>
          c.map((x) => (x.nombre === archivo.name ? { ...x, estado: 'error', error: mensaje } : x)),
        )
      }
    }
  }

  async function guardarNota() {
    if (!nota.contenido.trim()) return
    setGuardandoNota(true)
    try {
      await api(`/api/levantamientos/${levantamiento.id}/insumos`, {
        method: 'POST',
        json: { tipo: 'nota', ...nota },
      })
      setNota({ titulo: '', contenido: '' })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGuardandoNota(false)
    }
  }

  async function reprocesar(id: string) {
    await api(`/api/insumos/${id}`, { method: 'POST' })
    router.refresh()
  }

  async function archivar(id: string) {
    if (!confirm('¿Quitar este material del levantamiento? Queda guardado en el historial.')) return
    await api(`/api/insumos/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        {/* biome-ignore lint/a11y/noStaticElementInteractions: zona de arrastre; los botones internos cubren el teclado */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setArrastrando(true)
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault()
            setArrastrando(false)
            void subir(Array.from(e.dataTransfer.files))
          }}
          className={cx(
            'rounded-2xl border-2 border-dashed bg-superficie p-5 text-center transition',
            arrastrando ? 'border-marca bg-marca/5' : 'border-borde',
          )}
        >
          <Upload className="mx-auto size-7 text-marca" />
          <p className="mt-2 font-semibold">Sube lo que el cliente comparta</p>
          <p className="mt-1 text-xs text-tenue">
            PDF, Word, Excel, fotos, capturas, audios o videos · hasta 50 MB
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Boton
              variante="primario"
              onClick={() => entrada.current?.click()}
              icono={<Upload className="size-4" />}
            >
              Elegir archivos
            </Boton>
            <Boton onClick={() => camara.current?.click()} icono={<Camera className="size-4" />}>
              Foto
            </Boton>
          </div>
          <input
            ref={entrada}
            type="file"
            multiple
            hidden
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,image/*,audio/*,video/*"
            onChange={(e) => {
              void subir(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
          <input
            ref={camara}
            type="file"
            hidden
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              void subir(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </div>

        <div className="rounded-2xl border border-borde bg-superficie p-5">
          <p className="font-semibold">Grabar la conversación</p>
          <p className="mb-3 mt-1 text-xs text-tenue">
            Se transcribe y entra al diagnóstico. Pide permiso al cliente antes de grabar.
          </p>
          <Grabadora onListo={(archivo) => void subir([archivo])} />
        </div>

        <div className="rounded-2xl border border-borde bg-superficie p-5">
          <p className="mb-3 font-semibold">Nota rápida</p>
          <Campo
            placeholder="Título (opcional)"
            value={nota.titulo}
            onChange={(e) => setNota({ ...nota, titulo: e.target.value })}
            className="mb-2"
          />
          <Area
            placeholder="Lo que viste, lo que te dijeron, lo que intuyes…"
            value={nota.contenido}
            onChange={(e) => setNota({ ...nota, contenido: e.target.value })}
          />
          <Boton
            className="mt-3 w-full"
            cargando={guardandoNota}
            onClick={guardarNota}
            disabled={!nota.contenido.trim()}
          >
            Guardar nota
          </Boton>
        </div>
        {error ? <Aviso>{error}</Aviso> : null}
      </div>

      <div className="space-y-2">
        {cola.map((c) => (
          <div
            key={c.nombre}
            className="flex items-center gap-3 rounded-2xl border border-borde bg-superficie px-4 py-3"
          >
            {c.estado === 'subiendo' ? (
              <Loader2 className="size-5 animate-spin text-marca" />
            ) : (
              <AlertTriangle className="size-5 text-peligro" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.nombre}</p>
              <p className="text-xs text-tenue">
                {c.estado === 'subiendo' ? 'Subiendo y leyendo el contenido…' : c.error}
              </p>
            </div>
            {c.estado === 'error' ? (
              <button
                type="button"
                className="text-xs text-tenue"
                onClick={() => setCola((x) => x.filter((y) => y !== c))}
              >
                Cerrar
              </button>
            ) : null}
          </div>
        ))}

        {insumos.length === 0 && cola.length === 0 ? (
          <Vacio
            titulo="Sin material todavía"
            texto="Documentos, fotos del local, capturas de su Excel, audios de la reunión o las respuestas que el cliente llene en su celular."
          />
        ) : null}

        {[...insumos].reverse().map((i) => {
          const Icono = ICONOS[i.tipo]
          const expandido = abierto === i.id
          return (
            <div
              key={i.id}
              className="overflow-hidden rounded-2xl border border-borde bg-superficie"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <Icono className="size-5 shrink-0 text-marca" />
                <button
                  type="button"
                  onClick={() => setAbierto(expandido ? null : i.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-semibold">
                    {i.titulo || (i.tipo === 'nota' ? 'Nota' : i.tipo)}
                  </p>
                  <p className="truncate text-xs text-tenue">
                    {new Date(i.creado_en).toLocaleString('es-EC', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                    {i.contenido
                      ? ` · ${i.contenido.length.toLocaleString('es-EC')} caracteres`
                      : ''}
                  </p>
                </button>
                {i.origen === 'cliente' ? <Insignia tono="marca">cliente</Insignia> : null}
                {i.estado === 'procesando' ? <Insignia tono="aviso">leyendo…</Insignia> : null}
                {i.estado === 'error' ? <Insignia tono="peligro">revisar</Insignia> : null}
                <div className="flex shrink-0 items-center">
                  {i.ruta_archivo ? (
                    <a
                      href={`/api/insumos/${i.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg p-2 text-tenue hover:bg-superficie-2 hover:text-tinta"
                      title="Abrir original"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                  {i.ruta_archivo && i.estado !== 'listo' ? (
                    <button
                      type="button"
                      onClick={() => reprocesar(i.id)}
                      className="rounded-lg p-2 text-tenue hover:bg-superficie-2 hover:text-tinta"
                      title="Volver a leer"
                    >
                      <RefreshCw className="size-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => archivar(i.id)}
                    className="rounded-lg p-2 text-tenue hover:bg-peligro/10 hover:text-peligro"
                    title="Quitar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              {i.error ? <p className="px-4 pb-3 text-xs text-aviso">{i.error}</p> : null}
              {expandido && i.contenido ? (
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-borde bg-superficie-2 px-4 py-3 font-sans text-sm leading-relaxed">
                  {i.contenido}
                </pre>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
