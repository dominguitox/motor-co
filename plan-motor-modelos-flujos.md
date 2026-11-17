# Plan de ejecución — Motor de modelos y flujos (V1 portafolio, 30 días)

**Objetivo:** conseguir un puesto junior en una agencia en Chile.
**El proyecto es un medio, no un fin.** Su éxito se mide en entrevistas, no en usuarios.
**Fecha de congelamiento:** día 30. Lo que no esté, no existe.

> **Nota de vigencia (2026-11-17).** Este plan se escribió con un stack Node/Fastify/Prisma/PostgreSQL
> y deploy en Vercel + Fly.io + Neon. Ese stack fue reemplazado por la **Ruta A**: React + Vite en el
> frontend y **Laravel + MySQL en DirectAdmin** en el backend, con npm workspaces en lugar de pnpm.
> El motivo es que el hosting del autor es DirectAdmin con PHP/MySQL y no ejecuta procesos Node, y
> porque React + Laravel es el stack que usan las agencias chilenas. Las secciones de stack, modelo de
> datos, estructura, CI/CD, tests, MCP y calendario ya están actualizadas. La decisión completa está en
> [`docs/decisions/001-ruta-a.md`](./docs/decisions/001-ruta-a.md).

---

## 1. Criterio de éxito (día 30)

- [ ] URL pública funcionando con cuenta demo y credenciales visibles.
- [ ] Pipeline de CI en verde con badge en el README.
- [ ] Entre 25 y 40 tests con sentido (unitarios, integración y 2 E2E).
- [ ] Despliegue automático desde `main`, ejecutado al menos 5 veces.
- [ ] README que se entiende en 2 minutos: qué es, para quién, arquitectura, decisiones, capturas.
- [ ] Video de 3 minutos mostrando el flujo completo.
- [ ] Integrado al portafolio, con el P0 corregido.
- [ ] Puedo explicar cada archivo sin decir "lo hizo un agente".

Si al día 30 falta la app pero sobran deploy, tests, CI y README, **se aprueba**. Si sobra app y falta lo otro, **se reprueba**.

---

## 2. Contexto: qué existe y cómo se usa

| Proyecto | Estado | Rol en el portafolio | Acción |
|---|---|---|---|
| **Congelandia** | Laravel 13, 17 modelos, 91 PRs, 2.060 líneas de tests. Coautoría con Elías Pérez. Cambios sin commitear. | Mejor evidencia de trabajo real y colaborativo | No tocar. Describir con honestidad el rol propio y la coautoría. |
| **app-ventas-base** | Laravel 13, 60 tests en verde, CI, deploy, v1.1.0. Repo privado. | Producto white-label mantenido, con tests y pipeline | Publicar el repo (es seguro) o cambiar el enlace roto. Actualizar la ficha. |
| **jorgelio-portafolio** | Astro, textos de plantilla y link 404 | Vitrina | P0 de 4 horas, no rediseñar. |
| **Motor (nuevo)** | No existe | Señal de React + TS + Node + tests + CI/CD | Construir en 30 días, repo separado. |

**Regla:** el motor no se inspira en el código de Congelandia. Se diseña desde cero. Si se copia estructura, se hereda deuda y se pierde el relato de "lo construí yo".

---

## 3. Alcance congelado

### Entra

- Login con una cuenta demo sembrada. Sin registro.
- Un solo espacio de trabajo (sin multi-tenant).
- Constructor de modelos: nombre + campos.
- 5 tipos de campo: `text`, `number`, `date`, `boolean`, `reference`.
- CRUD generado por modelo: lista, búsqueda, filtro, orden, paginación, crear, editar, borrar.
- Formulario generado desde la definición, con validación compartida.
- Referencias simples entre modelos (selector, no texto libre).
- Flujos lineales: trigger `manual` o `on_create`.
- Precondición única: `campo operador valor` (`=`, `!=`, `>`, `<`, `>=`, `<=`, `contains`).
- 2 tipos de paso: `update_field`, `create_record`.
- Historial de ejecuciones: estado, fecha, error legible.
- Docker para MySQL local, CI con MySQL y deploy automático a DirectAdmin.
- MCP con 4 herramientas (opcional, día 26).

