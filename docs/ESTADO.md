# Estado del proyecto

_Última actualización: 23 de septiembre de 2026._

## En una línea

CREATOR está **en producción y en uso** en https://creator.emprendimientum.com. El flujo completo de la primera reunión funciona de punta a punta con Claude Opus 5.

## Qué hay (todo publicado)

| Área | Estado | Dónde |
|---|---|---|
| Nueva reunión (solo nombre obligatorio) | ✅ | `app/(app)/nuevo` |
| Entrevista guiada (5 secciones, opciones para tocar, preguntas de sondeo) + copiloto IA | ✅ | `components/levantamiento/entrevista.tsx`, `lib/preguntas.ts` |
| Formulario del cliente en el celular (QR/WhatsApp), por pasos, bilingüe, con sus datos legales | ✅ | `app/f/[token]`, `components/cliente/` |
| Panel en vivo: lo que responde el cliente aparece en ~5 s y sale de la lista de pendientes | ✅ | `usePulsoCliente` en `levantamiento/espacio.tsx`, `api/levantamientos/[id]/pulso` |
| Material: PDF, Word, Excel, imágenes (visión), audio (transcripción OpenAI), notas | ✅ | `server/extraer.ts` |
| Diagnóstico IA: dolores explícitos/ocultos, madurez, soluciones, arquitectura, viabilidad, plan, 3 paquetes | ✅ | `server/ia/` |
| **Cifras fundamentadas**: factores con fuente y cita; el código multiplica; "por cuantificar" si falta un dato | ✅ | `lib/analisis.ts`, `components/comun/cifra.tsx` |
| **Módulos a medida**: solo herramientas/agentes IA nuevos; precio por complejidad (tabla $300/$600/$900) | ✅ (ver pendiente 1) | `lib/precios.ts` (`precioAMedida`, `itemAMedida`) |
| Propuesta editable: paquetes, precio negociable por ítem, descuentos %, usuarios, volumen, margen y simulador de modelos de cobro (solo interno) | ✅ | `levantamiento/propuesta.tsx` |
| Presentación en iPad (diapositivas) y enlace público para el celular | ✅ | `components/presentacion/`, `app/presentar`, `app/p` |
| Exportación PDF, Word, PowerPoint, Excel (fórmulas vivas), Markdown | ✅ | `server/exportar/` |
| Cierre: paquete que eligió el cliente + 1 a 4 desembolsos que suman 100% | ✅ | `levantamiento/cierre.tsx`, `lib/pagos.ts` |
| Acuerdo para firmar (PDF/Word), 321 S.A.S. (AiUDA) ↔ cliente, montos en letras | ✅ | `server/acuerdo/` |
| Integración CRM (crm-321) con clave propia de permisos mínimos | ✅ configurada, ⚠️ sin probar el alta real | `server/crm.ts` |
| Catálogo editable (21 productos) con historial de precios; Ajustes (marca, precios, legal, IA, CRM); Rentabilidad | ✅ | `app/(app)/admin/*` |
| Historial/bitácora, respaldo JSON por cliente, versiones inmutables | ✅ | tabla `eventos` |

Verificación: `pnpm check` → **45 pruebas** en verde (precios, cifras, pagos, a medida, acuerdo, exportaciones, no-fuga de datos internos). CI en GitHub Actions.

## Pendientes (en orden)

1. **⭐ IMPORTANTE (en espera de decisión de Byron) — Valorar bien los módulos a medida grandes.** Hoy un sistema como el de rutas de la distribuidora (6 entregables, 6 semanas) sale a $900 por el tope. Propuestas presentadas el 23/09/2026:
   - **A · $900 + mensualidad** de operación ($120/mes en complejos): rutas = $1.620 al plazo mínimo, $2.340 el primer año.
   - **B · Nivel "proyecto" por entregables (recomendado):** simple/media/compleja se mantienen; si hay ≥3 piezas nuevas o >4 semanas, la IA da talla a cada entregable (S 8 h, M 16 h, L 32 h) y el código multiplica por $30/h (tarifa implícita de la tabla actual); tope $6.000, sobre eso se cotiza aparte. Rutas = 112 h → $3.360 + IVA.
   - **C · Partir en varios módulos de tabla:** rutas = $900 + $900 + $600 = $2.400.
   Al decidir: `lib/precios.ts#precioAMedida`, `ParametrosPrecio` (+ Ajustes), `server/ia/esquema.ts` (talla por entregable), `server/ia/analizar.ts`, pruebas en `tests/a-medida.test.ts`.
2. **Probar el primer "Enviar al CRM" real** y confirmar que el lead y la actividad aparecen bien en crm-321 (ver `docs/OPERACION.md` → CRM).
3. **Revisión legal del acuerdo** por el abogado de Byron antes del primer cliente real (`server/acuerdo/contenido.ts`). Aplicar sus cambios ahí; valen para todos.
4. **Costos mensuales del catálogo** son estimados (sobre todo voz Retell/Twilio y WhatsApp). Ajustar con facturas reales en Catálogo.
5. **Opcional ofrecido, sin respuesta:** agregar automáticamente las preguntas "por cuantificar" del diagnóstico como preguntas de seguimiento en la Entrevista.
6. **Cierre más flexible (visto en el acuerdo de DKB Courier, ACU-2026-0012):** se negoció la implementación en 7 cuotas mensuales de $600 y precios "IVA incluido", y hubo que ajustar el Word a mano. El cierre solo admite 1–4 desembolsos por % y siempre suma IVA. Evaluar: cuotas mensuales con fechas, opción "precio final con IVA incluido" y plazo mínimo por acuerdo (DKB: 12 meses).
7. **Opcional:** si se pasa a Vercel Pro, subir `maxDuration` de `api/levantamientos/[id]/analizar` y permitir esfuerzo `high`.

## Datos de producción (no secretos)

- App: https://creator.emprendimientum.com (también `creator-three-kappa.vercel.app`)
- Vercel: equipo `bcujanos-projects`, proyecto `creator`, conectado a GitHub → cada push a `main` despliega.
- GitHub: `bcujano/creator` (privado). crm-321 en `bcujano/crm-321`.
- Supabase: proyecto `fpzbzjfmemxkgiapxlnh` (São Paulo), 5 migraciones aplicadas (0001–0005).
- IA: Claude `claude-opus-5` (principal, esfuerzo `medium`), OpenAI `gpt-4.1` (respaldo) y `gpt-4o-transcribe` (audio).
- CRM: `https://crm.321archlab.com/api/webhook` con `CREATOR_WEBHOOK_SECRET` (en crm-321) = `CRM_WEBHOOK_SECRET` (en CREATOR).
- Admin: `brncjn@gmail.com`. Logo en `public/brand/logo.png`.

## Datos de ejemplo en la base

- **"Ejemplo · Clínica Sonrisa (demo)"**: cliente de demostración con varias versiones de análisis y propuestas. Útil para probar; se puede archivar.
- **"Prueba · Distribuidora Andina (logística, demo)"**: archivado (probó el módulo a medida de rutas).
- Reunión real en curso de Byron: levantamiento `09186a62-858e-4572-b98a-c13279916d27` (arriendo de estudios). No usarla para pruebas.
