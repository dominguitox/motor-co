# AGENTS.md — motor-co

Instrucciones para agentes de IA que trabajen en este repositorio. El plan completo está en
[`plan-motor-modelos-flujos.md`](./plan-motor-modelos-flujos.md) y la decisión de stack vigente en
[`docs/decisions/001-ruta-a.md`](./docs/decisions/001-ruta-a.md). Este archivo es la fuente de verdad
operativa; si contradice al plan, gana este archivo y se corrige el plan.

## 1. Qué es este proyecto

**Nombre: `motor-co`.** Repo: `https://github.com/dominguitox/motor-co`.
Producción: `https://motor.jorgelio.cl` (DirectAdmin, PHP/MySQL).

Un motor no-code mínimo: el usuario define **modelos** (campos), carga **registros** con un CRUD
generado y define **flujos** lineales que se disparan con eventos. Es una pieza de portafolio para
conseguir un puesto **junior** en una agencia en Chile.

Consecuencia práctica: **el proyecto es un medio, no un fin.** Su éxito se mide en entrevistas, no en
usuarios. Se valora más un repo pequeño, terminado, con tests, CI y deploy, que una app ambiciosa a medias.

- Sin registro de usuarios: solo login con una cuenta demo sembrada.
- Un único espacio de trabajo. Sin multi-tenant, sin roles, sin cobro.
- Fecha de congelamiento: **día 30**. Lo que no esté, no existe.
- Si una idea no está en la sección 3, **preguntar antes de implementarla**.

## 2. Stack (cerrado) — Ruta A

El hosting del autor es **DirectAdmin con PHP y MySQL y no ejecuta procesos fuera de PHP**.
Por eso la app es React (estático) + Laravel (API y mismo origen), y no un servidor de aplicación propio.
Es además el stack que usan las agencias chilenas.

| Capa | Elección |
|---|---|
| Frontend | React 19 + TypeScript estricto + Vite |
| Estilos | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Datos remotos | TanStack Query |
| Formularios | React Hook Form + Zod (solo frontend) |
| Router | React Router (solo cuando exista una segunda vista) |
| API | Laravel (solo API, `routes/api.php`; sin Blade para la app) |
| Auth | Laravel Sanctum |
| Base de datos | MySQL 8 (Docker local en `3307`; DirectAdmin en producción) |
| Registros | columna JSON de MySQL, validación en la capa de aplicación |
| Contrato | `docs/openapi.yaml` a mano + tipos TS con `openapi-typescript` |
| Tests API | Pest |
| Tests front | Vitest + Testing Library |
| E2E | Playwright |
| Monorepo | npm workspaces solo para JS (`apps/web`, `apps/e2e`); Laravel vive aparte en `apps/api` |
| CI | GitHub Actions: un job PHP+MySQL y un job JavaScript |
| Deploy | Front compilado dentro de Laravel, mismo origen; DirectAdmin |

**Prohibido instalar sin justificarlo en el PR y pedir permiso:** Nx, Turborepo, NestJS, tRPC,
Docker Compose con múltiples servicios, librerías de UI, de drag-and-drop o generadores de formularios,
cualquier ORM distinto de Eloquent, cualquier servidor de aplicación alternativo. El stack anterior
(descrito en el ADR 001) **no está vigente**: no se instala nada de él.

**No usar `pnpm`** (no está instalado). Se usa **npm**. **No usar `gh`, `flyctl` ni `vercel`** (tampoco
están instalados).

## 3. Alcance congelado

### Entra

- Login con cuenta demo (sin registro).
- Constructor de modelos: nombre + campos.
- 5 tipos de campo: `text`, `number`, `date`, `boolean`, `reference`.
- CRUD generado por modelo: lista, búsqueda, filtro, orden, paginación, crear, editar, borrar.
- Formulario generado desde la definición, con validación compartida (Zod en el front, FormRequest en la API).
- Referencias simples entre modelos (selector, nunca texto libre).
- Flujos lineales: trigger `manual` o `on_create`; precondición única `campo operador valor`
  (`=`, `!=`, `>`, `<`, `>=`, `<=`, `contains`); pasos `update_field` y `create_record`.
- Historial de ejecuciones: estado, fecha, error legible.
- CI con MySQL real y deploy automático a DirectAdmin.
- MCP con 4 herramientas (opcional, día 26, pieza separada; ver plan).

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
    api/            Laravel: app/, routes/api.php, database/, tests/
    web/            React + Vite (workspace npm)
    e2e/            Playwright (workspace npm)
  docs/
    openapi.yaml    contrato escrito a mano
    decisions/      ADR cortos
    architecture.md
  .github/workflows/
  docker-compose.yml  solo mysql:8.4