### No entra

Registro, planes, cobro, multi-empresa, invitaciones, roles.
Fórmulas, campos calculados, rollups, adjuntos, imágenes, geolocalización.
Ramas, bucles, esperas, cron, webhooks, correo, WhatsApp, APIs externas.
Kanban, calendario, exportar Excel, importar CSV masivo.
Asistente de IA propio, generación de apps con IA.
Tiempo real, websockets, notificaciones.

**Cada cosa de la lista de arriba arrastra cimientos. Si entra una, se cae el sprint.**

---

## 4. Stack (Ruta A)

| Capa | Elección | Por qué |
|---|---|---|
| Monorepo | npm workspaces solo para JS (`apps/web`, `apps/e2e`) | Sin pnpm instalado; Laravel vive aparte con Composer |
| Web | React 19 + TypeScript + Vite | Es la señal que falta en el portafolio |
| Datos remotos | TanStack Query | Estado de servidor, caché, invalidación: lo que pide una agencia |
| Formularios | React Hook Form + Zod | Validación en el cliente, espejo de las reglas del backend |
| Estilos | Tailwind CSS 4 | Velocidad, sin sistema de diseño propio |
| API | Laravel 13, solo API (`routes/api.php`) | Encaja en el hosting DirectAdmin y es el stack de las agencias locales |
| Validación | FormRequest generados desde `Field[]` (servidor) + Zod (cliente) | Una regla, dos implementaciones, tests en ambos lados |
| ORM | Eloquent + MySQL 8 | Migraciones, seed, MySQL en DirectAdmin |
| Auth | Laravel Sanctum con cookie de sesión | Simple y defendible; sin JWT innecesario |
| Contrato | `docs/openapi.yaml` a mano + tipos TS con `openapi-typescript` | El front no adivina el formato de la API |
| Tests | Pest + Vitest/Testing Library + Playwright | Unidad, integración y E2E |
| CI | GitHub Actions (job PHP+MySQL y job Node) | Servicio MySQL real, cache, gates |
| Deploy | DirectAdmin: front compilado dentro de Laravel, mismo origen | Sin CORS ni segundo proveedor; PHP/MySQL ya disponibles |

**Lo que no se instala:** Nx, Turborepo, NestJS, tRPC, Prisma, Docker Compose con 8 servicios,
librerías de UI, drag-and-drop o generadores de formularios, Sentry, feature flags. Complejidad sin
retorno en 30 días. Tampoco pnpm, `gh`, `flyctl` ni `vercel` (no están instalados).

---

## 5. Modelo de datos (Eloquent + MySQL)

Tablas creadas con migraciones de Laravel (nombres en snake_case, `id` bigint autoincremental,
`created_at`/`updated_at`):

| Tabla | Columnas principales |
|---|---|
| `users` | `email` unique, `password` hash, `name` |
| `models` | `name`, `slug` unique |
| `fields` | `model_id` FK cascade, `key`, `label`, `type` (`text\|number\|date\|boolean\|reference`), `required`, `options` JSON (`maxLength`, `min`, `max`, `target_model_id`), `position`; unique (`model_id`, `key`) |
| `records` | `model_id` FK cascade, `data` JSON, índices (`model_id`, `created_at`) |
| `flows` | `name`, `model_id` FK cascade, `trigger` (`manual\|on_create`), `condition` JSON, `steps` JSON, `enabled` |
| `flow_runs` | `flow_id` FK cascade, `record_id` nullable, `status` (`success\|failed\|skipped`), `detail` JSON, `error` text, `idempotency_key` unique nullable, índice (`flow_id`, `created_at`) |

### Decisión clave: columna JSON, no una tabla por modelo

