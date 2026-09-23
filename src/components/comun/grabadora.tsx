'use client'

import { Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Boton } from '@/components/ui/primitivos'

/** Tipo de audio que el navegador sabe grabar (Safari del iPad graba mp4). */
function tipoSoportado() {
  const candidatos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  return (
    candidatos.find(
      (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t),
    ) ?? ''
  )
}

function reloj(segundos: number) {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function Grabadora({
  onListo,
  textos = { grabar: 'Grabar audio', detener: 'Detener' },
  deshabilitado,
}: {
  onListo: (archivo: File) => void
  textos?: { grabar: string; detener: string }
  deshabilitado?: boolean
}) {
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [error, setError] = useState('')
  const grabadora = useRef<MediaRecorder | null>(null)
  const trozos = useRef<Blob[]>([])
  const reloj_ = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(
    () => () => {
      if (reloj_.current) clearInterval(reloj_.current)
      grabadora.current?.stream.getTracks().forEach((t) => {
        t.stop()
      })
    },
    [],
  )

  async function iniciar() {
    setError('')
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ audio: true })
      const tipo = tipoSoportado()
      const r = new MediaRecorder(flujo, tipo ? { mimeType: tipo } : undefined)
      trozos.current = []
      r.ondataavailable = (e) => {
        if (e.data.size > 0) trozos.current.push(e.data)
      }
      r.onstop = () => {
        flujo.getTracks().forEach((t) => {
          t.stop()
        })
        const mime = r.mimeType || tipo || 'audio/webm'
        const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'
        const fecha = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
        onListo(new File(trozos.current, `grabacion-${fecha}.${ext}`, { type: mime.split(';')[0] }))
      }
      // Trozos de 10 s: si algo falla a mitad de reunión, lo grabado no se pierde.
      r.start(10_000)
      grabadora.current = r
      setGrabando(true)
      setSegundos(0)
      reloj_.current = setInterval(() => setSegundos((s) => s + 1), 1000)
    } catch {
      setError('No se pudo acceder al micrófono. Revisa los permisos del navegador.')
    }
  }

  function detener() {
    grabadora.current?.stop()
    grabadora.current = null
    setGrabando(false)
    if (reloj_.current) clearInterval(reloj_.current)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {grabando ? (
        <Boton variante="peligro" onClick={detener} icono={<Square className="size-4" />}>
          {textos.detener} · {reloj(segundos)}
        </Boton>
      ) : (
        <Boton onClick={iniciar} disabled={deshabilitado} icono={<Mic className="size-4" />}>
          {textos.grabar}
        </Boton>
      )}
      {grabando ? (
        <span className="size-2.5 animate-pulse rounded-full bg-peligro" aria-hidden />
      ) : null}
      {error ? <span className="text-sm text-peligro">{error}</span> : null}
    </div>
  )
}
