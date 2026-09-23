'use client'

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

export function cx(...clases: (string | false | null | undefined)[]) {
  return clases.filter(Boolean).join(' ')
}

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-marca text-white hover:brightness-110 shadow-sm',
  secundario: 'bg-superficie text-tinta border border-borde hover:bg-superficie-2',
  fantasma: 'text-tenue hover:text-tinta hover:bg-superficie-2',
  peligro: 'bg-superficie text-peligro border border-borde hover:bg-peligro/10',
}

export function Boton({
  variante = 'secundario',
  cargando,
  icono,
  children,
  className,
  disabled,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  cargando?: boolean
  icono?: ReactNode
}) {
  return (
    <button
      type="button"
      {...resto}
      disabled={disabled || cargando}
      className={cx(
        'anillo-foco inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTES[variante],
        className,
      )}
    >
      {cargando ? <Girador /> : icono}
      {children}
    </button>
  )
}

export function Girador({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  )
}

export function Etiqueta({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-tenue"
    >
      {children}
    </label>
  )
}

const CAMPO =
  'anillo-foco w-full rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-[15px] text-tinta placeholder:text-tenue/70'

export function Campo(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(CAMPO, 'min-h-11', props.className)} />
}

export function Area(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(CAMPO, 'min-h-24 leading-relaxed', props.className)} />
}

export function Selector(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(CAMPO, 'min-h-11 pr-8', props.className)} />
}

export function Tarjeta({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-2xl border border-borde bg-superficie p-5', className)}>
      {children}
    </div>
  )
}

export function Insignia({
  children,
  tono = 'neutro',
}: {
  children: ReactNode
  tono?: 'neutro' | 'marca' | 'ok' | 'aviso' | 'peligro'
}) {
  const tonos = {
    neutro: 'bg-superficie-2 text-tenue',
    marca: 'bg-marca/12 text-marca',
    ok: 'bg-ok/12 text-ok',
    aviso: 'bg-aviso/12 text-aviso',
    peligro: 'bg-peligro/12 text-peligro',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tonos[tono],
      )}
    >
      {children}
    </span>
  )
}

export function Vacio({
  titulo,
  texto,
  accion,
}: {
  titulo: string
  texto?: string
  accion?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-borde px-6 py-12 text-center">
      <p className="font-titulo text-lg font-semibold">{titulo}</p>
      {texto ? <p className="mx-auto mt-1 max-w-md text-sm text-tenue">{texto}</p> : null}
      {accion ? <div className="mt-4">{accion}</div> : null}
    </div>
  )
}

export function Aviso({
  children,
  tono = 'peligro',
}: {
  children: ReactNode
  tono?: 'peligro' | 'aviso' | 'ok'
}) {
  const tonos = {
    peligro: 'border-peligro/30 bg-peligro/8 text-peligro',
    aviso: 'border-aviso/30 bg-aviso/8 text-aviso',
    ok: 'border-ok/30 bg-ok/8 text-ok',
  }
  return <div className={cx('rounded-xl border px-4 py-3 text-sm', tonos[tono])}>{children}</div>
}

/** Llamada JSON a la API con el error del servidor como mensaje legible. */
export async function api<T = unknown>(
  url: string,
  opciones: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...resto } = opciones
  const r = await fetch(url, {
    ...resto,
    headers: json !== undefined ? { 'content-type': 'application/json', ...headers } : headers,
    body: json !== undefined ? JSON.stringify(json) : resto.body,
  })
  const cuerpo = await r.json().catch(() => ({}))
  if (!r.ok) {
    const mensaje = (cuerpo as { error?: string }).error ?? `Error ${r.status}`
    throw new Error(mensaje)
  }
  return cuerpo as T
}
