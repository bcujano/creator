'use client'

import {
  Check,
  Headset,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  Package,
  TrendingUp,
  Users,
  Wallet,
  Workflow,
} from 'lucide-react'
import { cx } from '@/components/ui/primitivos'
import { ENFOQUES, type IdEnfoque, MAX_ENFOQUES } from '@/lib/enfoques'

const ICONOS: Record<IdEnfoque, LucideIcon> = {
  ventas: TrendingUp,
  atencion: Headset,
  operacion: Workflow,
  inventario: Package,
  finanzas: Wallet,
  equipo: Users,
  direccion: LayoutDashboard,
  marketing: Megaphone,
}

/**
 * Elegir en qué se enfoca el sistema: hasta tres áreas. El orden en que se
 * marcan es la prioridad (la primera es el foco principal).
 */
export function SelectorEnfoque({
  valor,
  onChange,
  compacto = false,
  deshabilitado = false,
}: {
  valor: IdEnfoque[]
  onChange: (enfoques: IdEnfoque[]) => void
  compacto?: boolean
  deshabilitado?: boolean
}) {
  const lleno = valor.length >= MAX_ENFOQUES

  function alternar(id: IdEnfoque) {
    if (valor.includes(id)) onChange(valor.filter((v) => v !== id))
    else if (!lleno) onChange([...valor, id])
  }

  return (
    <div className={cx('grid gap-2', compacto ? 'sm:grid-cols-4' : 'sm:grid-cols-2')}>
      {ENFOQUES.map((e) => {
        const Icono = ICONOS[e.id]
        const posicion = valor.indexOf(e.id)
        const activo = posicion >= 0
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => alternar(e.id)}
            disabled={deshabilitado || (!activo && lleno)}
            aria-pressed={activo}
            title={compacto ? `${e.resumen_es} Ej.: ${e.ejemplos_es}` : undefined}
            className={cx(
              'anillo-foco flex items-start gap-3 rounded-xl border-2 text-left transition disabled:opacity-40',
              compacto ? 'min-h-11 p-2.5' : 'p-3.5',
              activo ? 'border-marca bg-marca/8' : 'border-borde hover:border-marca/40',
            )}
          >
            <span
              className={cx(
                'grid size-8 shrink-0 place-items-center rounded-lg',
                activo ? 'bg-marca text-white' : 'bg-superficie-2 text-tenue',
              )}
            >
              {activo && valor.length > 1 ? (
                <span className="text-sm font-bold">{posicion + 1}</span>
              ) : activo ? (
                <Check className="size-4" />
              ) : (
                <Icono className="size-4" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-snug">{e.es}</span>
              {compacto ? null : (
                <>
                  <span className="mt-0.5 block text-xs text-tenue">{e.resumen_es}</span>
                  <span className="mt-1 block text-xs text-tenue/80">Ej.: {e.ejemplos_es}</span>
                </>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
