'use client'

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Languages,
  Maximize,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { etiquetaConfianza, formula } from '@/lib/analisis'
import { formatoUSD } from '@/lib/precios'
import type { DocumentoPublico } from '@/server/publico'
import { CifraConCuenta } from './cifra'
import { cx } from './ui'

type Diapositiva = { id: string; contenido: ReactNode; oscura?: boolean }

const SEV = {
  alta: 'bg-peligro/12 text-peligro',
  media: 'bg-aviso/12 text-aviso',
  baja: 'bg-ok/12 text-ok',
}

function Logo({ doc, claro }: { doc: DocumentoPublico; claro?: boolean }) {
  const [falla, setFalla] = useState(false)
  if (doc.marca.logo_url && !falla) {
    return (
      // biome-ignore lint/performance/noImgElement: logo configurable desde Ajustes (URL externa o local)
      <img
        src={doc.marca.logo_url}
        alt={doc.marca.nombre}
        onError={() => setFalla(true)}
        className={cx('h-10 w-auto max-w-44 object-contain', claro && 'brightness-0 invert')}
      />
    )
  }
  return <span className="font-titulo text-2xl font-extrabold">{doc.marca.nombre}</span>
}

function Encabezado({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-6 md:mb-10">
      {sub ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-marca">{sub}</p>
      ) : null}
      <h2 className="font-titulo text-3xl font-bold leading-tight tracking-tight md:text-5xl">
        {children}
      </h2>
    </div>
  )
}

function usd(v: number, doc: DocumentoPublico) {
  return formatoUSD(v, doc.idioma)
}

