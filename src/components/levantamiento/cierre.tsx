'use client'

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileSignature,
  FileText,
  Plus,
  Presentation,
  Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Aviso, api, Boton, Campo, cx, Etiqueta } from '@/components/ui/primitivos'
import {
  cierreEfectivo,
  MAX_DESEMBOLSOS,
  MOMENTOS,
  montosPagos,
  sumaPct,
  validarPagos,
} from '@/lib/pagos'
import { formatoUSD, type PaqueteCalculado } from '@/lib/precios'
import type { Cliente, Desembolso, NivelPaquete } from '@/lib/tipos'
import type { FilaPropuesta } from '@/server/datos'

const CAMPOS: { clave: keyof Cliente; etiqueta: string; requerido?: boolean }[] = [
  { clave: 'razon_social', etiqueta: 'Razón social', requerido: true },
  { clave: 'ruc', etiqueta: 'RUC', requerido: true },
  { clave: 'contacto_nombre', etiqueta: 'Representante legal', requerido: true },
  { clave: 'contacto_cargo', etiqueta: 'Cargo', requerido: true },
  { clave: 'cedula_representante', etiqueta: 'Cédula del representante', requerido: true },
  { clave: 'direccion', etiqueta: 'Dirección', requerido: true },
  { clave: 'ciudad', etiqueta: 'Ciudad' },
  { clave: 'email', etiqueta: 'Correo', requerido: true },
  { clave: 'telefono', etiqueta: 'Teléfono' },
]

const NOMBRE_NIVEL: Record<NivelPaquete, string> = {
  esencial: 'Esencial',
  recomendado: 'Recomendado',
  premium: 'Premium',
}

/**
 * Cierre en la misma reunión: qué paquete eligió el cliente, cómo lo paga
 * (1 a 12 desembolsos), sus datos legales y el acuerdo listo para firmar.
 */
