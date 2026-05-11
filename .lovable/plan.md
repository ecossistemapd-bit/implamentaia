# Implementa AI — Plan de construcción

Plataforma premium en español neutro, estética Apple monocromática (B&W), con catálogo de 36 soluciones de IA, Builder tipo wizard que genera planes de implementación con IA, auth invite-only y dashboard personal.

## Stack y decisiones clave

- **Frontend**: TanStack Start (ya configurado) + Tailwind v4 + shadcn/ui + framer-motion + lucide-react.
- **Backend**: Lovable Cloud (Supabase administrado) — Auth, Postgres con RLS, Storage para avatars, Edge Function para el Builder.
- **IA generativa**: por defecto **Lovable AI Gateway** (`google/gemini-2.5-pro` para calidad de plan, sin pedir API keys al usuario). Si el usuario prefiere OpenAI/Anthropic directos, lo configuramos como secret al final.
- **Fuente tipográfica**: Inter vía Google Fonts.
- **Tema**: tokens semánticos en `src/styles.css` (oklch) — blanco / negro / grises puros, sin saturación. Toggle persistido en localStorage con guardia anti-FOUC.

## Arquitectura de rutas (TanStack file-based)

```
src/routes/
  __root.tsx                  Shell html + providers (Query, Theme, Toaster)
  index.tsx                   Landing pública (redirect a /dashboard si auth)
  login.tsx                   Email/password + magic link, valida allowed_emails
  _authenticated.tsx          Guard beforeLoad → redirect /login
  _authenticated/dashboard.tsx
  _authenticated/solutions.index.tsx          Catálogo + filtros
  _authenticated/solutions.$slug.tsx          Detalle
  _authenticated/builder.index.tsx            Wizard 5 pasos
  _authenticated/builder.$id.tsx              Resultado (tabs)
  _authenticated/projects.tsx                 Mis Proyectos
  _authenticated/settings.tsx                 Perfil / Empresa / Cuenta
  api/public/...              (no se necesitan webhooks para v1)
```

Sidebar layout vive dentro de `_authenticated.tsx` (Sheet en mobile, fija en desktop).

## Esquema de base de datos (migración única)

Tablas: `profiles`, `solutions`, `saved_solutions`, `builder_projects`, `allowed_emails` — exactamente como las describiste.

- Enums Postgres: `solution_category`, `solution_difficulty`, `builder_status`.
- Trigger `handle_new_user` → crea `profiles` y valida que `email IN allowed_emails` (si no, raise exception que bloquea el signup).
- RLS:
  - `profiles`: SELECT/UPDATE solo `id = auth.uid()`.
  - `solutions`: SELECT público (authenticated).
  - `saved_solutions`, `builder_projects`: CRUD solo `user_id = auth.uid()`.
  - `allowed_emails`: sin SELECT para usuarios; sólo service role.
- Storage bucket `avatars` (público read, write solo dueño).

## Seed de 36 soluciones

Migración aparte con `INSERT INTO solutions ...` × 36 (6 por categoría) usando los textos, dificultades, ROI, tools e iconos lucide que definiste en el brief. Slugs autogenerados (kebab-case).

`allowed_emails` se siembra con el email del usuario actual + un par de placeholders para QA.

## Edge Function `generate-builder-output`

- Auth: validar JWT, confirmar que `builder_project_id` pertenece al user.
- Construye prompt + tool-calling (structured output) hacia Lovable AI Gateway (`google/gemini-2.5-pro`).
- Schema JSON forzado: `{ plan_md, system_prompt, integrations[], assets[] }`.
- Update `builder_projects.output` + `status = 'ready'` (o `'error'` con mensaje).
- Manejo de 429 / 402 → toast claro en frontend.

## Identidad visual y sistema de diseño

