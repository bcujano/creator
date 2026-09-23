'use client'

import { Check, Copy, Download, Pencil, QrCode, Smartphone, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { useState } from 'react'
import type { EstadoLevantamiento } from '@/lib/tipos'
import { api, Boton, Campo, Etiqueta, Selector } from '../ui'
import type { PropsEspacio } from './espacio'

const ESTADOS: { valor: EstadoLevantamiento; texto: string }[] = [
  { valor: 'recolectando', texto: 'Recolectando' },
  { valor: 'analizado', texto: 'Analizado' },
  { valor: 'propuesta', texto: 'Propuesta lista' },
  { valor: 'enviada', texto: 'Enviada' },
  { valor: 'ganada', texto: 'Ganada' },
  { valor: 'perdida', texto: 'Perdida' },
]

const FICHA: { clave: keyof PropsEspacio['levantamiento']['clientes']; etiqueta: string }[] = [
  { clave: 'nombre', etiqueta: 'Empresa' },
  { clave: 'industria', etiqueta: 'Industria' },
  { clave: 'ciudad', etiqueta: 'Ciudad' },
  { clave: 'contacto_nombre', etiqueta: 'Contacto' },
  { clave: 'contacto_cargo', etiqueta: 'Cargo' },
  { clave: 'telefono', etiqueta: 'Teléfono / WhatsApp' },
  { clave: 'email', etiqueta: 'Correo' },
  { clave: 'empleados', etiqueta: 'Empleados' },
  { clave: 'sitio_web', etiqueta: 'Sitio web o redes' },
  { clave: 'ruc', etiqueta: 'RUC' },
]

export function Cabecera({ levantamiento, appUrl }: PropsEspacio & { irA: (p: string) => void }) {
  const router = useRouter()
  const c = levantamiento.clientes
  const [editando, setEditando] = useState(false)
  const [ficha, setFicha] = useState<Record<string, string>>(() =>
    Object.fromEntries(FICHA.map((f) => [f.clave, String(c[f.clave] ?? '')])),
  )
  const [guardando, setGuardando] = useState(false)
  const [qr, setQr] = useState('')
  const [copiado, setCopiado] = useState(false)
  const enlaceCliente = `${appUrl}/f/${levantamiento.token_cliente}`

  async function guardarFicha() {
    setGuardando(true)
    try {
      await api(`/api/levantamientos/${levantamiento.id}`, {
        method: 'PATCH',
        json: { cliente: ficha },
      })
      setEditando(false)
      router.refresh()
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarEstado(estado: string) {
    await api(`/api/levantamientos/${levantamiento.id}`, { method: 'PATCH', json: { estado } })
    router.refresh()
  }

  async function alternarFormulario() {
    await api(`/api/levantamientos/${levantamiento.id}`, {
      method: 'PATCH',
      json: { formulario_activo: !levantamiento.formulario_activo },
    })
    router.refresh()
  }

  async function mostrarQr() {
    if (qr) return setQr('')
    setQr(await QRCode.toDataURL(enlaceCliente, { margin: 1, width: 360 }))
  }

  async function copiar() {
    await navigator.clipboard.writeText(enlaceCliente)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1800)
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-titulo text-3xl font-bold tracking-tight">{c.nombre}</h1>
            <button
              type="button"
              onClick={() => setEditando(!editando)}
              className="anillo-foco rounded-lg p-2 text-tenue hover:bg-superficie-2 hover:text-tinta"
              title="Editar ficha"
            >
              {editando ? <X className="size-4" /> : <Pencil className="size-4" />}
            </button>
          </div>
          <p className="mt-0.5 text-sm text-tenue">
            {[
              c.industria,
              c.ciudad,
              c.contacto_nombre &&
                `${c.contacto_nombre}${c.contacto_cargo ? ` (${c.contacto_cargo})` : ''}`,
              c.telefono,
            ]
              .filter(Boolean)
              .join(' · ') || 'Completa la ficha mientras conversas'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Selector
            aria-label="Estado"
            value={levantamiento.estado}
            onChange={(e) => cambiarEstado(e.target.value)}
            className="w-auto min-w-40"
          >
            {ESTADOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.texto}
              </option>
            ))}
          </Selector>
          <a
            href={`/api/levantamientos/${levantamiento.id}/respaldo`}
            className="anillo-foco inline-flex min-h-11 items-center gap-2 rounded-xl border border-borde bg-superficie px-3 text-sm font-semibold hover:bg-superficie-2"
            title="Descargar respaldo completo (JSON)"
          >
            <Download className="size-4" />
            <span className="hidden lg:inline">Respaldo</span>
          </a>
        </div>
      </div>

      {editando ? (
        <div className="aparecer rounded-2xl border border-borde bg-superficie p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FICHA.map((f) => (
              <div key={f.clave}>
                <Etiqueta htmlFor={`ficha-${f.clave}`}>{f.etiqueta}</Etiqueta>
                <Campo
                  id={`ficha-${f.clave}`}
                  value={ficha[f.clave] ?? ''}
                  onChange={(e) => setFicha({ ...ficha, [f.clave]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Boton variante="fantasma" onClick={() => setEditando(false)}>
              Cancelar
            </Boton>
            <Boton variante="primario" cargando={guardando} onClick={guardarFicha}>
              Guardar ficha
            </Boton>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-borde bg-superficie px-4 py-3">
        <Smartphone className="size-5 shrink-0 text-marca" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Formulario para el celular del cliente</p>
          <p className="truncate text-xs text-tenue">
            {levantamiento.formulario_activo
              ? enlaceCliente
              : 'Desactivado: el enlace no acepta respuestas.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {levantamiento.formulario_activo ? (
            <>
              <Boton onClick={mostrarQr} icono={<QrCode className="size-4" />}>
                QR
              </Boton>
              <Boton
                onClick={copiar}
                icono={copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              >
                {copiado ? 'Copiado' : 'Copiar'}
              </Boton>
              <a
                href={`https://wa.me/${c.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola${c.contacto_nombre ? ` ${c.contacto_nombre}` : ''}, aquí puedes contarnos más sobre tu negocio y subir lo que quieras compartir: ${enlaceCliente}`)}`}
                target="_blank"
                rel="noreferrer"
                className={`anillo-foco inline-flex min-h-11 items-center rounded-xl border border-borde bg-superficie px-3 text-sm font-semibold hover:bg-superficie-2 ${c.telefono ? '' : 'pointer-events-none opacity-40'}`}
              >
                WhatsApp
              </a>
            </>
          ) : null}
          <Boton variante="fantasma" onClick={alternarFormulario}>
            {levantamiento.formulario_activo ? 'Desactivar' : 'Activar'}
          </Boton>
        </div>
        {qr ? (
          <div className="aparecer w-full pt-2 text-center">
            {/* biome-ignore lint/performance/noImgElement: QR generado en el navegador como data URL */}
            <img
              src={qr}
              alt="Código QR del formulario"
              className="mx-auto size-64 rounded-xl bg-white p-2"
            />
            <p className="mt-2 text-sm text-tenue">
              Que el cliente lo escanee con la cámara de su celular.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
