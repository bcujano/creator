import { describe, expect, it } from 'vitest'
import { conPrecioCrm, mapaPreciosCrm } from '../src/lib/precios-crm'
import type { ItemCatalogo } from '../src/lib/tipos'

// Creator lee los precios de AiUDA del CRM (un precio, un lugar). Su tabla propia queda de respaldo.
const filas = [
  { codigo: 'IAGENTE_WA', marca: 'AiUDA', modalidad: 'fijo', valor: 2500, mensual: 190 },
  { codigo: 'SOPORTE', marca: 'AiUDA', modalidad: 'mensual', valor: 80, mensual: null },
  { codigo: 'CARGO_M30_SUITE', marca: '321', modalidad: 'fijo', valor: 22450.84, mensual: null },
]
const item = {
  codigo: 'IAGENTE_WA',
  precio_setup: 2000,
  precio_mensual: 150,
  costo_setup: 300,
} as ItemCatalogo

describe('precios desde el CRM', () => {
  it('toma solo AiUDA y separa instalación y mensualidad', () => {
    const m = mapaPreciosCrm(filas)
    expect(m.get('IAGENTE_WA')).toEqual({ setup: 2500, mensual: 190 })
    expect(m.get('SOPORTE')).toEqual({ setup: 0, mensual: 80 })
    expect(m.has('CARGO_M30_SUITE')).toBe(false)
  })
  it('el precio del CRM manda; los costos siguen siendo de Creator', () => {
    const r = conPrecioCrm(item, mapaPreciosCrm(filas))
    expect([r.precio_setup, r.precio_mensual, r.costo_setup, r.precio_del_crm]).toEqual([
      2500,
      190,
      300,
      true,
    ])
  })
  it('sin el CRM, queda el precio de la tabla propia', () => {
    expect(conPrecioCrm(item, new Map())).toBe(item)
  })
})
