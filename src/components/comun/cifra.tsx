'use client'

import { cx } from '@/components/ui/primitivos'
import { type Cifra, etiquetaConfianza, factorTexto, formula } from '@/lib/analisis'
import { formatoUSD } from '@/lib/precios'
import type { Idioma } from '@/lib/tipos'

const FUENTE = {
  es: { cliente: 'dato del cliente', consultor: 'dato de la reunión', supuesto: 'supuesto' },
  en: { cliente: 'client data', consultor: 'meeting data', supuesto: 'assumption' },
}

/**
 * Una cifra con su cuenta a la vista. Si no hay datos suficientes no muestra
 * un número: muestra "por cuantificar" y la pregunta que falta.
 */
export function CifraConCuenta({
  cifra,
  idioma = 'es',
  sufijo,
  detallado,
  horas,
}: {
  cifra: Cifra
  idioma?: Idioma
  sufijo?: string
  /** Muestra cada factor con su fuente y la cita (vista interna del consultor). */
  detallado?: boolean
  horas?: boolean
}) {
  const en = idioma === 'en'
  if (cifra.valor === null) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-borde px-3 py-2 text-sm">
        <p className="font-semibold text-tenue">{en ? 'To be quantified' : 'Por cuantificar'}</p>
        {cifra.pregunta_para_cuantificar ? (
          <p className="mt-0.5 text-tenue">
            {en ? 'Missing: ' : 'Falta: '}
            {cifra.pregunta_para_cuantificar}
          </p>
        ) : null}
        {detallado && cifra.descartado ? (
          <p className="mt-0.5 text-xs text-aviso">{cifra.descartado}</p>
        ) : null}
      </div>
    )
  }

  const valor = horas ? `${Math.round(cifra.valor)} h` : formatoUSD(cifra.valor, idioma)
  return (
    <div className="mt-3">
      <p className="font-titulo text-xl font-bold text-peligro">
        ≈ {valor}
        {sufijo ? <span className="text-base font-semibold"> {sufijo}</span> : null}
      </p>
      {cifra.factores.length ? (
        <p className="mt-1 text-xs leading-relaxed text-tenue">= {formula(cifra, idioma)}</p>
      ) : null}
      <p
        className={cx(
          'mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold',
          cifra.confianza === 'dato' ? 'bg-ok/12 text-ok' : 'bg-aviso/12 text-aviso',
        )}
      >
        {etiquetaConfianza(cifra, idioma)}
      </p>
      {detallado && cifra.factores.length ? (
        <ul className="mt-2 space-y-1.5 border-t border-borde pt-2">
          {cifra.factores.map((f) => (
            <li key={`${f.concepto}-${f.valor}`} className="text-xs">
              <span className="font-semibold">{factorTexto(f, idioma)}</span>{' '}
              <span
                className={cx(
                  'rounded px-1',
                  f.fuente === 'supuesto' ? 'bg-aviso/12 text-aviso' : 'bg-ok/12 text-ok',
                )}
              >
                {FUENTE[idioma][f.fuente]}
              </span>
              {f.evidencia ? <span className="block text-tenue">{f.evidencia}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
