'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Aviso, api, Boton, Campo, Etiqueta, Selector } from '@/components/ui'

const CAMPOS: { clave: string; etiqueta: string; tipo?: string; placeholder?: string }[] = [
  {
    clave: 'industria',
    etiqueta: 'Industria',
    placeholder: 'Clínica, inmobiliaria, distribuidora…',
  },
  { clave: 'ciudad', etiqueta: 'Ciudad', placeholder: 'Quito' },
  { clave: 'contacto_nombre', etiqueta: 'Contacto', placeholder: 'Nombre de quien te recibe' },
  { clave: 'contacto_cargo', etiqueta: 'Cargo', placeholder: 'Gerente general' },
  { clave: 'telefono', etiqueta: 'Teléfono / WhatsApp', tipo: 'tel', placeholder: '+593…' },
  { clave: 'email', etiqueta: 'Correo', tipo: 'email' },
  { clave: 'empleados', etiqueta: 'Empleados', placeholder: '12' },
  { clave: 'sitio_web', etiqueta: 'Sitio web o redes', placeholder: 'https://…' },
  { clave: 'ruc', etiqueta: 'RUC' },
]

export default function Nuevo() {
  const router = useRouter()
  const [cliente, setCliente] = useState<Record<string, string>>({ nombre: '' })
  const [idioma, setIdioma] = useState<'es' | 'en'>('es')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setError('')
    try {
      const { id } = await api<{ id: string }>('/api/levantamientos', {
        method: 'POST',
        json: { cliente, idioma },
      })
      router.push(`/l/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setCargando(false)
    }
  }

  return (
    <form onSubmit={crear} className="aparecer mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-titulo text-3xl font-bold tracking-tight">Nueva reunión</h1>
        <p className="mt-1 text-tenue">
          Solo el nombre es obligatorio. El resto lo completas durante la conversación.
        </p>
      </div>
      <div className="rounded-2xl border border-borde bg-superficie p-6">
        <Etiqueta htmlFor="nombre">Empresa</Etiqueta>
        <Campo
          id="nombre"
          required
          autoFocus
          placeholder="Nombre del negocio"
          className="text-lg"
          value={cliente.nombre}
          onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {CAMPOS.map((c) => (
            <div key={c.clave}>
              <Etiqueta htmlFor={c.clave}>{c.etiqueta}</Etiqueta>
              <Campo
                id={c.clave}
                type={c.tipo ?? 'text'}
                placeholder={c.placeholder}
                value={cliente[c.clave] ?? ''}
                onChange={(e) => setCliente({ ...cliente, [c.clave]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <Etiqueta htmlFor="idioma">Idioma de la propuesta</Etiqueta>
            <Selector
              id="idioma"
              value={idioma}
              onChange={(e) => setIdioma(e.target.value as 'es' | 'en')}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </Selector>
          </div>
        </div>
      </div>
      {error ? <Aviso>{error}</Aviso> : null}
      <div className="flex justify-end">
        <Boton type="submit" variante="primario" cargando={cargando} className="px-6">
          Empezar el levantamiento
        </Boton>
      </div>
    </form>
  )
}