export function CierreTrato({
  levantamientoId,
  cliente,
  propuesta,
  anticipoPct,
}: {
  levantamientoId: string
  cliente: Cliente
  propuesta: FilaPropuesta
  anticipoPct: number
}) {
  const router = useRouter()
  const inicial = cierreEfectivo(propuesta.cierre, propuesta.datos, anticipoPct)
  const [paquete, setPaquete] = useState<NivelPaquete>(inicial.paquete)
  const [pagos, setPagos] = useState<Desembolso[]>(inicial.pagos)
  // Claves estables para las filas de desembolso (no se guardan).
  const [claves, setClaves] = useState<string[]>(() => inicial.pagos.map(() => crypto.randomUUID()))
  const [datos, setDatos] = useState<Record<string, string>>(() =>
    Object.fromEntries(CAMPOS.map((c) => [c.clave, String(cliente[c.clave] ?? '')])),
  )
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState<{ tono: 'ok' | 'peligro'; texto: string } | null>(null)

  const totales = propuesta.totales as Record<string, PaqueteCalculado>
  const disponibles = propuesta.datos.paquetes.filter((p) => p.lineas.length > 0)
  const elegido = totales[paquete]
  const errorPagos = validarPagos(pagos)
  const conMontos = montosPagos(pagos, elegido?.setup.total ?? 0)

  // Se comparan valores, no texto: la base guarda las claves de cada desembolso en otro orden.
  const firmaPagos = (lista: Desembolso[]) =>
    lista.map((p) => `${p.concepto.trim()}|${Number(p.pct)}`).join(';')
  const cierreSucio =
    !propuesta.cierre ||
    propuesta.cierre.paquete !== paquete ||
    firmaPagos(propuesta.cierre.pagos) !== firmaPagos(pagos)
  const datosSucios = CAMPOS.some(
    (c) => (datos[c.clave] ?? '').trim() !== String(cliente[c.clave] ?? '').trim(),
  )
  const sucio = cierreSucio || datosSucios
  // La razón social puede quedar vacía: se usa el nombre comercial.
  const faltan = CAMPOS.filter(
    (c) => c.requerido && c.clave !== 'razon_social' && !datos[c.clave]?.trim(),
  )

  function pago(i: number, cambios: Partial<Desembolso>) {
    setPagos(pagos.map((p, j) => (j === i ? { ...p, ...cambios } : p)))
  }

  function agregarPago() {
    if (pagos.length >= MAX_DESEMBOLSOS) return
    const resto = Math.max(0, 100 - sumaPct(pagos))
    const usados = new Set(pagos.map((p) => p.concepto))
    const siguiente = MOMENTOS.find((m) => !usados.has(m)) ?? ''
    setPagos([...pagos, { concepto: siguiente, pct: resto }])
    setClaves([...claves, crypto.randomUUID()])
  }

  function repartirIgual() {
    const n = pagos.length
    // Cuatro decimales: 7 cuotas de 14,2857 % dan montos exactos ($600 de $4.200).
    const base = Math.floor((100 / n) * 10_000) / 10_000
    setPagos(
      pagos.map((p, i) => ({
        ...p,
        pct: i === n - 1 ? Math.round((100 - base * (n - 1)) * 10_000) / 10_000 : base,
      })),
    )
  }

  async function guardar() {
    if (errorPagos) {
      setAviso({ tono: 'peligro', texto: errorPagos })
      return
    }
    setGuardando(true)
    setAviso(null)
    try {
      if (cierreSucio) {
        await api(`/api/propuestas/${propuesta.id}`, {
          method: 'PATCH',
          json: { cierre: { paquete, pagos } },
        })
      }
      if (datosSucios) {
        await api(`/api/levantamientos/${levantamientoId}`, {
          method: 'PATCH',
          json: { cliente: datos },
        })
      }
      setAviso({ tono: 'ok', texto: 'Condiciones guardadas. El acuerdo ya las incluye.' })
      router.refresh()
    } catch (e) {
      setAviso({ tono: 'peligro', texto: e instanceof Error ? e.message : String(e) })
    } finally {
      setGuardando(false)
    }
  }

  async function aceptada() {
    await api(`/api/propuestas/${propuesta.id}`, { method: 'PATCH', json: { estado: 'aceptada' } })
    router.refresh()
  }

  const enlaceAcuerdo = (formato: 'pdf' | 'docx') =>
    sucio ? undefined : `/api/propuestas/${propuesta.id}/acuerdo?formato=${formato}`

  return (
    <div className="rounded-2xl border-2 border-marca/30 bg-superficie p-5">
      <p className="flex items-center gap-2 font-titulo text-lg font-semibold">
        <FileSignature className="size-5 text-marca" /> Cerrar el trato
      </p>
      <p className="text-sm text-tenue">
        Versión {propuesta.version} ({propuesta.numero}). Marca lo que eligió el cliente, acuerda
        cómo paga y genera el acuerdo.
      </p>

      {/* 1. Paquete elegido */}
      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-tenue">
        1 · Paquete que eligió el cliente
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {disponibles.map((p) => {
          const calc = totales[p.nivel]
          const activo = paquete === p.nivel
          return (
            <button
              key={p.nivel}
              type="button"
              onClick={() => setPaquete(p.nivel)}
              aria-pressed={activo}
              className={cx(
                'anillo-foco rounded-2xl border-2 p-4 text-left transition',
                activo ? 'border-marca bg-marca/8' : 'border-borde hover:border-marca/40',
              )}
            >
              <span className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-tenue">
                  {NOMBRE_NIVEL[p.nivel]}
                </span>
                {activo ? (
                  <span className="grid size-6 place-items-center rounded-full bg-marca text-white">
                    <Check className="size-4" />
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block font-semibold leading-snug">{p.nombre}</span>
              {calc ? (
                <span className="mt-2 block text-sm tabular-nums">
                  <strong>{formatoUSD(calc.setup.total)}</strong>
                  {calc.mensual.total ? (
                    <span className="text-tenue"> + {formatoUSD(calc.mensual.total)}/mes</span>
                  ) : null}
                  <span className="block text-[11px] text-tenue">con IVA</span>
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* 2. Desembolsos */}
      <div className="mb-2 mt-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-tenue">
          2 · Forma de pago de la implementación ({formatoUSD(elegido?.setup.total ?? 0)} con IVA)
        </p>
        {pagos.length > 1 ? (
          <button
            type="button"
            onClick={repartirIgual}
            className="text-xs font-semibold text-marca"
          >
            Repartir en partes iguales
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        {conMontos.map((d, i) => (
          <div
            key={claves[i] ?? i}
            className="grid grid-cols-[auto_1fr_96px_110px_auto] items-center gap-2"
          >
            <span className="grid size-8 place-items-center rounded-full bg-superficie-2 text-sm font-semibold">
              {i + 1}
            </span>
            <div>
              <input
                list="momentos-pago"
                value={d.concepto}
                onChange={(e) => pago(i, { concepto: e.target.value })}
                placeholder="¿Cuándo se paga?"
                aria-label={`Momento del desembolso ${i + 1}`}
                className="anillo-foco min-h-11 w-full rounded-xl border border-borde bg-superficie px-3 text-sm"
              />
            </div>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                value={d.pct}
                onChange={(e) => pago(i, { pct: Number(e.target.value) })}
                aria-label={`Porcentaje del desembolso ${i + 1}`}
                className="anillo-foco min-h-11 w-full rounded-xl border border-borde bg-superficie pl-3 pr-7 text-right text-sm tabular-nums"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-tenue">
                %
              </span>
            </div>
            <span className="text-right text-sm font-semibold tabular-nums">
              {formatoUSD(d.monto)}
            </span>
            <button
              type="button"
              onClick={() => {
                setPagos(pagos.filter((_, j) => j !== i))
                setClaves(claves.filter((_, j) => j !== i))
              }}
              disabled={pagos.length === 1}
              className="rounded-lg p-2 text-tenue hover:bg-peligro/10 hover:text-peligro disabled:opacity-30"
              title="Quitar desembolso"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <datalist id="momentos-pago">
          {MOMENTOS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        {pagos.length < MAX_DESEMBOLSOS ? (
          <button
            type="button"
            onClick={agregarPago}
            className="inline-flex items-center gap-1 font-semibold text-marca"
          >
            <Plus className="size-4" /> Agregar desembolso
          </button>
        ) : (
          <span className="text-tenue">Máximo {MAX_DESEMBOLSOS} desembolsos</span>
        )}
        <span className={cx('font-semibold tabular-nums', errorPagos ? 'text-peligro' : 'text-ok')}>
          Suma: {sumaPct(pagos)}%
        </span>
      </div>
      {errorPagos ? <p className="mt-1 text-xs text-peligro">{errorPagos}</p> : null}
      {elegido?.mensual.total ? (
        <p className="mt-2 text-xs text-tenue">
          La mensualidad de {formatoUSD(elegido.mensual.total)} (con IVA) se paga por adelantado
          desde la puesta en marcha.
        </p>
      ) : null}

      {/* 3. Datos del cliente */}
      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-tenue">
        3 · Datos de quien contrata
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CAMPOS.map((c) => (
          <div key={c.clave}>
            <Etiqueta htmlFor={`cierre-${c.clave}`}>
              {c.etiqueta}
              {c.requerido && c.clave !== 'razon_social' && !datos[c.clave]?.trim() ? (
                <span className="text-peligro"> *</span>
              ) : null}
            </Etiqueta>
            <Campo
              id={`cierre-${c.clave}`}
              value={datos[c.clave] ?? ''}
              placeholder={c.clave === 'razon_social' ? cliente.nombre : undefined}
              onChange={(e) => setDatos({ ...datos, [c.clave]: e.target.value })}
            />
          </div>
        ))}
      </div>

      {sucio ? (
        <div className="mt-4 flex justify-end">
          <Boton
            variante="primario"
            cargando={guardando}
            onClick={guardar}
            disabled={Boolean(errorPagos)}
          >
            Guardar condiciones
          </Boton>
        </div>
      ) : null}
      {aviso ? (
        <div className="mt-3">
          <Aviso tono={aviso.tono}>{aviso.texto}</Aviso>
        </div>
      ) : null}

      {/* 4. Acuerdo */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-borde pt-4">
        {faltan.length > 0 ? (
          <p className="flex w-full items-center gap-2 text-sm text-aviso">
            <AlertTriangle className="size-4" /> Faltan: {faltan.map((f) => f.etiqueta).join(', ')}.
            El acuerdo saldrá con esos espacios en blanco para llenarlos a mano.
          </p>
        ) : (
          <p className="flex w-full items-center gap-2 text-sm text-ok">
            <CheckCircle2 className="size-4" /> Datos completos para el acuerdo.
          </p>
        )}
        <a
          href={enlaceAcuerdo('pdf')}
          aria-disabled={sucio}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-marca px-4 text-sm font-semibold text-white shadow-sm hover:brightness-110 ${sucio ? 'pointer-events-none opacity-40' : ''}`}
        >
          <FileSignature className="size-4" /> Acuerdo para firmar (PDF)
        </a>
        <a
          href={enlaceAcuerdo('docx')}
          aria-disabled={sucio}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-borde bg-superficie px-4 text-sm font-semibold hover:bg-superficie-2 ${sucio ? 'pointer-events-none opacity-40' : ''}`}
        >
          <FileText className="size-4" /> Acuerdo en Word
        </a>
        {/* Para enviar junto con el acuerdo: incluye "Lo acordado" con el plan de pagos. */}
        <a
          href={sucio ? undefined : `/api/propuestas/${propuesta.id}/exportar?formato=presentacion`}
          aria-disabled={sucio}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-borde bg-superficie px-4 text-sm font-semibold hover:bg-superficie-2 ${sucio ? 'pointer-events-none opacity-40' : ''}`}
        >
          <Presentation className="size-4" /> Presentación (PDF)
        </a>
        {propuesta.estado !== 'aceptada' ? (
          <Boton onClick={aceptada} icono={<CheckCircle2 className="size-4" />} disabled={sucio}>
            Marcar como aceptada
          </Boton>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-ok">
            <CheckCircle2 className="size-4" /> Aceptada
          </span>
        )}
      </div>
      {sucio ? (
        <p className="mt-2 text-xs text-tenue">
          Guarda las condiciones para generar el acuerdo con lo negociado.
        </p>
      ) : null}
    </div>
  )
}
