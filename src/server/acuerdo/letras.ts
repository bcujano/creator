/** Montos en letras al estilo de los contratos ecuatorianos: "NUEVE MIL CUATROCIENTOS CON 00/100". */

const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
const ESPECIALES = [
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
  'veintiuno',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
]
const DECENAS = [
  '',
  '',
  '',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
]
const CENTENAS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
]

function hasta999(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cien'
  const c = Math.floor(n / 100)
  const resto = n % 100
  let texto = CENTENAS[c] ?? ''
  if (resto > 0) {
    let dos: string
    if (resto < 10) dos = UNIDADES[resto] ?? ''
    else if (resto < 30) dos = ESPECIALES[resto - 10] ?? ''
    else {
      const d = Math.floor(resto / 10)
      const u = resto % 10
      dos = `${DECENAS[d]}${u ? ` y ${UNIDADES[u]}` : ''}`
    }
    texto = texto ? `${texto} ${dos}` : dos
  }
  return texto
}

/** "uno" se apocopa delante de "mil" y "millones": veintiún mil, treinta y un millones. */
const apocopar = (t: string) => t.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un')

export function enteroEnLetras(n: number): string {
  if (n === 0) return 'cero'
  const millones = Math.floor(n / 1_000_000)
  const miles = Math.floor((n % 1_000_000) / 1000)
  const resto = n % 1000
  const partes: string[] = []
  if (millones)
    partes.push(millones === 1 ? 'un millón' : `${apocopar(hasta999(millones))} millones`)
  if (miles) partes.push(miles === 1 ? 'mil' : `${apocopar(hasta999(miles))} mil`)
  if (resto) partes.push(hasta999(resto))
  return partes.join(' ')
}

export function montoEnLetras(valor: number): string {
  const centavos = Math.round(valor * 100)
  const entero = Math.floor(centavos / 100)
  const cents = String(centavos % 100).padStart(2, '0')
  return `${enteroEnLetras(entero).toUpperCase()} CON ${cents}/100 DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA`
}
