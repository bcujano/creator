import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AJUSTES_DEFECTO } from '../src/lib/ajustes-defecto'
import { construirAcuerdo } from '../src/server/acuerdo/contenido'
import { acuerdoDocx } from '../src/server/acuerdo/docx'
import { enteroEnLetras, montoEnLetras } from '../src/server/acuerdo/letras'
import { acuerdoPdf } from '../src/server/acuerdo/pdf'
import { documentoDePrueba } from './fixture'

const SALIDA = process.env.CREATOR_SALIDA_PRUEBAS

describe('montos en letras', () => {
  it.each([
    [0, 'cero'],
    [21, 'veintiuno'],
    [100, 'cien'],
    [101, 'ciento uno'],
    [9400, 'nueve mil cuatrocientos'],
    [21000, 'veintiún mil'],
    [31000, 'treinta y un mil'],
    [1_250_000, 'un millón doscientos cincuenta mil'],
  ])('%i → %s', (n, texto) => {
    expect(enteroEnLetras(n)).toBe(texto)
  })

  it('incluye centavos y moneda', () => {
    expect(montoEnLetras(10810.5)).toBe(
      'DIEZ MIL OCHOCIENTOS DIEZ CON 50/100 DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA',
    )
  })
})

describe('acuerdo', () => {
  const doc = documentoDePrueba('es')
  const acuerdo = construirAcuerdo(doc, AJUSTES_DEFECTO.legal, new Date('2026-09-23T15:00:00Z'))
  const texto = JSON.stringify(acuerdo.bloques)

  it('identifica a las dos partes', () => {
    expect(texto).toContain('321 SOLUCIONES INMOBILIARIAS S.A.S.')
    expect(texto).toContain('1793232459001')
    expect(texto).toContain('AiUDA')
    expect(texto).toContain('Byron Cujano')
    expect(texto).toContain('Director General')
    expect(texto).toContain('CLÍNICA SONRISA CÍA. LTDA.')
    expect(texto).toContain('1712345678')
    expect(acuerdo.faltantes).toEqual(['RUC', 'Correo'])
  })

  it('usa los montos del paquete recomendado, con el total en letras', () => {
    const recomendado = doc.paquetes.find((p) => p.recomendado)
    const total = recomendado?.calculo.setup.total ?? 0
    expect(texto).toContain(montoEnLetras(total))
    expect(acuerdo.numero).toBe('ACU-2026-0001')
  })

  it('no filtra costos, márgenes ni notas internas', () => {
    expect(texto).not.toContain('NO DEBE APARECER')
    expect(texto.toLowerCase()).not.toContain('margen')
  })

  it('genera PDF y Word', async () => {
    const pdf = await acuerdoPdf(acuerdo)
    const docx = await acuerdoDocx(acuerdo)
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect([...docx.subarray(0, 2)]).toEqual([0x50, 0x4b])
    if (SALIDA) {
      mkdirSync(SALIDA, { recursive: true })
      writeFileSync(resolve(SALIDA, 'acuerdo.pdf'), pdf)
      writeFileSync(resolve(SALIDA, 'acuerdo.docx'), docx)
    }
  })
})
