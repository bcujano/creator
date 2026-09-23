export type Idioma = 'es' | 'en'

export type Volumen = {
  unidad_es: string
  unidad_en: string
  incluido: number
  precio_excedente: number
  costo_unitario: number
}

export type ItemCatalogo = {
  id: string
  codigo: string
  tipo: 'paquete' | 'modulo' | 'servicio'
  categoria: string
  nombre_es: string
  nombre_en: string
  descripcion_es: string
  descripcion_en: string
  caracteristicas_es: string[]
  caracteristicas_en: string[]
  resuelve: string[]
  incluye: string[]
  precio_setup: number
  precio_mensual: number
  costo_setup: number
  costo_mensual: number
  usuarios_incluidos: number
  volumen: Volumen | null
  semanas: number
  estado: 'listo' | 'beta' | 'proximamente'
  activo: boolean
  orden: number
}

export type Marca = {
  nombre: string
  eslogan_es: string
  eslogan_en: string
  logo_url: string
  color_primario: string
  color_acento: string
  email: string
  telefono: string
  sitio_web: string
  direccion: string
  validez_dias: number
}

export type ParametrosPrecio = {
  moneda: string
  iva_pct: number
  margen_minimo_mensual: number
  precio_usuario_extra: number
  costo_infra_base: number
  anticipo_pct: number
  /** Precio por usuario/mes si se cobrara solo por usuario (simulador). */
  modelo_por_usuario: number
  /** Cuota base si se cobrara solo por volumen (simulador). */
  modelo_volumen_base: number
  /** Precio máximo de implementación de un módulo a medida. */
  a_medida_tope: number
  /** Costo propio estimado de un desarrollo a medida, como % de su precio. */
  a_medida_costo_pct: number
}

export type AjustesIA = {
  proveedor: 'anthropic' | 'openai'
  modelo_anthropic: string
  modelo_openai: string
  modelo_transcripcion: string
  esfuerzo: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
}

export type AjustesCRM = {
  activo: boolean
  enviar_al_crear_propuesta: boolean
  service_type: string
  source: string
}

/** Quién presta el servicio en los acuerdos. */
export type DatosLegales = {
  razon_social: string
  ruc: string
  linea_negocio: string
  descripcion_linea: string
  representante: string
  cargo: string
  ciudad: string
  direccion: string
  plazo_minimo_meses: number
  dias_preaviso: number
  garantia_dias: number
}

export type Ajustes = {
  marca: Marca
  precios: ParametrosPrecio
  ia: AjustesIA
  crm: AjustesCRM
  legal: DatosLegales
}

export type Cliente = {
  id: string
  nombre: string
  industria: string
  ruc: string
  contacto_nombre: string
  contacto_cargo: string
  telefono: string
  email: string
  ciudad: string
  sitio_web: string
  empleados: string
  notas: string
  razon_social: string
  direccion: string
  cedula_representante: string
  crm_lead_id: string | null
  creado_en: string
}

export type EstadoLevantamiento =
  | 'recolectando'
  | 'analizado'
  | 'propuesta'
  | 'enviada'
  | 'ganada'
  | 'perdida'

export type Levantamiento = {
  id: string
  cliente_id: string
  titulo: string
  estado: EstadoLevantamiento
  idioma: Idioma
  respuestas: Record<string, string>
  /** Lo que el cliente respondió desde su celular (mismas claves de pregunta). */
  respuestas_cliente: Record<string, string>
  cliente_respondio_en: string | null
  cliente_termino: boolean
  token_cliente: string
  formulario_activo: boolean
  creado_en: string
  actualizado_en: string
}

export type Insumo = {
  id: string
  levantamiento_id: string
  tipo: 'nota' | 'archivo' | 'audio' | 'imagen' | 'formulario' | 'texto'
  origen: 'consultor' | 'cliente'
  titulo: string
  contenido: string
  ruta_archivo: string | null
  mime: string | null
  tamano: number | null
  estado: 'procesando' | 'listo' | 'error'
  error: string | null
  meta?: Record<string, unknown>
  creado_en: string
}

// ---------------------------------------------------------------------------
// Propuesta
// ---------------------------------------------------------------------------

export type NivelPaquete = 'esencial' | 'recomendado' | 'premium'

/** Desarrollo que no está en el catálogo y se cotiza para este cliente. */
export type ModuloAMedida = {
  nombre: string
  descripcion: string
  entregables: string[]
  precio_setup: number
  precio_mensual: number
  semanas: number
}

export type LineaPropuesta = {
  codigo: string
  cantidad: number
  /** Si existe, la línea es un desarrollo a medida y no se busca en el catálogo. */
  a_medida?: ModuloAMedida | null
  /** Si se define, reemplaza el precio del catálogo solo en esta propuesta. */
  precio_setup?: number | null
  precio_mensual?: number | null
}

export type PaquetePropuesta = {
  nivel: NivelPaquete
  nombre: string
  propuesta_valor: string
  lineas: LineaPropuesta[]
  usuarios: number
  /** Uso mensual estimado por código de línea (minutos, conversaciones...). */
  volumen: Record<string, number>
  descuento_setup_pct: number
  descuento_mensual_pct: number
}

/** Un desembolso del valor de implementación. */
export type Desembolso = { concepto: string; pct: number }

/** Lo que se acordó al cerrar: qué paquete eligió el cliente y cómo paga. */
export type Cierre = { paquete: NivelPaquete; pagos: Desembolso[] }

export type DatosPropuesta = {
  paquetes: PaquetePropuesta[]
  seleccionado: NivelPaquete
  condiciones: string
  notas_internas: string
}
