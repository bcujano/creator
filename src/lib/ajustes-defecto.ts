import type { Ajustes } from './tipos'

/** Valores de respaldo: si falta una clave en la base, se usa la de aquí. */
export const AJUSTES_DEFECTO: Ajustes = {
  marca: {
    nombre: 'AiUDA',
    eslogan_es: 'Sistemas de inteligencia artificial a la medida de tu negocio',
    eslogan_en: 'AI systems tailored to your business',
    logo_url: '/brand/logo.png',
    color_primario: '#4B2BD6',
    color_acento: '#12B886',
    email: '',
    telefono: '',
    sitio_web: '',
    direccion: 'Ecuador',
    validez_dias: 15,
  },
  precios: {
    moneda: 'USD',
    iva_pct: 15,
    margen_minimo_mensual: 150,
    precio_usuario_extra: 15,
    costo_infra_base: 45,
    anticipo_pct: 50,
    modelo_por_usuario: 45,
    modelo_volumen_base: 120,
    a_medida_simple: 300,
    a_medida_media: 600,
    a_medida_tope: 900,
    a_medida_costo_pct: 35,
  },
  ia: {
    proveedor: 'anthropic',
    modelo_anthropic: 'claude-opus-5',
    modelo_openai: 'gpt-4.1',
    modelo_transcripcion: 'gpt-4o-transcribe',
    esfuerzo: 'medium',
  },
  legal: {
    razon_social: '321 SOLUCIONES INMOBILIARIAS S.A.S.',
    ruc: '1793232459001',
    linea_negocio: 'AiUDA',
    descripcion_linea:
      'línea de negocio dedicada a brindar soluciones empresariales con inteligencia artificial',
    representante: 'Byron Cujano',
    cargo: 'Director General',
    ciudad: 'Quito',
    direccion: '',
    plazo_minimo_meses: 6,
    dias_preaviso: 30,
    garantia_dias: 30,
  },
  crm: {
    activo: true,
    enviar_al_crear_propuesta: false,
    service_type: 'consultoria',
    source: 'otro',
  },
}