function construir(doc: DocumentoPublico): Diapositiva[] {
  const t = doc.t
  const a = doc.analisis
  const d: Diapositiva[] = []
  const mes = doc.idioma === 'en' ? 'mo' : 'mes'

  d.push({
    id: 'portada',
    oscura: true,
    contenido: (
      <div className="flex h-full flex-col justify-between">
        <Logo doc={doc} claro />
        <div>
          <p className="text-lg opacity-80">
            {doc.idioma === 'en' ? doc.marca.eslogan_en : doc.marca.eslogan_es}
          </p>
          <h1 className="mt-3 font-titulo text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
            {t.propuesta}
          </h1>
          <div className="mt-6 h-1.5 w-24 rounded-full bg-acento" />
          <p className="mt-6 text-2xl md:text-3xl">
            {t.preparado_para} <strong>{doc.cliente.nombre}</strong>
          </p>
        </div>
        <p className="text-sm opacity-70">
          {t.numero} {doc.propuesta.numero} · {doc.fecha}
        </p>
      </div>
    ),
  })

  if (a) {
    d.push({
      id: 'resumen',
      contenido: (
        <div className="grid h-full content-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <Encabezado sub={t.resumen}>{t.lo_que_entendimos}</Encabezado>
            <p className="text-xl leading-relaxed md:text-2xl">{a.resumen_ejecutivo}</p>
          </div>
          <div className="self-center rounded-3xl bg-superficie-2 p-6">
            <p className="text-sm text-tenue">{a.negocio.industria}</p>
            <p className="mt-2 leading-relaxed">{a.negocio.descripcion}</p>
            <p className="mt-4 text-sm text-tenue">{a.negocio.tamano}</p>
          </div>
        </div>
      ),
    })

    d.push({
      id: 'madurez',
      contenido: (
        <div className="grid h-full content-center">
          <Encabezado sub={t.madurez}>
            {Math.round(a.madurez_digital.puntaje)}
            <span className="text-tenue">/100</span>
          </Encabezado>
          <div className="grid gap-4 md:grid-cols-2">
            {a.madurez_digital.areas.map((area) => (
              <div key={area.area}>
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">{area.area}</span>
                  <span className="tabular-nums text-tenue">{area.puntaje}/5</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-superficie-2">
                  <div
                    className="h-3 rounded-full bg-acento"
                    style={{ width: `${Math.min(100, (area.puntaje / 5) * 100)}%` }}
                  />
                </div>
                {area.falta.length ? (
                  <p className="mt-1.5 text-sm text-tenue">
                    {t.falta}: {area.falta.slice(0, 3).join(', ')}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ),
    })

    for (const tipo of ['explicito', 'oculto'] as const) {
      const lista = a.dolores.filter((x) => x.tipo === tipo)
      if (!lista.length) continue
      d.push({
        id: `dolores-${tipo}`,
        contenido: (
          <div className="grid h-full content-center">
            <Encabezado sub={t.dolores}>
              {tipo === 'explicito' ? t.dolores_explicitos : t.dolores_ocultos}
            </Encabezado>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {lista.map((x) => (
                <div key={x.titulo} className="rounded-3xl border border-borde bg-superficie p-5">
                  <span
                    className={cx(
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      SEV[x.severidad],
                    )}
                  >
                    {t[x.severidad]}
                  </span>
                  <p className="mt-3 text-lg font-semibold leading-snug">{x.titulo}</p>
                  <p className="mt-2 text-sm leading-relaxed text-tenue">{x.descripcion}</p>
                  <CifraConCuenta cifra={x.impacto} idioma={doc.idioma} sufijo={`/ ${mes}`} />
                </div>
              ))}
            </div>
          </div>
        ),
      })
    }

    d.push({
      id: 'solucion',
      contenido: (
        <div className="grid h-full content-center">
          <Encabezado sub={t.solucion}>
            {doc.idioma === 'en' ? 'What we will build' : 'Lo que vamos a construir'}
          </Encabezado>
          <div className="grid gap-4 md:grid-cols-2">
            {a.soluciones.map((s) => (
              <div key={s.titulo} className="rounded-3xl bg-superficie-2 p-5">
                <p className="text-lg font-semibold text-marca">{s.titulo}</p>
                <p className="mt-1.5 leading-relaxed">{s.descripcion}</p>
                <p className="mt-2 text-sm text-tenue">
                  {t.indicador}: {s.indicador}
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    })

    d.push({
      id: 'arquitectura',
      contenido: (
        <div className="grid h-full content-center">
          <Encabezado sub={t.arquitectura}>{a.arquitectura.descripcion}</Encabezado>
          <ol className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {a.arquitectura.flujo.map((paso, i) => (
              <li key={paso} className="rounded-3xl border border-borde bg-superficie p-4">
                <span className="font-titulo text-3xl font-bold text-marca">{i + 1}</span>
                <p className="mt-2 text-sm leading-relaxed">{paso}</p>
              </li>
            ))}
          </ol>
          {a.arquitectura.integraciones.length ? (
            <p className="mt-6 text-tenue">
              {t.integraciones}: {a.arquitectura.integraciones.join(' · ')}
            </p>
          ) : null}
        </div>
      ),
    })

    d.push({
      id: 'viabilidad',
      contenido: (
        <div className="grid h-full content-center gap-8 md:grid-cols-2">
          <div>
            <Encabezado sub={t.viabilidad}>{t[a.viabilidad.veredicto]}</Encabezado>
            <div className="grid grid-cols-3 gap-3">
              {(['tecnica', 'economica', 'operativa'] as const).map((k) => (
                <div key={k} className="rounded-3xl bg-superficie-2 p-4 text-center">
                  <p className="font-titulo text-4xl font-bold text-marca">
                    {a.viabilidad[k].puntaje}
                  </p>
                  <p className="text-sm text-tenue">{t[k]}</p>
                </div>
              ))}
            </div>
            <ul className="mt-5 space-y-2 text-sm">
              {a.viabilidad.riesgos.slice(0, 4).map((r) => (
                <li key={r.riesgo}>
                  <strong>{r.riesgo}</strong> — <span className="text-tenue">{r.mitigacion}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid content-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-marca">{t.roi}</p>
            {a.roi.componentes
              .filter((c) => c.calculo.valor !== null)
              .map((c) => (
                <div key={c.concepto} className="rounded-3xl bg-marca/8 px-5 py-4">
                  <p className="font-titulo text-3xl font-bold text-marca">
                    {usd(c.calculo.valor ?? 0, doc)}{' '}
                    <span className="text-base font-semibold">/ {mes}</span>
                  </p>
                  <p className="text-sm font-medium">{c.concepto}</p>
                  <p className="mt-1 text-xs text-tenue">= {formula(c.calculo, doc.idioma)}</p>
                  <p className="text-[11px] text-tenue">
                    {etiquetaConfianza(c.calculo, doc.idioma)}
                  </p>
                </div>
              ))}
            {a.roi.horas.valor !== null ? (
              <div className="rounded-3xl bg-marca/8 px-5 py-4">
                <p className="font-titulo text-3xl font-bold text-marca">
                  {Math.round(a.roi.horas.valor)} h
                </p>
                <p className="text-sm font-medium">{t.horas_mes}</p>
                <p className="mt-1 text-xs text-tenue">= {formula(a.roi.horas, doc.idioma)}</p>
              </div>
            ) : null}
            {doc.recuperacion_meses ? (
              <div className="rounded-3xl bg-marca/8 px-5 py-4">
                <p className="font-titulo text-3xl font-bold text-marca">
                  {doc.recuperacion_meses} {t.meses}
                </p>
                <p className="text-sm text-tenue">{t.recuperacion}</p>
              </div>
            ) : null}
            {a.roi.componentes.every((c) => c.calculo.valor === null) ? (
              <p className="text-sm text-tenue">
                {doc.idioma === 'en'
                  ? 'We will quantify the return together once we confirm a few figures.'
                  : 'Cuantificaremos el retorno juntos al confirmar algunos datos.'}
              </p>
            ) : null}
          </div>
        </div>
      ),
    })
  }

  d.push({
    id: 'paquetes',
    contenido: (
      <div className="grid h-full content-center">
        <Encabezado sub={t.paquetes}>
          {doc.idioma === 'en' ? 'Choose your path' : 'Elige tu camino'}
        </Encabezado>
        <div className="grid gap-4 lg:grid-cols-3">
          {doc.paquetes.map((p) => (
            <div
              key={p.nivel}
              className={cx(
                'relative flex flex-col rounded-3xl border bg-superficie p-6',
                p.recomendado
                  ? 'border-marca shadow-[0_0_0_2px_var(--marca)] lg:-translate-y-2'
                  : 'border-borde',
              )}
            >
              {p.recomendado ? (
                <span className="absolute -top-3 left-6 rounded-full bg-marca px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  {t.recomendado}
                </span>
              ) : null}
              <p className="font-titulo text-2xl font-bold">{p.nombre}</p>
              <p className="mt-1 text-sm text-tenue">{p.propuesta_valor}</p>
              <p className="mt-5 font-titulo text-4xl font-extrabold tabular-nums">
                {usd(p.setup.base, doc)}
              </p>
              <p className="text-xs text-tenue">
                {t.implementacion} · + {t.iva} {doc.iva_pct}%
              </p>
              <p className="mt-2 text-lg font-semibold tabular-nums">
                {p.mensual.base ? `+ ${usd(p.mensual.base, doc)} / ${mes}` : t.pago_unico}
              </p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {p.items.map((it) => (
                  <li key={it.codigo} className="flex gap-2">
                    <span className="text-acento">✓</span>
                    {it.nombre}
                    {it.a_medida ? (
                      <span className="ml-1 rounded bg-aviso/12 px-1 text-[11px] text-aviso">
                        {doc.idioma === 'en' ? 'custom' : 'a medida'}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-auto pt-4 text-xs text-tenue">
                {p.usuarios.incluidos ? `${p.usuarios.incluidos} ${t.usuarios} · ` : ''}
                {p.semanas} {t.semanas}
              </p>
            </div>
          ))}
        </div>
      </div>
    ),
  })

  if (a) {
    d.push({
      id: 'plan',
      contenido: (
        <div className="grid h-full content-center">
          <Encabezado sub={t.plan}>
            {doc.idioma === 'en' ? 'How we get there' : 'Cómo llegamos'}
          </Encabezado>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {a.plan.map((f) => (
              <div key={f.fase} className="border-t-4 border-marca pt-4">
                <p className="text-sm text-tenue">
                  {t.fase} {f.fase} · {f.semanas} {t.semanas}
                </p>
                <p className="mt-1 text-lg font-semibold">{f.nombre}</p>
                <ul className="mt-2 space-y-1 text-sm text-tenue">
                  {f.entregables.map((e) => (
                    <li key={e}>• {e}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ),
    })

    d.push({
      id: 'cierre',
      oscura: true,
      contenido: (
        <div className="flex h-full flex-col justify-between">
          <Logo doc={doc} claro />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-80">
              {t.siguiente_paso}
            </p>
            <p className="mt-4 max-w-4xl font-titulo text-3xl font-bold leading-snug md:text-5xl">
              {a.siguiente_paso}
            </p>
          </div>
          <p className="opacity-80">
            {[doc.marca.email, doc.marca.telefono, doc.marca.sitio_web]
              .filter(Boolean)
              .join('  ·  ')}
          </p>
        </div>
      ),
    })
  }
  return d
}

function Descargas({ doc, base }: { doc: DocumentoPublico; base: string }) {
  const formatos = [
    ['pdf', 'PDF'],
    ['docx', 'Word'],
    ['pptx', 'PowerPoint'],
    ['xlsx', 'Excel'],
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {formatos.map(([f, n]) => (
        <a
          key={f}
          href={`${base}?formato=${f}&idioma=${doc.idioma}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-borde bg-superficie px-4 text-sm font-semibold hover:bg-superficie-2"
        >
          <Download className="size-4" /> {n}
        </a>
      ))}
    </div>
  )
}

/** Modo diapositivas: para el iPad en la reunión. */
export function Presentacion({ doc, volver }: { doc: DocumentoPublico; volver: string }) {
  const diapositivas = construir(doc)
  const [i, setI] = useState(0)
  const router = useRouter()
  const params = useSearchParams()
  const contenedor = useRef<HTMLDivElement>(null)
  const toque = useRef<number | null>(null)

  const ir = useCallback(
    (n: number) => setI(Math.max(0, Math.min(diapositivas.length - 1, n))),
    [diapositivas.length],
  )

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) ir(i + 1)
      if (['ArrowLeft', 'PageUp'].includes(e.key)) ir(i - 1)
      if (e.key === 'Escape') router.push(volver)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [i, ir, router, volver])

  function idioma() {
    const nuevo = new URLSearchParams(params)
    nuevo.set('idioma', doc.idioma === 'es' ? 'en' : 'es')
    router.replace(`?${nuevo.toString()}`)
  }

  const actual = diapositivas[i]
  return (
    <div
      ref={contenedor}
      className={cx(
        'fixed inset-0 flex flex-col',
        actual?.oscura ? 'bg-marca text-white' : 'bg-fondo text-tinta',
      )}
      onTouchStart={(e) => {
        toque.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        if (toque.current === null) return
        const dx = (e.changedTouches[0]?.clientX ?? 0) - toque.current
        if (Math.abs(dx) > 50) ir(dx < 0 ? i + 1 : i - 1)
        toque.current = null
      }}
    >
      <div className="flex items-center justify-between px-5 pt-4 md:px-10">
        <Link
          href={volver}
          className="inline-flex items-center gap-1 rounded-lg p-2 text-sm opacity-60 hover:opacity-100"
        >
          <X className="size-5" />
        </Link>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={idioma}
            className="rounded-lg p-2 opacity-60 hover:opacity-100"
            title="Idioma"
          >
            <Languages className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => void contenedor.current?.requestFullscreen?.()}
            className="rounded-lg p-2 opacity-60 hover:opacity-100"
            title="Pantalla completa"
          >
            <Maximize className="size-5" />
          </button>
        </div>
      </div>
      <div
        key={actual?.id}
        className="aparecer min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-16 md:py-10"
      >
        {actual?.contenido}
      </div>
      <div className="flex items-center justify-between px-5 pb-5 md:px-10">
        <button
          type="button"
          onClick={() => ir(i - 1)}
          disabled={i === 0}
          className="rounded-full p-3 opacity-70 hover:opacity-100 disabled:opacity-20"
        >
          <ChevronLeft className="size-6" />
        </button>
        <div className="flex gap-1.5">
          {diapositivas.map((d, n) => (
            <button
              key={d.id}
              type="button"
              onClick={() => ir(n)}
              aria-label={`Diapositiva ${n + 1}`}
              className={cx(
                'h-2 rounded-full transition-all',
                n === i ? 'w-6 bg-current' : 'w-2 bg-current opacity-25',
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => ir(i + 1)}
          disabled={i === diapositivas.length - 1}
          className="rounded-full p-3 opacity-70 hover:opacity-100 disabled:opacity-20"
        >
          <ChevronRight className="size-6" />
        </button>
      </div>
    </div>
  )
}

/** Modo documento: para el celular del cliente, todo en scroll. */
export function PropuestaCliente({ doc }: { doc: DocumentoPublico }) {
  const diapositivas = construir(doc)
  const router = useRouter()
  const base = `/api/publico/p/${doc.propuesta.token_publico}/exportar`
  return (
    <div>
      <div className="no-imprimir sticky top-0 z-20 border-b border-borde bg-fondo/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <span className="truncate text-sm font-semibold">
            {doc.marca.nombre} · {doc.propuesta.numero}
          </span>
          <button
            type="button"
            onClick={() => router.replace(`?idioma=${doc.idioma === 'es' ? 'en' : 'es'}`)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-tenue hover:text-tinta"
          >
            <Languages className="size-4" /> {doc.idioma === 'es' ? 'English' : 'Español'}
          </button>
        </div>
      </div>
      {diapositivas.map((d) => (
        <section
          key={d.id}
          className={cx(
            'px-4 py-12 md:min-h-[80vh] md:py-20',
            d.oscura ? 'min-h-[80vh] bg-marca text-white' : 'bg-fondo',
          )}
        >
          <div className="mx-auto h-full max-w-6xl">{d.contenido}</div>
        </section>
      ))}
      <section className="border-t border-borde bg-superficie px-4 py-12">
        <div className="mx-auto max-w-6xl space-y-6">
          {doc.paquetes.map((p) => (
            <div key={p.nivel} className="overflow-x-auto">
              <p className="mb-2 font-titulo text-xl font-semibold">
                {p.nombre}
                {p.recomendado ? (
                  <span className="ml-2 text-sm text-marca">★ {doc.t.recomendado}</span>
                ) : null}
              </p>
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-borde text-left text-tenue">
                    <th className="py-2 font-medium">{doc.t.concepto}</th>
                    <th className="py-2 text-right font-medium">{doc.t.setup}</th>
                    <th className="py-2 text-right font-medium">{doc.t.mensual}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.lineas.map((l) => (
                    <tr key={l.codigo} className="border-b border-borde/60">
                      <td className="py-2">
                        {l.nombre}
                        {l.incluido_en ? (
                          <span className="text-tenue"> ({doc.t.incluido})</span>
                        ) : null}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {l.incluido_en ? '—' : usd(l.setup, doc)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {l.incluido_en || !l.mensual ? '—' : usd(l.mensual, doc)}
                      </td>
                    </tr>
                  ))}
                  <tr className="text-tenue">
                    <td className="py-2">
                      {doc.t.iva} {doc.iva_pct}%
                    </td>
                    <td className="py-2 text-right tabular-nums">{usd(p.setup.iva, doc)}</td>
                    <td className="py-2 text-right tabular-nums">{usd(p.mensual.iva, doc)}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="py-2">{doc.t.total}</td>
                    <td className="py-2 text-right tabular-nums">{usd(p.setup.total, doc)}</td>
                    <td className="py-2 text-right tabular-nums">{usd(p.mensual.total, doc)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
          <div className="text-sm text-tenue">
            <p>
              {doc.pagos.join(' · ')}. {doc.t.mensualidad_nota}
            </p>
            {doc.propuesta.condiciones ? <p className="mt-1">{doc.propuesta.condiciones}</p> : null}
            <p className="mt-1">
              {doc.t.valida_hasta}: {doc.valida_hasta}
            </p>
          </div>
          <Descargas doc={doc} base={base} />
        </div>
      </section>
    </div>
  )
}

export function BotonVolver({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-tenue hover:text-tinta"
    >
      <ArrowLeft className="size-4" /> Volver
    </Link>
  )
}
