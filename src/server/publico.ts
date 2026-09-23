import 'server-only'
import type { Documento } from './documento'

/**
 * Versión del documento apta para el cliente: sin costos, márgenes ni notas
 * internas. Todo lo que se renderiza para el cliente pasa por aquí.
 */
export type DocumentoPublico = ReturnType<typeof documentoPublico>

export function documentoPublico(doc: Documento) {
  return {
    idioma: doc.idioma,
    t: doc.t,
    marca: doc.marca,
    iva_pct: doc.precios.iva_pct,
    anticipo_pct: doc.precios.anticipo_pct,
    cliente: { nombre: doc.cliente.nombre, contacto_nombre: doc.cliente.contacto_nombre },
    propuesta: {
      id: doc.propuesta.id,
      numero: doc.propuesta.numero,
      version: doc.propuesta.version,
      token_publico: doc.propuesta.token_publico,
      condiciones: doc.propuesta.datos.condiciones,
    },
    analisis: doc.analisis,
    paquetes: doc.paquetes.map((p) => ({
      nivel: p.definicion.nivel,
      nombre: p.definicion.nombre,
      propuesta_valor: p.definicion.propuesta_valor,
      recomendado: p.recomendado,
      items: p.items,
      lineas: p.calculo.lineas.map((l) => ({
        codigo: l.codigo,
        nombre: l.nombre,
        cantidad: l.cantidad,
        setup: l.setup,
        mensual: l.mensual,
        incluido_en: l.incluido_en,
        volumen: l.volumen
          ? {
              unidad: l.volumen.unidad,
              incluido: l.volumen.incluido,
              excedente: l.volumen.excedente,
              cargo: l.volumen.cargo,
            }
          : null,
      })),
      usuarios: {
        incluidos: p.calculo.usuarios.incluidos,
        extra: p.calculo.usuarios.extra,
        cargo: p.calculo.usuarios.cargo,
      },
      setup: p.calculo.setup,
      mensual: p.calculo.mensual,
      primer_anio: p.calculo.primer_anio,
      semanas: p.calculo.semanas,
    })),
    fecha: doc.fecha,
    valida_hasta: doc.valida_hasta,
    recuperacion_meses: doc.recuperacion_meses,
  }
}
