# AGENTS.md — Motor de modelos y flujos

Instrucciones para agentes de IA que trabajen en este repositorio. El plan completo está en
[`plan-motor-modelos-flujos.md`](./plan-motor-modelos-flujos.md); este archivo es el resumen operativo
y las reglas que **no** se negocian.

## 1. Qué es este proyecto

**Nombre: `motor-co`.** Repo: `motor-co`.

Un motor no-code mínimo: el usuario define **modelos** (campos), carga **registros** y define **flujos**
lineales que se disparan con eventos. Es una pieza de portafolio para conseguir un puesto **junior** en
una agencia en Chile.

Consecuencia práctica: **el proyecto es un medio, no un fin.** Su éxito se mide en entrevistas, no en
usuarios. Se valora más un repo pequeño, terminado, con tests, CI y deploy, que una app ambiciosa a medias.

- Sin registro de usuarios: solo login con una cuenta demo sembrada.
- Un único espacio de trabajo. Sin multi-tenant, sin roles, sin cobro.
- Fecha de congelamiento: **día 30**. Lo que no esté, no existe.
- Código congelado en el alcance de la sección 3. Si una idea no está ahí, **preguntar antes de implementarla**.

## 2. Stack (cerrado)

| Capa | Elección |
|---|---|
| Monorepo | pnpm workspaces |
| Web | React 19 + TypeScript + Vite |
| Datos remotos | TanStack Query |
| Formularios | React Hook Form + Zod |
| Estilos | Tailwind CSS 4 |
| API | Node 22 + TypeScript + Fastify |
| Validación | Zod en `packages/shared` (fuente única cliente/servidor) |
| ORM / DB | Prisma + PostgreSQL (JSONB) |
| Auth | Cookie de sesión HttpOnly + hash de password (argon2 o bcrypt) |
| Tests | Vitest + Supertest (integración) + Playwright (E2E) |
| CI | GitHub Actions con servicio Postgres |
| Deploy | Web en Vercel, API en Fly.io (Dockerfile), DB en Neon |

**Prohibido instalar sin justificación explícita en el PR:** Nx, Turborepo, NestJS, tRPC, Sentry,
feature flags, Prisma Accelerate, Docker Compose con múltiples servicios, librerías de UI o de
drag-and-drop, generadores de formularios, ORMs alternativos.

Antes de agregar cualquier dependencia: verificar que no exista ya una forma simple de hacerlo con lo
que está en el stack, y dejarlo escrito en el PR.

## 3. Alcance congelado

### Entra

- Login con cuenta demo (sin registro).
- Constructor de modelos: nombre + campos.
- 5 tipos de campo: `text`, `number`, `date`, `boolean`, `reference`.
- CRUD generado por modelo: lista, búsqueda, filtro, orden, paginación, crear, editar, borrar.
- Formulario generado desde la definición, con validación compartida con el backend.
- Referencias simples entre modelos (selector, nunca texto libre).
- Flujos lineales: trigger `manual` o `on_create`; precondición única `campo operador valor`
  (`=`, `!=`, `>`, `<`, `>=`, `<=`, `contains`); pasos `update_field` y `create_record`.
- Historial de ejecuciones: estado, fecha, error legible.
- Docker para la API, CI con Postgres real y deploy automático desde `main`.
- MCP con 4 herramientas (opcional, día 26).

### No entra (no implementar aunque parezca fácil)

Registro, planes, cobro, multi-empresa, invitaciones, roles. Fórmulas, campos calculados, rollups,
adjuntos, imágenes, geolocalización. Ramas, bucles, esperas, cron, webhooks, correo, WhatsApp, APIs
externas. Kanban, calendario, exportar Excel, importar CSV masivo. Asistente de IA propio, generación
de apps con IA. Tiempo real, websockets, notificaciones.

**Cada cosa de esta lista arrastra cimientos. Si entra una, se cae el sprint.**

## 4. Estructura del repo

```
motor-co/
  apps/
    web/  src/{pages,components,lib}
    api/  src/{routes,services,lib,plugins}, prisma/, test/
    e2e/
  packages/
    shared/  src/{fieldTypes.ts,recordSchema.ts,flowDsl.ts}
  docs/  decisions/, architecture.md
  .github/workflows/
```

### Tres límites que no se cruzan

1. `flowEngine` **no conoce HTTP**. Recibe datos, devuelve resultado. Nada de `req`/`reply`.
2. Las **rutas no contienen lógica de negocio**: validan, llaman a un servicio y responden.
3. `packages/shared` **no importa Prisma ni React**. Solo tipos, esquemas Zod y lógica pura.

Si una tarea requiere romper uno de estos límites, es señal de que el diseño está mal planteado:
parar y proponer una alternativa.

## 5. Comandos

```bash
pnpm install                      # instalar todo el monorepo
pnpm dev                          # web + api en desarrollo
pnpm lint
pnpm typecheck
pnpm test                         # Vitest (unidad + integración)
pnpm test -- --coverage
pnpm --filter api prisma migrate dev
pnpm --filter api prisma migrate deploy
pnpm --filter api prisma db seed
pnpm build
pnpm exec playwright test
```

Regla: **no se declara una tarea terminada sin `lint`, `typecheck`, `test` y `build` en verde.**

## 6. Dominio y decisiones técnicas

### Registros en JSONB

Los registros viven en `Record.data` (JSONB); las definiciones en `Field`. **No** se crean tablas reales
por modelo.

