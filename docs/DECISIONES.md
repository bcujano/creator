# Decisiones

Registro breve de decisiones y su porqué. La más reciente al final. Si una cambia, se agrega otra entrada; no se reescribe la historia.

### 1. App propia en Next.js + Supabase + Vercel
Mismo stack que el resto de proyectos del usuario (laundry-vip, crm-321). Supabase propio (no el de crm-321) para no mezclar datos de clientes de AiUDA con los de la inmobiliaria.

### 2. Un solo usuario administrador; autorización en el servidor
`ADMIN_EMAILS` + Supabase Auth. RLS activa **sin políticas**: el navegador no lee la base; todo pasa por rutas del servidor con service role. Las rutas públicas (`/f`, `/p`, `/api/publico`) se autorizan con tokens aleatorios de 144 bits.

### 3. Claude como motor principal, OpenAI de respaldo
El usuario usaba OpenAI y aceptó pasar a Anthropic. Si Claude falla o rechaza, se reintenta con OpenAI; el proveedor usado queda guardado. OpenAI además transcribe audio (Anthropic no tiene transcripción).

### 4. Los números los calcula el código
Precios, IVA, márgenes, desembolsos e impacto/ROI salen de funciones puras en `src/lib`. La IA elige módulos, clasifica complejidad y aporta factores. Motivo: reproducibilidad y que nada que vea el cliente sea inventado.

### 5. Cifras de impacto fundamentadas (pedido explícito del usuario)
Cada cifra es un producto de factores con **fuente** (cliente, reunión o supuesto) y **cita**. Reglas en código: nunca dinero supuesto; máximo un supuesto; al menos un dato real. Si falta algo: "por cuantificar" + la pregunta exacta. Motivo: el usuario vio montos sin respaldo y pidió "que no te inventes nada".

### 6. Versiones inmutables y nada se borra
Cada análisis y cada guardado de propuesta es una versión nueva. Soft delete con `eliminado_en`. Bitácora `eventos`. Motivo: "historial robusto para no perder información valiosa".

### 7. Respuestas del cliente separadas de las del consultor
`levantamientos.respuestas_cliente` vs `respuestas`, con las mismas claves de pregunta. Lo que respondió el cliente sale de la lista de pendientes del consultor. La IA recibe ambas voces por separado.

### 8. Cierre mutable, contenido inmutable
El paquete que eligió el cliente y los desembolsos viven en `propuestas.cierre` (se editan en la reunión, cada cambio a bitácora); no crean versión nueva. El acuerdo usa el cierre.

### 9. Módulos a medida: solo herramientas nuevas, precio por tabla
Primera versión: la IA ponía precio (hasta $900) y proponía integraciones (Dentalink a $850) y nombres ambiguos ("campaña de reactivación"). El usuario lo rechazó: "no queremos atracar al cliente". Ahora: a medida = herramienta/agente IA nuevo con valor propio; integraciones con lo que el cliente ya usa van **incluidas sin costo**; nombres "Agente de… / Sistema de…"; la IA clasifica complejidad y el precio sale de la tabla de Ajustes ($300/$600/$900, el último es tope). **Pendiente:** valoración de proyectos grandes (ver ESTADO).

### 10. Integración CRM con clave propia de permisos mínimos
En vez de reutilizar el secreto de n8n (no recuperable en Vercel), crm-321 acepta `CREATOR_WEBHOOK_SECRET` que solo permite `new_lead` y `log_activity`; las lecturas (GET) siguen siendo exclusivas de n8n.

### 11. Precios del catálogo
Aprobados por el usuario el 23/09/2026: iAgente WhatsApp $2.500+$190/mes; CRM Básico $3.500+$250; Operativo $6.500+$390; Gerencial $12.000+$650; módulos de crm-321 como individuales; levantamiento documental $2.800. Cobro recomendado: híbrido (módulos + volumen con cuota incluida), usuario extra $15. Margen mínimo $150/mes por cliente. IVA 15%.

### 12. Estructura de carpetas por función
`components/{ui,comun,cliente,presentacion,levantamiento,admin}`, `server/{ia,exportar,acuerdo}`, `lib` puro, `tests/fixtures`. CI (tipos, lint, pruebas) en GitHub Actions; Vercel hace el build.

### 13. Valoración de módulos a medida grandes: pospuesta
El 23/09/2026 se presentaron tres esquemas (ver ESTADO, pendiente 1) con recomendación del nivel "proyecto" por entregables. Byron lo dejó pendiente para priorizar la revisión del acuerdo de DKB Courier. Mientras tanto sigue la tabla $300/$600/$900 con tope.

### 14. Numeración de propuestas desde la 127
El acuerdo de DKB Courier se firmó como N.º 127. Migración `0006`: su propuesta pasó de `AIU-2026-0012` a `AIU-2026-0127` (queda en `eventos`) y la secuencia sigue desde ahí: la próxima es `AIU-2026-0128`. El acuerdo toma el mismo número con prefijo `ACU-`.

### 15. Un número por negociación
Antes cada versión guardada tomaba un número nuevo de la serie (DKB: v1 = 0011, v2 = 0012). Desde la migración `0007`, las versiones de un mismo levantamiento comparten número (`AIU-2026-0127` v2, v3…) y solo la primera toma uno nuevo. Motivo: el acuerdo cita "propuesta N.º X, versión Y" y la serie no debe saltar por guardar cambios.

### 16. Presentación descargable en PDF
Pedido de Byron: enviar la presentación como valor agregado después de la reunión y junto al contrato. Es un PDF horizontal hecho con react-pdf a partir del mismo `Documento` (no una captura de la pantalla del iPad), así funciona desde el servidor y en el enlace público. Si hay cierre, marca el paquete "Elegido" y agrega "Lo acordado". Para que coincida con un contrato negociado, lo negociado se guarda como nueva versión de la propuesta.

