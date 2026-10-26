# Estado del proyecto

_Última actualización: 23 de septiembre de 2026._

## En una línea

CREATOR está **en producción y en uso** en https://creator.emprendimientum.com. El flujo completo de la primera reunión funciona de punta a punta con Claude Opus 5.

## Qué hay (todo publicado)

| Área | Estado | Dónde |
|---|---|---|
| Nueva reunión (solo nombre obligatorio) | ✅ | `app/(app)/nuevo` |
| **Enfoque del sistema**: hasta 3 áreas (ventas, atención, operación, inventario y logística, finanzas, equipo, dirección, marketing). Se elige al crear la reunión, en la entrevista o lo marca el cliente en su formulario; cambia las preguntas, el copiloto, el diagnóstico, los paquetes, las portadas y el brief | ✅ | `lib/enfoques.ts`, `comun/selector-enfoque.tsx` |
| Entrevista guiada (5 secciones, opciones para tocar, preguntas de sondeo) + copiloto IA | ✅ | `components/levantamiento/entrevista.tsx`, `lib/preguntas.ts` |
| Formulario del cliente en el celular (QR/WhatsApp), por pasos, bilingüe, con sus datos legales | ✅ | `app/f/[token]`, `components/cliente/` |
| Panel en vivo: lo que responde el cliente aparece en ~5 s y sale de la lista de pendientes | ✅ | `usePulsoCliente` en `levantamiento/espacio.tsx`, `api/levantamientos/[id]/pulso` |
| Material: PDF, Word, Excel, imágenes (visión), audio (transcripción OpenAI), notas | ✅ | `server/extraer.ts` |
| Diagnóstico IA: dolores explícitos/ocultos, madurez, soluciones, arquitectura, viabilidad, plan, 3 paquetes | ✅ | `server/ia/` |
| **Cifras fundamentadas**: factores con fuente y cita; el código multiplica; "por cuantificar" si falta un dato | ✅ | `lib/analisis.ts`, `components/comun/cifra.tsx` |
| **Módulos a medida**: solo herramientas/agentes IA nuevos; **precio por valor** (valor mensual demostrado × 6 meses, sin tope; referencia por facturación y piso de rentabilidad cuando falta el dato) con la justificación y la pregunta para subirlo en el editor | ✅ | `lib/valor.ts`, `levantamiento/propuesta.tsx` |
| Retorno al cliente: cada módulo a medida con valor demostrado muestra "recupera ~$X al mes · se paga en N meses · N× el primer año"; el paquete recomendado muestra "Se recupera en N meses" (sobre el precio con IVA) en pantalla, PDF y PowerPoint | ✅ | `ItemVisible.retorno`, `lineasRetornoModulos` |
| Precio **con IVA** como cifra principal en editor, presentación, PDF y PowerPoint (la base sin IVA es el detalle) | ✅ | |
| Propuesta editable: paquetes, precio negociable por ítem, descuentos %, usuarios, volumen, margen y simulador de modelos de cobro (solo interno) | ✅ | `levantamiento/propuesta.tsx` |
| Presentación en iPad (diapositivas) y enlace público para el celular | ✅ | `components/presentacion/`, `app/presentar`, `app/p` |
| Exportación PDF, Word, PowerPoint, Excel (fórmulas vivas), Markdown | ✅ | `server/exportar/` |
| **Presentación descargable (PDF 16:9)** para enviar después de la reunión; con cierre agrega "Lo acordado" (paquete, totales con IVA, plan de pagos). En Entregar al cliente, junto al acuerdo y en el enlace público | ✅ | `server/exportar/presentacion.tsx` (`formato=presentacion`) |
| **Arranque del proyecto (.md)**: con el cierre guardado, un brief para darle a Claude (alcance contratado y lo que quedó fuera, condiciones con IVA y pagos, diagnóstico, arquitectura, plan, riesgos, preguntas abiertas, entrevista textual y material) | ✅ | `server/proyecto.ts`, `api/propuestas/[id]/proyecto` |
| Cierre: paquete que eligió el cliente + 1 a 12 desembolsos que suman 100% (cuotas iguales al centavo) | ✅ | `levantamiento/cierre.tsx`, `lib/pagos.ts` |
| Acuerdo para firmar (PDF/Word), 321 S.A.S. (AiUDA) ↔ cliente, montos en letras | ✅ | `server/acuerdo/` |
| Integración CRM (crm-321) con clave propia de permisos mínimos. **Después del alta, cada cambio de la propuesta queda en la línea de tiempo del lead**: nueva versión, cierre acordado (paquete, montos con IVA, pagos), aceptada/rechazada/enviada y acuerdo generado | ✅ configurada, ⚠️ sin probar en vivo | `server/crm.ts` (`avisarCrm`) |
| Catálogo editable (21 productos) con historial de precios; Ajustes (marca, precios, legal, IA, CRM); Rentabilidad | ✅ | `app/(app)/admin/*` |
| Historial/bitácora, respaldo JSON por cliente, versiones inmutables | ✅ | tabla `eventos` |

