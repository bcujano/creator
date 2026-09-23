import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

/**
 * Crea (o reactiva) el usuario administrador en Supabase Auth.
 * Uso: pnpm admin:create correo@dominio.com "contraseña-segura"
 * El correo también debe estar en ADMIN_EMAILS.
 */

try {
  process.loadEnvFile(resolve(import.meta.dirname, '..', '.env.local'))
} catch {}

const [email, clave] = process.argv.slice(2)
if (!email || !clave) {
  console.error('Uso: pnpm admin:create correo@dominio.com "contraseña"')
  process.exit(1)
}
if (clave.length < 10) {
  console.error('La contraseña debe tener al menos 10 caracteres.')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const llave = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !llave) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(url, llave, { auth: { persistSession: false } })
const { error } = await supabase.auth.admin.createUser({
  email,
  password: clave,
  email_confirm: true,
})

if (error && !/already/i.test(error.message)) {
  console.error('No se pudo crear:', error.message)
  process.exit(1)
}
if (error) {
  // Ya existía: se actualiza la contraseña.
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const usuario = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!usuario) {
    console.error('El usuario existe pero no se encontró para actualizarlo.')
    process.exit(1)
  }
  await supabase.auth.admin.updateUserById(usuario.id, { password: clave })
  console.log(`Contraseña actualizada para ${email}.`)
} else {
  console.log(`Usuario ${email} creado.`)
}

const admins = (process.env.ADMIN_EMAILS ?? '')
  .toLowerCase()
  .split(',')
  .map((e) => e.trim())
if (!admins.includes(email.toLowerCase())) {
  console.warn(`Ojo: agrega ${email} a ADMIN_EMAILS o no podrá entrar.`)
}
