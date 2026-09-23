# CREATOR · AiUDA

Sistema para la primera reunión con un cliente: entiende el negocio, descubre los dolores (también los ocultos) con cifras fundamentadas, diseña la solución con IA, arma tres paquetes con precio e IVA, se presenta en el iPad y cierra el trato con el acuerdo listo para firmar. Todo queda versionado y se envía al CRM.

**Producción:** https://creator.emprendimientum.com

## Documentación

| Documento | Para qué |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Reglas y trampas para trabajar en el código (lo lee Claude al iniciar) |
| [docs/ESTADO.md](docs/ESTADO.md) | Qué está hecho, qué sigue y datos de producción |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Estructura, flujo, datos, API |
| [docs/DECISIONES.md](docs/DECISIONES.md) | Por qué está hecho así |
| [docs/OPERACION.md](docs/OPERACION.md) | Publicar, variables, migraciones, CRM, problemas conocidos |
| [docs/HISTORIAL.md](docs/HISTORIAL.md) | Qué se hizo y cuándo |

## Empezar

```bash
pnpm install
cp .env.example .env.local   # completar (ver docs/OPERACION.md)
pnpm db:migrate
pnpm admin:create tu@correo.com "contraseña-segura"
pnpm dev
```

## Comandos

```bash
pnpm dev          # desarrollo en :3000
pnpm check        # tipos + lint + pruebas
pnpm build        # build de producción
pnpm db:migrate   # migraciones pendientes
git push          # publica (Vercel despliega main)
```

## Principios

- **Los números los calcula el código, no la IA** (precios, IVA, márgenes, desembolsos, impacto y ROI).
- **No se inventan cifras:** cada una muestra su cuenta y de dónde sale cada dato; si falta uno, queda "por cuantificar".
- **Nada se borra:** versiones inmutables, soft delete, bitácora, respaldo JSON.
- **Lo interno no sale:** costos, márgenes y notas internas nunca llegan al cliente.
- **Una sola fuente para todas las salidas:** `src/server/documento.ts`.
