# Escuelitas Fut ⚽

Plataforma SaaS para administrar escuelas de futbol: control de alumnos, pagos
en línea, partidos, torneos y notificaciones para los papás.

## Stack

- **Next.js 16 (App Router) + TypeScript** — app full-stack (web/PWA)
- **PostgreSQL + Drizzle ORM** — base de datos (Aurora Serverless v2 en AWS)
- **Auth.js (NextAuth v5)** — login con correo/contraseña y Google
- **Stripe Connect** — pagos (cada escuela cobra a su propia cuenta) _(Fase 3)_
- **SST v3 (Ion)** — infraestructura y despliegue en AWS
- **Tailwind CSS** — estilos

La app es **multi-escuela (multi-tenant)**: todos los datos se aíslan por
`schoolId`, y cada usuario se relaciona con una escuela mediante una membresía
con un rol (`owner`, `admin`, `coach`, `parent`).

## Requisitos

- Node.js 20+
- PostgreSQL 16 (local). Dos opciones:
  - **Docker:** `docker compose up -d`
  - **Homebrew:** `brew install postgresql@16 && brew services start postgresql@16`

## Puesta en marcha (local)

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno y completar
cp .env.example .env.local
#   - DATABASE_URL: postgresql://postgres:postgres@localhost:5432/escuelitas_fut
#   - AUTH_SECRET: genera uno con `openssl rand -base64 32`

# 3. Crear la base de datos (si usas Homebrew y no existe)
createdb escuelitas_fut

# 4. Aplicar el esquema
npm run db:migrate

# 5. Arrancar
npm run dev
```

App en http://localhost:3000

### Scripts de base de datos

| Script                | Qué hace                                      |
| --------------------- | --------------------------------------------- |
| `npm run db:generate` | Genera una migración SQL a partir del esquema |
| `npm run db:migrate`  | Aplica las migraciones pendientes             |
| `npm run db:push`     | Sincroniza el esquema (interactivo, para dev) |
| `npm run db:studio`   | Abre Drizzle Studio para inspeccionar datos   |

## Estructura

```
src/
├── app/
│   ├── (auth)/            # login, registro y server actions de auth
│   ├── admin/             # portal de administración (roles owner/admin/coach)
│   ├── padres/            # portal de padres (rol parent)
│   ├── onboarding/        # creación de la escuela
│   └── api/auth/          # endpoints de Auth.js
├── db/
│   ├── schema/            # esquema Drizzle (auth + tenant)
│   └── index.ts           # cliente de base de datos
├── lib/
│   └── tenant.ts          # helpers de multi-tenancy y control de roles
├── auth.ts                # configuración completa de Auth.js (con DB)
├── auth.config.ts         # configuración edge-safe (para el proxy)
└── proxy.ts               # protección de rutas (antes "middleware")
```

## Despliegue en AWS (SST)

> Requiere credenciales de AWS configuradas y el AWS CLI.

```bash
# Configurar los secretos (una vez por stage)
npx sst secret set AuthSecret "$(openssl rand -base64 32)"
npx sst secret set StripeSecretKey "sk_..."
# ...los demás secretos definidos en sst.config.ts

# Desplegar
npx sst deploy --stage production
```

`sst.config.ts` provisiona VPC, Aurora Serverless v2 (Postgres) y el sitio
Next.js. Tras el primer deploy, corre las migraciones contra la base de Aurora.

## Roadmap

- [x] **Fase 0 — Fundamentos:** auth, multi-escuela, roles, portales base, infra
- [x] **Fase 1 — Escuela y alumnos:** perfil de escuela (escudo, dirección, info), categorías, equipos y registro de alumnos (con foto y datos del tutor)
- [ ] **Fase 2 — Portal de padres:** vinculación con hijos
- [ ] **Fase 3 — Pagos:** mensualidades y adeudos con Stripe Connect
- [ ] **Fase 4 — Partidos y torneos:** calendario, resultados, tabla
- [ ] **Fase 5 — Notificaciones:** push (Web Push) + correo (SES)
- [ ] **Fase 6 — Reportes y pulido**