Los registros viven en `records.data` como columna `JSON` de MySQL. La validación y los tipos viven en
`fields`. Se indexa con índices normales (`model_id`, `created_at`) y, si hace falta, con columnas
generadas para campos puntuales.

**Por qué:** crear tablas reales por modelo exige un motor DDL y migraciones con datos vivos. Correcto
para producción, imposible para 30 días.

**Cómo se defiende en entrevista:** "Elegí una columna JSON para la V1 porque el costo dominante era la
evolución del esquema, no el volumen. El trade-off es que las consultas agregadas son más lentas y no
tengo constraints en la base; por eso toda la validación está en la capa de aplicación, con FormRequest
en Laravel y Zod en el frontend, generados desde las definiciones. Con más volumen migraría a columnas
generadas para los campos indexables, y lo dejé documentado en `docs/decisions/002-json-records.md`."

---

## 6. Contrato de la API

```
POST   /auth/login            { email, password }        -> cookie de sesión
POST   /auth/logout
GET    /auth/me

GET    /models
POST   /models                { name, fields[] }
GET    /models/:id
PATCH  /models/:id
DELETE /models/:id

POST   /models/:id/fields
PATCH  /models/:id/fields/:fieldId
DELETE /models/:id/fields/:fieldId

GET    /models/:id/records?page=&size=&sort=&order=&q=&field=&value=
POST   /models/:id/records
GET    /records/:id
PATCH  /records/:id
DELETE /records/:id

GET    /models/:id/flows
POST   /models/:id/flows      { name, trigger, condition, steps[], enabled }
PATCH  /flows/:id
DELETE /flows/:id
POST   /flows/:id/run         { recordId? }
GET    /flows/:id/runs
GET    /runs/:id
```

Convenciones:

- Errores: `{ error: { code, message, details? } }`. Nunca stack traces al cliente.
- Paginación: `{ items, page, size, total }`.
- Validación: FormRequest generado desde `Field[]` en Laravel; Zod equivalente en el frontend.
- Contrato: `docs/openapi.yaml` escrito a mano; los tipos TS se generan con `openapi-typescript`.
- Auth: Sanctum; 401 sin sesión, 403 en recurso ajeno.
- Referencias: al borrar un registro referenciado, la V1 **no** hace cascada; se rechaza con 409 y se documenta.

---

## 7. Formato del flujo (DSL)

```json
{
  "name": "Avisar trabajo caro",
  "trigger": "on_create",
  "condition": { "field": "precio", "operator": ">", "value": 80000 },
  "steps": [
    { "type": "update_field", "config": { "field": "estado", "value": "revisar" } },
    { "type": "create_record", "config": { "modelId": "...", "data": { "detalle": "Trabajo sobre 80.000" } } }
  ]
}
```

### Semántica del ejecutor

1. Cargar flujo y registro. Si el flujo está deshabilitado → no corre.
2. Evaluar la precondición. Si falla → `FlowRun.status = skipped`.
3. Abrir transacción. Ejecutar pasos en orden.
4. Si un paso falla → rollback completo, `status = failed`, guardar el paso y el error.
5. Si todo pasa → commit, `status = success`, detalle por paso.
6. `on_create` se ejecuta **después** de crear el registro, con `idempotency = "create:<recordId>:<flowId>"` para no duplicar.
7. Sin reintentos automáticos en la V1. El fallo queda visible en el historial y se puede volver a correr a mano.
8. Un flujo no puede llamar a otro flujo. Sin recursión.

**Fuera de alcance explícito:** `eval`, `Function`, expresiones del usuario, plugins. El DSL se interpreta, nunca se ejecuta como código.

---

## 8. Estructura del repo

