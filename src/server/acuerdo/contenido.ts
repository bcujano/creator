import 'server-only'
import { fechaLarga } from '@/lib/i18n'
import { formatoUSD } from '@/lib/precios'
import type { DatosLegales } from '@/lib/tipos'
import type { Documento } from '../documento'
import { montoEnLetras } from './letras'

/**
 * Contenido del acuerdo como bloques neutros; los renderizadores de PDF y
 * Word solo los dibujan. Así ambos formatos dicen exactamente lo mismo.
 */

export type Bloque =
  | { tipo: 'titulo'; texto: string }
  | { tipo: 'subtitulo'; texto: string }
  | { tipo: 'clausula'; texto: string }
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'vinetas'; items: string[] }
  | { tipo: 'tabla'; filas: [string, string][]; ultimaNegrita?: boolean }
  | { tipo: 'firmas'; proveedor: string[]; cliente: string[] }

export type Acuerdo = { numero: string; bloques: Bloque[]; faltantes: string[] }

const BLANCO = '____________________'
const miles = (n: number) => n.toLocaleString('es-EC')
const ORDINALES = [
  'PRIMERA',
  'SEGUNDA',
  'TERCERA',
  'CUARTA',
  'QUINTA',
  'SEXTA',
  'SÉPTIMA',
  'OCTAVA',
  'NOVENA',
  'DÉCIMA',
  'DÉCIMA PRIMERA',
  'DÉCIMA SEGUNDA',
  'DÉCIMA TERCERA',
  'DÉCIMA CUARTA',
  'DÉCIMA QUINTA',
  'DÉCIMA SEXTA',
  'DÉCIMA SÉPTIMA',
  'DÉCIMA OCTAVA',
  'DÉCIMA NOVENA',
  'VIGÉSIMA',
]

/** Datos del cliente que faltan para un acuerdo completo. */
export function datosFaltantes(c: Documento['cliente']) {
  const requeridos: [string, string][] = [
    ['Razón social', c.razon_social || c.nombre],
    ['RUC', c.ruc],
    ['Representante legal', c.contacto_nombre],
    ['Cargo del representante', c.contacto_cargo],
    ['Cédula del representante', c.cedula_representante],
    ['Dirección', c.direccion],
    ['Correo', c.email],
  ]
  return requeridos.filter(([, v]) => !v?.trim()).map(([n]) => n)
}

