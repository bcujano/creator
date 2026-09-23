import 'server-only'
import { precioAMedida } from '@/lib/precios'
import { respuestasComoTexto } from '@/lib/preguntas'
import type {
  Ajustes,
  DatosPropuesta,
  Idioma,
  Insumo,
  ItemCatalogo,
  NivelPaquete,
  ParametrosPrecio,
} from '@/lib/tipos'
import type { LevantamientoCompleto } from '../datos'

/** Lo que dijo el cliente (en su celular) y lo que anotó el consultor, cada uno con su voz. */
function entrevistaComoTexto(l: LevantamientoCompleto, vacio: string) {
  const cliente = respuestasComoTexto(l.respuestas_cliente ?? {}, l.idioma)
  const consultor = respuestasComoTexto(l.respuestas, l.idioma)
  const partes = [
    cliente && `## Respondido por el cliente, con sus palabras\n${cliente}`,
    consultor && `## Anotado por el consultor durante la reunión\n${consultor}`,
  ].filter(Boolean)
  return partes.join('\n\n') || vacio
}

import { EsquemaAnalisis, EsquemaSugerencias, type ResultadoIA } from './esquema'
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
- Cifras (impacto de cada dolor, componentes del retorno, horas liberadas): NO calcules el total; da los factores que se multiplican y el sistema hace la cuenta. Reglas estrictas, porque el cliente verá de dónde sale cada número:
  · Cada factor lleva su fuente. "cliente" o "consultor" solo si lo dijeron en la reunión, y en evidencia va la cita textual de su respuesta.
  · Nunca inventes dinero: precios, rentas, tickets, sueldos o costos por hora deben venir del cliente o del consultor. Si falta ese dato, deja factores vacío y escribe en pregunta_para_cuantificar la pregunta exacta para obtenerlo.
  · Se permite como máximo UN factor "supuesto" por cálculo (típicamente un porcentaje), conservador, y en evidencia explica por qué es razonable.
  · Es preferible dejar una cifra sin cuantificar que presentar un número sin respaldo.
  · Porcentajes como fracción (20% = 0.2).
- Soluciones: primero el catálogo. Módulos a medida (modulos_a_medida) SOLO cuando el negocio necesita una herramienta o agente de inteligencia artificial nuevo, con valor propio, que ningún producto del catálogo ofrece. Ejemplos: un agente que planifica rutas y avisa a los clientes de una empresa de logística, un asistente que controla inventario y anticipa quiebres de stock, un agente de seguimiento y reactivación de clientes antiguos.
  · NO son módulos a medida y NO se cobran aparte: conectar o sincronizar con lo que el cliente ya usa (su calendario, su software de la industria, Excel, facturación), configuraciones, plantillas o reportes que son parte de implementar un producto del catálogo. Eso va incluido: menciónalo en la descripción de la solución y en integraciones de la arquitectura.
  · El nombre dice lo que ES, en palabras que un dueño entiende sin explicación: "Agente de…", "Asistente de…", "Sistema de…". Nunca términos de marketing o ambiguos ("campaña", "puente", "motor", "hub").
  · La descripción empieza con "Es un agente / asistente / sistema que…" y dice qué problema resuelve.
  · No pongas precio: clasifica la complejidad (simple, media o compleja) y explica qué hay que construir. El precio sale de la tabla de la empresa. No infles: la mayoría son simples o medias.
  · No busques cobrar de más: si un producto del catálogo bien configurado lo resuelve, no crees un módulo a medida.
  · En la solución correspondiente marca a_medida = true e incluye el código del módulo en los paquetes donde tenga sentido.
- Si los procesos no están documentados o la operación depende de personas, considera el LEVANTAMIENTO documental como primer paso.
- Paquetes (exactamente tres):
  · esencial: ataca el dolor más urgente con la menor inversión.
  · recomendado: el mejor retorno; es el que tú venderías.
  · premium: la transformación completa.
  No repitas módulos que ya vienen dentro de un paquete (campo "Contiene los módulos"). Ajusta los paquetes al tamaño y presupuesto aparente del cliente.
- Usa las palabras del cliente: cuando describe cómo imagina el sistema o por qué cree que podemos ayudarle, refleja esa visión en la propuesta de valor. Si indicó cuánto piensa invertir, el paquete recomendado debe caber en ese rango (o explicar por qué conviene salir de él) y el esencial debe quedar por debajo.
- Retorno: componentes de ahorro e ingreso con las mismas reglas de factores; no cuentes dos veces el mismo dinero. Contexto: Ecuador, dólares, pymes.
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
    c.razon_social && `Razón social: ${c.razon_social}`,
    c.notas && `Notas: ${c.notas}`,
  ]
    .filter(Boolean)
    .join('\n')

  return `# CATÁLOGO DISPONIBLE
${catalogoComoTexto(catalogo, idioma)}

# FICHA DEL CLIENTE
${ficha}

# ENTREVISTA
${entrevistaComoTexto(levantamiento, '(sin respuestas todavía)')}

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
${entrevistaComoTexto(levantamiento, '(ninguna)')}

Material:
${insumosComoTexto(insumos).slice(0, 12000) || '(ninguno)'}

Dame de 3 a 5 preguntas y los dolores que sospechas.`,
    esfuerzo: 'low',
    maxTokens: 8000,
  })
}

/** Convierte los paquetes que sugirió la IA en una propuesta editable. */
export function propuestaDesdeAnalisis(
  resultado: ResultadoIA,
  catalogo: Map<string, ItemCatalogo>,
  precios: ParametrosPrecio,
): DatosPropuesta {
  const niveles: NivelPaquete[] = ['esencial', 'recomendado', 'premium']
  // Los módulos a medida viajan dentro de la línea: no dependen del catálogo.
  // El precio sale de la tabla por complejidad; la IA no pone montos.
  const aMedida = new Map(
    (resultado.modulos_a_medida ?? []).map((m) => [
      m.codigo,
      {
        nombre: m.nombre,
        descripcion: m.descripcion,
        entregables: m.entregables,
        precio_setup: precioAMedida(m.complejidad, precios),
        precio_mensual: 0,
        semanas: Math.max(1, Math.round(m.semanas)),
      },
    ]),
  )
  const paquetes = niveles.map((nivel) => {
    const sugerido = resultado.paquetes.find((p) => p.nivel === nivel)
    const codigos = [...new Set(sugerido?.codigos ?? [])].filter(
      (c) => catalogo.get(c)?.activo || aMedida.has(c),
    )
    return {
      nivel,
      nombre: sugerido?.nombre ?? nivel,
      propuesta_valor: sugerido?.propuesta_valor ?? '',
      lineas: codigos.map((codigo) => ({
        codigo,
        cantidad: 1,
        a_medida: aMedida.get(codigo) ?? null,
      })),
      usuarios: Math.max(1, Math.round(sugerido?.usuarios_estimados ?? 3)),
      volumen: {},
      descuento_setup_pct: 0,
      descuento_mensual_pct: 0,
    }
  })
  return { paquetes, seleccionado: 'recomendado', condiciones: '', notas_internas: '' }
}