Verificación: `pnpm check` → **63 pruebas** en verde (precios, cifras, pagos, a medida, acuerdo, exportaciones, no-fuga de datos internos). CI en GitHub Actions.

## Pendientes (en orden)

1. **Calibrar el precio por valor con los primeros cierres.** Ya implementado (ver DECISIONES 22). Parámetros en Ajustes → Precios: meses de valor (6), costo semanal ($165), piso (2× costo) y referencia sin valor demostrado (1,5 % de la facturación mensual). Revisar si 6 meses y 1,5 % se sostienen en la negociación real. Rentabilidad ya muestra el punto de equilibrio con costos fijos $900 + digitales $200 al mes = $1.100 (Ajustes → Precios): clientes necesarios, ganancia pura al mes y ganancia del primer año.
2. **Probar el primer "Enviar al CRM" real** y confirmar que el lead y la actividad aparecen bien en crm-321 (ver `docs/OPERACION.md` → CRM).
3. **Revisión legal del acuerdo** por el abogado de Byron antes del primer cliente real (`server/acuerdo/contenido.ts`). Aplicar sus cambios ahí; valen para todos.
4. **Costos mensuales del catálogo** son estimados (sobre todo voz Retell/Twilio y WhatsApp). Ajustar con facturas reales en Catálogo.
5. **Opcional ofrecido, sin respuesta:** agregar automáticamente las preguntas "por cuantificar" del diagnóstico como preguntas de seguimiento en la Entrevista.
6. **Cierre más flexible (visto con DKB Courier):** ✅ ya admite hasta 12 cuotas. Falta: opción "precio final con IVA incluido" (hoy se cargan precios base = total/1,15 a mano, como en DKB v3), plazo mínimo por acuerdo (DKB: 12 meses) y fecha de inicio de la mensualidad en el acuerdo generado.
7. **Opcional:** si se pasa a Vercel Pro, subir `maxDuration` de `api/levantamientos/[id]/analizar` y permitir esfuerzo `high`.

## Datos de producción (no secretos)

- App: https://creator.emprendimientum.com (también `creator-three-kappa.vercel.app`)
- Vercel: equipo `bcujanos-projects`, proyecto `creator`, conectado a GitHub → cada push a `main` despliega.
- GitHub: `bcujano/creator` (privado). crm-321 en `bcujano/crm-321`.
- Supabase: proyecto `fpzbzjfmemxkgiapxlnh` (São Paulo), 8 migraciones aplicadas (0001–0008).
- IA: análisis con Claude `claude-opus-5-5` (esfuerzo `medium`, ~155 s, ~$0,37), modelo rápido `claude-sonnet-5-5` (copiloto y lectura de material), respaldo OpenAI `gpt-4.1`, audio `gpt-4o-transcribe`. Ajustes verifica que cada modelo exista antes de guardarlo y `gpt-4o-transcribe` (audio).
- CRM: `https://crm.321archlab.com/api/webhook` con `CREATOR_WEBHOOK_SECRET` (en crm-321) = `CRM_WEBHOOK_SECRET` (en CREATOR).
- Admin: `brncjn@gmail.com`. Logo en `public/brand/logo.png`.

## Datos de ejemplo en la base

- **"Ejemplo · Clínica Sonrisa (demo)"**: cliente de demostración con varias versiones de análisis y propuestas. Útil para probar; se puede archivar.
- **"Prueba · Distribuidora Andina (logística, demo)"**: archivado (probó el módulo a medida de rutas).
- **DKB Courier** (cliente real, razón social DKB LTD. S.A.S., propuesta `AIU-2026-0127` **v3** con los valores negociados y cierre de 7 cuotas; v1 = 0011, v2 = precios de catálogo): acuerdo final editado a mano (cita la v3) (IVA incluido: $4.200 en 7 cuotas de $600 de sep-2026 a mar-2027 + $380/mes desde el prototipo del 30/09/2026, plazo mínimo 12 meses desde el 01/10/2026). **Byron entrega el prototipo funcional el 30/09/2026.** Acuerdo listo para firmar (`Descargas/ACU-2026-0127-DKB-COURIER.docx`); la mensualidad se factura $330,43 + $49,56 = $379,99 (aceptado).. No usar para pruebas.
- Reunión real en curso de Byron: levantamiento `09186a62-858e-4572-b98a-c13279916d27` (arriendo de estudios). No usarla para pruebas.
