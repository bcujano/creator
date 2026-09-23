import 'server-only'
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { exigirSesion, NoAutorizado } from '@/lib/auth'

export class NoEncontrado extends Error {
  constructor(que = 'Recurso') {
    super(`${que} no encontrado`)
  }
}

export class Invalido extends Error {}

function respuestaError(error: unknown) {
  if (error instanceof NoAutorizado)
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (error instanceof NoEncontrado)
    return NextResponse.json({ error: error.message }, { status: 404 })
  if (error instanceof Invalido) return NextResponse.json({ error: error.message }, { status: 400 })
  if (error instanceof ZodError) {
    return NextResponse.json({ error: 'Datos inválidos', detalle: error.issues }, { status: 400 })
  }
  const mensaje = error instanceof Error ? error.message : String(error)
  console.error('[api]', mensaje)
  return NextResponse.json({ error: mensaje }, { status: 500 })
}

/** Ruta privada: exige sesión de administrador (además del proxy). */
export function privada<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      await exigirSesion()
      return await fn(...args)
    } catch (error) {
      return respuestaError(error)
    }
  }
}

/** Ruta pública: la autorización la da el token del enlace. */
export function publica<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args)
    } catch (error) {
      return respuestaError(error)
    }
  }
}

export type Ctx<P> = { params: Promise<P> }
