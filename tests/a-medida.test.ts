import { describe, expect, it } from 'vitest'
import { AJUSTES_DEFECTO } from '../src/lib/ajustes-defecto'
import { calcularPaquete } from '../src/lib/precios'
import type { PaquetePropuesta } from '../src/lib/tipos'
import { fraseRetorno, precioPorValor, retornoDelModulo, valorPorModulo } from '../src/lib/valor'
import { construirAcuerdo } from '../src/server/acuerdo/contenido'
import { generarMarkdown } from '../src/server/exportar/markdown'
import { documentoPublico } from '../src/server/publico'
import { ANALISIS, CATALOGO, documentoDePrueba } from './fixtures/documento'

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

const medida = (precio_setup: number, precio_mensual = 0, semanas = 2) => ({
  codigo: 'MEDIDA_X',
  cantidad: 1,
  a_medida: {
    nombre: 'Reporte de ocupación',
    descripcion: 'Tablero semanal de ocupación por estudio.',
    entregables: ['Tablero', 'Envío semanal por WhatsApp'],
    precio_setup,
    precio_mensual,
    semanas,
  },
})

const entrada = (valor: number | null, facturacion: number | null, semanas = 3) => ({
  valor_mensual: valor,
  facturacion_mensual: facturacion,
  semanas,
  dolores: [],
  pregunta: '¿Cuánto cuesta cada error?',
})

describe('precio de módulos a medida por valor', () => {
  it('valor demostrado × meses de valor, sin tope', () => {
    const r = precioPorValor(entrada(3360, null), precios)
    expect(r.precio).toBe(20160) // 3.360 al mes × 6 meses
    expect(r.justificacion.metodo).toBe('valor')
    expect(r.justificacion.pregunta).toBeNull()
    // Un módulo que vale muchísimo cuesta muchísimo: nada lo frena.
    expect(precioPorValor(entrada(50_000, null), precios).precio).toBe(300_000)
  })

  it('un valor chico da un precio chico, pero nunca bajo el piso de rentabilidad', () => {
    // 3 semanas × $165 × 2 = $990 de piso.
    const bajo = precioPorValor(entrada(40, null), precios)
    expect(bajo.justificacion.piso).toBe(990)
    expect(bajo.precio).toBe(990)
    expect(bajo.justificacion.metodo).toBe('piso')
    expect(bajo.justificacion.pregunta).toBe('¿Cuánto cuesta cada error?')
    // Una semana: el piso baja y un módulo pequeño puede costar poco.
    expect(precioPorValor(entrada(null, null, 1), precios).precio).toBe(330)
  })

  it('sin valor demostrado usa el tamaño del negocio y avisa qué preguntar', () => {
    const r = precioPorValor(entrada(null, 61_600), precios)
    expect(r.precio).toBe(990) // 1,5 % de 61.600 = 920, pero el piso es 990
    expect(r.justificacion.metodo).toBe('piso')
    const grande = precioPorValor(entrada(null, 400_000), precios)
    expect(grande.precio).toBe(6000)
    expect(grande.justificacion.metodo).toBe('referencia')
    expect(grande.justificacion.pregunta).not.toBeNull()
  })

  it('el cliente ve cuándo recupera la inversión y cuánto gana el primer año', () => {
    expect(retornoDelModulo(20160, 3360)).toEqual({ recuperacion_meses: 6, retorno_anio: 2 })
    expect(retornoDelModulo(1000, null)).toBeNull()
  })

  it('los meses de valor y el piso se editan en Ajustes', () => {
    const agresivo = { ...precios, a_medida_meses_valor: 8 }
    expect(precioPorValor(entrada(1000, null), agresivo).precio).toBe(8000)
    const exigente = { ...precios, a_medida_piso_veces: 4 }
    expect(precioPorValor(entrada(null, null), exigente).justificacion.piso).toBe(1980)
  })
})