- Toda la validación está en la capa de aplicación, con **Zod generado desde `Field[]`**.
- La base no tiene constraints por campo. No agregarlos con DDL dinámico.
- Al tocar consultas de registros, respetar la paginación `{ items, page, size, total }`.

### Motor de flujos

Semántica del ejecutor (no cambiar sin discutirlo):

1. Flujo deshabilitado → no corre.
2. Precondición falsa → `FlowRun.status = skipped` (no `failed`).
3. Pasos en orden dentro de **una transacción**.
4. Cualquier paso que falla → rollback completo, `status = failed`, guardar paso y error legible.
5. Éxito → commit, `status = success`, detalle por paso.
6. `on_create` corre **después** de crear el registro y usa `idempotency = "create:<recordId>:<flowId>"`
   para no duplicar efectos.
7. Sin reintentos automáticos. Sin recursión: un flujo no llama a otro flujo.

**El DSL se interpreta, nunca se ejecuta como código.** Prohibido `eval`, `new Function`, expresiones
del usuario o plugins. Cualquier propuesta que requiera ejecutar código del usuario se rechaza.

### Referencias

Borrar un registro referenciado **no** hace cascada en la V1: se rechaza con `409` y se documenta.

## 7. Contrato de API y convenciones

- Errores: `{ error: { code, message, details? } }`. **Nunca** stack traces al cliente.
- Validación fallida: `422` con detalle por campo.
- Auth: middleware global; `401` sin sesión, `403` en recurso ajeno.
- Paginación: `{ items, page, size, total }`.
- Rutas bajo `/auth`, `/models`, `/models/:id/fields`, `/models/:id/records`, `/records/:id`,
  `/models/:id/flows`, `/flows/:id`, `/flows/:id/run`, `/flows/:id/runs`, `/runs/:id`.
- Nombres de archivos y carpetas en inglés; textos de UI en español.

## 8. Tests

| Capa | Herramienta | Qué cubre | Meta |
|---|---|---|---|
| Unidad | Vitest | `recordSchema` desde `Field[]`, `conditionEvaluator`, transiciones del motor | 15–20 |
| Integración | Vitest + Supertest + Postgres real | Auth, permisos, validación, CRUD, referencias, ejecución de flujo | 15–20 |
| E2E | Playwright | login → modelo → registro → flujo → historial; validación de formulario | 2 |

Casos obligatorios (tienen valor real, no rellenar con tests triviales):

- Precondición falsa ⇒ `skipped`, no `failed`.
- Paso que falla ⇒ rollback: el primer paso **no** queda aplicado.
- Dos ejecuciones `on_create` del mismo registro ⇒ no duplican el efecto.
- Campo requerido ausente ⇒ `422` con detalle por campo.
- Borrar registro referenciado ⇒ `409`.

No se sube cobertura con tests de getters, constantes ni mocks de la propia implementación.

## 9. Git y flujo de trabajo

- `main` protegido. Todo entra por PR, incluso lo propio.
- Commits convencionales: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`.
- Un PR por feature, con descripción de **qué** y **por qué**.
- Un issue por feature antes de empezar.
- No refactorizar lo que ya pasa tests.
- Cada día termina con un commit y el pipeline en verde.

Al trabajar como agente: cambios pequeños y enfocados, un problema por PR, y explicar los trade-offs
en la descripción. No mezclar refactors oportunistas con features.

## 10. Reglas para agentes

1. **No inventar alcance.** Si la tarea no está en la sección 3, preguntar antes de escribir código.
2. **No romper los tres límites** de la sección 4.
3. **No agregar dependencias** sin justificarlo y avisar.
4. **No ejecutar código del usuario** (DSL) ni introducir `eval`/`Function`.
5. **No copiar la estructura de Congelandia** ni de otros proyectos Laravel del usuario: el motor se
   diseña desde cero. Si se hereda estructura, se hereda deuda y se pierde el relato de autoría.
6. **No generar archivos innecesarios** (índices de barriles, capas vacías, abstracciones de un solo uso).
   Preferir código explícito y legible a "arquitectura" decorativa.
7. **No dejar TODOs silenciosos.** Si algo queda pendiente, se documenta en el PR o en un issue.
8. **No tocar el portafolio ni los otros repos** desde este proyecto (son tareas separadas, días 28–29).
9. Documentar decisiones con impacto en `docs/decisions/NNN-titulo.md` (formato ADR corto).
10. El código debe poder explicarse en voz alta por el autor. Si el agente escribe algo que el autor no
    puede defender en una entrevista, el agente falló.

## 11. Escalera de cortes (si falta tiempo)

En este orden, sin culpa: MCP → campos `reference` → historial de ejecuciones en la UI → segundo E2E →
constructor visual de flujos (se reemplaza por editor JSON validado) → flujos completos (queda un CRUD
dinámico sólido).

**Nunca se corta:** deploy real, CI en verde, tests de API, README, video, integración al portafolio.

## 12. Definición de "terminado"

Una tarea está terminada cuando:

- Está dentro del alcance congelado.
- Tiene tests que prueban el comportamiento, no la implementación.
- `lint`, `typecheck`, `test` y `build` pasan en local y en CI.
- No rompe los límites arquitectónicos ni duplica validación.
- El error que puede producir es legible para el usuario final.
- Se puede explicar en 30 segundos: qué hace, por qué así y qué trade-off tiene.
