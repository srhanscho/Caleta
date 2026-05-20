# RF-01: Registro e Inicio de Sesión — Spec

**Fecha:** 2026-05-20
**Estado:** Aprobado
**Feature:** RF-01 — Auth (email/password + Google OAuth)

---

## Resumen

Página de autenticación única con flujo progresivo: el usuario ingresa su email, el sistema detecta si ya tiene cuenta y adapta el formulario (login vs. registro). Google OAuth disponible en todo momento. Sincronización de usuarios Supabase → Prisma via webhook.

---

## Rutas y archivos

```
src/
  app/
    (auth)/
      layout.tsx                     # layout sin navbar: fondo OLED, card centrado
      login/
        page.tsx                     # Server Component — redirige a /dashboard si autenticado
    auth/
      callback/
        route.ts                     # Route handler para redirect OAuth de Google
    api/
      auth/
        webhook/
          route.ts                   # POST webhook Supabase → upsert User en Prisma
  components/
    features/
      auth/
        auth-form.tsx                # "use client" — formulario progresivo con RHF + Zod
        google-button.tsx            # "use client" — botón OAuth Google
  server/
    actions/
      auth/
        check-email.ts               # Server Action — verifica si email existe en Supabase
  middleware.ts                      # protege /dashboard/**, redirige /login si autenticado
```

---

## Flujo de usuario

### Flujo email/password

1. Usuario llega a `/login`
2. Si tiene sesión activa → redirige inmediatamente a `/dashboard`
3. Ve: campo email + botón "Continuar" + separador "o" + botón Google
4. Ingresa email → llama `checkEmail` Server Action (usa Supabase Admin, service role)
5. **Email registrado:** aparece campo "Contraseña" con animación fade+slide-down (200ms). Título cambia a "Bienvenido de vuelta". Botón: "Iniciar sesión"
6. **Email nuevo:** aparecen campos "Tu nombre" + "Contraseña" con animación. Título: "Crea tu cuenta". Botón: "Crear cuenta"
7. El campo email queda editable — clic limpia el step 2 y vuelve al inicio
8. Submit → `supabase.auth.signInWithPassword` o `supabase.auth.signUp`
9. Éxito → `router.push('/dashboard')`
10. Error → mensaje en español bajo el campo afectado

### Flujo Google OAuth

1. Clic en "Continuar con Google" → `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })`
2. Supabase redirige a Google → Google autentica → redirige a `/auth/callback`
3. `/auth/callback` intercambia el code por sesión con `supabase.auth.exchangeCodeForSession`
4. Redirige a `/dashboard`

### Sincronización Supabase → Prisma (webhook)

1. Supabase dispara `POST /api/auth/webhook` cuando se inserta en `auth.users`
2. El endpoint verifica la firma con `SUPABASE_WEBHOOK_SECRET`
3. Hace `prisma.user.upsert` con `supabaseId`, `email`, `name` (del `raw_user_meta_data`)
4. Responde `200 OK`; cualquier error retorna `500` (Supabase reintentará)

**Dev local:** usar `ngrok http 3000` y configurar la URL en Supabase Dashboard → Webhooks.

---

## Design system (ui-ux-pro-max)

| Token | Valor |
|---|---|
| Background | `#09090B` (OLED negro) |
| Card | `#18181B` (zinc-900) |
| Brand / CTA | `#0D9488` (teal-600) |
| Texto principal | `#FAFAFA` |
| Texto muted | `#A1A1AA` |
| Border | `#27272A` |
| Focus ring | `#0D9488` |
| Tipografía | IBM Plex Sans (Google Fonts) |

**Estilo:** Dark Mode OLED — moderno, ahorra batería en AMOLED, confiable para fintech.

---

## Componente `auth-form.tsx`

- **React Hook Form + Zod** para validación (patrón shadcn/ui)
- **Step 1 schema:** `z.object({ email: z.string().email("Ingresa un correo válido") })`
- **Login schema:** `z.object({ email, password: z.string().min(6, "Mínimo 6 caracteres") })`
- **Registro schema:** `z.object({ email, nombre: z.string().min(2, "Ingresa tu nombre"), password: z.string().min(6) })`
- Estado local: `'idle' | 'checking' | 'login' | 'register' | 'submitting'`
- Animación campos step 2: `transition-all duration-200` + `animate-in fade-in slide-in-from-top-2`
- `inputMode="email"` en el campo email
- Toggle visibilidad contraseña (icono SVG Lucide `Eye` / `EyeOff`)
- Botón deshabilitado + spinner durante `checking` y `submitting`
- `prefers-reduced-motion`: sin animación si el OS lo solicita

---

## Server Action `check-email.ts`

```typescript
'use server'
// Usa SUPABASE_SERVICE_ROLE_KEY (solo server-side)
// Consulta auth.users por email via Supabase Admin API
// Retorna: { exists: boolean }
// No expone datos del usuario — solo boolean
```

**Nota de seguridad:** Esta acción expone enumeración de emails. Aceptado conscientemente por UX — app de finanzas personales (no corporativo), y el flujo progresivo lo requiere.

---

## Middleware

```typescript
// src/middleware.ts
// Rutas protegidas: /dashboard/** → /login si sin sesión
// Rutas auth: /login → /dashboard si con sesión
// Usa createServerClient de @supabase/ssr (requiere leer/escribir cookies)
// matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons).*)']
```

---

## Variables de entorno

Agregar a `.env.local` y `.env.example`:

```
# Ya existentes
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Nuevas para RF-01
SUPABASE_SERVICE_ROLE_KEY=    # Admin API — solo server-side, nunca NEXT_PUBLIC_
SUPABASE_WEBHOOK_SECRET=      # Para verificar firma del webhook
```

---

## Configuración externa requerida

1. **Supabase Dashboard → Authentication → Providers:** activar Google, ingresar Client ID y Secret de Google Cloud Console
2. **Google Cloud Console:** crear OAuth 2.0 client, agregar `https://<proyecto>.supabase.co/auth/v1/callback` como redirect URI autorizado
3. **Supabase Dashboard → Database → Webhooks:** crear webhook en `auth.users` (INSERT) apuntando a `/api/auth/webhook`
4. **Supabase Dashboard → Authentication → URL Configuration:** agregar `http://localhost:3000/auth/callback` a "Redirect URLs"

---

## Criterios de aceptación

- [ ] `/login` redirige a `/dashboard` si el usuario ya tiene sesión
- [ ] Flujo progresivo: email → detecta → muestra campos correctos con animación
- [ ] Login con email/password existente funciona
- [ ] Registro con email nuevo crea cuenta en Supabase y User en Prisma
- [ ] Google OAuth completa el flujo y redirige a `/dashboard`
- [ ] Webhook crea `User` en Prisma al registrarse por cualquier método
- [ ] Rutas `/dashboard/**` son inaccesibles sin sesión
- [ ] Todos los errores se muestran en español
- [ ] Formulario usa labels explícitos (no solo placeholders)
- [ ] Botón deshabilitado durante operaciones async
