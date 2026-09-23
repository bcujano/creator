import type { NextConfig } from 'next'

const CABECERAS_SEGURIDAD = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Librerías de exportación y extracción: se cargan tal cual en Node, sin empaquetar.
  serverExternalPackages: ['@react-pdf/renderer', 'exceljs', 'unpdf', 'mammoth'],
  headers: async () => [{ source: '/:ruta*', headers: CABECERAS_SEGURIDAD }],
}

export default nextConfig
