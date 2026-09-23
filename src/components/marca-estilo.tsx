import type { Marca } from '@/lib/tipos'

/** Inyecta los colores de marca vigentes como variables CSS. */
export function EstiloMarca({ marca }: { marca: Pick<Marca, 'color_primario' | 'color_acento'> }) {
  const css = `:root{--marca:${marca.color_primario};--acento:${marca.color_acento};}`
  // biome-ignore lint/security/noDangerouslySetInnerHtml: colores validados como #RRGGBB en /api/ajustes
  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
