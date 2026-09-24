# Arquitectura

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 6 · Tailwind 4 · Supabase (Postgres, Auth, Storage) · Vercel · `@anthropic-ai/sdk` + `openai` · zod 4 · `@react-pdf/renderer`, `docx`, `pptxgenjs`, `exceljs` · `unpdf`, `mammoth` · Vitest · Biome · pnpm 12 · Node 24.

## Estructura

```
src/
  app/                        Solo rutas: páginas y handlers delgados
    (app)/                    Área privada (layout con sesión y navegación)
      page.tsx                Lista de levantamientos + KPIs
      nuevo/                  Crear cliente + levantamiento
      l/[id]/                 Espacio de trabajo de la reunión
      admin/{catalogo,ajustes,rentabilidad}/
    login/                    Inicio de sesión
    f/[token]/                Formulario del cliente (público, celular)
    p/[token]/                Propuesta para el cliente (público)
    presentar/[id]/           Presentación en iPad (privado)
    api/                      Rutas JSON (ver tabla abajo)
  components/
    ui/primitivos.tsx         Botón, campos, tarjetas, avisos, api()
    comun/                    Piezas compartidas: campo-respuesta, cifra, grabadora, subir, navegacion, marca-estilo
    cliente/                  Formulario del cliente
    presentacion/             Diapositivas y vista pública
    levantamiento/            Espacio: cabecera, entrevista, material, analisis, propuesta, cierre, historial
    admin/                    Catálogo, ajustes, simulador de rentabilidad
  lib/                        Dominio puro (cliente y servidor): tipos, precios, pagos, analisis (cifras),
                              preguntas, i18n, ajustes-defecto, env, auth, supabase/{admin,server,browser}
  server/                     Solo servidor (`import 'server-only'`)
    datos.ts                  Acceso a datos (service role) y bitácora
    servicios.ts              Orquestación: ejecutarAnalisis, guardarPropuesta
    documento.ts              Arma el documento único para todas las salidas
    publico.ts                Versión sin datos internos para el cliente
    proyecto.ts               Brief .md de arranque del proyecto aprobado (interno)
    ia/{motor,esquema,analizar}.ts
    exportar/{presentacion,pdf,docx,pptx,xlsx,markdown,comun,index}
    acuerdo/{contenido,pdf,docx,letras}
    extraer.ts, almacen.ts, subidas.ts, crm.ts, http.ts
  proxy.ts                    Protección de rutas (Next 16)
supabase/migrations/          SQL append-only (0001–0007)
scripts/                      db-migrate, crear-admin
tests/                        Vitest; fixtures/ con un caso completo (Clínica Sonrisa)
docs/                         Estado, arquitectura, decisiones, operación, historial
```

## Flujo de la reunión

```
Nueva reunión ─► Entrevista (iPad) ◄── pulso cada 5 s ── Formulario del cliente (celular)
                     │                                          │
                     ├─ Material (archivos, audio, notas) ◄──────┘ (sus archivos también)
                     ▼
              "Listo: analizar y diseñar"
                     ▼
     server/servicios.ejecutarAnalisis
       construirEntrada (catálogo + ficha + respuestas cliente/consultor + material)
       → motor.generarEstructurado (Claude; fallback JSON+zod; respaldo OpenAI)
       → lib/analisis.normalizarAnalisis (cifras calculadas por código)
       → guarda versión de análisis → propuestaDesdeAnalisis → guarda propuesta v1
                     ▼
     Propuesta (editar, negociar) ─► Presentar (iPad) / enlace /p (celular) / archivos
                     ▼
     Cerrar el trato: paquete elegido + desembolsos + datos legales ─► Acuerdo PDF/Word
                     ▼
     Enviar al CRM (crm-321: new_lead + log_activity "cotizacion")
```

## Datos (Postgres)

| Tabla | Qué guarda |
|---|---|
| `ajustes` (1 fila) | `marca`, `precios` (IVA, márgenes, tabla a medida), `ia`, `crm`, `legal` (jsonb) |
| `catalogo` + `catalogo_historial` | Productos con precio, costo, usuarios, volumen, `incluye`; historial de cada cambio |
| `clientes` | Ficha + datos legales (razón social, RUC, cédula del representante, dirección) |
| `levantamientos` | Reunión: `respuestas` (consultor), `respuestas_cliente`, `token_cliente`, estado |
| `insumos` | Material: texto extraído + archivo en Storage (bucket privado `insumos`) |
| `analisis` | Versión inmutable: entrada congelada, resultado normalizado, uso de tokens |
| `propuestas` | Versión inmutable: `datos` (paquetes/líneas), `totales` congelados, `cierre` (mutable), `token_publico`, número AIU-AAAA-NNNN (compartido por todas las versiones de un levantamiento) |
| `eventos` | Bitácora de todo |
| `crm_envios` | Cada llamada al CRM con solicitud y respuesta |

Storage: `insumos` (privado, subida directa con URL firmada), `marca` (público, logo).

## Piezas clave

- **Motor de precios** (`lib/precios.ts`): líneas del catálogo o a medida (`itemAMedida`), módulos incluidos en paquetes a $0, usuarios extra, excedentes de volumen, descuentos, IVA, costo y margen, simulador de modelos de cobro.
- **Cifras** (`lib/analisis.ts`): `calcular()` multiplica factores y aplica las reglas anti-invención; `normalizarAnalisis()` es idempotente y tolera análisis antiguos.
- **Pagos** (`lib/pagos.ts`): `cierreEfectivo`, `validarPagos` (1–12, suma 100%), `pctVisible`, `montosPagos` (el último absorbe el redondeo).
- **IA** (`server/ia/`): `esquema.ts` (zod, sin opcionales para servir a ambos proveedores), `analizar.ts` (prompts: reglas de cifras, dolores ocultos, módulos a medida, presupuesto del cliente), `motor.ts` (streaming, esfuerzo adaptativo, fallback por gramática grande, respaldo OpenAI).
- **Salidas**: `server/documento.ts` → exportadores y presentación; `server/publico.ts` filtra costos, márgenes y notas internas.

## API

| Ruta | Uso |
|---|---|
| `POST /api/levantamientos` · `PATCH/DELETE /api/levantamientos/[id]` | Crear, editar (respuestas, ficha, estado), archivar |
| `…/[id]/insumos` · `subida` · `archivos` | Notas y archivos (URL firmada + registro + extracción) |
| `…/[id]/sugerir` · `analizar` · `propuestas` · `respaldo` · `pulso` · `beacon` | Copiloto, análisis, nueva versión, JSON completo, firma para el panel en vivo, guardado al cerrar pestaña |
| `PATCH /api/propuestas/[id]` | Estado y/o `cierre` |
| `GET /api/propuestas/[id]/exportar?formato=` · `acuerdo?formato=` · `proyecto` · `POST …/crm` | Archivos, acuerdo, brief de arranque (.md), CRM |
| `/api/publico/f/[token]` (PUT, subida, archivos) · `/api/publico/p/[token]/exportar` | Cliente sin sesión |
| `/api/catalogo` · `/api/ajustes` (PUT; POST sube logo) | Administración |
