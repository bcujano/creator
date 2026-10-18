import { describe, expect, it } from 'vitest'
import { ENFOQUES, enfoquesDe, PREGUNTA_AREAS } from '../src/lib/enfoques'
import {
  mapaPreguntas,
  respuestasComoTexto,
  seccionesCliente,
  seccionesPara,
} from '../src/lib/preguntas'

const ids = (secciones: ReturnType<typeof seccionesPara>) =>
  secciones.flatMap((s) => s.preguntas.map((p) => p.id))

describe('enfoque del sistema', () => {
  it('manda lo que eligió el consultor; si no, lo que marcó el cliente', () => {
    expect(enfoquesDe({ enfoques: ['finanzas'] })).toEqual(['finanzas'])
    const cliente = {
      [PREGUNTA_AREAS]: 'Operación y procesos · Inventory, purchasing and logistics',
    }
    expect(enfoquesDe({ enfoques: [], respuestas_cliente: cliente })).toEqual([
      'operacion',
      'inventario',
    ])
    expect(enfoquesDe({ enfoques: ['equipo'], respuestas_cliente: cliente })).toEqual(['equipo'])
    expect(enfoquesDe({ enfoques: ['no-existe'] })).toEqual([])
    expect(enfoquesDe({ enfoques: ['ventas', 'atencion', 'operacion', 'finanzas'] })).toHaveLength(
      3,
    )
  })

  it('cada enfoque agrega sus preguntas antes de la visión del cliente', () => {
    expect(ids(seccionesPara([]))).not.toContain('ventas_proceso')
    const conVentas = seccionesPara(['ventas'])
    expect(ids(conVentas)).toContain('ventas_proceso')
    const orden = conVentas.map((s) => s.id)
    expect(orden.indexOf('enfoque:ventas')).toBeLessThan(orden.indexOf('vision'))
    expect(ids(seccionesPara(['finanzas']))).toContain('finanzas_cobranza')
  })

  it('el cliente no ve las preguntas de sondeo del consultor', () => {
    const suyas = seccionesCliente(['ventas']).flatMap((s) => s.preguntas)
    expect(suyas.every((p) => p.cliente)).toBe(true)
    expect(suyas.map((p) => p.id)).not.toContain('sondeo_cotizar')
  })

  it('ninguna clave de pregunta se repite y las respuestas guardadas siguen leyéndose', () => {
    const todas = ids(seccionesPara(ENFOQUES.map((e) => e.id)))
    expect(new Set(todas).size).toBe(todas.length)
    expect(mapaPreguntas().size).toBe(todas.length)
    expect(respuestasComoTexto({ ventas_proceso: 'Escriben por WhatsApp' })).toContain(
      '[Ventas y comercial]',
    )
  })
})
