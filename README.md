# Caleta

Gestión de finanzas personales con IA para jóvenes colombianos.

Sube screenshots de tus apps financieras (Nequi, Daviplata, Bancolombia, Nubank) y deja que la IA registre y categorice tus transacciones automáticamente.

## Stack

- **Next.js 15** — App Router, Server Components, Server Actions
- **TypeScript** — strict mode
- **Tailwind CSS v4** + **shadcn/ui v4** — UI
- **Prisma 7** — ORM (type-safe queries, cliente generado en `src/generated/prisma/`)
- **Supabase** — PostgreSQL, Auth, Storage
- **Vercel AI SDK** + **@ai-sdk/anthropic** — extracción y análisis con IA
- **@ducanh2912/next-pwa** — PWA con soporte offline

## Instalación

### Requisitos previos

- Node.js 20+
- pnpm 11+
- Cuenta en [Supabase](https://supabase.com)
- API Key de [Anthropic](https://console.anthropic.com)

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd Caleta
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales (ver tabla abajo).

### 4. Configurar base de datos

```bash
# Generar el Prisma Client (crea src/generated/prisma/)
pnpm prisma generate

# Correr migraciones contra tu base de datos Supabase
pnpm prisma migrate dev --name init

# Sembrar categorías predefinidas del sistema
pnpm prisma db seed
```

### 5. Correr en desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Ver `.env.example` para la lista completa con comentarios.

| Variable | Dónde obtenerla |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection Pooling (port 6543) |
| `DIRECT_URL` | Supabase → Project Settings → Database → Connection String (port 5432) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role (secreto, solo servidor) |

## Estructura de carpetas

```
src/
  app/
    (auth)/          # Login, registro — sin auth requerida
    (dashboard)/     # Rutas protegidas — requieren sesión
    api/             # Solo webhooks y endpoints de streaming
  components/
    ui/              # Componentes shadcn/ui (auto-generados, no editar)
    features/        # Componentes organizados por feature
  generated/
    prisma/          # Cliente Prisma generado (no editar — usar pnpm prisma generate)
  lib/
    prisma.ts        # Singleton de Prisma Client
    supabase/        # Clientes Supabase (browser + server)
    ai/              # Proveedor Anthropic compartido
  server/actions/    # Server Actions organizadas por dominio
  types/             # Tipos compartidos y re-exports de Prisma
  hooks/             # React hooks del lado cliente
prisma/
  schema.prisma      # Schema completo del dominio
  seed.ts            # Categorías predefinidas del sistema
prisma.config.ts     # Configuración Prisma 7 (DB URL, paths)
public/
  manifest.json      # PWA manifest
  icons/             # Íconos PWA (icon-192x192.png, icon-512x512.png)
```

## Comandos frecuentes

```bash
pnpm dev                          # servidor de desarrollo
pnpm build                        # build de producción
pnpm prisma generate              # regenerar cliente Prisma tras cambios en schema
pnpm prisma migrate dev --name X  # crear y aplicar migración
pnpm prisma db seed               # sembrar categorías predefinidas
pnpm prisma studio                # abrir Prisma Studio (browser de la BD)
pnpm dlx shadcn@latest add button # agregar componente shadcn
pnpm format                       # formatear código con Prettier
```

## Estado del desarrollo

### Completado
- [x] Scaffolding y configuración del proyecto (Next.js 15, TypeScript, Tailwind v4)
- [x] Prettier + ESLint configurados
- [x] shadcn/ui v4 con tema verde caleta (`#0F766E`)
- [x] Schema de base de datos completo (Prisma 7)
- [x] Clientes Supabase (browser + server SSR)
- [x] Vercel AI SDK con proveedor Anthropic
- [x] PWA manifest y configuración de service worker
- [x] Estructura de carpetas por feature

### Pendiente
- [ ] RF-01: Auth (login/registro con Supabase)
- [ ] RF-02: Onboarding — agregar cuentas y balance inicial
- [ ] RF-03: Dashboard principal con resumen financiero
- [ ] RF-04: Subida de screenshots + extracción de transacciones con IA
- [ ] RF-05: CRUD manual de transacciones
- [ ] RF-06: Categorización automática
- [ ] RF-07: Caletas (metas de ahorro)
- [ ] RF-08: Insights mensuales con IA
- [ ] RF-09: Historial y búsqueda de transacciones
- [ ] RF-10: Configuración de cuentas y perfil
- [ ] RF-11: Funcionalidad offline (PWA)

## Deploy

Deploy automático en Vercel. Conecta el repositorio en [vercel.com](https://vercel.com) y agrega las variables de entorno en el dashboard del proyecto.

## Licencia

MIT
