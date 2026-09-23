import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { env } from '@/lib/env'
import type { AjustesIA } from '@/lib/tipos'

/**
 * Una sola puerta a los modelos. Anthropic es el motor principal; si falla o
 * rechaza la solicitud y hay llave de OpenAI, se reintenta con OpenAI. Quién
 * respondió queda registrado en el resultado.
 */

export type Imagen = { mime: string; base64: string }

export type SolicitudEstructurada<T extends z.ZodType> = {
  esquema: T
  nombre: string
  sistema: string
  usuario: string
  imagenes?: Imagen[]
  esfuerzo?: AjustesIA['esfuerzo']
  maxTokens?: number
}

export type RespuestaEstructurada<T> = {
  datos: T
  proveedor: 'anthropic' | 'openai'
  modelo: string
  uso: Record<string, unknown>
}

export class ErrorIA extends Error {}

let anthropic: Anthropic | null = null
let openai: OpenAI | null = null

function clienteAnthropic() {
  if (!env.anthropicKey) return null
  // Las llaves de organización (sin workspace) exigen indicar el workspace en cada llamada.
  anthropic ??= new Anthropic({
    apiKey: env.anthropicKey,
    defaultHeaders: env.anthropicWorkspace
      ? { 'anthropic-workspace-id': env.anthropicWorkspace }
      : undefined,
  })
  return anthropic
}

function clienteOpenAI() {
  if (!env.openaiKey) return null
  openai ??= new OpenAI({ apiKey: env.openaiKey })
  return openai
}

async function conAnthropic<T extends z.ZodType>(
  cliente: Anthropic,
  modelo: string,
  s: SolicitudEstructurada<T>,
): Promise<RespuestaEstructurada<z.infer<T>>> {
  type Tipos = Anthropic.ImageBlockParam['source'] extends { media_type: infer M } ? M : never
  const contenido: Anthropic.ContentBlockParam[] = [
    ...(s.imagenes ?? []).map(
      (img): Anthropic.ImageBlockParam => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mime as Tipos, data: img.base64 },
      }),
    ),
    { type: 'text', text: s.usuario },
  ]

  try {
    // Streaming: el análisis completo puede tardar varios minutos.
    const stream = cliente.messages.stream({
      model: modelo,
      max_tokens: s.maxTokens ?? 32000,
      thinking: { type: 'adaptive' },
      system: s.sistema,
      messages: [{ role: 'user', content: contenido }],
      output_config: { effort: s.esfuerzo ?? 'high', format: zodOutputFormat(s.esquema) },
    })
    const mensaje = await stream.finalMessage()
    revisarCierre(mensaje)
    if (!mensaje.parsed_output) throw new ErrorIA('La respuesta no tiene el formato esperado.')
    return {
      datos: mensaje.parsed_output as z.infer<T>,
      proveedor: 'anthropic',
      modelo: mensaje.model,
      uso: { ...mensaje.usage },
    }
  } catch (error) {
    // Esquemas grandes (el análisis completo) superan el límite de la salida estricta:
    // se pide el JSON por instrucciones y se valida aquí con el mismo esquema.
    if (!(error instanceof Error) || !/grammar is too large/i.test(error.message)) throw error
    return conAnthropicJson(cliente, modelo, s, contenido)
  }
}

function revisarCierre(mensaje: Anthropic.Message) {
  if (mensaje.stop_reason === 'refusal') throw new ErrorIA('El modelo rechazó la solicitud.')
  if (mensaje.stop_reason === 'max_tokens') throw new ErrorIA('La respuesta se cortó por longitud.')
}

function extraerJson(texto: string): unknown {
  const inicio = texto.indexOf('{')
  const fin = texto.lastIndexOf('}')
  if (inicio < 0 || fin <= inicio) throw new ErrorIA('La respuesta no contiene JSON.')
  return JSON.parse(texto.slice(inicio, fin + 1))
}

