# Historial

## 23 de septiembre de 2026 — primera sesión (construcción y puesta en producción)

1. **Base** (`99461c7`): entrevista, material, diagnóstico con IA, propuesta con motor de precios, presentación, exportación en 5 formatos, catálogo con precios aprobados y módulos de crm-321, ajustes, rentabilidad, integración CRM, versionado y bitácora. Supabase propio, Vercel, dominio `creator.emprendimientum.com`.
2. **Infraestructura**: clave propia de CREATOR en crm-321 (permisos mínimos; commit `a07c5da` en crm-321). Claude como motor con fallback para el esquema grande y OpenAI de respaldo. Repos en GitHub y despliegue automático.
3. **Reunión con cliente** (`e14393f`): cuestionario nuevo (visión, necesidad, inversión, sondeos), formulario por pasos con datos legales, panel en vivo, precio negociable por ítem, acuerdo para firmar.
4. **Usabilidad** (`1f4b5ab`, `2f6f67a`): botón "Listo: analizar y diseñar"; la propuesta ya no queda vacía al terminar el análisis.
5. **Cifras fundamentadas** (`41e75f9`): factores con fuente, cálculo por código, "por cuantificar".
6. **Cierre** (`8aef6f3`, `e864e78`): paquete que eligió el cliente, 1–4 desembolsos, arreglo de habilitación del acuerdo.
7. **Módulos a medida** (`5b39aff`, `2cd3ca2`): primero con precio de la IA; luego redefinidos a pedido del usuario: solo herramientas nuevas, nombres claros, precio por tabla de complejidad.
8. **Orden y documentación**: estructura por función, CI, `CLAUDE.md` y `docs/`.

## 23 de septiembre de 2026 — segunda sesión

1. **A medida grandes:** tres esquemas de valoración con el caso de rutas (A mensualidad, B proyecto por entregables, C partir módulos). Pospuesto por Byron; queda como pendiente 1.
2. **Revisión del acuerdo ACU-2026-0012 (DKB Courier)**, editado a mano con los valores negociados; se detectaron inconsistencias y necesidades del cierre (pendiente 6).
3. **Numeración desde 127** (migración `0006`) y acuerdo de DKB corregido: número 0127, "$4.200", "portador", desglose de subtotal sin IVA + IVA 15 % en ambas tablas (precios con IVA incluido). Calendario negociado: $600 a la firma (23/09), $380 el 30/09 contra entrega del prototipo funcional (mensualidad de octubre), cuotas de $600 de octubre a marzo, $980 de noviembre a marzo, solo $380 desde abril 2027; plazo mínimo desde el 01/10/2026. Razón social corregida a DKB LTD. S.A.S. (acuerdo y ficha del cliente). Acuerdo listo para firmar.
4. **Presentación descargable en PDF** (`formato=presentacion`) con diapositiva "Lo acordado"; cierre hasta 12 cuotas; versiones con el mismo número (migración `0007`). DKB: versión 3 con los valores negociados (IVA incluido) y cierre de 7 cuotas; su presentación coincide con el acuerdo, que ahora cita la versión 3.

Pendientes: ver `docs/ESTADO.md`.
