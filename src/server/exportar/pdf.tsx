import 'server-only'
import {
  Document,
  Font,
  Image,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import type { ReactNode } from 'react'
import type { Documento } from '../documento'
import {
  cargarLogo,
  etiquetaVeredicto,
  filasPaquete,
  type Logo,
  lineaCifra,
  lineasRoi,
  usd,
} from './comun'

// Sin cortar palabras con guion: en español y en documentos formales se ve mal.
Font.registerHyphenationCallback((palabra) => [palabra])

function estilos(primario: string, acento: string) {
  return StyleSheet.create({
    pagina: {
      padding: 42,
      paddingBottom: 56,
      fontSize: 10,
      fontFamily: 'Helvetica',
      color: '#1F2433',
      lineHeight: 1.45,
    },
    portada: { padding: 0, fontFamily: 'Helvetica', color: '#FFFFFF', backgroundColor: primario },
    portadaInterior: { flex: 1, padding: 56, justifyContent: 'space-between' },
    portadaTitulo: { fontSize: 30, fontFamily: 'Helvetica-Bold', marginTop: 24, lineHeight: 1.15 },
    portadaCliente: { fontSize: 18, marginTop: 10 },
    portadaMeta: { fontSize: 10, opacity: 0.85, marginTop: 4 },
    franja: { height: 6, backgroundColor: acento, width: 80, marginTop: 20 },
    h1: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: primario, marginBottom: 10 },
    h2: {
      fontSize: 12,
      fontFamily: 'Helvetica-Bold',
      color: '#1F2433',
      marginTop: 12,
      marginBottom: 5,
    },
    parrafo: { marginBottom: 6 },
    tenue: { color: '#626A7D' },
    vineta: { flexDirection: 'row', marginBottom: 3 },
    punto: { width: 10, color: acento },
    tarjeta: {
      borderWidth: 1,
      borderColor: '#E2E5EE',
      borderRadius: 6,
      padding: 10,
      marginBottom: 8,
    },
    etiqueta: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: '#FFFFFF',
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 3,
      alignSelf: 'flex-start',
      marginBottom: 4,
    },
    fila: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#EEF0F5',
      paddingVertical: 4,
    },
    filaTitulo: {
      flexDirection: 'row',
      backgroundColor: '#F4F5F9',
      paddingVertical: 5,
      fontFamily: 'Helvetica-Bold',
    },
    celda: { flex: 3, paddingHorizontal: 4 },
    celdaNum: { flex: 1.2, paddingHorizontal: 4, textAlign: 'right' },
    kpis: { flexDirection: 'row', gap: 8, marginVertical: 8 },
    kpi: { flex: 1, backgroundColor: '#F4F5F9', borderRadius: 6, padding: 10 },
    kpiValor: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: primario },
    kpiNombre: { fontSize: 8, color: '#626A7D', marginTop: 2 },
    barraFondo: { height: 6, backgroundColor: '#E8EAF1', borderRadius: 3, marginTop: 3 },
    pie: {
      position: 'absolute',
      bottom: 24,
      left: 42,
      right: 42,
      fontSize: 8,
      color: '#8A91A3',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  })
}

type E = ReturnType<typeof estilos>

function Vinetas({ items, e }: { items: string[]; e: E }) {
  return (
    <View>
      {items.map((x) => (
        <View key={x} style={e.vineta}>
          <Text style={e.punto}>•</Text>
          <Text style={{ flex: 1 }}>{x}</Text>
        </View>
      ))}
    </View>
  )
}

