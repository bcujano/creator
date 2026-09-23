'use client'

import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, Paperclip } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { seccionesCliente } from '@/lib/preguntas'
import type { Idioma } from '@/lib/tipos'
import { CampoRespuesta } from './campo-respuesta'
import { Grabadora } from './grabadora'
import { subirArchivo } from './subir'
import { api, cx } from './ui'

type Datos = Record<
  | 'contacto_nombre'
  | 'contacto_cargo'
  | 'razon_social'
  | 'ruc'
  | 'cedula_representante'
  | 'email'
  | 'telefono'
  | 'direccion'
  | 'ciudad',
  string
>

const T = {
  es: {
    hola: 'Cuéntanos de tu negocio',
    intro: (empresa: string, marca: string) =>
      `Unos minutos para que ${marca} diseñe la solución ideal para ${empresa}. Responde como te salga: no hay respuestas incorrectas y todo se guarda solo.`,
    empezar: 'Empezar',
    minutos: 'Toma unos 5 minutos',
    paso: (n: number, t: number) => `Paso ${n} de ${t}`,
    siguiente: 'Siguiente',
    atras: 'Atrás',
    enviar: 'Enviar',
    opcional: 'Si quieres',
    comparte: 'Comparte lo que quieras',
    comparte_ayuda: 'Fotos, capturas de tu Excel, catálogos o una nota de voz contándonos más.',
    adjuntar: 'Adjuntar archivos',
    grabar: 'Grabar nota de voz',
    detener: 'Detener',
    datos: 'Tus datos',
    datos_intro: 'Para preparar tu propuesta y, si decides avanzar, el acuerdo.',
    campos: {
      contacto_nombre: 'Tu nombre completo',
      contacto_cargo: 'Tu cargo',
      razon_social: 'Razón social de la empresa',
      ruc: 'RUC',
      cedula_representante: 'Cédula del representante legal',
      email: 'Correo',
      telefono: 'Teléfono / WhatsApp',
      direccion: 'Dirección',
      ciudad: 'Ciudad',
    },
    guardado: 'Guardado',
    guardando: 'Guardando…',
    error: 'Sin conexión: reintentamos al seguir',
    gracias_titulo: '¡Gracias!',
    gracias:
      'Ya tenemos tus respuestas. Con esto diseñamos tu solución. Puedes volver a este enlace cuando quieras para agregar algo.',
    editar: 'Revisar mis respuestas',
    otro: 'English',
  },
  en: {
    hola: 'Tell us about your business',
    intro: (empresa: string, marca: string) =>
      `A few minutes so ${marca} can design the ideal solution for ${empresa}. Answer however it comes: there are no wrong answers and everything saves automatically.`,
    empezar: 'Start',
    minutos: 'Takes about 5 minutes',
    paso: (n: number, t: number) => `Step ${n} of ${t}`,
    siguiente: 'Next',
    atras: 'Back',
    enviar: 'Submit',
    opcional: 'Optional',
    comparte: 'Share anything useful',
    comparte_ayuda: 'Photos, spreadsheet screenshots, catalogs or a voice note telling us more.',
    adjuntar: 'Attach files',
    grabar: 'Record voice note',
    detener: 'Stop',
    datos: 'Your details',
    datos_intro: 'To prepare your proposal and, if you decide to move forward, the agreement.',
    campos: {
      contacto_nombre: 'Your full name',
      contacto_cargo: 'Your role',
      razon_social: 'Company legal name',
      ruc: 'Tax ID (RUC)',
      cedula_representante: "Legal representative's ID",
      email: 'Email',
      telefono: 'Phone / WhatsApp',
      direccion: 'Address',
      ciudad: 'City',
    },
    guardado: 'Saved',
    guardando: 'Saving…',
    error: 'Offline: we will retry',
    gracias_titulo: 'Thank you!',
    gracias:
      'We have your answers and will design your solution with them. You can come back to this link anytime to add more.',
    editar: 'Review my answers',
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
  datosIniciales,
  terminado: terminadoInicial,
}: {
  token: string
  empresa: string
  marca: { nombre: string; logo_url: string }
  idiomaInicial: Idioma
  respuestasIniciales: Record<string, string>
  datosIniciales: Datos
  terminado: boolean
}) {
  const secciones = seccionesCliente()
  const total = secciones.length + 1 // + tus datos
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial)
  const [paso, setPaso] = useState(-1) // -1 = bienvenida
  const [respuestas, setRespuestas] = useState(respuestasIniciales)
  const [datos, setDatos] = useState<Datos>(datosIniciales)
  const [estado, setEstado] = useState<'inicial' | 'guardando' | 'guardado' | 'error'>('inicial')
  const [terminado, setTerminado] = useState(terminadoInicial)
  const [archivos, setArchivos] = useState<Archivo[]>([])
  const [logoOk, setLogoOk] = useState(true)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ultimo = useRef({ respuestas, datos })
  const entrada = useRef<HTMLInputElement>(null)
  const t = T[idioma]

  async function guardar(fin = false) {
    if (temporizador.current) clearTimeout(temporizador.current)
    setEstado('guardando')
    try {
      await api(`/api/publico/f/${token}`, {
        method: 'PUT',
        json: { ...ultimo.current, terminado: fin },
      })
      setEstado('guardado')
      return true
    } catch {
      setEstado('error')
      return false
    }
  }

  function programar() {
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => void guardar(), 1000)
  }

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current)
    },
    [],
  )

  function responder(id: string, valor: string) {
    const nuevas = { ...respuestas, [id]: valor }
    setRespuestas(nuevas)
    ultimo.current = { ...ultimo.current, respuestas: nuevas }
    programar()
  }

  function dato(clave: keyof Datos, valor: string) {
    const nuevos = { ...datos, [clave]: valor }
    setDatos(nuevos)
    ultimo.current = { ...ultimo.current, datos: nuevos }
    programar()
  }

  function ir(n: number) {
    void guardar()
    setPaso(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function enviar() {
    if (await guardar(true)) {
      setTerminado(true)
      setPaso(-2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
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

  const seccion = paso >= 0 ? secciones[paso] : undefined
  const enDatos = paso === secciones.length

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-32 pt-5">
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

      {paso >= 0 ? (
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-tenue">
            <span>{t.paso(paso + 1, total)}</span>
            <span className={cx(estado === 'error' && 'text-peligro')}>
              {estado === 'guardando'
                ? t.guardando
                : estado === 'guardado'
                  ? `✓ ${t.guardado}`
                  : estado === 'error'
                    ? t.error
                    : ''}
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-superficie-2">
            <div
              className="h-1.5 rounded-full bg-marca transition-all"
              style={{ width: `${((paso + 1) / total) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {paso === -1 ? (
        <section className="aparecer flex flex-1 flex-col justify-center py-10">
          {terminado ? (
            <div className="mb-6 flex gap-3 rounded-2xl border border-ok/30 bg-ok/8 p-4 text-sm text-ok">
              <CheckCircle2 className="size-5 shrink-0" /> {t.gracias}
            </div>
          ) : null}
          <h1 className="font-titulo text-4xl font-bold leading-tight">{t.hola}</h1>
          <p className="mt-3 text-lg text-tenue">{t.intro(empresa, marca.nombre)}</p>
          <p className="mt-2 text-sm text-tenue">{t.minutos}</p>
          <button
            type="button"
            onClick={() => ir(0)}
            className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-marca text-lg font-semibold text-white shadow-sm"
          >
            {terminado ? t.editar : t.empezar} <ArrowRight className="size-5" />
          </button>
        </section>
      ) : null}

      {paso === -2 ? (
        <section className="aparecer flex flex-1 flex-col justify-center py-10 text-center">
          <CheckCircle2 className="mx-auto size-14 text-ok" />
          <h1 className="mt-4 font-titulo text-3xl font-bold">{t.gracias_titulo}</h1>
          <p className="mt-3 text-tenue">{t.gracias}</p>
          <button
            type="button"
            onClick={() => setPaso(0)}
            className="mt-8 text-sm font-semibold text-marca"
          >
            {t.editar}
          </button>
        </section>
      ) : null}

      {seccion ? (
        <section key={seccion.id} className="aparecer mt-8">
          <h1 className="font-titulo text-3xl font-bold">
            {idioma === 'en' ? seccion.en : seccion.es}
          </h1>
          <p className="mt-1 text-tenue">{idioma === 'en' ? seccion.intro_en : seccion.intro_es}</p>
          <div className="mt-6 space-y-7">
            {seccion.preguntas.map((p) => (
              <div key={p.id}>
                <p id={`${p.id}-titulo`} className="mb-2.5 text-lg font-medium leading-snug">
                  <label htmlFor={p.id}>{idioma === 'en' ? p.en : p.es}</label>
                </p>
                <CampoRespuesta
                  pregunta={p}
                  idioma={idioma}
                  valor={respuestas[p.id] ?? ''}
                  onChange={(v) => responder(p.id, v)}
                  grande
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {enDatos ? (
        <section className="aparecer mt-8">
          <h1 className="font-titulo text-3xl font-bold">{t.datos}</h1>
          <p className="mt-1 text-tenue">{t.datos_intro}</p>
          <div className="mt-6 space-y-4">
            {(Object.keys(t.campos) as (keyof Datos)[]).map((clave) => (
              <div key={clave}>
                <label htmlFor={clave} className="mb-1.5 block text-sm font-semibold">
                  {t.campos[clave]}
                </label>
                <input
                  id={clave}
                  value={datos[clave] ?? ''}
                  inputMode={
                    clave === 'ruc' || clave === 'cedula_representante'
                      ? 'numeric'
                      : clave === 'telefono'
                        ? 'tel'
                        : clave === 'email'
                          ? 'email'
                          : 'text'
                  }
                  autoComplete={
                    clave === 'email'
                      ? 'email'
                      : clave === 'telefono'
                        ? 'tel'
                        : clave === 'contacto_nombre'
                          ? 'name'
                          : 'off'
                  }
                  onChange={(e) => dato(clave, e.target.value)}
                  className="anillo-foco min-h-12 w-full rounded-xl border border-borde bg-superficie px-4 text-base"
                />
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-borde bg-superficie p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-tenue">{t.opcional}</p>
            <h2 className="mt-1 font-titulo text-xl font-semibold">{t.comparte}</h2>
            <p className="mt-1 text-sm text-tenue">{t.comparte_ayuda}</p>
            <div className="mt-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => entrada.current?.click()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-borde font-semibold"
              >
                <Paperclip className="size-4" /> {t.adjuntar}
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
          </div>
        </section>
      ) : null}

      {paso >= 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-borde bg-superficie/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-xl gap-3">
            <button
              type="button"
              onClick={() => ir(paso - 1)}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-borde px-5"
              aria-label={t.atras}
            >
              <ArrowLeft className="size-5" />
            </button>
            {enDatos ? (
              <button
                type="button"
                onClick={enviar}
                className="min-h-14 flex-1 rounded-2xl bg-marca text-lg font-semibold text-white shadow-sm"
              >
                {t.enviar}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => ir(paso + 1)}
                className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-marca text-lg font-semibold text-white shadow-sm"
              >
                {t.siguiente} <ArrowRight className="size-5" />
              </button>
            )}
          </div>
        </div>
      ) : null}
    </main>
  )
}
