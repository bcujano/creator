import { describe, expect, it } from 'vitest'
import { AJUSTES_DEFECTO } from '../src/lib/ajustes-defecto'
import { construirAcuerdo } from '../src/server/acuerdo/contenido'
import { documentoPublico } from '../src/server/publico'
import { documentoDePrueba } from './fixtures/documento'

describe('habilidades de las herramientas', () => {
  it('se destacan ante el cliente', () => {
    const publico = documentoPublico(documentoDePrueba('es'))
    // Los módulos a medida no traen habilidades: se arman al vuelo para cada cliente.
    const items = publico.paquetes.flatMap((p) => p.items).filter((i) => !i.a_medida)
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((i) => i.habilidades.includes('Habilidad extra sin costo'))).toBe(true)
  })

  it('nunca entran al alcance del acuerdo: lo contratado no cambia', () => {
    const doc = documentoDePrueba('es')
    doc.propuesta.cierre = { paquete: 'premium', pagos: [{ concepto: 'a la firma', pct: 100 }] }
    const texto = JSON.stringify(construirAcuerdo(doc, AJUSTES_DEFECTO.legal).bloques)
    expect(texto).toContain('Primera ventaja')
    expect(texto).not.toContain('Habilidad extra sin costo')
  })
})
