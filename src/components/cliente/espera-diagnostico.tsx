'use client'

import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/components/ui/primitivos'
import type { Idioma } from '@/lib/tipos'

type Estado =
  | { estado: 'llenando' }
  | { estado: 'analizando' }
  | { estado: 'listo'; propuesta: string }
  | { estado: 'error' }

const T = {
  es: {
    analizando: 'Estamos armando tu diagnóstico',
    analizando_texto:
      'Leemos tus respuestas, buscamos lo que te está costando dinero y diseñamos tu solución con precios. Toma entre 2 y 4 minutos; puedes dejar esta página abierta.',
    listo: 'Tu diagnóstico está listo',
    listo_texto: 'También te llega por WhatsApp.',
    ver: 'Ver mi diagnóstico',
    error: 'No pudimos terminar tu diagnóstico',
    error_texto: 'Ya nos avisó el sistema. Te escribimos por WhatsApp con tu diagnóstico.',
  },
  en: {
    analizando: 'We are building your check-up',
    analizando_texto:
      'We read your answers, find what is costing you money and design your solution with prices. It takes 2 to 4 minutes; you can keep this page open.',
    listo: 'Your check-up is ready',
    listo_texto: 'It also reaches you on WhatsApp.',
    ver: 'See my check-up',
    error: 'We could not finish your check-up',
    error_texto: 'The system already told us. We will message you on WhatsApp with it.',
  },
}

/** Pantalla final de un autodiagnóstico: espera el análisis y lleva a la propuesta cuando está lista. */
export function EsperaDiagnostico({ token, idioma }: { token: string; idioma: Idioma }) {
  const [e, setE] = useState<Estado>({ estado: 'analizando' })
  const t = T[idioma]

  useEffect(() => {
    if (e.estado === 'listo' || e.estado === 'error') return
    const id = setInterval(() => {
      api<Estado>(`/api/publico/f/${token}/estado`)
        .then(setE)
        .catch(() => undefined)
    }, 5000)
    return () => clearInterval(id)
  }, [e.estado, token])

  if (e.estado === 'listo')
    return (
      <section className="aparecer flex flex-1 flex-col justify-center py-10 text-center">
        <CheckCircle2 className="mx-auto size-14 text-ok" />
        <h1 className="mt-4 font-titulo text-3xl font-bold">{t.listo}</h1>
        <p className="mt-3 text-tenue">{t.listo_texto}</p>
        <a
          href={e.propuesta}
          className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-marca text-lg font-semibold text-white shadow-sm"
        >
          {t.ver} <ArrowRight className="size-5" />
        </a>
      </section>
    )
  if (e.estado === 'error')
    return (
      <section className="aparecer flex flex-1 flex-col justify-center py-10 text-center">
        <h1 className="font-titulo text-3xl font-bold">{t.error}</h1>
        <p className="mt-3 text-tenue">{t.error_texto}</p>
      </section>
    )
  return (
    <section className="aparecer flex flex-1 flex-col justify-center py-10 text-center">
      <Loader2 className="mx-auto size-12 animate-spin text-marca" />
      <h1 className="mt-4 font-titulo text-3xl font-bold">{t.analizando}</h1>
      <p className="mt-3 text-tenue">{t.analizando_texto}</p>
    </section>
  )
}
