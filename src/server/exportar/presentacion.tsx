import 'server-only'
import { Document, Font, Image, Page, renderToBuffer, Text, View } from '@react-pdf/renderer'
import type { ReactNode } from 'react'
import { formula } from '@/lib/analisis'
import { cierreEfectivo, montosPagos } from '@/lib/pagos'
import type { Documento } from '../documento'
import { cargarLogo, etiquetaVeredicto, type Logo, lineaCifra, usd } from './comun'

/**
 * La presentación de la reunión como PDF horizontal (16:9), para enviarla al
 * cliente después de la reunión o junto con el acuerdo. Sigue las mismas
 * diapositivas que el PowerPoint; si ya hay cierre, agrega "Lo acordado".
 */

Font.registerHyphenationCallback((palabra) => [palabra])

// 13,33 × 7,5 pulgadas, igual que LAYOUT_WIDE del PowerPoint.
const ANCHO = 960
const ALTO = 540
const ENCABEZADO = 76
const PIE = 30
const TINTA = '#1F2433'
const TENUE = '#626A7D'
const BORDE = '#E2E5EE'
const SUAVE = '#F4F5F9'
const ALERTA = '#D6336C'

type Colores = { primario: string; acento: string; lila: string }

const TEXTOS = {
  es: {
    acordado: 'Lo acordado',
    elegido: 'Elegido',
    plan_pagos: 'Plan de pagos de la implementación',
    version: 'versión',
    mes: 'mes',
    iva_incluido: 'IVA incluido',
  },
  en: {
    acordado: 'Agreed terms',
    elegido: 'Selected',
    plan_pagos: 'Implementation payment plan',
    version: 'version',
    mes: 'mo',
    iva_incluido: 'VAT included',
  },
}

function Diapositiva({
  doc,
  c,
  logo,
  titulo,
  children,
}: {
  doc: Documento
  c: Colores
  logo: Logo
  titulo: string
  children: ReactNode
}) {
  return (
    <Page
      size={[ANCHO, ALTO]}
      wrap={false}
      style={{ fontFamily: 'Helvetica', color: TINTA, fontSize: 11 }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 13,
          backgroundColor: c.primario,
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 24,
          paddingHorizontal: 43,
          height: ENCABEZADO,
        }}
      >
        <Text style={{ fontSize: 24, fontFamily: 'Helvetica-Bold', flex: 1 }}>{titulo}</Text>
        {logo ? (
          <Image
            src={{ data: logo.buffer, format: logo.formato }}
            style={{ width: 100, height: 40, objectFit: 'contain' }}
          />
        ) : null}
      </View>
      {/* Alturas fijas: con flex o posición absoluta react-pdf ubica mal el pie en páginas sin salto. */}
      <View style={{ height: ALTO - ENCABEZADO - PIE, paddingHorizontal: 43 }}>{children}</View>
      <Text
        style={{ height: PIE, paddingHorizontal: 43, paddingTop: 8, fontSize: 8, color: '#8A91A3' }}
      >
        {doc.marca.nombre} · {doc.t.numero} {doc.propuesta.numero}
      </Text>
    </Page>
  )
}

function Portada({
  doc,
  c,
  logo,
  titulo,
  subtitulo,
  pie,
}: {
  doc: Documento
  c: Colores
  logo: Logo
  titulo: string
  subtitulo: string
  pie: string
}) {
  return (
    <Page
      size={[ANCHO, ALTO]}
      wrap={false}
      style={{ backgroundColor: c.primario, color: '#FFFFFF' }}
    >
      <View style={{ height: ALTO, padding: 58, justifyContent: 'space-between' }}>
        {logo ? (
          <Image
            src={{ data: logo.buffer, format: logo.formato }}
            style={{ width: 170, height: 64, objectFit: 'contain', objectPosition: 'left' }}
          />
        ) : (
          <Text style={{ fontSize: 28, fontFamily: 'Helvetica-Bold' }}>{doc.marca.nombre}</Text>
        )}
        <View>
          <Text style={{ fontSize: 15, color: c.lila }}>
            {doc.idioma === 'en' ? doc.marca.eslogan_en : doc.marca.eslogan_es}
          </Text>
          <Text style={{ fontSize: 44, fontFamily: 'Helvetica-Bold', marginTop: 6 }}>{titulo}</Text>
          <View style={{ height: 7, width: 86, backgroundColor: c.acento, marginVertical: 16 }} />
          <Text style={{ fontSize: 20 }}>{subtitulo}</Text>
        </View>
        <Text style={{ fontSize: 11, color: c.lila }}>{pie}</Text>
      </View>
    </Page>
  )
}