describe('valor de cada módulo a partir del análisis', () => {
  it('un problema sin cifra no suma y se convierte en la pregunta que sube el precio', () => {
    const solo = structuredClone(ANALISIS)
    solo.soluciones = solo.soluciones.map((x) => ({ ...x, codigos_catalogo: [] }))
    const v = valorPorModulo(solo).get('MEDIDA_REACTIVACION')
    // Su único problema tiene un supuesto en dinero: no se cuantifica, se pregunta.
    expect(v?.dolores).toEqual(['Presupuestos que nadie sigue'])
    expect(v?.valor_mensual).toBeNull()
    expect(v?.pregunta).toContain('ortodoncia')
  })

  it('no cobra dos veces un problema que ya resuelve un producto del catálogo', () => {
    const solucion = ANALISIS.soluciones[0]
    if (!solucion) throw new Error('el caso de prueba debe tener soluciones')
    const copia = structuredClone(ANALISIS)
    copia.soluciones = [
      {
        ...solucion,
        a_medida: false,
        codigos_catalogo: ['IAGENTE_WA'],
        dolores_que_resuelve: ['Mensajes sin responder fuera de horario'],
      },
    ]
    const modulo = copia.modulos_a_medida?.[0]
    if (!modulo) throw new Error('el caso de prueba debe tener un módulo a medida')
    Object.assign(modulo, { dolores_que_resuelve: ['Mensajes sin responder fuera de horario'] })
    expect(valorPorModulo(copia).get(modulo.codigo)?.valor_mensual).toBeNull()
  })

  it('la facturación del cliente sale de sus datos', () => {
    expect(ANALISIS.facturacion_mensual.valor).toBe(51_000) // 600 pacientes × $85
  })
})

describe('módulos a medida en la propuesta', () => {
  it('se cotizan sin estar en el catálogo, con el costo de sus semanas para el margen', () => {
    const r = calcularPaquete(paquete([medida(1200, 0, 3)]), CATALOGO, precios)
    expect(r.lineas[0]?.a_medida).toBe(true)
    expect(r.lineas[0]?.nombre).toBe('Reporte de ocupación')
    expect(r.setup.base).toBe(1200)
    expect(r.costo.setup).toBe(495) // 3 semanas × $165
    expect(r.margen.setup).toBe(705)
  })

  it('no hay tope: el precio negociado se respeta, sea grande o chico', () => {
    expect(calcularPaquete(paquete([medida(18_900)]), CATALOGO, precios).setup.base).toBe(18_900)
    expect(calcularPaquete(paquete([medida(200)]), CATALOGO, precios).setup.base).toBe(200)
    const negociado = { ...medida(500), precio_setup: 25_000 }
    expect(calcularPaquete(paquete([negociado]), CATALOGO, precios).setup.base).toBe(25_000)
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

describe('lo que ve el cliente de un módulo a medida', () => {
  const justificacion = {
    metodo: 'valor' as const,
    valor_mensual: 3360,
    meses: 6,
    facturacion_mensual: null,
    piso: 987_654,
    sugerido: 20_160,
    dolores: ['Pedidos sin registro digital'],
    pregunta: null,
  }

  function conRetorno() {
    const doc = documentoDePrueba('es')
    for (const p of doc.paquetes) {
      for (const linea of p.definicion.lineas) {
        if (linea.a_medida) linea.a_medida.valor = justificacion
      }
      for (const item of p.items) {
        if (item.a_medida) {
          item.retorno = { valor_mensual: 3360, recuperacion_meses: 6, retorno_anio: 2 }
        }
      }
    }
    return doc
  }

  it('ve lo que recupera, en cuántos meses se paga y el retorno del primer año', () => {
    expect(fraseRetorno({ valor_mensual: 3360, recuperacion_meses: 6, retorno_anio: 2 })).toBe(
      'Recupera ~$3.360 al mes · se paga en 6 meses · 2× el primer año',
    )
    expect(generarMarkdown(conRetorno())).toContain('se paga en 6 meses')
    const publico = documentoPublico(conRetorno())
    const itemsAMedida = publico.paquetes.flatMap((p) => p.items).filter((i) => i.a_medida)
    expect(itemsAMedida.length).toBeGreaterThan(0)
    expect(itemsAMedida.every((i) => i.retorno?.recuperacion_meses === 6)).toBe(true)
  })

  it('nunca ve el piso de rentabilidad ni cómo se calculó el precio', () => {
    const texto = JSON.stringify(documentoPublico(conRetorno()))
    expect(texto).not.toContain('987654')
    expect(texto).not.toContain('piso')
    expect(texto).not.toContain('sugerido')
    expect(generarMarkdown(conRetorno())).not.toContain('987')
  })
})