```
motor-co/
  apps/
    web/
      src/
        pages/           # login, models, models/:id, models/:id/records, flows
        components/      # FieldEditor, DynamicForm, RecordTable, FlowBuilder
        lib/             # api client, query keys, session, tipos generados
    api/                 # Laravel 13 (Composer, no workspace npm)
      app/
        Http/Controllers/  # auth, models, fields, records, flows
        Http/Requests/     # validación derivada de Field[]
        Models/            # User, Model, Field, Record, Flow, FlowRun
        Services/          # RecordService, FlowEngine, ConditionEvaluator
      routes/api.php
      database/migrations/
      database/seeders/
      tests/             # Pest: unit + feature
    e2e/
  docs/
    openapi.yaml         # contrato escrito a mano
    decisions/
    architecture.md
  .github/workflows/
```

**Tres límites que no se cruzan:**

- `FlowEngine` no conoce HTTP: no recibe `Request` ni devuelve `Response`.
- Las rutas y controladores no contienen lógica de negocio.
- El frontend solo consume el contrato: no importa código PHP ni conoce la base de datos.

---

## 9. CI/CD

### `.github/workflows/ci.yml`

Un job por stack. El job `web` queda preparado y se activa en el PR #2.

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  api:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/api
    services:
      mysql:
        image: mysql:8.4
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: motor_co
          MYSQL_USER: motor
          MYSQL_PASSWORD: secret
        ports: ['3306:3306']
        options: >-
          --health-cmd="mysqladmin ping -h 127.0.0.1 -uroot -proot"
          --health-interval=5s
          --health-timeout=5s
          --health-retries=10
    env:
      DB_CONNECTION: mysql
      DB_HOST: 127.0.0.1
      DB_PORT: 3306
      DB_DATABASE: motor_co
      DB_USERNAME: motor
      DB_PASSWORD: secret
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.4'
          extensions: mbstring, pdo_mysql, bcmath
          coverage: none
      - run: composer install --no-interaction --prefer-dist
      - run: cp .env.example .env && php artisan key:generate
      - run: php artisan migrate --force
      - run: ./vendor/bin/pint --test
      - run: php artisan test

  # web:
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - uses: actions/setup-node@v4
  #       with:
  #         node-version: 24
  #         cache: npm
  #     - run: npm ci
  #     - run: npm run typecheck
  #     - run: npx vitest run
  #     - run: npm run build