async function conAnthropicJson<T extends z.ZodType>(
  cliente: Anthropic,
  modelo: string,
  s: SolicitudEstructurada<T>,
  contenido: Anthropic.ContentBlockParam[],
): Promise<RespuestaEstructurada<z.infer<T>>> {
  const esquema = JSON.stringify(z.toJSONSchema(s.esquema))
  const sistema = `${s.sistema}\n\nResponde únicamente con un objeto JSON válido que cumpla exactamente este JSON Schema, sin texto antes ni después y sin bloques de código:\n${esquema}`
  const mensajes: Anthropic.MessageParam[] = [{ role: 'user', content: contenido }]

  // Hasta dos intentos: si el JSON no valida, se le devuelve el error para que lo corrija.
  for (let intento = 1; intento <= 2; intento++) {
    const mensaje = await cliente.messages
      .stream({
        model: modelo,
        max_tokens: s.maxTokens ?? 32000,
        thinking: { type: 'adaptive' },
        system: sistema,
        messages: mensajes,
        output_config: { effort: s.esfuerzo ?? 'high' },
      })
      .finalMessage()
    revisarCierre(mensaje)
    const texto = mensaje.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    let problema: string
    try {
      const validado = s.esquema.safeParse(extraerJson(texto))
      if (validado.success) {
        return {
          datos: validado.data,
          proveedor: 'anthropic',
          modelo: mensaje.model,
          uso: { ...mensaje.usage },
        }
      }
      problema = z.prettifyError(validado.error)
    } catch (error) {
      problema = error instanceof Error ? error.message : String(error)
    }
    mensajes.push(
      { role: 'assistant', content: mensaje.content },
      {
        role: 'user',
        content: `El JSON no cumple el esquema:\n${problema.slice(0, 4000)}\nDevuelve el objeto JSON completo y corregido.`,
      },
    )
  }
  throw new ErrorIA('Claude no devolvió un JSON válido después de corregirlo.')
}

async function conOpenAI<T extends z.ZodType>(
  cliente: OpenAI,
  modelo: string,
  s: SolicitudEstructurada<T>,
): Promise<RespuestaEstructurada<z.infer<T>>> {
  const respuesta = await cliente.responses.parse({
    model: modelo,
    instructions: s.sistema,
    input: [
      {
        role: 'user',
        content: [
          ...(s.imagenes ?? []).map((img) => ({
            type: 'input_image' as const,
            image_url: `data:${img.mime};base64,${img.base64}`,
            detail: 'auto' as const,
          })),
          { type: 'input_text' as const, text: s.usuario },
        ],
      },
    ],
    text: { format: zodTextFormat(s.esquema, s.nombre) },
  })
  if (!respuesta.output_parsed) throw new ErrorIA('OpenAI no devolvió el formato esperado.')
  return {
    datos: respuesta.output_parsed as z.infer<T>,
    proveedor: 'openai',
    modelo: respuesta.model,
    uso: { ...(respuesta.usage ?? {}) },
  }
}

export async function generarEstructurado<T extends z.ZodType>(
  ajustes: AjustesIA,
  s: SolicitudEstructurada<T>,
): Promise<RespuestaEstructurada<z.infer<T>>> {
  const a = clienteAnthropic()
  const o = clienteOpenAI()
  const orden =
    ajustes.proveedor === 'openai'
      ? (['openai', 'anthropic'] as const)
      : (['anthropic', 'openai'] as const)

  const errores: string[] = []
  for (const proveedor of orden) {
    try {
      if (proveedor === 'anthropic' && a) return await conAnthropic(a, ajustes.modelo_anthropic, s)
      if (proveedor === 'openai' && o) return await conOpenAI(o, ajustes.modelo_openai, s)
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error)
      console.error(`[ia:${proveedor}]`, mensaje)
      errores.push(`${proveedor}: ${mensaje}`)
    }
  }
  if (!a && !o)
    throw new ErrorIA('No hay llave de IA configurada (ANTHROPIC_API_KEY u OPENAI_API_KEY).')
  throw new ErrorIA(errores.join(' · '))
}

export async function transcribirAudio(
  ajustes: AjustesIA,
  archivo: File,
  idioma: 'es' | 'en',
): Promise<string> {
  const o = clienteOpenAI()
  if (!o) throw new ErrorIA('Para transcribir audio se necesita OPENAI_API_KEY.')
  const r = await o.audio.transcriptions.create({
    file: archivo,
    model: ajustes.modelo_transcripcion,
    language: idioma,
  })
  return r.text
}

export function hayIA() {
  return Boolean(env.anthropicKey || env.openaiKey)
}
