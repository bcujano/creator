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

### 17. El precio que se muestra en grande es el total con IVA
Byron: mostrar la base sin IVA como cifra principal lo confundía y lo llevaba a cobrar sin IVA. Desde el 24/09/2026 el número destacado en el editor, la presentación (pantalla, PDF, PowerPoint) y las tarjetas del cierre es el **total con IVA**, que es lo que se pide al cliente; la base queda como detalle ("$X sin IVA"). Las tablas de detalle siguen con subtotal, IVA y total.

### 18. Brief de arranque del proyecto en Markdown
Al firmar, Byron necesita pasarle a Claude todo lo aprobado para diseñar y construir. `server/proyecto.ts` arma un .md interno (no pasa por `publico.ts`: incluye entrevista textual, material y notas internas, pero nunca costos ni márgenes) con instrucciones de uso al inicio, el alcance contratado como fuente de verdad y lo ofrecido que quedó fuera. Solo se habilita con el cierre guardado.

### 19. Ajustes verifica los modelos de IA antes de guardarlos
El 06/10/2026 se cambió el modelo a "claude-sonnet-5.5" y "gpt-4.1 mini" (punto y espacio en vez de guiones). Se guardó sin error y el 17/10 el análisis de Código F. falló con los dos proveedores en plena reunión. Ahora `PUT /api/ajustes` consulta a Anthropic/OpenAI si el modelo existe (`problemaConModelo` en `server/ia/motor.ts`) y rechaza el cambio con la sugerencia correcta. Solo un 404 bloquea; una falla de red no impide guardar.

### 20. Un modelo por tarea
17/10/2026, aprobado por Byron. El análisis es lo que vende: **Claude Opus 5.5** con esfuerzo `medium` (medido: 155 s con Código F, 7 dolores, ~$0,37; Opus 5 costaba ~$0,44 y Sonnet 5.5 ~$0,11 pero con análisis más cortos). El copiloto de la entrevista y la lectura de imágenes usan el **modelo rápido** (`ia.modelo_rapido`, Claude Sonnet 5.5). Respaldo: `gpt-4.1` completo, porque si entra debe poder hacer el análisis entero. Fable 5.1 descartado: 2,5× el costo de Opus y turnos largos que chocan con los 300 s de Vercel.

### 21. Enfoque del sistema elegible
Pedido de Byron (17/10/2026): CREATOR solo pensaba en ventas. Ahora cada reunión tiene `levantamientos.enfoques` (hasta 3 de 8 áreas, en orden de prioridad; migración `0008`, las reuniones anteriores quedaron en "ventas"). Manda lo que elige el consultor; si no eligió, lo que el cliente marca en "¿En qué área necesitas más ayuda?" (`enfoquesDe`). Cada enfoque trae sus preguntas (las de ventas conservan sus claves, así las respuestas guardadas siguen valiendo), una guía para la IA y las categorías del catálogo afines. El análisis diagnostica todo el negocio pero diseña soluciones, plan y paquetes alrededor del enfoque. Con el enfoque "por definir", la IA elige el área de mayor retorno y lo explica.

### 22. El precio de los módulos a medida se fija por valor (implementado 18/10/2026)
Byron: AiUDA cobra por el valor que entrega, no por horas, y no quiere precios estandarizados; un módulo puede costar $200 o $18.900 según su valor, con justificación profesional. El tope de $900 y la tabla $300/$600/$900 los puso Claude como valor por defecto el 23/09 (no fueron decisión de negocio) y se eliminaron.

Cómo se calcula (`lib/valor.ts`, nada lo inventa la IA):
1. **Valor demostrado**: suma de las cifras con fuente de los problemas que *solo* ese módulo resuelve (la IA los lista en `dolores_que_resuelve`; los que ya resuelve un producto del catálogo no cuentan, y los compartidos se reparten). **Precio = valor mensual × 6 meses**: el cliente lo recupera en medio año y el primer año gana 2×. Sin tope.
2. **Sin valor demostrado**: referencia = 1,5 % de la facturación mensual del cliente (nueva cifra `facturacion_mensual` = clientes × ticket, con las mismas reglas de fuentes). Se marca "sin valor demostrado" y el editor dice qué preguntar para poder subir el precio.
3. **Piso de rentabilidad**: nunca menos de 2× el costo directo (semanas × $165). Solo lo ve el consultor.
El cliente ve el retorno (no el piso). Costos informados por Byron (18/10/2026): desarrollo de un proyecto ~$1.000 (semana de equipo $130–200), digital $200/mes, costos fijos operativos $900/mes; sobre eso todo es ganancia salvo casos específicos. Parámetros editables en Ajustes → Precios. Primer caso real: la distribuidora de prueba pasó de $900 a $2.520 (referencia sobre $168.000/mes de facturación). Medición previa con 5 clientes: solo 14 de 39 dolores tenían cifra, así que la calidad del precio depende de cuantificar en la reunión.
