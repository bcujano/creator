import { describe, expect, it } from 'vitest'
import { calcularPaquete, compararModelos } from '../src/lib/precios'
import type { ItemCatalogo, PaquetePropuesta, ParametrosPrecio } from '../src/lib/tipos'

const parametros: ParametrosPrecio = {
  moneda: 'USD',
  iva_pct: 15,
  margen_minimo_mensual: 150,
  precio_usuario_extra: 15,
  costo_infra_base: 45,
  anticipo_pct: 50,
  modelo_por_usuario: 45,
  modelo_volumen_base: 120,
  a_medida_simple: 300,
  a_medida_media: 600,
  a_medida_tope: 900,
  a_medida_costo_pct: 35,
}

function item(parcial: Partial<ItemCatalogo> & Pick<ItemCatalogo, 'codigo'>): ItemCatalogo {
  return {
    id: parcial.codigo,
    tipo: 'modulo',
    categoria: 'x',
    nombre_es: parcial.codigo,
    nombre_en: parcial.codigo,
    descripcion_es: '',
    descripcion_en: '',
    caracteristicas_es: [],
    caracteristicas_en: [],
    resuelve: [],
    incluye: [],
    precio_setup: 0,
    precio_mensual: 0,
    costo_setup: 0,
    costo_mensual: 0,
    usuarios_incluidos: 0,
    volumen: null,
    semanas: 1,
    estado: 'listo',
    activo: true,
    orden: 0,
    ...parcial,
  }
}

const catalogo = new Map(
  [
    item({
      codigo: 'CRM_GERENCIAL',
      tipo: 'paquete',
      incluye: ['LLAMADAS'],
      precio_setup: 12000,
      precio_mensual: 650,
      costo_mensual: 250,
      usuarios_incluidos: 20,
      semanas: 10,
      volumen: {
        unidad_es: 'min',
        unidad_en: 'min',
        incluido: 200,
        precio_excedente: 0.35,
        costo_unitario: 0.18,
      },
    }),
    item({
      codigo: 'LLAMADAS',
      precio_setup: 2000,
      precio_mensual: 150,
      costo_mensual: 45,
      volumen: {
        unidad_es: 'min',
        unidad_en: 'min',
        incluido: 200,
        precio_excedente: 0.35,
        costo_unitario: 0.18,
      },
    }),
    item({ codigo: 'COTIZADOR', precio_setup: 1800, precio_mensual: 60, costo_mensual: 10 }),
  ].map((i) => [i.codigo, i]),
)

function paquete(parcial: Partial<PaquetePropuesta>): PaquetePropuesta {
  return {
    nivel: 'recomendado',
    nombre: 'x',
    propuesta_valor: '',
    lineas: [],
    usuarios: 0,
    volumen: {},
    descuento_setup_pct: 0,
    descuento_mensual_pct: 0,
    ...parcial,
  }
}

describe('calcularPaquete', () => {
  it('suma IVA del 15% sobre la base con descuento', () => {
    const r = calcularPaquete(
      paquete({ lineas: [{ codigo: 'COTIZADOR', cantidad: 1 }], descuento_setup_pct: 10 }),
      catalogo,
      parametros,
    )
    expect(r.setup.subtotal).toBe(1800)
    expect(r.setup.descuento).toBe(180)
    expect(r.setup.base).toBe(1620)
    expect(r.setup.iva).toBe(243)
    expect(r.setup.total).toBe(1863)
  })

  it('un módulo incluido en el paquete va a $0 y no suma costo', () => {
    const r = calcularPaquete(
      paquete({
        lineas: [
          { codigo: 'CRM_GERENCIAL', cantidad: 1 },
          { codigo: 'LLAMADAS', cantidad: 1 },
        ],
      }),
      catalogo,
      parametros,
    )
    const llamadas = r.lineas.find((l) => l.codigo === 'LLAMADAS')
    expect(llamadas?.incluido_en).toBe('CRM_GERENCIAL')
    expect(llamadas?.setup).toBe(0)
    expect(r.setup.base).toBe(12000)
    expect(r.mensual.base).toBe(650)
    expect(r.costo.infra).toBe(0)
  })

  it('cobra excedente de volumen y usuarios extra', () => {
    const r = calcularPaquete(
      paquete({
        lineas: [{ codigo: 'CRM_GERENCIAL', cantidad: 1 }],
        usuarios: 25,
        volumen: { CRM_GERENCIAL: 500 },
      }),
      catalogo,
      parametros,
    )
    expect(r.usuarios.extra).toBe(5)
    expect(r.usuarios.cargo).toBe(75)
    expect(r.lineas[0]?.volumen?.cargo).toBe(105) // 300 min × 0.35
    expect(r.mensual.base).toBe(830) // 650 + 105 + 75
    expect(r.costo.mensual).toBe(304) // 250 + 300 × 0.18
    expect(r.margen.mensual).toBe(526)
    expect(r.margen.cumple_minimo).toBe(true)
  })

  it('módulos sueltos cargan la infraestructura base como costo propio', () => {
    const r = calcularPaquete(
      paquete({ lineas: [{ codigo: 'COTIZADOR', cantidad: 1 }] }),
      catalogo,
      parametros,
    )
    expect(r.costo.mensual).toBe(55)
    expect(r.margen.mensual).toBe(5)
    expect(r.margen.cumple_minimo).toBe(false)
  })

  it('respeta un precio ajustado solo para esta propuesta', () => {
    const r = calcularPaquete(
      paquete({ lineas: [{ codigo: 'COTIZADOR', cantidad: 1, precio_mensual: 250 }] }),
      catalogo,
      parametros,
    )
    expect(r.mensual.base).toBe(250)
  })

  it('compara modelos de cobro con el mismo costo', () => {
    const r = calcularPaquete(
      paquete({ lineas: [{ codigo: 'CRM_GERENCIAL', cantidad: 1 }], usuarios: 8 }),
      catalogo,
      parametros,
    )
    const modelos = compararModelos(r, parametros)
    expect(modelos.map((m) => m.clave)).toEqual(['modulos', 'usuario', 'volumen'])
    expect(modelos[1]?.ingreso_mensual).toBe(360)
    expect(modelos[0]?.margen_mensual).toBe(400)
  })
})
