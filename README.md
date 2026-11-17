# motor-co

Motor de modelos y flujos: el usuario define campos y reglas sin tocar código.

Destino planificado: `https://motor.jorgelio.cl` (sin desplegar aún).
Estado: en construcción. La API responde `GET /api/health` y el frontend muestra el estado de conexión.

## Qué es

Una aplicación web mínima donde se puede:

1. **Definir un modelo**: un nombre y una lista de campos (`text`, `number`, `date`, `boolean`, `reference`).
2. **Cargar registros** con un CRUD generado desde esa definición: lista, búsqueda, filtro, orden,
   paginación, crear, editar y borrar.
3. **Definir flujos** lineales que se disparan a mano o al crear un registro, con una precondición
   (`campo operador valor`) y pasos (`update_field`, `create_record`).
4. **Ver el historial de ejecuciones** con estado, fecha y error legible.

Los registros se guardan en una columna JSON de MySQL y se validan en la capa de aplicación.

## Para quién

Pieza de portafolio para un puesto junior de desarrollo web. Se prioriza un proyecto terminado, con
tests, CI y deploy real, por sobre funcionalidades. La decisión de stack está en
[`docs/decisions/001-ruta-a.md`](./docs/decisions/001-ruta-a.md).

## Stack

| Capa | Elección |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Estilos | Tailwind CSS 4 |
| Datos remotos | TanStack Query |
| Formularios | React Hook Form + Zod |
| API | Laravel 13, solo API |
| Auth | Laravel Sanctum |
| Base de datos | MySQL 8 (Docker local, puerto 3307) |
| Tests | Pest (API), Vitest + Testing Library (front), Playwright (E2E) |
| CI/CD | GitHub Actions; deploy en DirectAdmin (mismo origen) |

## Requisitos

- PHP 8.4 + Composer
- Node 24 + npm
- Docker (solo para MySQL local)

## Cómo levantarlo

```bash
# 1. Base de datos
docker compose up -d
docker compose ps          # esperar "healthy"

# 2. API
cd apps/api
composer install
cp .env.example .env       # en Windows: copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8001

# 3. Verificar
curl http://127.0.0.1:8001/api/health
# {"status":"ok","app":"motor-co"}
```

La API usa el puerto **8001** porque en el equipo de desarrollo el 8000 lo ocupa Docker Desktop.
Si en tu máquina está libre, cambia el puerto en `package.json`, `.env` y el proxy de Vite.

### Frontend

```bash
npm install
npm run dev:web            # http://localhost:5173
npm run build              # salida estática en apps/web/dist
```

El frontend consulta `/api/health` a través del proxy de Vite (`/api` → `127.0.0.1:8001`) y muestra
tres estados: cargando, API conectada y error.

## Comandos

```bash
npm run dev:web            # frontend en desarrollo
npm run dev:api            # API en 127.0.0.1:8001
npm run lint               # pint --test + eslint
npm run typecheck          # tsc --noEmit
npm test                   # pest + vitest
npm run build              # build del front

cd apps/api && php artisan test
cd apps/api && php vendor/bin/pint --test
```

## Estructura

```
apps/api         Laravel: API JSON, migraciones, seed y tests Pest
apps/web         React + Vite (workspace npm)
apps/e2e         Playwright (pendiente; workspace npm)
docs             openapi.yaml, decisiones (ADR), arquitectura
.github/workflows  CI
docker-compose.yml MySQL 8.4 local
```

## Documentación

- [`AGENTS.md`](./AGENTS.md): reglas de trabajo, alcance y decisiones técnicas.
- [`docs/decisions/001-ruta-a.md`](./docs/decisions/001-ruta-a.md): por qué React + Laravel.
- [`plan-motor-modelos-flujos.md`](./plan-motor-modelos-flujos.md): plan de ejecución de 30 días.

## Estado

- [x] Repo, monorepo y Laravel API-only
- [x] `GET /api/health` + test Pest
- [x] MySQL local en Docker (3307) y CI con MySQL
- [x] Frontend React con estado de conexión (3 tests de componente)
- [ ] Auth y modelos
- [ ] Registros y CRUD generado
- [ ] Motor de flujos
- [ ] E2E y deploy automático a DirectAdmin
