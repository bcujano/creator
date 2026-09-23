import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postgres from 'postgres'

/**
 * Aplica en orden las migraciones de supabase/migrations que falten.
 * Una migración aplicada nunca se edita ni se repite: todo cambio es un archivo nuevo.
 * Uso: pnpm db:migrate  (lee SUPABASE_DB_URL de .env.local)
 */

const RAIZ = resolve(import.meta.dirname, '..')
const DIRECTORIO = resolve(RAIZ, 'supabase/migrations')

try {
  process.loadEnvFile(resolve(RAIZ, '.env.local'))
} catch {
  // Sin .env.local: se usan las variables del entorno.
}

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error(
    'Falta SUPABASE_DB_URL (Supabase → Project Settings → Database → Connection string).',
  )
  process.exit(1)
}

const sql = postgres(url, { ssl: 'require', max: 1, onnotice: () => {} })

try {
  await sql`
    create table if not exists schema_migrations (
      nombre text primary key,
      aplicada_en timestamptz not null default now()
    )
  `
  const filas = await sql<{ nombre: string }[]>`select nombre from schema_migrations`
  const hechas = new Set(filas.map((f) => f.nombre))
  const pendientes = readdirSync(DIRECTORIO)
    .filter((a) => a.endsWith('.sql'))
    .sort()
    .filter((a) => !hechas.has(a))

  for (const nombre of pendientes) {
    const contenido = readFileSync(resolve(DIRECTORIO, nombre), 'utf8')
    await sql.begin(async (tx) => {
      await tx.unsafe(contenido)
      await tx`insert into schema_migrations (nombre) values (${nombre})`
    })
    console.log(`aplicada  ${nombre}`)
  }
  console.log(
    pendientes.length
      ? `${pendientes.length} migración(es) aplicada(s).`
      : 'Sin migraciones pendientes.',
  )
} finally {
  await sql.end()
}