function Pie({ doc, e }: { doc: Documento; e: E }) {
  return (
    <View style={e.pie} fixed>
      <Text>
        {doc.marca.nombre} · {doc.t.numero} {doc.propuesta.numero}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

function Seccion({ doc, e, children }: { doc: Documento; e: E; children: ReactNode }) {
  return (
    <Page size="A4" style={e.pagina} wrap>
      {children}
      <Pie doc={doc} e={e} />
    </Page>
  )
}

function Portada({ doc, e, logo }: { doc: Documento; e: E; logo: Logo }) {
  const t = doc.t
  return (
    <Page size="A4" style={e.portada}>
      <View style={e.portadaInterior}>
        <View>
          {logo ? (
            <Image
              src={{ data: logo.buffer, format: logo.formato }}
              style={{ width: 140, maxHeight: 60, objectFit: 'contain' }}
            />
          ) : (
            <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold' }}>{doc.marca.nombre}</Text>
          )}
        </View>
        <View>
          <Text style={{ fontSize: 11, opacity: 0.85 }}>
            {doc.idioma === 'en' ? doc.marca.eslogan_en : doc.marca.eslogan_es}
          </Text>
          <Text style={e.portadaTitulo}>{t.propuesta}</Text>
          <View style={e.franja} />
          <Text style={e.portadaCliente}>
            {t.preparado_para}: {doc.cliente.nombre}
          </Text>
          {doc.cliente.contacto_nombre ? (
            <Text style={e.portadaMeta}>{doc.cliente.contacto_nombre}</Text>
          ) : null}
        </View>
        <View>
          <Text style={e.portadaMeta}>
            {t.numero} {doc.propuesta.numero} · {t.fecha}: {doc.fecha}
          </Text>
          <Text style={e.portadaMeta}>
            {t.valida_hasta}: {doc.valida_hasta}
          </Text>
          <Text style={e.portadaMeta}>
            {[doc.marca.email, doc.marca.telefono, doc.marca.sitio_web].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
    </Page>
  )
}

function Diagnostico({ doc, e }: { doc: Documento; e: E }) {
  const a = doc.analisis
  if (!a) return null
  const t = doc.t
  const colorSev = { alta: '#D6336C', media: '#F08C00', baja: '#2F9E44' }
  return (
    <>
      <Seccion doc={doc} e={e}>
        <Text style={e.h1}>{t.resumen}</Text>
        <Text style={e.parrafo}>{a.resumen_ejecutivo}</Text>
        <Text style={e.h2}>{t.lo_que_entendimos}</Text>
        <Text style={e.parrafo}>{a.negocio.descripcion}</Text>
        <Text style={[e.parrafo, e.tenue]}>
          {a.negocio.industria} · {a.negocio.modelo_de_negocio} · {a.negocio.tamano}
        </Text>
        <Text style={e.h2}>
          {t.madurez}: {Math.round(a.madurez_digital.puntaje)}/100
        </Text>
        {a.madurez_digital.areas.map((area) => (
          <View key={area.area} style={{ marginBottom: 6 }} wrap={false}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>
              {area.area} · {area.puntaje}/5
            </Text>
            <View style={e.barraFondo}>
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  width: `${Math.min(100, (area.puntaje / 5) * 100)}%`,
                  backgroundColor: doc.marca.color_acento,
                }}
              />
            </View>
            {area.falta.length > 0 ? (
              <Text style={[e.tenue, { fontSize: 9, marginTop: 2 }]}>
                {t.falta}: {area.falta.join(', ')}
              </Text>
            ) : null}
          </View>
        ))}
      </Seccion>

      <Seccion doc={doc} e={e}>
        <Text style={e.h1}>{t.dolores}</Text>
        {(['explicito', 'oculto'] as const).map((tipo) => {
          const lista = a.dolores.filter((d) => d.tipo === tipo)
          if (lista.length === 0) return null
          return (
            <View key={tipo}>
              <Text style={e.h2}>
                {tipo === 'explicito' ? t.dolores_explicitos : t.dolores_ocultos}
              </Text>
              {lista.map((d) => (
                <View key={d.titulo} style={e.tarjeta} wrap={false}>
                  <Text style={[e.etiqueta, { backgroundColor: colorSev[d.severidad] }]}>
                    {t[d.severidad].toUpperCase()}
                  </Text>
                  <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>{d.titulo}</Text>
                  <Text>{d.descripcion}</Text>
                  <Text style={[e.tenue, { marginTop: 3 }]}>
                    {t.impacto_mes}: {lineaCifra(d.impacto, doc)}
                  </Text>
                  <Text style={[e.tenue, { marginTop: 2, fontSize: 9 }]}>
                    {t.costo_no_actuar}: {d.costo_de_no_actuar}
                  </Text>
                </View>
              ))}
            </View>
          )
        })}
      </Seccion>

      <Seccion doc={doc} e={e}>
        <Text style={e.h1}>{t.solucion}</Text>
        {a.soluciones.map((s) => (
          <View key={s.titulo} style={e.tarjeta} wrap={false}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
              {s.titulo}
              {s.a_medida ? ` · ${t.a_medida}` : ''}
            </Text>
            <Text>{s.descripcion}</Text>
            <Text style={[e.tenue, { marginTop: 3 }]}>{s.beneficio}</Text>
            <Text style={[e.tenue, { fontSize: 9 }]}>
              {t.indicador}: {s.indicador}
            </Text>
          </View>
        ))}
        <Text style={e.h2}>{t.arquitectura}</Text>
        <Text style={e.parrafo}>{a.arquitectura.descripcion}</Text>
        <Vinetas items={a.arquitectura.componentes.map((c) => `${c.nombre}: ${c.funcion}`)} e={e} />
        <Text style={e.h2}>{t.flujo}</Text>
        <Vinetas items={a.arquitectura.flujo.map((paso, i) => `${i + 1}. ${paso}`)} e={e} />
      </Seccion>

      <Seccion doc={doc} e={e}>
        <Text style={e.h1}>{t.viabilidad}</Text>
        <View style={e.kpis}>
          {(['tecnica', 'economica', 'operativa'] as const).map((k) => (
            <View key={k} style={e.kpi}>
              <Text style={e.kpiValor}>{a.viabilidad[k].puntaje}/10</Text>
              <Text style={e.kpiNombre}>{t[k]}</Text>
            </View>
          ))}
        </View>
        <Text style={[e.parrafo, { fontFamily: 'Helvetica-Bold' }]}>
          {t.veredicto}: {etiquetaVeredicto(doc)}
        </Text>
        {(['tecnica', 'economica', 'operativa'] as const).map((k) => (
          <Text key={k} style={e.parrafo}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{t[k]}: </Text>
            {a.viabilidad[k].justificacion}
          </Text>
        ))}
        {a.viabilidad.condiciones.length > 0 ? (
          <>
            <Text style={e.h2}>{t.condiciones}</Text>
            <Vinetas items={a.viabilidad.condiciones} e={e} />
          </>
        ) : null}
        <Text style={e.h2}>{t.riesgos}</Text>
        <Vinetas items={a.viabilidad.riesgos.map((r) => `${r.riesgo} → ${r.mitigacion}`)} e={e} />
        <Text style={e.h2}>{t.roi}</Text>
        <Vinetas items={lineasRoi(doc)} e={e} />
        <Text style={[e.tenue, { fontSize: 9 }]}>{a.roi.explicacion}</Text>
      </Seccion>
    </>
  )
}

function Inversion({ doc, e }: { doc: Documento; e: E }) {
  const t = doc.t
  return (
    <Seccion doc={doc} e={e}>
      <Text style={e.h1}>{t.paquetes}</Text>
      {doc.paquetes.map((p, i) => (
        <View
          key={p.definicion.nivel}
          style={[
            e.tarjeta,
            p.recomendado ? { borderColor: doc.marca.color_primario, borderWidth: 2 } : {},
          ]}
          wrap={false}
        >
          {p.recomendado ? (
            <Text style={[e.etiqueta, { backgroundColor: doc.marca.color_primario }]}>
              {t.recomendado.toUpperCase()}
            </Text>
          ) : null}
          <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold' }}>{p.definicion.nombre}</Text>
          <Text style={[e.tenue, { marginBottom: 6 }]}>{p.definicion.propuesta_valor}</Text>
          <View style={e.filaTitulo}>
            <Text style={e.celda}>{t.concepto}</Text>
            <Text style={e.celdaNum}>{t.setup}</Text>
            <Text style={e.celdaNum}>{t.mensual}</Text>
          </View>
          {filasPaquete(doc, i).map((f) => (
            <View key={f.concepto} style={e.fila}>
              <Text style={e.celda}>{f.concepto}</Text>
              <Text style={e.celdaNum}>{f.setup}</Text>
              <Text style={e.celdaNum}>{f.mensual}</Text>
            </View>
          ))}
          {p.calculo.setup.descuento > 0 || p.calculo.mensual.descuento > 0 ? (
            <View style={e.fila}>
              <Text style={e.celda}>{t.descuento}</Text>
              <Text style={e.celdaNum}>-{usd(p.calculo.setup.descuento, doc)}</Text>
              <Text style={e.celdaNum}>-{usd(p.calculo.mensual.descuento, doc)}</Text>
            </View>
          ) : null}
          <View style={e.fila}>
            <Text style={e.celda}>{t.subtotal}</Text>
            <Text style={e.celdaNum}>{usd(p.calculo.setup.base, doc)}</Text>
            <Text style={e.celdaNum}>{usd(p.calculo.mensual.base, doc)}</Text>
          </View>
          <View style={e.fila}>
            <Text style={e.celda}>
              {t.iva} {doc.precios.iva_pct}%
            </Text>
            <Text style={e.celdaNum}>{usd(p.calculo.setup.iva, doc)}</Text>
            <Text style={e.celdaNum}>{usd(p.calculo.mensual.iva, doc)}</Text>
          </View>
          <View style={[e.fila, { borderBottomWidth: 0 }]}>
            <Text style={[e.celda, { fontFamily: 'Helvetica-Bold' }]}>{t.total}</Text>
            <Text style={[e.celdaNum, { fontFamily: 'Helvetica-Bold' }]}>
              {usd(p.calculo.setup.total, doc)}
            </Text>
            <Text style={[e.celdaNum, { fontFamily: 'Helvetica-Bold' }]}>
              {usd(p.calculo.mensual.total, doc)}
            </Text>
          </View>
          <Text style={[e.tenue, { fontSize: 9, marginTop: 4 }]}>
            {p.calculo.usuarios.incluidos > 0
              ? `${p.calculo.usuarios.incluidos} ${t.usuarios} · `
              : ''}
            {p.calculo.semanas} {t.semanas}
          </Text>
        </View>
      ))}
      <Text style={e.h2}>{t.condiciones_comerciales}</Text>
      <Vinetas
        items={[
          `${doc.precios.anticipo_pct}% ${t.anticipo}`,
          t.mensualidad_nota,
          `${t.precios_iva} ${doc.precios.iva_pct}%.`,
          `${t.valida_hasta}: ${doc.valida_hasta}.`,
          ...(doc.propuesta.datos.condiciones ? [doc.propuesta.datos.condiciones] : []),
        ]}
        e={e}
      />
    </Seccion>
  )
}

function Plan({ doc, e }: { doc: Documento; e: E }) {
  const a = doc.analisis
  if (!a) return null
  const t = doc.t
  return (
    <Seccion doc={doc} e={e}>
      <Text style={e.h1}>{t.plan}</Text>
      {a.plan.map((f) => (
        <View key={f.fase} style={e.tarjeta} wrap={false}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>
            {t.fase} {f.fase}: {f.nombre} · {f.semanas} {t.semanas}
          </Text>
          <Vinetas items={f.entregables} e={e} />
        </View>
      ))}
      <Text style={e.h2}>{t.siguiente_paso}</Text>
      <Text style={e.parrafo}>{a.siguiente_paso}</Text>
      <Text style={[e.h2, { marginTop: 24 }]}>{t.contacto}</Text>
      <Text>{doc.marca.nombre}</Text>
      <Text style={e.tenue}>
        {[doc.marca.email, doc.marca.telefono, doc.marca.sitio_web, doc.marca.direccion]
          .filter(Boolean)
          .join(' · ')}
      </Text>
    </Seccion>
  )
}

export async function generarPdf(doc: Documento): Promise<Buffer> {
  const e = estilos(doc.marca.color_primario, doc.marca.color_acento)
  const logo = await cargarLogo(doc.marca.logo_url)
  return renderToBuffer(
    <Document
      title={`${doc.t.propuesta} ${doc.propuesta.numero}`}
      author={doc.marca.nombre}
      language={doc.idioma}
    >
      <Portada doc={doc} e={e} logo={logo} />
      <Diagnostico doc={doc} e={e} />
      <Inversion doc={doc} e={e} />
      <Plan doc={doc} e={e} />
    </Document>,
  )
}