```

### `.github/workflows/e2e.yml`

Corre en PR que toque `apps/web/` o `apps/api/`: levanta MySQL, migra, siembra, compila el front,
levanta `php artisan serve` y ejecuta Playwright contra `127.0.0.1:8000`. Sube el reporte como artefacto.

### `.github/workflows/deploy.yml`

En `main` después de CI: compila el front (`npm run build`), sube Laravel + `public/build` al
DirectAdmin del autor y ejecuta `php artisan migrate --force`. El mecanismo exacto (SSH o FTP) se
decide en la sesión 2 con las credenciales; no hay deploy a Vercel, Fly.io ni Neon.

### Base de datos local

No hay `Dockerfile` para la API: producción es DirectAdmin con PHP-FPM, no un contenedor. Docker solo
se usa para MySQL 8.4 local (`docker-compose.yml`, host `3307`, volumen nombrado y `healthcheck`).

---

## 10. Calendario de 30 días

Supuesto: 4–5 h/día, 6 días/semana (~130 h).

| Días | Entregable | Evidencia acumulada |
|---|---|---|
| 1 | Repo, npm workspaces JS, Laravel API-only, TS estricto, ESLint/Prettier, README inicial | Estructura |
| 2 | MySQL en Docker, deploy de "hello world" React + Laravel a DirectAdmin | **URL viva** |
| 3 | `ci.yml` con job PHP+MySQL y job Node, en verde | **CI verde** |
| 4–5 | Migraciones Laravel: `users`, `models`, `fields`, `records`; seed demo; auth con Sanctum | Login real |
| 6–7 | Endpoints de modelos y campos + FormRequest derivados de `Field[]` | 8–10 tests de integración |
| 8–9 | Endpoints de registros: filtros, orden, paginación, referencias | 15–18 tests |
| 10–11 | Web: layout, login, lista de modelos, constructor de campos | Navegable |
| 12–14 | Web: formulario dinámico, tabla, editar/borrar, estados vacíos y de error | **Demo usable** |
| 15–16 | `FlowEngine` + `ConditionEvaluator` + `flows`/`flow_runs` | Unitarios del motor |
| 17–18 | Endpoints de flujos + ejecución transaccional + idempotencia | Integración de ejecución, fallo y skip |
| 19–21 | Web: constructor de flujos lineal, historial de ejecuciones | **Producto completo** |
| 22 | Playwright: login → crear modelo → registro → flujo → historial | 2 E2E en CI |
| 23 | Build del front integrado en Laravel, deploy automático desde `main` | **CD real** |
| 24 | Seed realista, responsive básico, accesibilidad mínima (labels, foco) | Pulido |
| 25 | README: arquitectura, decisiones, capturas, credenciales demo | Documentación |
| 26 | MCP con 4 herramientas + token con alcance (opcional, Node aparte) | Diferenciador |
| 27 | `docs/decisions/` (3 ADR) + video de 3 minutos | Material de entrevista |
| 28 | Integrar al portafolio: nueva ficha + hero + Tecnologías | Portafolio actualizado |
| 29 | P0 del portafolio: link roto, textos de plantilla, CV, LinkedIn | **Deja de perder clics** |
| 30 | Buffer, ensayo de la explicación oral, checklist final | Listo |

**Hitos de respaldo:** si al día 14 no hay demo usable, se corta alcance, no calidad. Si al día 23 no hay CD, se sacrifica el MCP y el pulido.

---

## 11. Escalera de cortes

En este orden, sin culpa:

1. MCP.
2. Campos `reference` (quedan 4 tipos).
3. Historial de ejecuciones en la UI (queda en base y en API).
4. Segundo E2E.
5. Constructor visual de flujos: se reemplaza por un editor JSON con validación y vista previa.
6. Flujos completos (último recurso: queda un CRUD dinámico sólido con tests, CI y deploy).

**Nunca se corta:** deploy real, CI en verde, tests de API, README, video, integración al portafolio.

---

## 12. Estrategia de tests

| Capa | Herramienta | Qué prueba | Meta |
|---|---|---|---|
| Unidad API | Pest | `recordSchema` desde `Field[]`, `ConditionEvaluator`, transiciones del motor | 15–20 |
| Integración API | Pest + MySQL real | Auth, permisos, validación, CRUD, referencias, ejecución de flujo (éxito, fallo, skip, idempotencia) | 15–20 |
| Front | Vitest + Testing Library | estados de la UI, formulario dinámico, tabla | 8–12 |
| E2E | Playwright | Alta de modelo → registro → flujo → historial; y validación de formulario | 2 |

Casos que sí valen puntos:

- Un flujo con precondición falsa queda `skipped`, no `failed`.
- Un paso que falla hace rollback y no deja el primer paso aplicado.
- Dos ejecuciones `on_create` del mismo registro no duplican el efecto.
- Un campo requerido ausente devuelve 422 con detalle por campo.
- Borrar un registro referenciado devuelve 409.

---

## 13. MCP (opcional)

Se implementa **en Node + TypeScript, como pieza separada**, el día 26. No vive dentro de Laravel ni
se despliega en DirectAdmin; consume la API HTTP con un token. Si el día 26 no está listo, se corta.

Herramientas:

| Herramienta | Acción | Riesgo |
|---|---|---|
| `list_models` | Leer definiciones | Bajo |
| `list_records` | Consultar con filtro y límite | Bajo |
| `create_record` | Crear registro validado | Medio |
| `run_flow` | Ejecutar flujo habilitado | Medio |

Reglas:

- Token propio, con alcance por modelo y por acción, guardado hasheado.
- Sin herramientas de borrado ni de cambio de esquema.
- Límite de filas y rate limit por token.
- Toda llamada queda en `FlowRun` o en un log de auditoría con el token usado.

**Si el día 26 no está listo, se corta.** No es requisito para una agencia junior.

---

## 14. Reglas de trabajo

1. `main` protegido. Todo entra por PR, incluso lo propio.
2. Commits convencionales: `feat:`, `fix:`, `test:`, `docs:`, `chore:`.
3. Un PR por feature, con descripción de qué y por qué.
4. Dejar 2 PRs con discusión técnica real (por ejemplo, "columna JSON vs una tabla por modelo"). Es gratis y demuestra criterio.
5. Issue por cada feature antes de empezar.
6. No refactorizar lo que ya pasa tests.
7. No agregar dependencias sin justificarlo en el PR.

---

## 15. Portafolio (días 28–29)

### P0 — 4 horas

- Publicar `app-ventas-base` (verificado: 60 tests en verde, sin secretos, `.env` y `.recovery/` ignorados) **o** cambiar el enlace. Nunca dejar un 404.
- Borrar los textos de plantilla de "Sitios Web en Producción" (`src/pages/index.astro`, L262–268).
- Reemplazar "Captura del proyecto" por capturas reales.
- Agregar CV PDF y LinkedIn en contacto. Quitar el placeholder de Instagram.

### Cambios de contenido

- Hero: mencionar React/TypeScript junto a Laravel y PHP.
- Tecnologías: agregar la tarjeta del stack moderno; mover OpenWrt/ESP32 a una línea de infraestructura.
- Portafolio: tres casos con estructura problema → rol → stack → resultado:
  1. Congelandia (coautor, aclarado).
  2. app-ventas-base (producto mantenido, 60 tests, CI).
  3. Motor (React/TS, tests, CI/CD, URL).
- Blog: dejarlo vacío pero sin promesa incumplida, o quitar del mosaico.

---

## 16. Cómo se explica en la entrevista (ensayar en voz alta)

1. "Es un motor de modelos y flujos: el usuario define campos y reglas sin tocar código."
2. "Los registros se guardan en una columna JSON de MySQL y los valido con FormRequest en Laravel y Zod en el frontend, generados desde las definiciones; el trade-off está documentado."
3. "El motor de flujos interpreta un DSL, no ejecuta código; cada ejecución es transaccional y queda auditada."
4. "Tengo 35 tests, CI con MySQL real, E2E en Playwright y deploy automático desde main."
5. "Mantengo además una app Laravel en producción y trabajé en un proyecto de título con otro desarrollador."

Si no puedo decir la frase 2 y la 3 sin leer, el proyecto no está terminado.

---

## 17. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| El constructor de campos se come 10 días | Sin drag-and-drop, sin preview, sin undo. Un select y un botón. |
| El motor de flujos se vuelve un lenguaje | Una condición, pasos lineales, dos tipos. Nada más. |
| Rediseñar el portafolio | Solo P0. Nada de fuentes ni paletas. |
| Perfeccionismo visual | Tailwind plano. Ordenado, no impresionante. |
| No puedo defender el código | 2 h leyendo los 6 controladores y 9 tests de `app-ventas-base` antes de publicarlo. |
| Se cae el deploy | DirectAdmin ya contratado; front compilado dentro de Laravel, sin entorno Node en producción. |
| Se acaba el tiempo | Escalera de cortes, en orden. |

---

## 18. Nombre

Decidido: **motor-co**. Repo `https://github.com/dominguitox/motor-co`, producción en
`https://motor.jorgelio.cl`.

---

## 19. Primeras 3 acciones

1. Crear el repo y el monorepo; commit inicial con README de una página. (Hecho.)
2. Desplegar el esqueleto de web y API el día 2. No el día 25.
3. Crear `ci.yml` el día 3 con MySQL de servicio.

A partir de ahí, cada día termina con un commit y el pipeline en verde.