function Tarjeta({
  children,
  borde = BORDE,
  grosor = 1,
  fondo = '#FFFFFF',
  style,
}: {
  children: ReactNode
  borde?: string
  grosor?: number
  fondo?: string
  style?: Record<string, unknown>
}) {
  return (
    <View
      style={{
        borderWidth: grosor,
        borderColor: borde,
        borderRadius: 6,
        backgroundColor: fondo,
        padding: 10,
        ...style,
      }}
    >
      {children}
    </View>
  )
}

function Vinetas({ items, c, tamano = 11 }: { items: string[]; c: Colores; tamano?: number }) {
  return (
    <View>
      {items.map((x, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: PDF estático, el orden no cambia
        <View key={`${i}-${x}`} style={{ flexDirection: 'row', marginBottom: 4 }}>
          <Text style={{ width: 12, color: c.acento, fontSize: tamano }}>•</Text>
          <Text style={{ flex: 1, fontSize: tamano }}>{x}</Text>
        </View>
      ))}
    </View>
  )
}

/** Filas de 2 o 3 columnas con el mismo ancho. */
function Rejilla<T>({
  items,
  columnas,
  alto,
  celda,
}: {
  items: T[]
  columnas: number
  alto: number
  celda: (item: T) => ReactNode
}) {
  const filas: T[][] = []
  for (let i = 0; i < items.length; i += columnas) filas.push(items.slice(i, i + columnas))
  return (
    <View style={{ gap: 10 }}>
      {filas.map((fila, f) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: PDF estático, el orden no cambia
        <View key={f} style={{ flexDirection: 'row', gap: 12, height: alto }}>
          {fila.map((item, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: PDF estático, el orden no cambia
            <View key={i} style={{ flex: 1 }}>
              {celda(item)}
            </View>
          ))}
          {Array.from({ length: columnas - fila.length }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: PDF estático, el orden no cambia
            <View key={`v${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  )
}

function FilaMonto({
  concepto,
  valor,
  fuerte,
}: {
  concepto: string
  valor: string
  fuerte?: boolean
}) {
  const estilo = fuerte ? { fontFamily: 'Helvetica-Bold' } : {}
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#EEF0F5',
        paddingVertical: 4,
      }}
    >
      <Text style={estilo}>{concepto}</Text>
      <Text style={estilo}>{valor}</Text>
    </View>
  )
}

export async function generarPresentacion(doc: Documento): Promise<Buffer> {
  const t = doc.t
  const x = TEXTOS[doc.idioma]
  const a = doc.analisis
  const c: Colores = {
    primario: doc.marca.color_primario,
    acento: doc.marca.color_acento,
    lila: '#E6E1FF',
  }
  const logo = await cargarLogo(doc.marca.logo_url)
  const props = { doc, c, logo }
  const mes = x.mes

  // Con cierre, la opción que eligió el cliente reemplaza a la recomendada.
  const cierre = doc.propuesta.cierre
    ? cierreEfectivo(doc.propuesta.cierre, doc.propuesta.datos, doc.precios.anticipo_pct)
    : null
  const elegido = cierre ? doc.paquetes.find((p) => p.definicion.nivel === cierre.paquete) : null

  const diapositivas: ReactNode[] = []

  if (a) {
    diapositivas.push(
      <Diapositiva key="resumen" {...props} titulo={t.resumen}>
        <View style={{ flexDirection: 'row', gap: 24, flex: 1 }}>
          <Text style={{ flex: 1.7, fontSize: 16, lineHeight: 1.45 }}>{a.resumen_ejecutivo}</Text>
          <Tarjeta style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', color: c.primario, marginBottom: 6 }}>
              {t.lo_que_entendimos}
            </Text>
            <Text style={{ fontSize: 10.5 }}>{a.negocio.descripcion}</Text>
            <Text style={{ fontSize: 10, color: TENUE, marginTop: 8 }}>
              {a.negocio.industria} · {a.negocio.tamano}
            </Text>
          </Tarjeta>
        </View>
      </Diapositiva>,
    )

    diapositivas.push(
      <Diapositiva
        key="madurez"
        {...props}
        titulo={`${t.madurez}: ${Math.round(a.madurez_digital.puntaje)}/100`}
      >
        {a.madurez_digital.areas.slice(0, 6).map((area) => (
          <View
            key={area.area}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 62 }}
          >
            <Text style={{ width: 180, fontSize: 13, fontFamily: 'Helvetica-Bold' }}>
              {area.area}
            </Text>
            <View style={{ width: 280, height: 14, backgroundColor: '#E8EAF1', borderRadius: 7 }}>
              <View
                style={{
                  width: Math.max(8, (280 * area.puntaje) / 5),
                  height: 14,
                  backgroundColor: c.acento,
                  borderRadius: 7,
                }}
              />
            </View>
            <Text style={{ width: 36, color: TENUE }}>{area.puntaje}/5</Text>
            <Text style={{ flex: 1, fontSize: 9.5, color: TENUE }}>
              {area.falta.slice(0, 3).join(' · ')}
            </Text>
          </View>
        ))}
      </Diapositiva>,
    )

    for (const tipo of ['explicito', 'oculto'] as const) {
      const lista = a.dolores.filter((d) => d.tipo === tipo).slice(0, 6)
      if (!lista.length) continue
      diapositivas.push(
        <Diapositiva
          key={`dolores-${tipo}`}
          {...props}
          titulo={tipo === 'explicito' ? t.dolores_explicitos : t.dolores_ocultos}
        >
          <Rejilla
            items={lista}
            columnas={3}
            alto={196}
            celda={(d) => (
              <Tarjeta
                borde={d.severidad === 'alta' ? ALERTA : BORDE}
                grosor={d.severidad === 'alta' ? 1.5 : 1}
                style={{ height: '100%' }}
              >
                <Text style={{ fontSize: 12.5, fontFamily: 'Helvetica-Bold', marginBottom: 5 }}>
                  {d.titulo}
                </Text>
                <Text style={{ fontSize: 9.5, flex: 1 }}>{d.descripcion}</Text>
                <Text
                  style={{
                    fontSize: 8.5,
                    color: d.impacto.valor !== null ? ALERTA : TENUE,
                    fontFamily: d.impacto.valor !== null ? 'Helvetica-Bold' : 'Helvetica',
                  }}
                >
                  {lineaCifra(d.impacto, doc)}
                </Text>
              </Tarjeta>
            )}
          />
        </Diapositiva>,
      )
    }

    diapositivas.push(
      <Diapositiva key="solucion" {...props} titulo={t.solucion}>
        <Rejilla
          items={a.soluciones.slice(0, 6)}
          columnas={2}
          alto={128}
          celda={(s) => (
            <Tarjeta style={{ height: '100%' }}>
              <Text style={{ fontSize: 12.5, fontFamily: 'Helvetica-Bold', color: c.primario }}>
                {s.titulo}
              </Text>
              <Text style={{ fontSize: 9.5, marginTop: 4, flex: 1 }}>{s.descripcion}</Text>
              <Text style={{ fontSize: 8.5, color: TENUE }}>
                {t.indicador}: {s.indicador}
              </Text>
            </Tarjeta>
          )}
        />
      </Diapositiva>,
    )

    diapositivas.push(
      <Diapositiva key="arquitectura" {...props} titulo={t.arquitectura}>
        <Text style={{ fontSize: 13 }}>{a.arquitectura.descripcion}</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginVertical: 16, height: 118 }}>
          {a.arquitectura.flujo.slice(0, 6).map((paso, i) => (
            <Tarjeta
              key={`paso-${paso}`}
              fondo={i % 2 ? SUAVE : '#EFEBFF'}
              style={{ flex: 1, height: '100%' }}
            >
              <Text style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', color: c.primario }}>
                {i + 1}
              </Text>
              <Text style={{ fontSize: 9.5, marginTop: 3 }}>{paso}</Text>
            </Tarjeta>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 24 }}>
          <View style={{ flex: 1.7 }}>
            <Vinetas
              c={c}
              tamano={10}
              items={a.arquitectura.componentes.slice(0, 6).map((k) => `${k.nombre}: ${k.funcion}`)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', color: TENUE }}>{t.integraciones}</Text>
            <Text style={{ fontSize: 10, color: TENUE, marginTop: 3 }}>
              {a.arquitectura.integraciones.join(', ')}
            </Text>
          </View>
        </View>
      </Diapositiva>,
    )

    const kpis: [string, string][] = [
      ...a.roi.componentes
        .filter((k) => k.calculo.valor !== null)
        .slice(0, 3)
        .map((k): [string, string] => [
          `${usd(k.calculo.valor ?? 0, doc)}/${mes}`,
          `${k.concepto} = ${formula(k.calculo, doc.idioma)}`,
        ]),
      ...(a.roi.horas.valor !== null
        ? [
            [
              `${Math.round(a.roi.horas.valor)} h`,
              `${t.horas_mes} = ${formula(a.roi.horas, doc.idioma)}`,
            ] as [string, string],
          ]
        : []),
      ...(doc.recuperacion_meses
        ? [[`${doc.recuperacion_meses} ${t.meses}`, t.recuperacion] as [string, string]]
        : []),
    ]
    diapositivas.push(
      <Diapositiva key="viabilidad" {...props} titulo={t.viabilidad}>
        <View style={{ flexDirection: 'row', gap: 28, flex: 1 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['tecnica', 'economica', 'operativa'] as const).map((k) => (
                <Tarjeta
                  key={k}
                  fondo={SUAVE}
                  borde={SUAVE}
                  style={{ flex: 1, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 24, fontFamily: 'Helvetica-Bold', color: c.primario }}>
                    {a.viabilidad[k].puntaje}/10
                  </Text>
                  <Text style={{ color: TENUE }}>{t[k]}</Text>
                </Tarjeta>
              ))}
            </View>
            <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', marginVertical: 12 }}>
              {t.veredicto}: {etiquetaVeredicto(doc)}
            </Text>
            <Vinetas
              c={c}
              tamano={10}
              items={a.viabilidad.riesgos.slice(0, 4).map((r) => `${r.riesgo} → ${r.mitigacion}`)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 8 }}>
              {t.roi}
            </Text>
            {kpis.map(([valor, nombre]) => (
              <Tarjeta
                key={nombre}
                fondo="#EFEBFF"
                borde="#EFEBFF"
                style={{ marginBottom: 8, paddingVertical: 8 }}
              >
                <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: c.primario }}>
                  {valor}
                </Text>
                <Text style={{ fontSize: 9, color: TENUE }}>{nombre}</Text>
              </Tarjeta>
            ))}
          </View>
        </View>
      </Diapositiva>,
    )
  }

  diapositivas.push(
    <Diapositiva key="paquetes" {...props} titulo={t.paquetes}>
      <View style={{ flexDirection: 'row', gap: 16, flex: 1 }}>
        {doc.paquetes.map((p) => {
          const destacado = elegido ? p === elegido : p.recomendado
          return (
            <Tarjeta
              key={p.definicion.nivel}
              borde={destacado ? c.primario : BORDE}
              grosor={destacado ? 2.5 : 1}
              style={{ flex: 1, padding: 12 }}
            >
              <View style={{ height: 20 }}>
                {destacado ? (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: c.primario,
                      paddingVertical: 3,
                      paddingHorizontal: 8,
                      borderRadius: 3,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 8, fontFamily: 'Helvetica-Bold' }}>
                      {(elegido ? x.elegido : t.recomendado).toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', marginTop: 4 }}>
                {p.definicion.nombre}
              </Text>
              <Text style={{ fontSize: 9, color: TENUE, marginTop: 4, height: 50 }}>
                {p.definicion.propuesta_valor}
              </Text>
              <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: c.primario }}>
                {usd(p.calculo.setup.base, doc)}
              </Text>
              <Text style={{ fontSize: 8.5, color: TENUE }}>
                {t.implementacion} + {t.iva}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', marginVertical: 6 }}>
                {p.calculo.mensual.base
                  ? `+ ${usd(p.calculo.mensual.base, doc)} / ${doc.idioma === 'en' ? 'month' : 'mes'}`
                  : t.pago_unico}
              </Text>
              <Vinetas c={c} tamano={9.5} items={p.items.map((i) => i.nombre)} />
            </Tarjeta>
          )
        })}
      </View>
      <Text style={{ fontSize: 8.5, color: TENUE, marginTop: 8 }}>
        {t.precios_iva} {doc.precios.iva_pct}%{' '}
        {doc.idioma === 'en' ? 'not included' : 'no incluido'}.{' '}
        {cierre ? '' : `${t.valida_hasta}: ${doc.valida_hasta}.`}
      </Text>
    </Diapositiva>,
  )

  if (a) {
    diapositivas.push(
      <Diapositiva key="plan" {...props} titulo={t.plan}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {a.plan.slice(0, 5).map((f, i) => (
            <View key={`${f.fase}-${f.nombre}`} style={{ flex: 1 }}>
              <View
                style={{
                  height: 6,
                  backgroundColor: i === 0 ? c.acento : c.primario,
                  marginBottom: 8,
                }}
              />
              <Text style={{ fontSize: 9, color: TENUE }}>
                {t.fase} {f.fase} · {f.semanas} {t.semanas}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', marginVertical: 6 }}>
                {f.nombre}
              </Text>
              <Vinetas c={c} tamano={9.5} items={f.entregables.slice(0, 5)} />
            </View>
          ))}
        </View>
      </Diapositiva>,
    )
  }

  if (cierre && elegido) {
    const s = elegido.calculo.setup
    const m = elegido.calculo.mensual
    const pagos = montosPagos(cierre.pagos, s.total)
    diapositivas.push(
      <Diapositiva key="acordado" {...props} titulo={x.acordado}>
        <Text
          style={{ fontSize: 17, fontFamily: 'Helvetica-Bold', color: c.primario, marginBottom: 6 }}
        >
          {elegido.definicion.nombre}
        </Text>
        <Text style={{ fontSize: 10, color: TENUE, marginBottom: 14 }}>
          {elegido.items.map((i) => i.nombre).join(' · ')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <Tarjeta style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>
              {t.implementacion}
            </Text>
            <FilaMonto concepto={t.subtotal} valor={usd(s.base, doc)} />
            <FilaMonto concepto={`${t.iva} ${doc.precios.iva_pct}%`} valor={usd(s.iva, doc)} />
            <FilaMonto
              concepto={`${t.total} (${x.iva_incluido})`}
              valor={usd(s.total, doc)}
              fuerte
            />
          </Tarjeta>
          <Tarjeta style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>{t.mensualidad}</Text>
            {m.total ? (
              <>
                <FilaMonto concepto={t.subtotal} valor={usd(m.base, doc)} />
                <FilaMonto concepto={`${t.iva} ${doc.precios.iva_pct}%`} valor={usd(m.iva, doc)} />
                <FilaMonto
                  concepto={`${t.total} (${x.iva_incluido})`}
                  valor={`${usd(m.total, doc)} / ${mes}`}
                  fuerte
                />
              </>
            ) : (
              <Text style={{ color: TENUE }}>{t.pago_unico}</Text>
            )}
          </Tarjeta>
          <Tarjeta style={{ flex: 1.25 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>{x.plan_pagos}</Text>
            {pagos
              .map((d, i) => ({ ...d, n: i + 1 }))
              .map((d) => (
                <FilaMonto key={d.n} concepto={`${d.n}. ${d.concepto}`} valor={usd(d.monto, doc)} />
              ))}
          </Tarjeta>
        </View>
        {m.total ? (
          <Text style={{ fontSize: 9, color: TENUE, marginTop: 12 }}>{t.mensualidad_nota}</Text>
        ) : null}
      </Diapositiva>,
    )
  }

  const contacto = [doc.marca.nombre, doc.marca.email, doc.marca.telefono, doc.marca.sitio_web]
    .filter(Boolean)
    .join('   ·   ')

  const archivo = (
    <Document
      title={`${t.propuesta} ${doc.propuesta.numero}`}
      author={doc.marca.nombre}
      subject={doc.cliente.nombre}
    >
      <Portada
        {...props}
        titulo={t.propuesta}
        subtitulo={`${t.preparado_para}: ${doc.cliente.nombre}`}
        pie={`${t.numero} ${doc.propuesta.numero} · ${x.version} ${doc.propuesta.version} · ${doc.fecha}`}
      />
      {diapositivas}
      <Portada
        {...props}
        titulo={a ? t.siguiente_paso : t.gracias}
        subtitulo={a ? a.siguiente_paso : ''}
        pie={contacto}
      />
    </Document>
  )
  return renderToBuffer(archivo)
}
