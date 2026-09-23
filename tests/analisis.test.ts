import { describe, expect, it } from 'vitest'
import { calcular, type Factor, formula, normalizarAnalisis } from '../src/lib/analisis'
import { ANALISIS } from './fixture'

const f = (p: Partial<Factor>): Factor => ({
  concepto: 'x',
  valor: 1,
  unidad: 'cantidad',
  fuente: 'cliente',
  evidencia: '',
  ...p,
})

describe('cifras fundamentadas', () => {
  it('multiplica los factores; con un supuesto queda como estimado', () => {
    const c = calcular({
      factores: [
        f({ concepto: 'inquilinos atrasados', valor: 3 }),
        f({ concepto: 'renta', valor: 250, unidad: 'usd' }),
        f({ concepto: 'que no se recupera', valor: 0.2, unidad: 'porcentaje', fuente: 'supuesto' }),
      ],
      pregunta_para_cuantificar: null,
    })
    expect(c.valor).toBe(150)
    expect(c.confianza).toBe('estimado')
    expect(formula(c)).toBe('3 inquilinos atrasados × $250 renta × 20% que no se recupera')
  })

  it('solo con datos del cliente queda como dato', () => {
    const c = calcular({
      factores: [f({ valor: 2 }), f({ valor: 100, unidad: 'usd' })],
      pregunta_para_cuantificar: null,
    })
    expect(c.valor).toBe(200)
    expect(c.confianza).toBe('dato')
  })

  it('nunca acepta dinero supuesto', () => {
    const c = calcular({
      factores: [
        f({ valor: 4 }),
        f({ concepto: 'por tratamiento', valor: 600, unidad: 'usd', fuente: 'supuesto' }),
      ],
      pregunta_para_cuantificar: '¿Cuánto cuesta un tratamiento?',
    })
    expect(c.valor).toBeNull()
    expect(c.descartado).toContain('por tratamiento')
    expect(c.pregunta_para_cuantificar).toBe('¿Cuánto cuesta un tratamiento?')
  })

  it('rechaza más de un supuesto y cálculos sin datos del cliente', () => {
    const dos = calcular({
      factores: [
        f({ valor: 10 }),
        f({ valor: 0.5, unidad: 'porcentaje', fuente: 'supuesto' }),
        f({ valor: 0.5, unidad: 'porcentaje', fuente: 'supuesto' }),
      ],
      pregunta_para_cuantificar: null,
    })
    expect(dos.valor).toBeNull()
    const ninguno = calcular({
      factores: [f({ valor: 10, fuente: 'supuesto' })],
      pregunta_para_cuantificar: null,
    })
    expect(ninguno.valor).toBeNull()
  })

  it('porcentaje enviado como 20 se lee como 20%', () => {
    const c = calcular({
      factores: [f({ valor: 100, unidad: 'usd' }), f({ valor: 20, unidad: 'porcentaje' })],
      pregunta_para_cuantificar: null,
    })
    expect(c.valor).toBe(20)
  })

  it('el caso de ejemplo: descarta el dinero supuesto y suma el retorno', () => {
    expect(ANALISIS.dolores.map((d) => d.impacto_mensual_usd)).toEqual([1700, null, null])
    expect(ANALISIS.roi.ingreso_adicional_mensual_usd).toBe(1700)
    expect(ANALISIS.roi.horas_ahorradas_mes).toBe(44)
  })

  it('normalizar dos veces da lo mismo (lo guardado se vuelve a leer igual)', () => {
    const otra = normalizarAnalisis(JSON.parse(JSON.stringify(ANALISIS)))
    expect(otra.dolores.map((d) => d.impacto_mensual_usd)).toEqual([1700, null, null])
    expect(otra.roi.horas_ahorradas_mes).toBe(44)
    expect(otra.roi.ingreso_adicional_mensual_usd).toBe(1700)
  })

  it('un análisis antiguo sin desglose se marca como tal', () => {
    const viejo = normalizarAnalisis({
      ...JSON.parse(JSON.stringify(ANALISIS)),
      dolores: [{ ...ANALISIS.dolores[0], impacto: undefined, impacto_mensual_usd: 500 }],
      roi: {
        ahorro_mensual_usd: 100,
        ingreso_adicional_mensual_usd: 200,
        horas_ahorradas_mes: 10,
        explicacion: '',
      },
    })
    expect(viejo.dolores[0]?.impacto.confianza).toBe('sin_desglose')
    expect(viejo.roi.ahorro_mensual_usd + viejo.roi.ingreso_adicional_mensual_usd).toBe(300)
  })
})
