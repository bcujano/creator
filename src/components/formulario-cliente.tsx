'use client'

import { Check, CheckCircle2, Loader2, Paperclip } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SECCIONES } from '@/lib/preguntas'
import type { Idioma } from '@/lib/tipos'
import { Grabadora } from './grabadora'
import { subirArchivo } from './subir'
import { api, cx } from './ui'

const T = {
  es: {
    hola: 'Cuéntanos de tu negocio',
    intro: (empresa: string, marca: string) =>
      `Estas preguntas ayudan a ${marca} a diseñar la mejor solución para ${empresa}. Responde lo que puedas, con tus palabras: no hay respuestas incorrectas. Todo se guarda solo.`,
    nombre: 'Tu nombre',
    archivos: 'Comparte lo que quieras',
    archivos_ayuda:
      'Fotos, capturas de tu Excel, catálogos, procesos, lo que nos ayude a entender. También puedes grabar una nota de voz.',
    elegir: 'Adjuntar archivos',
    grabar: 'Grabar nota de voz',
    detener: 'Detener',
    subiendo: 'Subiendo',
    subido: 'Recibido',
    guardado: 'Guardado',
    guardando: 'Guardando…',
    error: 'No se pudo guardar. Revisa tu conexión.',
    listo: 'Enviar',
    gracias:
      '¡Gracias! Ya recibimos tus respuestas. Puedes volver a este enlace cuando quieras para agregar más.',
    otro: 'English',
  },
  en: {
    hola: 'Tell us about your business',
    intro: (empresa: string, marca: string) =>
      `These questions help ${marca} design the best solution for ${empresa}. Answer what you can, in your own words: there are no wrong answers. Everything saves automatically.`,
    nombre: 'Your name',
    archivos: 'Share anything useful',
    archivos_ayuda:
      'Photos, screenshots of your spreadsheets, catalogs, processes — anything that helps us understand. You can also record a voice note.',
    elegir: 'Attach files',
    grabar: 'Record voice note',
    detener: 'Stop',
    subiendo: 'Uploading',
    subido: 'Received',
    guardado: 'Saved',
    guardando: 'Saving…',
    error: 'Could not save. Check your connection.',
    listo: 'Submit',
    gracias:
      'Thank you! We received your answers. You can come back to this link anytime to add more.',
    otro: 'Español',
  },
}

type Archivo = { nombre: string; estado: 'subiendo' | 'listo' | 'error' }

