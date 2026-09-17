# King Queen Live

Scalable NestJS API for the King Queen Live app. PostgreSQL for data, Redis for cache/pubsub, Socket.IO for realtime.

## Stack

- NestJS 10
- PostgreSQL + TypeORM (migrations, connection pooling)
- Redis (cache, counters, Socket.IO adapter for multi-instance)
- JWT utilities (access + refresh)
- Mailer (optional until SMTP is configured)
- Swagger, Helmet, rate limiting, request IDs

## Project structure

```
src/
  config/                 # env-backed typed config
  common/                 # guards, filters, interceptors, dto, utils
  database/               # TypeORM module, base entity, migrations
  infrastructure/
    redis/                # Redis client + Socket.IO adapter
    jwt/                  # token sign/verify
    mail/                 # transactional email
  modules/
    health/               # liveness + readiness
    realtime/             # Socket.IO gateway (/live)
    <your-modules>/       # add features here
  app.module.ts
  main.ts
```

Add new features under `src/modules/` — keep `common/` and `infrastructure/` free of business logic.

```bash
npm run generate-module -- users
```

## Setup

```bash
cp .env.example .env
docker compose up -d
npm install
npm run start:dev
```

| | URL |
|---|---|
| API | http://localhost:3000/api/v1 |
| Health | http://localhost:3000/api/v1/health |
| Ready | http://localhost:3000/api/v1/health/ready |
| Swagger | http://localhost:3000/api-docs (`admin` / `admin123`) |
| Socket.IO | `ws://localhost:3000/live` |

`DB_SYNC=true` is for local development only. Use migrations in staging/production:

```bash
npm run migration:generate -- src/database/migrations/CreateUsers
npm run migration:run
```

## How to add a module

1. Generate it: `npm run generate-module -- bookings`
2. Extend `BaseEntity` for tables
3. Register the entity with `TypeOrmModule.forFeature([...])`
4. Return data from controllers — the interceptor wraps `{ success, statusCode, message, data }`
5. Use `ApiResponseDto.ok(data, 'message')` when you need a custom message
6. Protect routes with `@UseGuards(JwtAuthGuard)` and `@Roles('admin')`
7. Use `RedisService` for cache / locks / pubsub
8. Use `MailService.send(...)` for email

To lock **all** routes behind JWT, uncomment `JwtAuthGuard` as `APP_GUARD` in `app.module.ts` and mark public routes with `@Public()`.

## Production notes

- Set `DB_SYNC=false` and run migrations
- Use strong `JWT_SECRET` / `JWT_REFRESH_SECRET`
- Point `CORS_ORIGIN` at real frontends
- Redis adapter lets multiple API instances share Socket.IO rooms
- `/health` is liveness; `/health/ready` checks Postgres + Redis (use this for load balancers)