```

### Límites que no se cruzan

1. El **motor de flujos** vive en un servicio de Laravel (`app/Services/FlowEngine`) y **no conoce HTTP**:
   no recibe `Request`, no devuelve `Response`, no usa `$request->...`. Recibe datos tipados y devuelve un
   resultado.
2. Las **rutas y controladores no contienen lógica de negocio**: validan con FormRequest, delegan en un
   servicio y responden un recurso/JSON.
3. El frontend **no conoce la base de datos**: solo consume `docs/openapi.yaml` a través de tipos generados.
4. Sin Blade para la app: Laravel solo sirve JSON y, en producción, el `index.html` compilado.

Si una tarea requiere romper uno de estos límites, parar y proponer una alternativa.

## 5. Comandos

```bash
# raíz
npm install
npm run dev:web            # Vite (proxy /api -> 127.0.0.1:8000)
npm run dev:api            # php artisan serve
npm run lint               # pint --test + eslint
npm run typecheck          # tsc --noEmit
npm test                   # pest + vitest
npm run build              # build del front

# base de datos
docker compose up -d
docker compose ps

# API (desde apps/api)
composer install
php artisan migrate
php artisan db:seed
php artisan test           # pest
./vendor/bin/pint --test
```

Regla: **no se declara una tarea terminada sin lint, typecheck, test y build en verde** (en la API:
`pint --test` y `php artisan test`).

## 6. Dominio y decisiones técnicas

### Registros en columna JSON

Los registros viven en `records.data` (JSON de MySQL); las definiciones en `fields`. **No** se crean
tablas reales por modelo ni DDL dinámico.

- Validación en la capa de aplicación: **FormRequest generado desde `Field[]`** en Laravel y **Zod
  generado desde `Field[]`** en el frontend. No hay constraints por campo en la base.
- Al tocar consultas de registros, respetar la paginación `{ items, page, size, total }`.

### Motor de flujos

Semántica del ejecutor (no cambiar sin discutirlo):

1. Flujo deshabilitado → no corre.
2. Precondición falsa → `flow_runs.status = skipped` (no `failed`).
3. Pasos en orden dentro de **una transacción** (`DB::transaction`).
4. Cualquier paso que falla → rollback completo, `status = failed`, guardar paso y error legible.
5. Éxito → commit, `status = success`, detalle por paso.
6. `on_create` corre **después** de crear el registro y usa
   `idempotency_key = "create:<recordId>:<flowId>"` (unique) para no duplicar efectos.
7. Sin reintentos automáticos. Sin recursión: un flujo no llama a otro flujo.

**El DSL se interpreta, nunca se ejecuta como código.** Prohibido `eval`, `Function`, expresiones del
usuario o plugins. Cualquier propuesta que requiera ejecutar código del usuario se rechaza.

### Referencias

Borrar un registro referenciado **no** hace cascada en la V1: se rechaza con `409` y se documenta.

## 7. Contrato de API y convenciones

- **El contrato se escribe primero en `docs/openapi.yaml`**, a mano. Los tipos TS se generan con
  `openapi-typescript`; no se editan a mano.
- Errores: `{ error: { code, message, details? } }`. **Nunca** stack traces al cliente.
- Validación fallida: `422` con detalle por campo.
- Auth: Sanctum; `401` sin sesión, `403` en recurso ajeno.
- Paginación: `{ items, page, size, total }`.
- Rutas bajo `/api`: `/auth/login`, `/auth/logout`, `/auth/me`, `/models`, `/models/:id/fields`,
  `/models/:id/records`, `/records/:id`, `/models/:id/flows`, `/flows/:id`, `/flows/:id/run`,
  `/flows/:id/runs`, `/runs/:id`.
- Nombres de archivos y carpetas en inglés; textos de UI en español.

## 8. Tests

| Capa | Herramienta | Qué cubre | Meta |
|---|---|---|---|
| Unidad API | Pest | generación de reglas desde `Field[]`, evaluador de condiciones, motor de flujos | 15–20 |
| Integración API | Pest + MySQL real | Auth, permisos, validación, CRUD, referencias, ejecución de flujo | 15–20 |
| Front | Vitest + Testing Library | estados de la UI, formulario dinámico, tabla | 8–12 |
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
2. **No romper los límites** de la sección 4, especialmente el motor de flujos sin HTTP.
3. **No agregar dependencias** sin justificarlo y avisar. Nada de `pnpm`, `gh`, `flyctl` ni `vercel`.
4. **No ejecutar código del usuario** (DSL) ni introducir `eval`/`Function`.
5. **No copiar la estructura de Congelandia** ni de otros proyectos del usuario: motor-co se diseña
   desde cero. Si se hereda estructura, se hereda deuda y se pierde el relato de autoría.
6. **No generar archivos innecesarios** (índices de barriles, capas vacías, abstracciones de un solo uso).
   Preferir código explícito y legible a "arquitectura" decorativa.
7. **No dejar TODOs silenciosos.** Si algo queda pendiente, se documenta en el PR o en un issue.
8. **No tocar** `C:\Proyectos\Congelandia`, `C:\Proyectos\app-ventas-base` ni
   `C:\Proyectos\Herd\jorgelio-portafolio`.
9. Documentar decisiones con impacto en `docs/decisions/NNN-titulo.md` (formato ADR corto).
10. **Nunca commitear `.env`, credenciales ni dumps.** Solo `.env.example`.
11. El código debe poder explicarse en voz alta por el autor. Si el agente escribe algo que el autor no
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
