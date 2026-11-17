# ADR 001 — Ruta A: React + Laravel en lugar de React + Node

- **Estado:** aceptada
- **Fecha:** 2026-11-17
- **Reemplaza:** el stack Node/Fastify/Prisma/PostgreSQL/pnpm/Fly.io descrito originalmente en
  `plan-motor-modelos-flujos.md`.

## Contexto

El plan inicial proponía un monorepo pnpm con una API Node 22 + Fastify + Prisma sobre PostgreSQL,
frontend en Vercel, API en Fly.io y base de datos en Neon. Ese stack era razonable como ejercicio,
pero choca con dos restricciones reales del autor:

1. **Hosting:** la app se publica en un **DirectAdmin con PHP y MySQL**. Ese entorno ejecuta PHP y
   archivos estáticos; **no ejecuta procesos Node** ni permite un runtime persistente. Mantener la API
   en Node obligaría a pagar y operar otro proveedor (Fly.io/Neon) solo para el portafolio, y a
   gestionar CORS y dos deploys distintos.
2. **Mercado objetivo:** las agencias chilenas a las que se postula trabajan mayoritariamente con
   **PHP/Laravel** y **React**. Un proyecto que combine ambos lenguajes en un solo repo demuestra
   empleabilidad directa; uno puramente Node demuestra menos de lo que el mercado pide.

Además, el autor ya tiene experiencia demostrable en Laravel (Congelandia, app-ventas-base), por lo que
la parte PHP no es una carga de aprendizaje nueva: el aprendizaje que aporta valor es el frontend
React + TypeScript.

## Decisión

Se adopta la **Ruta A**:

| Capa | Elección |
|---|---|
| Frontend | React 19 + TypeScript estricto + Vite |
| Estilos | Tailwind CSS 4 con `@tailwindcss/vite` |
| Datos remotos | TanStack Query |
| Formularios | React Hook Form + Zod (solo frontend) |
| API | Laravel 13, solo API (`routes/api.php`), sin Blade para la app |
| Auth | Laravel Sanctum |
| Base de datos | MySQL 8 (Docker local en el puerto 3307; DirectAdmin en producción) |
| Registros | columna JSON de MySQL, validación en la capa de aplicación |
| Contrato | `docs/openapi.yaml` escrito a mano + tipos TS con `openapi-typescript` |
| Tests API | Pest |
| Tests front | Vitest + Testing Library |
| E2E | Playwright |
| Monorepo | npm workspaces solo para JS (`apps/web`, `apps/e2e`); Laravel en `apps/api` |
| CI | GitHub Actions con un job PHP+MySQL y un job Node |
| Deploy | Front compilado dentro de Laravel, servido desde el mismo origen |

El motor de flujos se implementa como un servicio PHP (`app/Services/FlowEngine`) que no conoce HTTP.
El MCP del día 26, si se hace, será una pieza separada en Node/TypeScript y no condiciona la app.

## Consecuencias

**Positivas**

- Un solo origen en producción: Laravel sirve la API y el `index.html` compilado; sin CORS, sin
  segundo deploy, sin costo extra de hosting.
- El deploy encaja en DirectAdmin (subir archivos + `php artisan migrate`), sin Docker en producción.
- El CV muestra React + TypeScript + Laravel + MySQL + tests + CI, que es exactamente el perfil que
  piden las agencias locales.
- Se elimina Prisma, Fly.io, Neon y Vercel del camino crítico.

**Negativas / trade-offs**

- El monorepo deja de ser homogéneo: npm workspaces solo cubre JS; PHP se gestiona con Composer.
  Se acepta porque la alternativa (un solo runtime) no está disponible en el hosting.
- El contrato OpenAPI se escribe a mano y puede desincronizarse del código. Mitigación: el archivo es
  la fuente para generar tipos y los tests de integración cubren las rutas.
- No hay tipos compartidos reales entre front y back; se compensa con `openapi-typescript` y Zod en el
  frontend.
- Docker queda reducido a MySQL local; no se dockeriza la API para no introducir un entorno que
  producción no usa.

## Alternativas descartadas

1. **Node/Fastify/Prisma en Fly.io (plan original):** imposible de alojar en el DirectAdmin del autor
   y obliga a operar dos infraestructuras para un proyecto de portafolio.
2. **Laravel con Blade/Inertia:** descartado porque el objetivo del portafolio es demostrar React y
   TypeScript; Inertia habría escondido el frontend detrás de PHP.
3. **Firebase/Supabase como backend:** resuelve el hosting pero elimina la señal PHP/Laravel que pide
   el mercado objetivo y reduce el proyecto a CRUD sobre un servicio de terceros.
