import 'server-only'
import { respuestasComoTexto } from '@/lib/preguntas'
import type {
  Ajustes,
  DatosPropuesta,
  Idioma,
  Insumo,
  ItemCatalogo,
  NivelPaquete,
} from '@/lib/tipos'
import type { LevantamientoCompleto } from '../datos'
import { EsquemaAnalisis, EsquemaSugerencias, type ResultadoAnalisis } from './esquema'
import { generarEstructurado } from './motor'

function catalogoComoTexto(catalogo: ItemCatalogo[], idioma: Idioma) {
  return catalogo
    .filter((i) => i.activo && i.estado !== 'proximamente')
    .map((i) => {
      const nombre = idioma === 'en' ? i.nombre_en : i.nombre_es
      const desc = idioma === 'en' ? i.descripcion_en : i.descripcion_es
      const carac = (idioma === 'en' ? i.caracteristicas_en : i.caracteristicas_es).join('; ')
      const partes = [
        `${i.codigo} [${i.tipo}] ${nombre}`,
        `  ${desc}`,
        carac && `  Incluye: ${carac}`,
        i.incluye.length > 0 && `  Contiene los módulos: ${i.incluye.join(', ')}`,
        i.resuelve.length > 0 && `  Señales de que aplica: ${i.resuelve.join(', ')}`,
        `  Precio: setup $${i.precio_setup}${i.precio_mensual ? ` + $${i.precio_mensual}/mes` : ' (pago único)'}${i.usuarios_incluidos ? `, ${i.usuarios_incluidos} usuarios incluidos` : ''}`,
      ]
      return partes.filter(Boolean).join('\n')
    })
    .join('\n\n')
}

function insumosComoTexto(insumos: Insumo[]) {
  return insumos
    .filter((i) => i.estado === 'listo' && i.contenido.trim())
    .map((i) => {
      const quien = i.origen === 'cliente' ? 'aportado por el cliente' : 'del consultor'
      return `### ${i.titulo || i.tipo} (${i.tipo}, ${quien})\n${i.contenido.trim()}`
    })
    .join('\n\n')
}

function sistema(ajustes: Ajustes, idioma: Idioma) {
  const lengua = idioma === 'en' ? 'inglés' : 'español'
  return `Eres el consultor principal de ${ajustes.marca.nombre}, empresa ecuatoriana que diseña, desarrolla e implanta sistemas con inteligencia artificial para empresas (CRMs con IA, agentes de WhatsApp, llamadas con IA, un Super Agente que conoce todo el CRM y gerencia, automatizaciones con n8n, cotizadores, marketing con IA).

Estás en la primera reunión con un cliente. Tu trabajo es entender el negocio, descubrir sus dolores —los que dice y los que no ve— y diseñar en el momento la solución, con paquetes listos para cotizar.

Cómo trabajas:
- Te basas en la evidencia del levantamiento. Si algo es una suposición, dilo en "supuestos". No inventes datos del cliente.
- Dolores ocultos: busca siempre al menos dos (tipo "oculto"), distintos de los que el cliente nombró. Infiérelos de tiempos de respuesta, dependencia de personas clave, trabajo manual repetido, falta de datos para decidir, clientes que se pierden sin seguimiento, errores recurrentes. Cada uno necesita evidencia concreta.
- Estima el impacto en dólares con cálculos conservadores y explicables (volumen × ticket × % perdido, horas × costo por hora). Si no hay base, usa null.
- Soluciones: usa SOLO códigos del catálogo. Si algo necesario no está en el catálogo, descríbelo igual y marca a_medida = true.
- Si los procesos no están documentados o la operación depende de personas, considera el LEVANTAMIENTO documental como primer paso.
- Paquetes (exactamente tres):
  · esencial: ataca el dolor más urgente con la menor inversión.
  · recomendado: el mejor retorno; es el que tú venderías.
  · premium: la transformación completa.
  No repitas módulos que ya vienen dentro de un paquete (campo "Contiene los módulos"). Ajusta los paquetes al tamaño y presupuesto aparente del cliente.
- ROI conservador. Contexto: Ecuador, dólares, pymes.
- Escribe todo el contenido en ${lengua}, claro y directo, pensado para mostrárselo al dueño del negocio.`
}

