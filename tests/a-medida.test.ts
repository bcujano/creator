import { describe, expect, it } from 'vitest'
import { AJUSTES_DEFECTO } from '../src/lib/ajustes-defecto'
import { calcularPaquete, precioAMedida } from '../src/lib/precios'
import type { PaquetePropuesta } from '../src/lib/tipos'
import { construirAcuerdo } from '../src/server/acuerdo/contenido'
import { CATALOGO, documentoDePrueba } from './fixture'

const precios = AJUSTES_DEFECTO.precios

function paquete(lineas: PaquetePropuesta['lineas']): PaquetePropuesta {
  return {
    nivel: 'premium',
    nombre: 'x',
    propuesta_valor: '',
    lineas,
    usuarios: 0,
    volumen: {},
    descuento_setup_pct: 0,
    descuento_mensual_pct: 0,
  }
}

const medida = (precio_setup: number, precio_mensual = 0) => ({
  codigo: 'MEDIDA_X',
  cantidad: 1,
  a_medida: {
    nombre: 'Reporte de ocupación',
    descripcion: 'Tablero semanal de ocupación por estudio.',
    entregables: ['Tablero', 'Envío semanal por WhatsApp'],
    precio_setup,
    precio_mensual,
    semanas: 2,
  },
})

describe('módulos a medida', () => {
  it('el precio sale de la tabla por complejidad, no de la IA', () => {
    expect(precioAMedida('simple', precios)).toBe(300)
    expect(precioAMedida('media', precios)).toBe(600)
    expect(precioAMedida('compleja', precios)).toBe(900)
    expect(precioAMedida('simple', { ...precios, a_medida_simple: 5000 })).toBe(900)
  })

  it('se cotizan sin estar en el catálogo, con costo para el margen', () => {
    const r = calcularPaquete(paquete([medida(600)]), CATALOGO, precios)
    expect(r.lineas[0]?.a_medida).toBe(true)
    expect(r.lineas[0]?.nombre).toBe('Reporte de ocupación')
    expect(r.setup.base).toBe(600)
    expect(r.costo.setup).toBe(210) // 35 %
  })

  it('nunca pasan del tope, ni siquiera negociando el precio', () => {
    expect(calcularPaquete(paquete([medida(1500)]), CATALOGO, precios).setup.base).toBe(900)
    const negociado = { ...medida(500), precio_setup: 2000 }
    expect(calcularPaquete(paquete([negociado]), CATALOGO, precios).setup.base).toBe(900)
  })

  it('se suman a un paquete del catálogo', () => {
    const r = calcularPaquete(
      paquete([{ codigo: 'CRM_OPERATIVO', cantidad: 1 }, medida(700)]),
      CATALOGO,
      precios,
    )
    expect(r.setup.base).toBe(6500 + 700)
  })

  it('aparecen en el acuerdo con su descripción y entregables', () => {
    const doc = documentoDePrueba('es')
    doc.propuesta.cierre = { paquete: 'premium', pagos: [{ concepto: 'a la firma', pct: 100 }] }
    const texto = JSON.stringify(construirAcuerdo(doc, AJUSTES_DEFECTO.legal).bloques)
    expect(texto).toContain(
      'Agente de seguimiento y reactivación de pacientes (desarrollo a medida)',
    )
    expect(texto).toContain('Agente de reactivación por WhatsApp')
    expect(texto).toContain('$600')
  })
})