`src/styles.css` redefinido con tokens monocromáticos:
- Light: bg `oklch(1 0 0)`, fg `oklch(0.05 0 0)`, border `oklch(0.9 0 0)`, accent `oklch(0.1 0 0)`.
- Dark: bg `oklch(0 0 0)`, fg `oklch(0.98 0 0)`, border `oklch(0.18 0 0)`, accent `oklch(1 0 0)`.
- Radios: `--radius: 1rem` (rounded-2xl en cards, `rounded-full` en CTAs primarios).
- Sombras suaves (`shadow-sm`).
- Tipografía: Inter (400/500/600/700), headings `tracking-tight`.

Componentes shadcn a instalar/usar: Button, Card, Input, Textarea, Select, Tabs, Dialog, Sheet, Badge, Skeleton, Sonner (toast), Avatar, DropdownMenu, Progress, Separator, Tooltip, Form.

## Páginas — qué se construye

1. **Landing `/`** — Hero B&W, grid 6 categorías con counts dinámicos, "Cómo funciona" en 3 pasos, footer. Meta SEO específico.
2. **`/login`** — Form minimalista con magic link toggle, validación zod, error claro si email no está invitado.
3. **`/dashboard`** — Saludo, 4 stat cards (queries agregadas), últimos 3 proyectos, 4 soluciones recomendadas (random no guardadas), chips de categorías.
4. **`/solutions`** — Search + tabs categoría + filtro dificultad, grid responsive, bookmark inline, empty state.
5. **`/solutions/:slug`** — Layout 60/40, markdown long_description, sticky card de stats, CTA "Configurar con Builder", relacionadas.
6. **`/builder`** — Wizard 5 pasos con framer-motion AnimatePresence, progress bar, validación zod por paso, pre-fill desde `?source=`. Paso 5 dispara Edge Function con loading premium (mensajes rotando) y navega a `/builder/:id`.
7. **`/builder/:id`** — Tabs Plan / Prompt / Integraciones / Assets, título inline editable, exportar ZIP (jszip client-side), eliminar con confirmación.
8. **`/projects`** — Lista filtrable.
9. **`/settings`** — Tabs Perfil / Empresa / Cuenta, upload avatar a Storage, cambio de password, eliminar cuenta.

## Detalles de calidad

- Skeleton loaders (sin spinners), empty states con icono + copy útil, error boundaries premium, transiciones de página con `AnimatePresence`, focus rings accesibles, dark mode anti-FOUC vía script inline en `__root`, toasts sonner en todas las mutaciones, meta tags por ruta, favicon "I" en cuadro negro generado.

## Orden de implementación

1. Habilitar Lovable Cloud.
2. Migración: enums + tablas + RLS + trigger signup + bucket avatars.
3. Migración seed: 36 soluciones + email del usuario en `allowed_emails`.
4. Sistema de diseño: `styles.css` + Inter + ThemeProvider + favicon.
5. Auth: `login.tsx`, `_authenticated.tsx`, hook `useAuth`, integración con allowed_emails.
6. Layout autenticado: sidebar + Sheet mobile + topbar.
7. Landing pública.
8. Catálogo + detalle de solución + guardar/desguardar.
9. Dashboard con stats reales.
10. Builder wizard (5 pasos) + Edge Function `generate-builder-output` + página de resultado.
11. Mis Proyectos + Settings (perfil/empresa/cuenta + avatar upload).
12. Pulido: skeletons, empties, errors, SEO meta, QA dark/light.

## Notas técnicas

- Generación IA va por Lovable AI Gateway (sin pedir keys). Si querés tus propias keys de OpenAI/Anthropic, te las pido como secret al final y cambio el endpoint.
- Por la magnitud, la build se entrega en varios pasos dentro de una sola sesión de implementación; cada paso queda funcional.

## Preguntas que voy a confirmar antes de empezar a codear

1. **Proveedor de IA**: ¿Lovable AI Gateway (default, sin keys) o tus propias keys OpenAI/Anthropic?
2. **Email invitado inicial**: ¿qué email querés sembrar en `allowed_emails` para poder loguearte vos mismo?
3. **Magic link**: ¿lo incluimos en `/login` desde v1 o solo email/password?