export function FormularioCliente({
  token,
  empresa,
  marca,
  idiomaInicial,
  respuestasIniciales,
  nombreInicial,
}: {
  token: string
  empresa: string
  marca: { nombre: string; logo_url: string }
  idiomaInicial: Idioma
  respuestasIniciales: Record<string, string>
  nombreInicial: string
}) {
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial)
  const [respuestas, setRespuestas] = useState(respuestasIniciales)
  const [nombre, setNombre] = useState(nombreInicial)
  const [estado, setEstado] = useState<'guardado' | 'guardando' | 'error' | 'inicial'>('inicial')
  const [archivos, setArchivos] = useState<Archivo[]>([])
  const [enviado, setEnviado] = useState(false)
  const [logoOk, setLogoOk] = useState(true)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ultimo = useRef({ respuestas, nombre })
  const entrada = useRef<HTMLInputElement>(null)
  const t = T[idioma]

  async function guardar() {
    setEstado('guardando')
    try {
      await api(`/api/publico/f/${token}`, { method: 'PUT', json: ultimo.current })
      setEstado('guardado')
    } catch {
      setEstado('error')
    }
  }

  function programar() {
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(guardar, 1200)
  }

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current)
    },
    [],
  )

  function cambiar(id: string, valor: string) {
    const nuevas = { ...respuestas, [id]: valor }
    setRespuestas(nuevas)
    ultimo.current = { respuestas: nuevas, nombre }
    programar()
  }

  async function subir(lista: File[]) {
    for (const archivo of lista) {
      setArchivos((a) => [...a, { nombre: archivo.name, estado: 'subiendo' }])
      try {
        await subirArchivo(archivo, {
          preparar: `/api/publico/f/${token}/subida`,
          registrar: `/api/publico/f/${token}/archivos`,
        })
        setArchivos((a) =>
          a.map((x) => (x.nombre === archivo.name ? { ...x, estado: 'listo' } : x)),
        )
      } catch {
        setArchivos((a) =>
          a.map((x) => (x.nombre === archivo.name ? { ...x, estado: 'error' } : x)),
        )
      }
    }
  }

  async function enviar() {
    if (temporizador.current) clearTimeout(temporizador.current)
    await guardar()
    setEnviado(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const secciones = SECCIONES.map((s) => ({
    ...s,
    preguntas: s.preguntas.filter((p) => !p.solo_consultor),
  }))

  return (
    <main className="mx-auto max-w-xl px-4 pb-32 pt-6">
      <header className="flex items-center justify-between">
        {marca.logo_url && logoOk ? (
          // biome-ignore lint/performance/noImgElement: logo configurable desde Ajustes
          <img
            src={marca.logo_url}
            alt={marca.nombre}
            className="h-8 w-auto max-w-36 object-contain"
            onError={() => setLogoOk(false)}
          />
        ) : (
          <span className="font-titulo text-xl font-extrabold">{marca.nombre}</span>
        )}
        <button
          type="button"
          onClick={() => setIdioma(idioma === 'es' ? 'en' : 'es')}
          className="text-sm text-tenue"
        >
          {t.otro}
        </button>
      </header>

      {enviado ? (
        <div className="aparecer mt-6 flex gap-3 rounded-2xl border border-ok/30 bg-ok/8 p-4 text-ok">
          <CheckCircle2 className="size-5 shrink-0" />
          <p className="text-sm">{t.gracias}</p>
        </div>
      ) : null}

      <h1 className="mt-8 font-titulo text-3xl font-bold leading-tight">{t.hola}</h1>
      <p className="mt-2 text-tenue">{t.intro(empresa, marca.nombre)}</p>

      <div className="mt-6">
        <label htmlFor="nombre" className="mb-1.5 block text-sm font-semibold">
          {t.nombre}
        </label>
        <input
          id="nombre"
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value)
            ultimo.current = { respuestas, nombre: e.target.value }
            programar()
          }}
          className="anillo-foco min-h-12 w-full rounded-xl border border-borde bg-superficie px-4 text-base"
        />
      </div>

      {secciones.map((s) => (
        <section key={s.id} className="mt-8">
          <h2 className="font-titulo text-xl font-semibold text-marca">
            {idioma === 'en' ? s.en : s.es}
          </h2>
          <div className="mt-3 space-y-5">
            {s.preguntas.map((p) => (
              <div key={p.id}>
                <label htmlFor={p.id} className="mb-1.5 block font-medium leading-snug">
                  {idioma === 'en' ? p.en : p.es}
                </label>
                <textarea
                  id={p.id}
                  rows={2}
                  value={respuestas[p.id] ?? ''}
                  onChange={(e) => cambiar(p.id, e.target.value)}
                  className="anillo-foco min-h-20 w-full rounded-xl border border-borde bg-superficie px-4 py-3 text-base leading-relaxed"
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-10 rounded-2xl border border-borde bg-superficie p-5">
        <h2 className="font-titulo text-xl font-semibold">{t.archivos}</h2>
        <p className="mt-1 text-sm text-tenue">{t.archivos_ayuda}</p>
        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-borde font-semibold"
          >
            <Paperclip className="size-4" /> {t.elegir}
          </button>
          <Grabadora
            onListo={(a) => void subir([a])}
            textos={{ grabar: t.grabar, detener: t.detener }}
          />
        </div>
        <input
          ref={entrada}
          type="file"
          multiple
          hidden
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*,audio/*,video/*"
          onChange={(e) => {
            void subir(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
        {archivos.length ? (
          <ul className="mt-4 space-y-2 text-sm">
            {archivos.map((a) => (
              <li key={a.nombre} className="flex items-center gap-2">
                {a.estado === 'subiendo' ? (
                  <Loader2 className="size-4 animate-spin text-marca" />
                ) : a.estado === 'listo' ? (
                  <Check className="size-4 text-ok" />
                ) : (
                  <span className="text-peligro">!</span>
                )}
                <span className="truncate">{a.nombre}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-borde bg-superficie/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <span className={cx('text-sm', estado === 'error' ? 'text-peligro' : 'text-tenue')}>
            {estado === 'guardando'
              ? t.guardando
              : estado === 'guardado'
                ? `✓ ${t.guardado}`
                : estado === 'error'
                  ? t.error
                  : ''}
          </span>
          <button
            type="button"
            onClick={enviar}
            className="min-h-12 rounded-xl bg-marca px-6 font-semibold text-white shadow-sm"
          >
            {t.listo}
          </button>
        </div>
      </div>
    </main>
  )
}
