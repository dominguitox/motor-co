# motor-co

Motor de modelos y flujos: el usuario define campos y reglas sin tocar código.

> Estado: en construcción. Repo inicializado, sin código todavía.

## Qué es

Una aplicación web mínima donde se puede:

1. **Definir un modelo**: un nombre y una lista de campos (`text`, `number`, `date`, `boolean`, `reference`).
2. **Cargar registros** con un CRUD generado desde esa definición: lista, búsqueda, filtro, orden,
   paginación, crear, editar y borrar.
3. **Definir flujos** lineales que se disparan a mano o al crear un registro, con una precondición
   (`campo operador valor`) y pasos (`update_field`, `create_record`).
4. **Ver el historial de ejecuciones** con estado, fecha y error legible.

Los registros se guardan en JSONB y se validan con Zod generado desde la definición de los campos.

## Para quién

Pieza de portafolio para un puesto junior de desarrollo web. Se prioriza un proyecto terminado, con
tests, CI y deploy real, por sobre funcionalidades.

## Stack

| Capa | Elección |
|---|---|
| Monorepo | pnpm workspaces |
| Web | React 19 + TypeScript + Vite + TanStack Query + React Hook Form + Zod |
| Estilos | Tailwind CSS 4 |
| API | Node 22 + TypeScript + Fastify |
| Validación | Zod en `packages/shared` |
| Datos | Prisma + PostgreSQL |
| Tests | Vitest, Supertest, Playwright |
| CI/CD | GitHub Actions, Vercel (web), Fly.io (API), Neon (DB) |

## Estructura

```
apps/web     interfaz
apps/api     API HTTP y motor de flujos
apps/e2e     pruebas end-to-end
packages/shared  tipos, esquemas Zod y DSL de flujos (sin HTTP, sin DB, sin React)
docs         arquitectura y decisiones (ADR)
```

## Documentación

- [`AGENTS.md`](./AGENTS.md): reglas de trabajo, alcance y decisiones técnicas.
- [`plan-motor-modelos-flujos.md`](./plan-motor-modelos-flujos.md): plan de ejecución de 30 días.

## Estado

- [ ] Monorepo con pnpm workspaces
- [ ] API desplegada (hello world)
- [ ] CI en verde
- [ ] Auth y modelos
- [ ] Registros y CRUD generado
- [ ] Motor de flujos
- [ ] E2E y deploy automático
