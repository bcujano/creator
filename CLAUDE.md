# CREATOR · guía para trabajar en este proyecto

Herramienta de **AiUDA** (línea de negocio de 321 Soluciones Inmobiliarias S.A.S., Ecuador) para la **primera reunión con un cliente**: entrevista + formulario en el celular del cliente → diagnóstico con IA (dolores ocultos, viabilidad, ROI fundamentado) → tres paquetes con precio e IVA → presentación en iPad → cierre (paquete elegido, desembolsos) → acuerdo para firmar → CRM.

**Al empezar una sesión, lee en este orden:** `docs/ESTADO.md` (qué está hecho y qué sigue) → `docs/ARQUITECTURA.md` (cómo está armado) → `docs/DECISIONES.md` (por qué). No le pidas contexto al usuario: está todo ahí. `docs/OPERACION.md` tiene despliegue, variables y comandos.

## El usuario

- Byron Cujano, Director General de 321 / AiUDA. Escribe en español: responde en español.
- Quiere **velocidad**: decidir con buenos defaults, ejecutar y publicar. Pregunta solo lo que de verdad es suyo decidir.
- Prefiere **verlo publicado**, no pruebas locales largas. Se publica con `git push` a `main` (Vercel despliega solo).
- **No inventar números** ni **cobrar de más** al cliente (ver `docs/DECISIONES.md`).

## Reglas del código

- **Capas:** `src/app` solo rutas (delgadas) · `src/server` lógica de servidor (`import 'server-only'`, service role) · `src/lib` dominio puro e isomórfico (precios, pagos, cifras, preguntas, tipos) · `src/components/<área>` UI por función.
- **Los montos los calcula el código, nunca la IA:** `lib/precios.ts` (precios, IVA, márgenes, tope a medida), `lib/analisis.ts` (impacto y ROI como producto de factores con fuente), `lib/pagos.ts` (desembolsos). La IA elige módulos y da factores/complejidad.
- **Nada se borra:** `eliminado_en` (soft delete). Análisis y propuestas son **versiones inmutables**; el cierre (`propuestas.cierre`) y el estado son lo único mutable, y se registran en `eventos`.
- **Lo interno no sale:** costos, márgenes y notas internas nunca llegan al cliente. Todo lo público pasa por `server/publico.ts` (hay prueba).
- **Una sola fuente para todas las salidas:** `server/documento.ts` arma el documento; PDF/Word/PPT/Excel/MD/presentación/acuerdo lo consumen.
- **Migraciones append-only:** archivo nuevo `supabase/migrations/000N_nombre.sql`, luego `pnpm db:migrate`. Nunca editar una aplicada.
- Nombres y comentarios **en español**, comentarios que expliquen el porqué. Estilo Biome (comillas simples, sin punto y coma, 100 columnas). Finales de línea **LF**.
- Antes de publicar: `pnpm check` (tipos + lint + 45 pruebas) y `pnpm build`.

## Trampas conocidas (ya resueltas; no repetirlas)

- **Bash en Windows:** heredocs con `'EOF'` que contienen comillas mixtas fallan. Para editar con scripts, escribe un `.py` en el scratchpad y ejecútalo. Python en Windows escribe CRLF si no pasas `newline='\n'`.
- **curl desde Git Bash** manda tildes mal codificadas: para datos con acentos usa un script `tsx` (UTF-8).
- **Scripts que importan `src/server`:** `NODE_OPTIONS="--conditions=react-server" npx tsx --tsconfig tsconfig.json scripts/x.ts` (por `server-only`). Con esa condición, `@react-pdf` no renderiza: los PDF pruébalos por la ruta HTTP o con `pnpm test`.
- **jsonb reordena claves:** compara objetos guardados por valor, no con `JSON.stringify`.
- **`pptxgenjs` no puede ser `serverExternalPackages`** (falla en Vercel). Los exportadores se cargan con `import()` por formato.
- **Claude + esquema grande:** la salida estricta rechaza el esquema del análisis ("grammar too large"); `server/ia/motor.ts` cae a JSON por instrucciones + validación zod con un reintento. OpenAI queda de respaldo.
- **Vercel Hobby = 300 s por función.** El análisis con esfuerzo `high` tardó ~256 s; el default es `medium` (~160–200 s).
- **react-pdf:** registrar `Font.registerHyphenationCallback` para no cortar palabras.
- **Git:** identidad local del repo (Byron Cujano); no hay identidad global.

## Comandos

```bash
pnpm dev            # local en :3000 (usa .env.local)
pnpm check          # tipos + lint + pruebas
pnpm build
pnpm db:migrate     # aplica migraciones pendientes a Supabase
git push            # publica en producción (Vercel)
```
