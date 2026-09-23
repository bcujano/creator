import { Simulador } from '@/components/admin/simulador'
import { leerAjustes, leerCatalogo } from '@/server/datos'

export default async function Rentabilidad() {
  const [catalogo, ajustes] = await Promise.all([
    leerCatalogo({ soloActivos: true }),
    leerAjustes(),
  ])
  return <Simulador catalogo={catalogo} precios={ajustes.precios} />
}