export function construirEntrada(
  levantamiento: LevantamientoCompleto,
  insumos: Insumo[],
  catalogo: ItemCatalogo[],
) {
  const c = levantamiento.clientes
  const idioma = levantamiento.idioma
  const ficha = [
    `Empresa: ${c.nombre}`,
    c.industria && `Industria: ${c.industria}`,
    c.ciudad && `Ciudad: ${c.ciudad}`,
    c.empleados && `Empleados: ${c.empleados}`,
    c.sitio_web && `Sitio web: ${c.sitio_web}`,
    c.contacto_nombre &&
      `Contacto: ${c.contacto_nombre}${c.contacto_cargo ? ` (${c.contacto_cargo})` : ''}`,
    c.notas && `Notas: ${c.notas}`,
  ]
    .filter(Boolean)
    .join('\n')

  return `# CATÁLOGO DISPONIBLE
${catalogoComoTexto(catalogo, idioma)}

# FICHA DEL CLIENTE
${ficha}

# ENTREVISTA
${respuestasComoTexto(levantamiento.respuestas, idioma) || '(sin respuestas todavía)'}

# MATERIAL RECOPILADO
${insumosComoTexto(insumos) || '(sin material adicional)'}`
}

export async function analizar(
  ajustes: Ajustes,
  levantamiento: LevantamientoCompleto,
  entrada: string,
) {
  return generarEstructurado(ajustes.ia, {
    esquema: EsquemaAnalisis,
    nombre: 'analisis',
    sistema: sistema(ajustes, levantamiento.idioma),
    usuario: `${entrada}\n\nAnaliza este levantamiento y entrega el diagnóstico completo con la propuesta de solución.`,
    esfuerzo: ajustes.ia.esfuerzo,
  })
}

export async function sugerirPreguntas(
  ajustes: Ajustes,
  levantamiento: LevantamientoCompleto,
  insumos: Insumo[],
) {
  const idioma = levantamiento.idioma
  return generarEstructurado(ajustes.ia, {
    esquema: EsquemaSugerencias,
    nombre: 'sugerencias',
    sistema: `Eres consultor senior de ${ajustes.marca.nombre} y estás en plena reunión con un cliente. Propón las siguientes preguntas que el consultor debe hacer AHORA para descubrir dolores ocultos, cuantificar el impacto y detectar oportunidades de automatizar con IA. Preguntas cortas, conversacionales, en ${idioma === 'en' ? 'inglés' : 'español'}. No repitas lo ya respondido.`,
    usuario: `Cliente: ${levantamiento.clientes.nombre} (${levantamiento.clientes.industria || 'industria sin definir'})

Respuestas hasta ahora:
${respuestasComoTexto(levantamiento.respuestas, idioma) || '(ninguna)'}

Material:
${insumosComoTexto(insumos).slice(0, 12000) || '(ninguno)'}

Dame de 3 a 5 preguntas y los dolores que sospechas.`,
    esfuerzo: 'low',
    maxTokens: 8000,
  })
}

/** Convierte los paquetes que sugirió la IA en una propuesta editable. */
export function propuestaDesdeAnalisis(
  resultado: ResultadoAnalisis,
  catalogo: Map<string, ItemCatalogo>,
): DatosPropuesta {
  const niveles: NivelPaquete[] = ['esencial', 'recomendado', 'premium']
  const paquetes = niveles.map((nivel) => {
    const sugerido = resultado.paquetes.find((p) => p.nivel === nivel)
    const codigos = [...new Set(sugerido?.codigos ?? [])].filter((c) => catalogo.get(c)?.activo)
    return {
      nivel,
      nombre: sugerido?.nombre ?? nivel,
      propuesta_valor: sugerido?.propuesta_valor ?? '',
      lineas: codigos.map((codigo) => ({ codigo, cantidad: 1 })),
      usuarios: Math.max(1, Math.round(sugerido?.usuarios_estimados ?? 3)),
      volumen: {},
      descuento_setup_pct: 0,
      descuento_mensual_pct: 0,
    }
  })
  return { paquetes, seleccionado: 'recomendado', condiciones: '', notas_internas: '' }
}
