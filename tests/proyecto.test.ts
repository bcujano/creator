import { describe, expect, it } from 'vitest'
import { briefProyecto } from '../src/server/proyecto'
import { CATALOGO, documentoDePrueba } from './fixtures/documento'

describe('brief de arranque del proyecto', () => {
  const doc = documentoDePrueba('es')
  doc.propuesta.cierre = {
    paquete: 'premium',
    pagos: [
      { concepto: 'a la firma', pct: 50 },
      { concepto: 'a la entrega', pct: 50 },
    ],
  }
  const md = briefProyecto(doc, {
    levantamiento: {
      titulo: 'Reunión',
      respuestas: { dolor_principal: 'Perdemos citas de noche' },
      respuestas_cliente: {},
    },
    insumos: [
      {
        titulo: 'Notas',
        tipo: 'nota',
        origen: 'consultor',
        contenido: 'x'.repeat(5000),
        estado: 'listo',
      },
    ],
    catalogo: CATALOGO,
  })

  it('trae alcance, montos con IVA y plan de pagos del cierre', () => {
    const premium = doc.paquetes.find((p) => p.definicion.nivel === 'premium')
    expect(md).toContain('## Alcance contratado')
    expect(md).toContain('(desarrollo a medida)')
    expect(md).toContain('Montos con IVA incluido')
    expect(md).toContain('1. ')
    expect(premium).toBeTruthy()
    expect(md).toContain('## Cómo usar este documento')
  })

  it('incluye la entrevista y recorta el material largo', () => {
    expect(md).toContain('Perdemos citas de noche')
    expect(md).toContain('[… recortado')
  })

  it('no filtra costos ni márgenes', () => {
    expect(md).not.toMatch(/costo_|margen/i)
  })
})
