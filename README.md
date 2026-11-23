# Escuelitas Fut ⚽

Plataforma SaaS para administrar escuelas de futbol: control de alumnos, pagos
en línea, partidos, torneos y notificaciones para los papás.

## Stack

- **Next.js 16 (App Router) + TypeScript** — app full-stack (web/PWA)
- **PostgreSQL + Drizzle ORM** — base de datos en Supabase
- **Auth.js (NextAuth v5)** — login con correo/contraseña y Google
- **Stripe Connect** — pagos (cada escuela cobra a su propia cuenta) _(Fase 3)_
- **Vercel** — despliegue; **Supabase Storage** — imágenes
- **Tailwind CSS** — estilos

La app es **multi-escuela (multi-tenant)**: todos los datos se aíslan por
`schoolId`, y cada usuario se relaciona con una escuela mediante una membresía
con un rol (`owner`, `admin`, `coach`, `parent`).

## Permisos por escuela

| Perfil | Alcance |
| --- | --- |
| Dueño (`owner`) | Toda su escuela: precios y vencimientos, becas, cargos, pagos, egresos, reportes financieros, historial y accesos del personal. |
| Administrador (`admin`) | Alumnos, equipos y asistencias. Consulta becas asignadas, registra y corrige pagos manuales y registra gastos. |
| Profesor (`coach`) | Solo sus equipos: alumnos y estado de pago verde/rojo, entrenamientos, partidos, asistencias y avisos a los tutores vinculados. |
| Tutor (`parent`) | Portal de sus hijos vinculados y avisos recibidos. |

Los permisos se comprueban en las páginas y acciones del servidor. El dueño de
una escuela no tiene acceso a otras escuelas por ese rol. Desde **Usuarios**
invita administradores y desde cada equipo invita o retira profesores. Las
invitaciones duran siete días y se comparten mediante un enlace.

**Movimientos** registra operaciones del personal desde su activación; no
reconstruye movimientos anteriores. Los avisos a tutores son mensajes internos,
individuales o para todo el equipo, visibles en el portal de padres.

La migración `0024_roles_activity` agrega el historial y el rol de las
invitaciones del personal. Conserva las invitaciones existentes como profesor.

## Requisitos

- Node.js 22.18+ (también permite ejecutar `npm run check:supabase`)
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
│   ├── admin/             # portal de administración (roles owner/admin)
│   ├── coach/             # portal del profesor (equipos asignados)
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

## Despliegue en Vercel y Supabase

En el proyecto de Vercel configura estas variables del servidor:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | URL de Supabase del pooler transaccional, puerto 6543, con TLS (`sslmode=require`) |
| `SUPABASE_URL` | URL API del proyecto de Supabase |
| `SUPABASE_SECRET_KEY` | Clave `sb_secret_...`, solo en el servidor |
| `AUTH_SECRET` | Secreto de Auth.js guardado como variable sensible en Vercel |
| `AUTH_TRUST_HOST` | `true` |

Para migraciones configura `DIRECT_URL` en tu entorno local con la conexión
directa o el pooler de sesión (puerto 5432, `sslmode=require`). Después ejecuta
`npm run db:migrate`. No uses `db:push` sobre producción. Antes de transferir
datos, respalda la base origen y comprueba que el destino esté vacío. Transfiere
solo los esquemas de la app (`public` y `drizzle`), conservando IDs, hashes de
contraseñas e historial de migraciones; no reemplaces `auth` ni `storage` de Supabase.

La migración `0023_supabase_security` activa RLS y revoca acceso de `anon` y
`authenticated` a las tablas de la app. Drizzle debe conectar con el propietario
de esas tablas: la autenticación y el aislamiento entre escuelas siguen en
Auth.js y en el servidor. No se utiliza Supabase Auth para el login.

En Supabase Storage crea el bucket privado `images`, con límite de 4 MB y tipos
`image/png`, `image/jpeg`, `image/webp`. Las escrituras pasan por las acciones
autorizadas del servidor. `/api/images/[filename]` comprueba el acceso y redirige
a una URL firmada que dura 60 segundos: escudos del perfil público, fotos solo
para administradores, tutores vinculados, entrenadores del equipo o enlaces de
invitación vigentes; imágenes de torneos solo para administradores. No agregues
políticas para `anon` o `authenticated`. Las imágenes locales existentes deben
subirse a Storage y sus URLs actualizarse en la base antes del despliegue.

El límite por imagen es 4 MB para respetar el límite de peticiones de Vercel.
En desarrollo, sin configuración de Supabase, se usa `public/uploads`; en
producción la app exige Storage y no escribe imágenes en disco.

Verificación local: `npm run check:supabase`. Para comprobar también la migración
SQL contra tu base local, sin guardar cambios: `npm run check:supabase -- --database`.

Verificación de permisos: `npm run check:security`. Usa exclusivamente Postgres
local y revierte los datos de prueba al terminar. Comprueba la vinculación por
correo verificado, invitaciones de un solo uso con vigencia de siete días,
aislamiento por escuela/equipo y conservación de registros ante errores.
Los tutores registrados con correo/contraseña necesitan una invitación de la
escuela para vincularse; escribir el correo del tutor no prueba su identidad.

`sst.config.ts` conserva la infraestructura anterior de AWS como referencia.

### Mensualidades y renovación anual

En Producción de Vercel define `CRON_SECRET` con un valor aleatorio de al
menos 16 caracteres. Aplica `npm run db:migrate` antes de desplegar. Vercel
invoca `/api/cron/billing` a diario a partir de las 00:00 de Ciudad de México.

- En **Pagos**, configura un plan mensual general para cubrir a todos los
  alumnos activos. Los planes de categoría tienen prioridad sobre el general.
- Para cada plan de inscripción anual que corresponda, activa **Renovar cada
  año**. Se genera un cargo en el aniversario de la fecha de inscripción de cada
  alumno, desde el día en que activaste el plan. Para un 29 de febrero se usa
  el último día de febrero en años no bisiestos. Las renovaciones quedan por pagar.
- En **Becas** y en la ficha del alumno puedes asignar el descuento y su fecha
  límite. La fecha del alumno tiene prioridad sobre la del plan de pagos de la
  escuela. Tras el vencimiento, la mensualidad pendiente vuelve al precio
  completo. Una beca que cubre la cuota entera se registra como cubierta.

Si la escuela usa Stripe Connect, el webhook de cuentas conectadas recibe
`checkout.session.completed`, `checkout.session.async_payment_succeeded` y
`payment_intent.succeeded` para confirmar pagos en línea.

## Roadmap

- [x] **Fase 0 — Fundamentos:** auth, multi-escuela, roles, portales base, infra
- [x] **Fase 1 — Escuela y alumnos:** perfil de escuela (escudo, dirección, info), categorías, equipos y registro de alumnos (con foto y datos del tutor)
- [ ] **Fase 2 — Portal de padres:** vinculación con hijos
- [ ] **Fase 3 — Pagos:** mensualidades y adeudos con Stripe Connect
- [ ] **Fase 4 — Partidos y torneos:** calendario, resultados, tabla
- [ ] **Fase 5 — Notificaciones:** push (Web Push) + correo (SES)
- [ ] **Fase 6 — Reportes y pulido**
