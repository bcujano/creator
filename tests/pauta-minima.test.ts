import { describe, expect, it } from 'vitest'
import { AJUSTES_DEFECTO } from '../src/lib/ajustes-defecto'
import { pautaMinima, textosPautaMinima } from '../src/lib/precios-crm'
import { construirAcuerdo } from '../src/server/acuerdo/contenido'
import { montoEnLetras } from '../src/server/acuerdo/letras'
import { generarMarkdown } from '../src/server/exportar/markdown'
import { documentoPublico } from '../src/server/publico'
import { documentoDePrueba } from './fixtures/documento'

// Regla de dirección general (2026-11-19): sin inversión mínima en anuncios no se instala.
// El monto vive solo en el CRM (condiciones → PAUTA_MINIMA); aquí se usa 175 para probar que se toma de ahí.
const condiciones = [
  { codigo: 'OTRA', monto: 999 },
  {
    codigo: 'PAUTA_MINIMA',
    nombre: 'Inversión mínima mensual en anuncios',
    monto: 175,
    unidad: 'mes',
  },
]

describe('inversión mínima en anuncios (PAUTA_MINIMA del CRM)', () => {
  it('lee el monto de la fila PAUTA_MINIMA de condiciones', () => {
    expect(pautaMinima(condiciones)).toBe(175)
    expect(pautaMinima([])).toBeNull()
    expect(pautaMinima(undefined)).toBeNull()
    expect(pautaMinima([{ codigo: 'PAUTA_MINIMA', monto: 0 }])).toBeNull()
  })

  it('el texto al cliente dice el monto del CRM, que lo paga en su cuenta y que el panel lo muestra', () => {
    const t = textosPautaMinima(175, 'es')
    expect(t.condicion).toContain('$175 al mes')
    expect(t.condicion).toContain('su propia cuenta de anuncios')
    expect(t.condicion).toContain('dependen de esa inversión')
    expect(t.condicion).toContain('su panel le muestra')
    expect(t.resumen).toContain('$175')
    expect(textosPautaMinima(175, 'en').condicion).toContain('$175 a month')
  })

  it('el acuerdo trae la cláusula con el monto del CRM en números y en letras', () => {
    const doc = documentoDePrueba('es')
    const texto = JSON.stringify(construirAcuerdo(doc, AJUSTES_DEFECTO.legal).bloques)
    expect(texto).toContain('INVERSIÓN MÍNIMA MENSUAL EN ANUNCIOS')
    expect(texto).toContain('$175')
    expect(texto).toContain(montoEnLetras(175))
    expect(texto).toContain('su propia cuenta de anuncios')
    expect(texto).toContain('no se paga a EL PROVEEDOR')
    expect(texto).not.toContain('$150')
  })

  it('la propuesta la muestra en el resumen y en las condiciones, y llega al cliente', () => {
    const doc = documentoDePrueba('es')
    const md = generarMarkdown(doc)
    const resumen = md.slice(
      md.indexOf('## Resumen'),
      md.indexOf('## ', md.indexOf('## Resumen') + 3),
    )
    expect(resumen).toContain('$175 al mes en anuncios')
    expect(md).toContain('Inversión mínima en anuncios: $175 al mes')
    expect(documentoPublico(doc).pauta_minima?.monto).toBe(175)
  })

  it('sin respuesta del CRM no hay cláusula (nunca una cifra inventada)', () => {
    const doc = { ...documentoDePrueba('es'), pauta_minima: null }
    const texto = JSON.stringify(construirAcuerdo(doc, AJUSTES_DEFECTO.legal).bloques)
    expect(texto).not.toContain('INVERSIÓN MÍNIMA')
    expect(generarMarkdown(doc)).not.toContain('anuncios:')
  })
})
