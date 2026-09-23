'use client'

import { AlertTriangle, CheckCircle2, FileSignature, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Cliente } from '@/lib/tipos'
import type { FilaPropuesta } from '@/server/datos'
import { Aviso, api, Boton, Campo, Etiqueta } from '../ui'

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

/**
 * Cierre en la misma reunión: datos legales de quien contrata (vienen del
 * formulario del cliente y se completan aquí) y el acuerdo listo para firmar.
 */
export function CierreTrato({
  levantamientoId,
  cliente,
  propuesta,
}: {
  levantamientoId: string
  cliente: Cliente
  propuesta: FilaPropuesta
}) {
  const router = useRouter()
  const [datos, setDatos] = useState<Record<string, string>>(() =>
    Object.fromEntries(CAMPOS.map((c) => [c.clave, String(cliente[c.clave] ?? '')])),
  )
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState('')
  const sucio = CAMPOS.some((c) => (datos[c.clave] ?? '') !== String(cliente[c.clave] ?? ''))
  // La razón social puede quedar vacía: se usa el nombre comercial.
  const faltan = CAMPOS.filter(
    (c) => c.requerido && c.clave !== 'razon_social' && !datos[c.clave]?.trim(),
  )

  async function guardar() {
    setGuardando(true)
    setAviso('')
    try {
      await api(`/api/levantamientos/${levantamientoId}`, {
        method: 'PATCH',
        json: { cliente: datos },
      })
      router.refresh()
    } catch (e) {
      setAviso(e instanceof Error ? e.message : String(e))
    } finally {
      setGuardando(false)
    }
  }

  async function aceptada() {
    await api(`/api/propuestas/${propuesta.id}`, { method: 'PATCH', json: { estado: 'aceptada' } })
    router.refresh()
  }

  return (
    <div className="rounded-2xl border-2 border-marca/30 bg-superficie p-5">
      <p className="flex items-center gap-2 font-titulo text-lg font-semibold">
        <FileSignature className="size-5 text-marca" /> Cerrar el trato
      </p>
      <p className="text-sm text-tenue">
        Acuerdo de la versión {propuesta.version} ({propuesta.numero}), opción recomendada. Los
        datos vienen del formulario del cliente; completa lo que falte.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="mt-3 flex justify-end">
          <Boton variante="primario" cargando={guardando} onClick={guardar}>
            Guardar datos
          </Boton>
        </div>
      ) : null}
      {aviso ? (
        <div className="mt-3">
          <Aviso>{aviso}</Aviso>
        </div>
      ) : null}

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
          href={sucio ? undefined : `/api/propuestas/${propuesta.id}/acuerdo?formato=pdf`}
          aria-disabled={sucio}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-marca px-4 text-sm font-semibold text-white shadow-sm hover:brightness-110 ${sucio ? 'pointer-events-none opacity-40' : ''}`}
        >
          <FileSignature className="size-4" /> Acuerdo para firmar (PDF)
        </a>
        <a
          href={sucio ? undefined : `/api/propuestas/${propuesta.id}/acuerdo?formato=docx`}
          aria-disabled={sucio}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-borde bg-superficie px-4 text-sm font-semibold hover:bg-superficie-2 ${sucio ? 'pointer-events-none opacity-40' : ''}`}
        >
          <FileText className="size-4" /> Acuerdo en Word
        </a>
        {propuesta.estado !== 'aceptada' ? (
          <Boton onClick={aceptada} icono={<CheckCircle2 className="size-4" />}>
            Marcar como aceptada
          </Boton>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-ok">
            <CheckCircle2 className="size-4" /> Aceptada
          </span>
        )}
      </div>
      {sucio ? (
        <p className="mt-2 text-xs text-tenue">Guarda los datos antes de generar el acuerdo.</p>
      ) : null}
    </div>
  )
}
