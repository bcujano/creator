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

1. **⭐ IMPORTANTE — Valorar bien los módulos a medida complejos.** El tope de $900 se queda corto para desarrollos grandes (ej.: sistema de planificación de rutas + app de choferes + avisos, propuesto para una distribuidora). Hay que decidir con Byron: ¿mantener $900 como gancho y cobrar el resto por mensualidad/fase 2, subir la tabla de "compleja", o agregar un nivel "proyecto" que se cotice aparte (quizá con horas estimadas)? Tabla actual en Ajustes → Precios (`a_medida_simple/media/tope`). La lógica está en `lib/precios.ts#precioAMedida` y el criterio de la IA en `server/ia/analizar.ts` (sección "Módulos a medida").
2. **Probar el primer "Enviar al CRM" real** y confirmar que el lead y la actividad aparecen bien en crm-321 (ver `docs/OPERACION.md` → CRM).
3. **Revisión legal del acuerdo** por el abogado de Byron antes del primer cliente real (`server/acuerdo/contenido.ts`). Aplicar sus cambios ahí; valen para todos.
4. **Costos mensuales del catálogo** son estimados (sobre todo voz Retell/Twilio y WhatsApp). Ajustar con facturas reales en Catálogo.
5. **Opcional ofrecido, sin respuesta:** agregar automáticamente las preguntas "por cuantificar" del diagnóstico como preguntas de seguimiento en la Entrevista.
6. **Opcional:** si se pasa a Vercel Pro, subir `maxDuration` de `api/levantamientos/[id]/analizar` y permitir esfuerzo `high`.

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
