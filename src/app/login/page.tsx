'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Aviso, Boton, Campo, Etiqueta } from '@/components/ui'
import { supabaseBrowser } from '@/lib/supabase/browser'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setError('')
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password: clave })
    if (error) {
      setError('Correo o contraseña incorrectos.')
      setCargando(false)
      return
    }
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={entrar} className="aparecer w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-titulo text-4xl font-extrabold tracking-tight">
            CREATOR<span className="text-marca">.</span>
          </p>
          <p className="mt-1 text-sm text-tenue">Diagnóstico y diseño de sistemas con IA · AiUDA</p>
        </div>
        <div className="space-y-4 rounded-2xl border border-borde bg-superficie p-6 shadow-sm">
          <div>
            <Etiqueta htmlFor="email">Correo</Etiqueta>
            <Campo
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Etiqueta htmlFor="clave">Contraseña</Etiqueta>
            <Campo
              id="clave"
              type="password"
              autoComplete="current-password"
              required
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
          </div>
          {error ? <Aviso>{error}</Aviso> : null}
          <Boton type="submit" variante="primario" cargando={cargando} className="w-full">
            Entrar
          </Boton>
        </div>
      </form>
    </main>
  )
}