export function construirAcuerdo(doc: Documento, legal: DatosLegales, hoy = new Date()): Acuerdo {
  const c = doc.cliente
  const v = (x: string | null | undefined) => (x?.trim() ? x.trim() : BLANCO)
  const paquete = doc.paquetes.find((p) => p.recomendado) ?? doc.paquetes[0]
  if (!paquete) throw new Error('La propuesta no tiene paquetes.')
  const calc = paquete.calculo
  const numero = doc.propuesta.numero.replace(/^AIU-/, 'ACU-')
  const usd = (n: number) => formatoUSD(n, 'es')
  const razonCliente = c.razon_social?.trim() || c.nombre
  const proveedor = `${legal.razon_social}, con RUC ${legal.ruc}, a través de su línea de negocio ${legal.linea_negocio}, ${legal.descripcion_linea}`

  let n = 0
  const clausula = (titulo: string) => ({
    tipo: 'clausula' as const,
    texto: `${ORDINALES[n++] ?? `CLÁUSULA ${n}`}. ${titulo}`,
  })

  const lineasCobradas = calc.lineas.filter((l) => !l.desconocido)
  const conVolumen = calc.lineas.filter((l) => l.volumen)
  const hayMensual = calc.mensual.base > 0

  const tablaImplementacion: [string, string][] = [
    ...lineasCobradas.map((l): [string, string] => [
      l.incluido_en
        ? `${l.nombre} (incluido)`
        : l.cantidad > 1
          ? `${l.nombre} × ${l.cantidad}`
          : l.nombre,
      l.incluido_en ? '—' : usd(l.setup),
    ]),
    ...(calc.setup.descuento > 0
      ? ([['Descuento', `-${usd(calc.setup.descuento)}`]] as [string, string][])
      : []),
    ['Subtotal', usd(calc.setup.base)],
    [`IVA ${doc.precios.iva_pct}%`, usd(calc.setup.iva)],
    ['Total implementación', usd(calc.setup.total)],
  ]

  const tablaMensual: [string, string][] = [
    ...lineasCobradas
      .filter((l) => l.mensual > 0)
      .map((l): [string, string] => [l.nombre, usd(l.mensual)]),
    ...calc.lineas
      .filter((l) => l.volumen && l.volumen.cargo > 0)
      .map((l): [string, string] => [
        `Uso adicional estimado: ${miles(l.volumen?.excedente ?? 0)} ${l.volumen?.unidad}`,
        usd(l.volumen?.cargo ?? 0),
      ]),
    ...(calc.usuarios.cargo > 0
      ? ([[`${calc.usuarios.extra} usuarios adicionales`, usd(calc.usuarios.cargo)]] as [
          string,
          string,
        ][])
      : []),
    ...(calc.mensual.descuento > 0
      ? ([['Descuento', `-${usd(calc.mensual.descuento)}`]] as [string, string][])
      : []),
    ['Subtotal mensual', usd(calc.mensual.base)],
    [`IVA ${doc.precios.iva_pct}%`, usd(calc.mensual.iva)],
    ['Total mensual', usd(calc.mensual.total)],
  ]

  const anticipo = Math.round(calc.setup.total * doc.precios.anticipo_pct) / 100
  const saldo = Math.round((calc.setup.total - anticipo) * 100) / 100

  const bloques: Bloque[] = [
    {
      tipo: 'titulo',
      texto:
        'ACUERDO DE PRESTACIÓN DE SERVICIOS DE IMPLEMENTACIÓN DE SISTEMAS CON INTELIGENCIA ARTIFICIAL',
    },
    { tipo: 'subtitulo', texto: `N.º ${numero}` },
    {
      tipo: 'parrafo',
      texto: `En la ciudad de ${legal.ciudad}, a ${fechaLarga(hoy, 'es')}, comparecen a la celebración del presente acuerdo: por una parte, ${proveedor}, legalmente representada por ${legal.representante}, en su calidad de ${legal.cargo}, a quien en adelante se denominará «EL PROVEEDOR»; y, por otra parte, ${razonCliente.toUpperCase()}, con RUC ${v(c.ruc)}, domiciliada en ${v(c.direccion)}${c.ciudad && !c.direccion.toLowerCase().includes(c.ciudad.toLowerCase()) ? `, ${c.ciudad}` : ''}, legalmente representada por ${v(c.contacto_nombre)}, portador(a) de la cédula de ciudadanía N.º ${v(c.cedula_representante)}, en su calidad de ${v(c.contacto_cargo)}, a quien en adelante se denominará «EL CLIENTE». Las partes, libre y voluntariamente, convienen en celebrar el presente acuerdo al tenor de las siguientes cláusulas:`,
    },

    clausula('ANTECEDENTES'),
    {
      tipo: 'parrafo',
      texto: `EL CLIENTE requiere sistemas y herramientas con inteligencia artificial para mejorar su operación comercial y administrativa. Con base en el levantamiento realizado, EL PROVEEDOR presentó la propuesta N.º ${doc.propuesta.numero}, versión ${doc.propuesta.version}, de fecha ${doc.fecha}, cuya opción «${paquete.definicion.nombre}» fue aceptada por EL CLIENTE y forma parte integrante de este acuerdo.`,
    },

    clausula('OBJETO'),
    {
      tipo: 'parrafo',
      texto: `EL PROVEEDOR se obliga a diseñar, configurar, implementar y poner en marcha para EL CLIENTE la solución «${paquete.definicion.nombre}», y a prestar el servicio mensual de soporte y mantenimiento descrito en este acuerdo. La solución comprende:`,
    },
    { tipo: 'vinetas', items: paquete.items.map((i) => `${i.nombre}: ${i.descripcion}`) },

    clausula('ALCANCE Y ENTREGABLES'),
    { tipo: 'parrafo', texto: 'El alcance incluye las siguientes funcionalidades:' },
    {
      tipo: 'vinetas',
      items: paquete.items.flatMap((i) => i.caracteristicas.map((x) => `${x} (${i.nombre})`)),
    },
    {
      tipo: 'parrafo',
      texto: `La solución incluye ${calc.usuarios.incluidos > 0 ? `${calc.usuarios.incluidos} usuarios` : 'los usuarios indicados en la propuesta'}${conVolumen.length ? ` y ${conVolumen.map((l) => `${miles(l.volumen?.incluido ?? 0)} ${l.volumen?.unidad} al mes`).join(', ')}` : ''}. Cualquier funcionalidad, integración o desarrollo no descrito expresamente se considerará adicional y requerirá un acuerdo escrito entre las partes.`,
    },

    clausula('PLAZO DE IMPLEMENTACIÓN'),
    {
      tipo: 'parrafo',
      texto: `EL PROVEEDOR implementará la solución en un plazo estimado de ${calc.semanas} semanas, contado desde la recepción del anticipo y de los accesos e información que EL CLIENTE debe proporcionar. Los retrasos atribuibles a EL CLIENTE extenderán el plazo por el mismo tiempo.`,
    },

    clausula('PRECIO'),
    {
      tipo: 'parrafo',
      texto: `Por la implementación, EL CLIENTE pagará la suma de ${usd(calc.setup.total)} (${montoEnLetras(calc.setup.total)}), IVA incluido, según el siguiente detalle:`,
    },
    { tipo: 'tabla', filas: tablaImplementacion, ultimaNegrita: true },
    ...(hayMensual
      ? ([
          {
            tipo: 'parrafo',
            texto: `Por el servicio mensual de soporte y mantenimiento, EL CLIENTE pagará ${usd(calc.mensual.total)} (${montoEnLetras(calc.mensual.total)}) mensuales, IVA incluido, según el siguiente detalle:`,
          },
          { tipo: 'tabla', filas: tablaMensual, ultimaNegrita: true },
        ] as Bloque[])
      : []),
    ...(conVolumen.length || calc.usuarios.incluidos > 0
      ? ([
          {
            tipo: 'vinetas',
            items: [
              ...conVolumen.map(
                (l) =>
                  `El uso que supere ${miles(l.volumen?.incluido ?? 0)} ${l.volumen?.unidad} al mes se facturará a ${usd(l.volumen?.precio_unidad ?? 0)} más IVA por unidad.`,
              ),
              ...(calc.usuarios.incluidos > 0
                ? [
                    `Cada usuario adicional a los ${calc.usuarios.incluidos} incluidos tendrá un valor de ${usd(doc.precios.precio_usuario_extra)} más IVA al mes.`,
                  ]
                : []),
            ],
          },
        ] as Bloque[])
      : []),

    clausula('FORMA DE PAGO'),
    {
      tipo: 'vinetas',
      items: [
        `Anticipo del ${doc.precios.anticipo_pct}% del valor de implementación, esto es ${usd(anticipo)}, a la firma del presente acuerdo.`,
        `Saldo de ${usd(saldo)} a la entrega y puesta en marcha de la solución.`,
        ...(hayMensual
          ? [
              'La mensualidad se pagará por adelantado dentro de los cinco primeros días de cada mes, a partir de la puesta en marcha.',
              'Los consumos adicionales y usuarios extra se facturarán a mes vencido.',
            ]
          : []),
        'EL PROVEEDOR emitirá las facturas electrónicas correspondientes conforme a la normativa del Servicio de Rentas Internas.',
      ],
    },

    ...(hayMensual
      ? ([
          clausula('SERVICIO MENSUAL DE SOPORTE Y MANTENIMIENTO'),
          {
            tipo: 'parrafo',
            texto: `La mensualidad cubre el alojamiento e infraestructura de la solución, el consumo de inteligencia artificial dentro de los volúmenes incluidos, el soporte técnico, el mantenimiento correctivo y las actualizaciones de las funcionalidades contratadas. El servicio mensual tendrá un plazo mínimo de ${legal.plazo_minimo_meses} meses desde la puesta en marcha y se renovará automáticamente mes a mes, salvo aviso por escrito de cualquiera de las partes con ${legal.dias_preaviso} días de anticipación.`,
          },
          {
            tipo: 'parrafo',
            texto:
              'Si EL CLIENTE incurre en mora de más de quince (15) días en el pago de la mensualidad, EL PROVEEDOR podrá suspender el servicio, previa notificación, hasta que se regularice el pago.',
          },
        ] as Bloque[])
      : []),

    clausula('COSTOS DE TERCEROS'),
    {
      tipo: 'parrafo',
      texto:
        'Son de cargo de EL CLIENTE, salvo pacto expreso en contrario, las tarifas que cobren terceros por conversaciones o plantillas de WhatsApp (Meta), la inversión en pauta publicitaria, los números telefónicos o de WhatsApp dedicados, los dominios y las licencias de software de terceros que EL CLIENTE decida contratar.',
    },

    clausula('OBLIGACIONES DE EL CLIENTE'),
    {
      tipo: 'vinetas',
      items: [
        'Entregar oportunamente la información, accesos y cuentas necesarios para la implementación.',
        'Designar una persona de contacto con capacidad de decisión para validar avances.',
        'Revisar y aprobar los entregables dentro de los cinco (5) días hábiles siguientes a su presentación; transcurrido este plazo sin observaciones, se entenderán aprobados.',
        'Pagar los valores acordados en los plazos establecidos.',
        'Usar la solución conforme a la ley y a las políticas de los servicios de terceros integrados.',
      ],
    },

    clausula('OBLIGACIONES DE EL PROVEEDOR'),
    {
      tipo: 'vinetas',
      items: [
        'Implementar la solución con diligencia profesional y conforme al alcance acordado.',
        'Capacitar al personal que EL CLIENTE designe en el uso de la solución.',
        'Mantener la solución operativa y atender los requerimientos de soporte mientras esté vigente el servicio mensual.',
        'Informar oportunamente cualquier circunstancia que afecte el plazo o el alcance.',
      ],
    },

    clausula('GARANTÍA'),
    {
      tipo: 'parrafo',
      texto: `EL PROVEEDOR corregirá sin costo adicional, durante los ${legal.garantia_dias} días siguientes a la puesta en marcha, cualquier falla atribuible a la implementación. La garantía no cubre fallas causadas por cambios realizados por terceros, por servicios externos o por un uso distinto al acordado.`,
    },

    clausula('PROPIEDAD INTELECTUAL'),
    {
      tipo: 'parrafo',
      texto:
        'La información, datos y contenidos de EL CLIENTE son y seguirán siendo de su exclusiva propiedad. El software, componentes, flujos de automatización, instrucciones de inteligencia artificial, metodologías y demás desarrollos de EL PROVEEDOR son de su propiedad; EL CLIENTE recibe una licencia de uso no exclusiva e intransferible mientras se encuentre vigente el servicio mensual. A la terminación, EL PROVEEDOR entregará a EL CLIENTE una exportación de sus datos en un formato estándar.',
    },

    clausula('CONFIDENCIALIDAD'),
    {
      tipo: 'parrafo',
      texto:
        'Las partes se obligan a mantener reserva sobre la información confidencial a la que accedan con motivo de este acuerdo y a no divulgarla a terceros sin autorización escrita, durante su vigencia y por dos (2) años posteriores a su terminación.',
    },

    clausula('PROTECCIÓN DE DATOS PERSONALES'),
    {
      tipo: 'parrafo',
      texto:
        'En cumplimiento de la Ley Orgánica de Protección de Datos Personales, EL CLIENTE actúa como responsable del tratamiento de los datos personales de sus clientes y contactos, y EL PROVEEDOR como encargado del tratamiento. EL PROVEEDOR tratará dichos datos únicamente para prestar los servicios contratados, conforme a las instrucciones de EL CLIENTE, y aplicará medidas técnicas y organizativas razonables para su seguridad.',
    },

    clausula('TERMINACIÓN'),
    {
      tipo: 'parrafo',
      texto: `El presente acuerdo terminará por: (a) mutuo acuerdo; (b) incumplimiento de cualquiera de las partes no subsanado dentro de los quince (15) días siguientes a la notificación escrita; o (c) decisión de cualquiera de las partes, cumplido el plazo mínimo del servicio mensual, con ${legal.dias_preaviso} días de preaviso. Los valores devengados hasta la fecha de terminación serán exigibles.`,
    },

    clausula('RELACIÓN ENTRE LAS PARTES'),
    {
      tipo: 'parrafo',
      texto:
        'Las partes son independientes. Este acuerdo no crea relación laboral, societaria ni de representación entre ellas ni entre sus respectivos empleados.',
    },

    ...(doc.propuesta.datos.condiciones?.trim()
      ? ([
          clausula('CONDICIONES PARTICULARES'),
          { tipo: 'parrafo', texto: doc.propuesta.datos.condiciones.trim() },
        ] as Bloque[])
      : []),

    clausula('CONTROVERSIAS'),
    {
      tipo: 'parrafo',
      texto: `Las partes procurarán resolver de buena fe cualquier controversia. De no lograrlo, se someterán a mediación en el Centro de Arbitraje y Mediación de la Cámara de Comercio de ${legal.ciudad}; si no se llega a un acuerdo, serán competentes los jueces de la ciudad de ${legal.ciudad}.`,
    },

    clausula('ACEPTACIÓN'),
    {
      tipo: 'parrafo',
      texto:
        'Las partes aceptan el contenido íntegro de este acuerdo y, para constancia, lo suscriben en dos ejemplares de igual tenor y valor, o mediante firma electrónica, en la fecha indicada al inicio.',
    },
    {
      tipo: 'firmas',
      proveedor: [
        legal.representante,
        legal.cargo,
        legal.razon_social,
        `RUC ${legal.ruc}`,
        `Línea de negocio ${legal.linea_negocio}`,
      ],
      cliente: [
        v(c.contacto_nombre),
        v(c.contacto_cargo),
        razonCliente.toUpperCase(),
        `RUC ${v(c.ruc)}`,
        `C.I. ${v(c.cedula_representante)}`,
      ],
    },
  ]

  return { numero, bloques, faltantes: datosFaltantes(c) }
}
