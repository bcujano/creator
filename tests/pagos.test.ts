import { describe, expect, it } from 'vitest'
import { AJUSTES_DEFECTO } from '../src/lib/ajustes-defecto'
import { cierreEfectivo, montosPagos, pagosPorDefecto, validarPagos } from '../src/lib/pagos'
import { construirAcuerdo } from '../src/server/acuerdo/contenido'
import { lineasPago } from '../src/server/exportar/comun'
import { documentoDePrueba } from './fixture'

describe('desembolsos', () => {
  it('por defecto: anticipo configurado y saldo contra entrega', () => {
    expect(pagosPorDefecto(50).map((p) => p.pct)).toEqual([50, 50])
    expect(pagosPorDefecto(40).map((p) => p.pct)).toEqual([40, 60])
    expect(pagosPorDefecto(100)).toHaveLength(1)
  })

  it('valida cantidad, porcentajes y que sumen 100', () => {
    const p = (pct: number) => ({ concepto: 'x', pct })
    expect(validarPagos([p(40), p(30), p(30)])).toBeNull()
    expect(validarPagos([p(40), p(30)])).toContain('70')
    expect(validarPagos([p(20), p(20), p(20), p(20), p(20)])).toContain('Entre 1 y 4')
    expect(validarPagos([p(100), p(0)])).toContain('mayor a 0')
    expect(validarPagos([{ concepto: ' ', pct: 100 }])).toContain('cuándo')
  })

  it('los montos cuadran exacto con el total aunque haya redondeo', () => {
    const m = montosPagos(
      [
        { concepto: 'a', pct: 33.33 },
        { concepto: 'b', pct: 33.33 },
        { concepto: 'c', pct: 33.34 },
      ],
      10350,
    )
    expect(m.map((x) => x.monto)).toEqual([3449.66, 3449.66, 3450.68])
    expect(m.reduce((s, x) => s + x.monto, 0)).toBeCloseTo(10350, 2)
  })

  it('sin cierre negociado usa el paquete destacado', () => {
    expect(cierreEfectivo(null, { seleccionado: 'recomendado' }, 50).paquete).toBe('recomendado')
  })
})

describe('acuerdo con cierre negociado', () => {
  const doc = documentoDePrueba('es')
  doc.propuesta.cierre = {
    paquete: 'premium',
    pagos: [
      { concepto: 'a la firma del presente acuerdo', pct: 40 },
      { concepto: 'al completar la primera fase', pct: 30 },
      { concepto: 'a la entrega y puesta en marcha de la solución', pct: 30 },
    ],
  }
  const texto = JSON.stringify(construirAcuerdo(doc, AJUSTES_DEFECTO.legal).bloques)
  const premium = doc.paquetes.find((p) => p.definicion.nivel === 'premium')

  it('usa el paquete que eligió el cliente, no el recomendado', () => {
    expect(texto).toContain('«Clínica inteligente»')
    expect(texto).not.toContain('«Clínica conectada»')
  })

  it('detalla los tres desembolsos con su monto', () => {
    const total = premium?.calculo.setup.total ?? 0
    const [a, b, c] = montosPagos(doc.propuesta.cierre?.pagos ?? [], total)
    expect(texto).toContain('Desembolso 1: 40% del valor de implementación')
    expect(texto).toContain('Desembolso 3: 30%')
    expect(a && b && c && a.monto + b.monto + c.monto).toBeCloseTo(total, 2)
  })

  it('la propuesta también muestra el plan acordado', () => {
    expect(lineasPago(doc)).toHaveLength(3)
    expect(lineasPago(doc)[1]).toContain('al completar la primera fase')
  })
})
