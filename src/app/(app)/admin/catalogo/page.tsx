import { EditorCatalogo } from '@/components/admin/catalogo'
import { leerAjustes, leerCatalogo } from '@/server/datos'

export default async function Catalogo() {
  const [catalogo, ajustes] = await Promise.all([leerCatalogo(), leerAjustes()])
  return <EditorCatalogo catalogo={catalogo} precios={ajustes.precios} />
}
