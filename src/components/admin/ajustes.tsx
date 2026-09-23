'use client'

import { CheckCircle2, Upload, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import type { Ajustes } from '@/lib/tipos'
import { Aviso, api, Boton, Campo, Etiqueta, Selector } from '../ui'

type Estado = { anthropic: boolean; openai: boolean; ia: boolean; crm: boolean; crmUrl: string }

function Seccion({
  titulo,
  texto,
  children,
}: {
  titulo: string
  texto?: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-6 border-b border-borde py-8 last:border-0 md:grid-cols-[260px_1fr]">
      <div>
        <h2 className="font-titulo text-lg font-semibold">{titulo}</h2>
        {texto ? <p className="mt-1 text-sm text-tenue">{texto}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function Chequeo({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <p className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="size-4 text-ok" />
      ) : (
        <XCircle className="size-4 text-peligro" />
      )}
      {texto}
    </p>
  )
}

export function EditorAjustes({ inicial, estado }: { inicial: Ajustes; estado: Estado }) {
  const router = useRouter()
  const [a, setA] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [aviso, setAviso] = useState<{ tono: 'ok' | 'peligro'; texto: string } | null>(null)
  const logo = useRef<HTMLInputElement>(null)

  function campo<S extends keyof Ajustes>(
    seccion: S,
    clave: keyof Ajustes[S],
    tipo: 'texto' | 'numero' = 'texto',
  ) {
    return {
      value: String(a[seccion][clave] ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setA({
          ...a,
          [seccion]: {
            ...a[seccion],
            [clave]: tipo === 'numero' ? Number(e.target.value) : e.target.value,
          },
        }),
    }
  }

  async function guardar() {
    setGuardando(true)
    setAviso(null)
    try {
      await api('/api/ajustes', { method: 'PUT', json: a })
      setAviso({ tono: 'ok', texto: 'Ajustes guardados.' })
      router.refresh()
    } catch (e) {
      setAviso({ tono: 'peligro', texto: e instanceof Error ? e.message : String(e) })
    } finally {
      setGuardando(false)
    }
  }

  async function subirLogo(archivo: File) {
    setSubiendo(true)
    setAviso(null)
    try {
      const form = new FormData()
      form.append('logo', archivo)
      const r = await fetch('/api/ajustes', { method: 'POST', body: form })
      const cuerpo = await r.json()
      if (!r.ok) throw new Error(cuerpo.error ?? 'No se pudo subir el logo')
      setA({ ...a, marca: { ...a.marca, logo_url: cuerpo.marca.logo_url } })
      setAviso({ tono: 'ok', texto: 'Logo actualizado.' })
      router.refresh()
    } catch (e) {
      setAviso({ tono: 'peligro', texto: e instanceof Error ? e.message : String(e) })
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="aparecer mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titulo text-3xl font-bold tracking-tight">Ajustes</h1>
          <p className="mt-1 text-tenue">
            Marca, impuestos, márgenes, motor de IA e integración con el CRM.
          </p>
        </div>
        <Boton variante="primario" cargando={guardando} onClick={guardar}>
          Guardar cambios
        </Boton>
      </div>
      {aviso ? (
        <div className="mt-4">
          <Aviso tono={aviso.tono}>{aviso.texto}</Aviso>
        </div>
      ) : null}

      <Seccion
        titulo="Marca"
        texto="Aparece en la presentación, el enlace del cliente y todos los archivos."
      >
        <div className="flex items-center gap-4 sm:col-span-2">
          <div className="grid size-20 place-items-center overflow-hidden rounded-2xl border border-borde bg-white p-2">
            {a.marca.logo_url ? (
              // biome-ignore lint/performance/noImgElement: vista previa del logo configurado
              <img
                src={a.marca.logo_url}
                alt="Logo"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-tenue">Sin logo</span>
            )}
          </div>
          <div>
            <Boton
              onClick={() => logo.current?.click()}
              cargando={subiendo}
              icono={<Upload className="size-4" />}
            >
              Subir logo
            </Boton>
            <p className="mt-1 text-xs text-tenue">
              PNG o JPG, máx. 2 MB. Fondo transparente queda mejor.
            </p>
            <input
              ref={logo}
              type="file"
              accept="image/png,image/jpeg"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void subirLogo(f)
                e.target.value = ''
              }}
            />
          </div>
        </div>
        <div>
          <Etiqueta>Nombre comercial</Etiqueta>
          <Campo {...campo('marca', 'nombre')} />
        </div>
        <div>
          <Etiqueta>Validez de la propuesta (días)</Etiqueta>
          <Campo type="number" {...campo('marca', 'validez_dias', 'numero')} />
        </div>
        <div>
          <Etiqueta>Eslogan (español)</Etiqueta>
          <Campo {...campo('marca', 'eslogan_es')} />
        </div>
        <div>
          <Etiqueta>Eslogan (inglés)</Etiqueta>
          <Campo {...campo('marca', 'eslogan_en')} />
        </div>
        <div>
          <Etiqueta>Color principal</Etiqueta>
          <div className="flex gap-2">
            <input
              type="color"
              className="h-11 w-14 rounded-lg border border-borde"
              {...campo('marca', 'color_primario')}
            />
            <Campo {...campo('marca', 'color_primario')} />
          </div>
        </div>
        <div>
          <Etiqueta>Color de acento</Etiqueta>
          <div className="flex gap-2">
            <input
              type="color"
              className="h-11 w-14 rounded-lg border border-borde"
              {...campo('marca', 'color_acento')}
            />
            <Campo {...campo('marca', 'color_acento')} />
          </div>
        </div>
        <div>
          <Etiqueta>Correo</Etiqueta>
          <Campo type="email" {...campo('marca', 'email')} />
        </div>
        <div>
          <Etiqueta>Teléfono</Etiqueta>
          <Campo {...campo('marca', 'telefono')} />
        </div>
        <div>
          <Etiqueta>Sitio web</Etiqueta>
          <Campo {...campo('marca', 'sitio_web')} />
        </div>
        <div>
          <Etiqueta>Dirección</Etiqueta>
          <Campo {...campo('marca', 'direccion')} />
        </div>
      </Seccion>

      <Seccion
        titulo="Precios e impuestos"
        texto="Valores en USD. Aplican a todas las propuestas nuevas."
      >
        <div>
          <Etiqueta>IVA (%)</Etiqueta>
          <Campo type="number" {...campo('precios', 'iva_pct', 'numero')} />
        </div>
        <div>
          <Etiqueta>Anticipo para iniciar (%)</Etiqueta>
          <Campo type="number" {...campo('precios', 'anticipo_pct', 'numero')} />
        </div>
        <div>
          <Etiqueta>Margen mínimo mensual por cliente</Etiqueta>
          <Campo type="number" {...campo('precios', 'margen_minimo_mensual', 'numero')} />
        </div>
        <div>
          <Etiqueta>Precio por usuario extra / mes</Etiqueta>
          <Campo type="number" {...campo('precios', 'precio_usuario_extra', 'numero')} />
        </div>
        <div>
          <Etiqueta>Costo de infraestructura base / mes</Etiqueta>
          <Campo type="number" {...campo('precios', 'costo_infra_base', 'numero')} />
          <p className="mt-1 text-xs text-tenue">
            Se suma cuando vendes módulos sueltos, sin un paquete.
          </p>
        </div>
        <div />
        <div>
          <Etiqueta>Simulador: tarifa por usuario</Etiqueta>
          <Campo type="number" {...campo('precios', 'modelo_por_usuario', 'numero')} />
        </div>
        <div>
          <Etiqueta>Simulador: cuota base por volumen</Etiqueta>
          <Campo type="number" {...campo('precios', 'modelo_volumen_base', 'numero')} />
        </div>
      </Seccion>

      <Seccion
        titulo="Inteligencia artificial"
        texto="Claude es el motor principal; si falla, se reintenta con OpenAI. OpenAI también transcribe los audios."
      >
        <div className="space-y-1 sm:col-span-2">
          <Chequeo ok={estado.anthropic} texto="ANTHROPIC_API_KEY" />
          <Chequeo ok={estado.openai} texto="OPENAI_API_KEY (respaldo y transcripción de audio)" />
        </div>
        <div>
          <Etiqueta>Motor principal</Etiqueta>
          <Selector {...campo('ia', 'proveedor')}>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI</option>
          </Selector>
        </div>
        <div>
          <Etiqueta>Profundidad del análisis</Etiqueta>
          <Selector {...campo('ia', 'esfuerzo')}>
            <option value="medium">Media (más rápido)</option>
            <option value="high">Alta (recomendado)</option>
            <option value="xhigh">Muy alta</option>
            <option value="max">Máxima (más lento)</option>
          </Selector>
        </div>
        <div>
          <Etiqueta>Modelo Anthropic</Etiqueta>
          <Campo {...campo('ia', 'modelo_anthropic')} />
        </div>
        <div>
          <Etiqueta>Modelo OpenAI</Etiqueta>
          <Campo {...campo('ia', 'modelo_openai')} />
        </div>
        <div>
          <Etiqueta>Modelo de transcripción</Etiqueta>
          <Campo {...campo('ia', 'modelo_transcripcion')} />
        </div>
      </Seccion>

      <Seccion
        titulo="CRM"
        texto="Cada propuesta puede crear o actualizar el lead en tu CRM y dejarla en su línea de tiempo."
      >
        <div className="space-y-1 sm:col-span-2">
          <Chequeo
            ok={estado.crm}
            texto={
              estado.crm
                ? `Conectado a ${estado.crmUrl}`
                : 'Falta CRM_WEBHOOK_URL o CRM_WEBHOOK_SECRET'
            }
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={a.crm.activo}
            onChange={(e) => setA({ ...a, crm: { ...a.crm, activo: e.target.checked } })}
          />
          Integración activa
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={a.crm.enviar_al_crear_propuesta}
            onChange={(e) =>
              setA({ ...a, crm: { ...a.crm, enviar_al_crear_propuesta: e.target.checked } })
            }
          />
          Enviar automáticamente al guardar cada propuesta
        </label>
        <div>
          <Etiqueta>Tipo de servicio en el CRM</Etiqueta>
          <Campo {...campo('crm', 'service_type')} />
          <p className="mt-1 text-xs text-tenue">Debe existir en el enum service_type del CRM.</p>
        </div>
        <div>
          <Etiqueta>Origen del lead</Etiqueta>
          <Campo {...campo('crm', 'source')} />
          <p className="mt-1 text-xs text-tenue">Debe existir en el enum lead_source del CRM.</p>
        </div>
      </Seccion>
    </div>
  )
}
