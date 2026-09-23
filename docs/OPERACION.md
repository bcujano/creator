# Operación

## Publicar

`git push` a `main` → Vercel despliega a producción (≈1 min). Antes: `pnpm check` y `pnpm build`. CI en GitHub corre tipos, lint y pruebas.

Si cambió el esquema: crear `supabase/migrations/000N_*.sql` y `pnpm db:migrate` **antes** del push (la app nueva puede depender de columnas nuevas).

## Variables de entorno

En `.env.local` (local) y en Vercel → proyecto `creator` → Production. Para cargar una en Vercel sin mostrarla:

```bash
printf %s "valor" | vercel env add NOMBRE production --force
```

| Variable | Notas |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fpzbzjfmemxkgiapxlnh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (`sb_secret_…`). Solo servidor |
| `SUPABASE_DB_URL` | Session pooler (solo local, para migraciones). No se sube a Vercel |
| `ADMIN_EMAILS` | `brncjn@gmail.com` |
| `ANTHROPIC_API_KEY` | Llave de un workspace. `ANTHROPIC_WORKSPACE_ID` solo si la llave no tiene workspace |
| `OPENAI_API_KEY` | Respaldo y transcripción |
| `CRM_WEBHOOK_URL` / `CRM_WEBHOOK_SECRET` | `https://crm.321archlab.com/api/webhook` / igual a `CREATOR_WEBHOOK_SECRET` de crm-321 |
| `NEXT_PUBLIC_APP_URL` | `https://creator.emprendimientum.com` en producción; `http://localhost:3000` local |

Cambiar una `NEXT_PUBLIC_*` exige volver a desplegar (se incrusta en el build).

## Usuario administrador

```bash
pnpm admin:create correo@dominio.com "contraseña-de-10+"
```
El correo debe estar en `ADMIN_EMAILS`. Si ya existe, actualiza la contraseña.

## CRM (crm-321)

- crm-321 acepta en `x-webhook-secret`: los secretos de n8n (todo) o `CREATOR_WEBHOOK_SECRET` (solo `new_lead` y `log_activity`; GET → 401). Código: `crm-321/src/app/api/webhook/route.ts`.
- Probar sin crear datos: POST con la clave de CREATOR y `action: "update_lead"` debe dar **403** (clave aceptada, acción vetada).
- Cada envío queda en la tabla `crm_envios`.
- Para rotar la clave: generar una nueva, cargarla en ambos proyectos de Vercel y en `.env.local`, y redesplegar los dos.

## Pruebas manuales útiles

- Ejecutar un análisis real sin la interfaz (sobre el cliente demo):
  `NODE_OPTIONS="--conditions=react-server" npx tsx --tsconfig tsconfig.json scripts/<script>.ts` con un script que importe `@/server/servicios` dinámicamente después de `process.loadEnvFile('.env.local')`. Borrar el script al terminar.
- Rutas públicas para verificar producción sin sesión: `/login` (200), `/` (307 → login), `/api/catalogo` (401), `/p/<token>` (200), `/api/publico/p/<token>/exportar?formato=pdf|docx|pptx|xlsx|md` (200).
- Archivos generados por las pruebas: `CREATOR_SALIDA_PRUEBAS=<carpeta> pnpm test`.

## Problemas conocidos y solución

| Síntoma | Causa | Solución |
|---|---|---|
| El análisis cae a OpenAI | Llave de Anthropic sin workspace o error de gramática | Llave de workspace; la gramática grande ya tiene fallback |
| Timeout del análisis | Límite de 300 s en Hobby | Esfuerzo `medium` (Ajustes → IA); Vercel Pro para más |
| Botones del acuerdo apagados tras guardar | Comparación por texto de jsonb | Ya corregido (compara por valor) |
| Exportaciones 500 en Vercel | Paquete externo que no carga | Quitar de `serverExternalPackages`; cada formato se importa por separado |
