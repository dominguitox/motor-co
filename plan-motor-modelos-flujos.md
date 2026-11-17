# Plan de ejecución — Motor de modelos y flujos (V1 portafolio, 30 días)

**Objetivo:** conseguir un puesto junior en una agencia en Chile.
**El proyecto es un medio, no un fin.** Su éxito se mide en entrevistas, no en usuarios.
**Fecha de congelamiento:** día 30. Lo que no esté, no existe.

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
- Docker para la API, CI con Postgres y deploy automático.
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

## 4. Stack

| Capa | Elección | Por qué |
|---|---|---|
| Monorepo | pnpm workspaces | Un solo repo, instalación reproducible, narrativa de monorepo |
| Web | React 19 + TypeScript + Vite | Es la señal que falta en el portafolio |
| Datos remotos | TanStack Query | Estado de servidor, caché, invalidación: lo que pide una agencia |
| Formularios | React Hook Form + Zod | Validación compartida con el backend |
| Estilos | Tailwind CSS 4 | Velocidad, sin sistema de diseño propio |
| API | Node 22 + TypeScript + Fastify | Ligero, rápido de montar, tipado |
| Validación | Zod en `packages/shared` | Una sola fuente de verdad cliente/servidor |
| ORM | Prisma + PostgreSQL | Migraciones, tipos, seed |
| Auth | Sesión con cookie HttpOnly + bcrypt/argon2 | Simple y defendible; sin JWT innecesario |
| Tests | Vitest + Supertest + Playwright | Unidad, integración, E2E |
| CI | GitHub Actions | Servicio Postgres, cache, gates |
| Deploy | Web en Vercel, API en Fly.io (Dockerfile), DB en Neon | Real, barato y sin operar TLS |

**Lo que no se instala:** Nx, Turborepo, NestJS, tRPC, Docker Compose con 8 servicios, Prisma Accelerate, Sentry, feature flags. Complejidad sin retorno en 30 días.

---

## 5. Modelo de datos (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  createdAt DateTime @default(now())
}

model Model {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  fields    Field[]
  records   Record[]
  flows     Flow[]
}

model Field {
  id        String   @id @default(cuid())
  modelId   String
  key       String
  label     String
  type      String   // text | number | date | boolean | reference
  required  Boolean  @default(false)
  options   Json?    // { maxLength, min, max, targetModelId }
  position  Int
  model     Model    @relation(fields: [modelId], references: [id], onDelete: Cascade)

  @@unique([modelId, key])
}

model Record {
  id        String   @id @default(cuid())
  modelId   String
  data      Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  model     Model    @relation(fields: [modelId], references: [id], onDelete: Cascade)

  @@index([modelId, createdAt])
}

model Flow {
  id          String   @id @default(cuid())
  name        String
  modelId     String
  trigger     String   // manual | on_create
  condition   Json?    // { field, operator, value }
  steps       Json     // [{ type, config }]
  enabled     Boolean  @default(true)
  model       Model    @relation(fields: [modelId], references: [id], onDelete: Cascade)
  runs        FlowRun[]
}

model FlowRun {
  id          String   @id @default(cuid())
  flowId      String
  recordId    String?
  status      String   // success | failed | skipped
  detail      Json?    // por paso: ok/error
  error       String?
  idempotency String?  @unique
  createdAt   DateTime @default(now())
  flow        Flow     @relation(fields: [flowId], references: [id], onDelete: Cascade)

  @@index([flowId, createdAt])
}
```

### Decisión clave: JSONB, no una tabla por modelo

Los registros viven en `Record.data` como JSONB. La validación y los tipos viven en `Field`. Se indexa con GIN sobre `data` y con índices de expresión para los campos más filtrados.

**Por qué:** crear tablas reales por modelo exige un motor DDL y migraciones con datos vivos. Correcto para producción, imposible para 30 días.

**Cómo se defiende en entrevista:** "Elegí JSONB para la V1 porque el costo dominante era la evolución del esquema, no el volumen. El trade-off es que las consultas agregadas son más lentas y no tengo constraints en la base; por eso toda la validación está en la capa de aplicación con Zod generado desde las definiciones. Con más volumen migraría a columnas generadas para campos indexables, y lo dejé documentado en `docs/decisions/001-jsonb.md`."

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
- Validación: Zod derivado de `Field[]`; el cliente usa el mismo esquema.
- Auth: middleware global; 401 sin sesión, 403 en recurso ajeno.
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
motor/
  apps/
    web/
      src/
        pages/           # login, models, models/:id, models/:id/records, flows
        components/      # FieldEditor, DynamicForm, RecordTable, FlowBuilder
        lib/             # api client, query keys, session
    api/
      src/
        routes/          # auth, models, fields, records, flows
        services/        # recordService, flowEngine, conditionEvaluator
        lib/             # prisma, session, errors
        plugins/
      prisma/
        schema.prisma
        seed.ts
      test/              # integration
    e2e/
  packages/
    shared/
      src/
        fieldTypes.ts
        recordSchema.ts  # genera Zod desde Field[]
        flowDsl.ts       # tipos + validación del flujo
  docs/
    decisions/
    architecture.md
  .github/workflows/
```

**Tres límites que no se cruzan:**

- `flowEngine` no conoce HTTP.
- Las rutas no contienen lógica de negocio.
- `shared` no importa Prisma ni React.

---

## 9. CI/CD

### `.github/workflows/ci.yml`

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
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm --filter api prisma migrate deploy
      - run: pnpm test -- --coverage
      - run: pnpm build
