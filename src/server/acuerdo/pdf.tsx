import 'server-only'
import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Acuerdo } from './contenido'

// Sin cortar palabras con guion: en español y en documentos formales se ve mal.
Font.registerHyphenationCallback((palabra) => [palabra])

const e = StyleSheet.create({
  pagina: {
    paddingTop: 56,
    paddingBottom: 60,
    paddingHorizontal: 64,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
    color: '#111111',
  },
  titulo: { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  subtitulo: { textAlign: 'center', marginBottom: 18 },
  clausula: { fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 4 },
  parrafo: { textAlign: 'justify', marginBottom: 6 },
  vineta: { flexDirection: 'row', marginBottom: 3, paddingLeft: 8 },
  punto: { width: 10 },
  tabla: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#BBBBBB', marginVertical: 6 },
  fila: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#DDDDDD',
    paddingVertical: 3,
  },
  concepto: { flex: 3, paddingHorizontal: 4 },
  valor: { flex: 1, paddingHorizontal: 4, textAlign: 'right' },
  firmas: { flexDirection: 'row', gap: 32, marginTop: 56 },
  firma: { flex: 1 },
  pie: {
    position: 'absolute',
    bottom: 28,
    left: 64,
    right: 64,
    fontSize: 8,
    color: '#888888',
    textAlign: 'center',
  },
})

export async function acuerdoPdf(a: Acuerdo): Promise<Buffer> {
  return renderToBuffer(
    <Document
      title={`Acuerdo ${a.numero}`}
      author="321 SOLUCIONES INMOBILIARIAS S.A.S."
      language="es"
    >
      <Page size="A4" style={e.pagina} wrap>
        {a.bloques.map((b, i) => {
          const clave = `${b.tipo}-${i}`
          if (b.tipo === 'titulo')
            return (
              <Text key={clave} style={e.titulo}>
                {b.texto}
              </Text>
            )
          if (b.tipo === 'subtitulo')
            return (
              <Text key={clave} style={e.subtitulo}>
                {b.texto}
              </Text>
            )
          if (b.tipo === 'clausula')
            return (
              <Text key={clave} style={e.clausula} minPresenceAhead={40}>
                {b.texto}
              </Text>
            )
          if (b.tipo === 'parrafo')
            return (
              <Text key={clave} style={e.parrafo}>
                {b.texto}
              </Text>
            )
          if (b.tipo === 'vinetas')
            return (
              <View key={clave}>
                {b.items.map((item) => (
                  <View key={item} style={e.vineta}>
                    <Text style={e.punto}>•</Text>
                    <Text style={[e.parrafo, { flex: 1, marginBottom: 0 }]}>{item}</Text>
                  </View>
                ))}
              </View>
            )
          if (b.tipo === 'tabla')
            return (
              <View key={clave} style={e.tabla} wrap={false}>
                {b.filas.map(([concepto, valor], j) => {
                  const negrita =
                    b.ultimaNegrita && j === b.filas.length - 1
                      ? { fontFamily: 'Helvetica-Bold' }
                      : {}
                  return (
                    <View
                      key={concepto}
                      style={[e.fila, j === b.filas.length - 1 ? { borderBottomWidth: 0 } : {}]}
                    >
                      <Text style={[e.concepto, negrita]}>{concepto}</Text>
                      <Text style={[e.valor, negrita]}>{valor}</Text>
                    </View>
                  )
                })}
              </View>
            )
          return (
            <View key={clave} style={e.firmas} wrap={false}>
              {(
                [
                  ['EL PROVEEDOR', b.proveedor],
                  ['EL CLIENTE', b.cliente],
                ] as const
              ).map(([titulo, lineas]) => (
                <View key={titulo} style={e.firma}>
                  <Text>_______________________________</Text>
                  {lineas.map((l, j) => (
                    <Text key={l} style={j === 0 ? { fontFamily: 'Helvetica-Bold' } : {}}>
                      {l}
                    </Text>
                  ))}
                  <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 4 }}>{titulo}</Text>
                </View>
              ))}
            </View>
          )
        })}
        <Text
          style={e.pie}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Acuerdo ${a.numero} · Página ${pageNumber} de ${totalPages}`
          }
        />
      </Page>
    </Document>,
  )
}
