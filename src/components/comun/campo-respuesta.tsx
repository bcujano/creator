'use client'

import { Check } from 'lucide-react'
import { cx } from '@/components/ui/primitivos'
import { type Pregunta, SEPARADOR } from '@/lib/preguntas'
import type { Idioma } from '@/lib/tipos'

/**
 * Una respuesta: texto libre o botones para tocar. Las opciones se guardan
 * como texto ("WhatsApp · Referidos"), así el análisis las lee igual que
 * una respuesta escrita.
 */
export function CampoRespuesta({
  pregunta,
  idioma,
  valor,
  onChange,
  grande,
}: {
  pregunta: Pregunta
  idioma: Idioma
  valor: string
  onChange: (valor: string) => void
  grande?: boolean
}) {
  if (pregunta.tipo === 'texto' || !pregunta.opciones) {
    return (
      <textarea
        id={pregunta.id}
        rows={2}
        value={valor}
        placeholder={idioma === 'en' ? pregunta.ejemplo_en : pregunta.ejemplo_es}
        onChange={(e) => onChange(e.target.value)}
        className={cx(
          'anillo-foco w-full rounded-xl border border-borde bg-superficie px-4 py-3 leading-relaxed placeholder:text-tenue/60',
          grande ? 'min-h-24 text-base' : 'min-h-20 text-[15px]',
        )}
      />
    )
  }

  const marcadas = valor ? valor.split(SEPARADOR).map((x) => x.trim()) : []
  const etiqueta = (op: { es: string; en: string }) => (idioma === 'en' ? op.en : op.es)

  function tocar(texto: string) {
    if (pregunta.tipo === 'unica') {
      onChange(marcadas.includes(texto) ? '' : texto)
      return
    }
    const nuevas = marcadas.includes(texto)
      ? marcadas.filter((m) => m !== texto)
      : [...marcadas, texto]
    onChange(nuevas.join(SEPARADOR))
  }

  return (
    <fieldset
      className="m-0 flex flex-wrap gap-2 border-0 p-0"
      aria-labelledby={`${pregunta.id}-titulo`}
    >
      {pregunta.opciones.map((op) => {
        // Se guarda siempre en español para que el análisis compare igual en ambos idiomas.
        const activa = marcadas.includes(op.es)
        return (
          <button
            key={op.es}
            type="button"
            aria-pressed={activa}
            onClick={() => tocar(op.es)}
            className={cx(
              'anillo-foco inline-flex items-center gap-1.5 rounded-full border px-4 font-medium transition',
              grande ? 'min-h-12 text-base' : 'min-h-10 text-sm',
              activa
                ? 'border-marca bg-marca text-white'
                : 'border-borde bg-superficie hover:border-marca/50',
            )}
          >
            {activa ? <Check className="size-4" /> : null}
            {etiqueta(op)}
          </button>
        )
      })}
    </fieldset>
  )
}