```

### `.github/workflows/e2e.yml`

Corre en PR que toque `web/` o `api/`: levanta Postgres, siembra, build, Playwright contra `localhost`. Sube el reporte como artefacto.

### `.github/workflows/deploy.yml`

En `main` después de CI:

- Web → `vercel deploy --prod` (token en secrets).
- API → `flyctl deploy` usando el `Dockerfile` multi-stage.
- `prisma migrate deploy` antes de levantar la nueva versión.

### `Dockerfile` de la API (multi-stage)

- Etapas: `deps` → `build` → `runtime`.
- Runtime `node:22-alpine`, usuario no root, `HEALTHCHECK /health`.
- Sin devDependencies en la imagen final.
- Secretos por variables de entorno, nunca en capas.

---

## 10. Calendario de 30 días

Supuesto: 4–5 h/día, 6 días/semana (~130 h).

| Días | Entregable | Evidencia acumulada |
|---|---|---|
| 1 | Repo, pnpm workspaces, TS estricto, ESLint/Prettier, README inicial | Estructura |
| 2 | `Dockerfile` API, deploy de "hello world" web + API, Postgres en Neon | **URL viva** |
| 3 | `ci.yml` con lint, typecheck, build, Postgres de servicio | **CI verde** |
| 4–5 | Prisma: `User`, `Model`, `Field`, `Record`; migraciones; seed demo; auth con cookie | Login real |
| 6–7 | Endpoints de modelos y campos + validación Zod | 8–10 tests de integración |
| 8–9 | Endpoints de registros: filtros, orden, paginación, referencias | 15–18 tests |
| 10–11 | Web: layout, login, lista de modelos, constructor de campos | Navegable |
| 12–14 | Web: formulario dinámico, tabla, editar/borrar, estados vacíos y de error | **Demo usable** |
| 15–16 | `flowEngine` + `conditionEvaluator` + `Flow`/`FlowRun` | Unitarios del motor |
| 17–18 | Endpoints de flujos + ejecución transaccional + idempotencia | Integración de ejecución, fallo y skip |
| 19–21 | Web: constructor de flujos lineal, historial de ejecuciones | **Producto completo** |
| 22 | Playwright: login → crear modelo → registro → flujo → historial | 2 E2E en CI |
| 23 | Dockerfile final, deploy automático desde `main` | **CD real** |
| 24 | Seed realista, responsive básico, accesibilidad mínima (labels, foco) | Pulido |
| 25 | README: arquitectura, decisiones, capturas, credenciales demo | Documentación |
| 26 | MCP con 4 herramientas + token con alcance (opcional) | Diferenciador |
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
| Unidad | Vitest | `recordSchema` desde `Field[]`, `conditionEvaluator`, transiciones del motor | 15–20 |
| Integración | Vitest + Supertest + Postgres real | Auth, permisos, validación, CRUD, referencias, ejecución de flujo (éxito, fallo, skip, idempotencia) | 15–20 |
| E2E | Playwright | Alta de modelo → registro → flujo → historial; y validación de formulario | 2 |

Casos que sí valen puntos:

- Un flujo con precondición falsa queda `skipped`, no `failed`.
- Un paso que falla hace rollback y no deja el primer paso aplicado.
- Dos ejecuciones `on_create` del mismo registro no duplican el efecto.
- Un campo requerido ausente devuelve 422 con detalle por campo.
- Borrar un registro referenciado devuelve 409.

---

## 13. MCP (opcional)

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
4. Dejar 2 PRs con discusión técnica real (por ejemplo, "JSONB vs columnas generadas"). Es gratis y demuestra criterio.
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

- Hero: mencionar React/TypeScript/Node junto a Laravel y PHP.
- Tecnologías: agregar la tarjeta del stack moderno; mover OpenWrt/ESP32 a una línea de infraestructura.
- Portafolio: tres casos con estructura problema → rol → stack → resultado:
  1. Congelandia (coautor, aclarado).
  2. app-ventas-base (producto mantenido, 60 tests, CI).
  3. Motor (React/TS, tests, CI/CD, URL).
- Blog: dejarlo vacío pero sin promesa incumplida, o quitar del mosaico.

---

## 16. Cómo se explica en la entrevista (ensayar en voz alta)

1. "Es un motor de modelos y flujos: el usuario define campos y reglas sin tocar código."
2. "Los registros se guardan en JSONB y valido con Zod generado desde las definiciones; el trade-off está documentado."
3. "El motor de flujos interpreta un DSL, no ejecuta código; cada ejecución es transaccional y queda auditada."
4. "Tengo 35 tests, CI con Postgres real, E2E en Playwright y deploy automático desde main."
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
| Se cae el deploy | PaaS, no VPS. Vercel + Fly + Neon. |
| Se acaba el tiempo | Escalera de cortes, en orden. |

---

## 18. Nombre

Pendiente de decidir. Candidatos: **Trama** (tejido de datos y reglas), **Andamio** (estructura que se arma), **Nexo**. Evitar nombres genéricos tipo "AppBuilder" o "NoCode". Verificar dominio y disponibilidad en GitHub antes de crear el repo.

---

## 19. Primeras 3 acciones

1. Crear el repo y el monorepo; commit inicial con README de una página.
2. Desplegar el esqueleto de web y API el día 2. No el día 25.
3. Crear `ci.yml` el día 3 con Postgres de servicio.

A partir de ahí, cada día termina con un commit y el pipeline en verde.
