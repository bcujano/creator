import { redondear } from './precios'
import type { Cierre, DatosPropuesta, Desembolso, NivelPaquete } from './tipos'

export const MAX_DESEMBOLSOS = 4

/** Momentos habituales, para elegir rápido en la reunión. */
export const MOMENTOS = [
  'a la firma del presente acuerdo',
  'al aprobar el diseño de la solución',
  'al completar la primera fase',
  'a la entrega y puesta en marcha de la solución',
  'a los 30 días de la puesta en marcha',
]

export function pagosPorDefecto(anticipoPct: number): Desembolso[] {
  const anticipo = Math.min(100, Math.max(0, anticipoPct))
  if (anticipo >= 100) return [{ concepto: MOMENTOS[0] as string, pct: 100 }]
  return [
    { concepto: MOMENTOS[0] as string, pct: anticipo },
    { concepto: MOMENTOS[3] as string, pct: redondear(100 - anticipo) },
  ]
}

/** Cierre vigente: lo negociado o, si no hay, el paquete destacado y el anticipo por defecto. */
export function cierreEfectivo(
  cierre: Cierre | null | undefined,
  datos: Pick<DatosPropuesta, 'seleccionado'>,
  anticipoPct: number,
): Cierre {
  return {
    paquete: (cierre?.paquete ?? datos.seleccionado) as NivelPaquete,
    pagos: cierre?.pagos?.length ? cierre.pagos : pagosPorDefecto(anticipoPct),
  }
}

export function sumaPct(pagos: Desembolso[]) {
  return redondear(pagos.reduce((s, p) => s + (Number(p.pct) || 0), 0))
}

export function validarPagos(pagos: Desembolso[]): string | null {
  if (pagos.length < 1 || pagos.length > MAX_DESEMBOLSOS)
    return `Entre 1 y ${MAX_DESEMBOLSOS} desembolsos.`
  if (pagos.some((p) => !(p.pct > 0))) return 'Cada desembolso debe tener un porcentaje mayor a 0.'
  if (pagos.some((p) => !p.concepto.trim())) return 'Indica cuándo se paga cada desembolso.'
  const suma = sumaPct(pagos)
  if (Math.abs(suma - 100) > 0.001) return `Los porcentajes suman ${suma}%; deben sumar 100%.`
  return null
}

/** Monto de cada desembolso; el último absorbe el redondeo para que cuadre exacto. */
export function montosPagos(pagos: Desembolso[], total: number) {
  let acumulado = 0
  return pagos.map((p, i) => {
    const monto =
      i === pagos.length - 1 ? redondear(total - acumulado) : redondear((total * p.pct) / 100)
    acumulado = redondear(acumulado + monto)
    return { ...p, monto }
  })
}
