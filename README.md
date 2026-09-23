# CREATOR · AiUDA

Sistema para la primera reunión con un cliente: entiende el negocio, descubre los dolores (también los ocultos), diseña la solución con IA, arma tres paquetes con precio e IVA y entrega la propuesta en PDF, Word, PowerPoint, Excel o enlace web. Todo queda versionado y se envía al CRM.

## Flujo

1. **Nueva reunión**: solo el nombre de la empresa.
2. **Entrevista** (iPad): guía por áreas con preguntas de sondeo para dolores ocultos. El **copiloto** sugiere qué preguntar ahora. Todo se guarda solo.
3. **Formulario del cliente** (celular): QR o enlace por WhatsApp. El cliente responde y sube archivos o notas de voz.
4. **Material**: PDF, Word, Excel, fotos, capturas, audios (se transcriben) y notas.
5. **Diagnóstico con IA**: negocio, madurez digital, dolores explícitos y ocultos con impacto en USD, soluciones del catálogo, arquitectura, viabilidad técnica, económica y operativa, ROI, plan y tres paquetes.
6. **Propuesta**: edita paquetes, precios, usuarios, volumen y descuentos. Ves tu margen y la comparación de modelos de cobro (solo tú).
7. **Presentar** en el iPad → **entregar**: PDF, Word, PowerPoint, Excel, Markdown o enlace → **enviar al CRM**.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local   # y completa las variables
pnpm db:migrate              # crea tablas, catálogo y ajustes iniciales
pnpm admin:create tu@correo.com "contraseña-segura"
pnpm dev
```

| Variable | Dónde se obtiene |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → Connection string (URI) |
| `ADMIN_EMAILS` | Correos que pueden entrar, separados por coma |
| `ANTHROPIC_API_KEY` | console.anthropic.com (motor principal) |
| `OPENAI_API_KEY` | Respaldo del análisis y **necesaria para transcribir audios** |
| `CRM_WEBHOOK_URL`, `CRM_WEBHOOK_SECRET` | crm-321: `https://crm.321archlab.com/api/webhook` y el valor de `N8N_WEBHOOK_SECRET_NUEVO` |
| `NEXT_PUBLIC_APP_URL` | URL pública de CREATOR (para los enlaces y el QR) |

**Logo**: súbelo en *Ajustes* (PNG o JPG), o déjalo en `public/brand/logo.png`.

## Despliegue en Vercel

Crea el proyecto en Vercel, carga las mismas variables y despliega. El análisis usa `maxDuration = 300` (300 s: el límite del plan Hobby con Fluid Compute).

## Principios

- **Los números los calcula el código, no la IA.** La IA elige módulos; `src/lib/precios.ts` calcula setup, mensualidad, usuarios extra, excedentes de volumen, descuentos, IVA y márgenes.
- **Nada se borra.** Se archiva con `eliminado_en`. Cada análisis y cada propuesta son versiones inmutables. La bitácora (`eventos`) registra cada cambio, y el catálogo guarda su historial de precios. Hay respaldo JSON por levantamiento.
- **Lo interno no sale.** Costos, márgenes y notas internas nunca llegan a la presentación, al enlace ni a los archivos (`src/server/publico.ts`, con prueba).
- **Una sola fuente para todas las salidas**: `src/server/documento.ts`.

## Estructura

```
src/lib/precios.ts            motor de precios (probado)
src/lib/preguntas.ts          guía de entrevista bilingüe
src/server/ia/                esquema del análisis, motor Claude + OpenAI, prompts
src/server/extraer.ts         lectura de PDF, Word, Excel, imágenes y audio
src/server/exportar/          PDF, Word, PowerPoint, Excel, Markdown
src/server/crm.ts             integración con crm-321
supabase/migrations/          esquema, catálogo inicial y numeración
```

## Comandos

```bash
pnpm test        # motor de precios + exportaciones
pnpm typecheck
pnpm lint
pnpm build
```
