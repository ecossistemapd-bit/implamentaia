# Implementa AI — Design System

Guía operativa del lenguaje visual de la plataforma autenticada. **Esta doc es la fuente de verdad** — si una página nueva no la sigue, esa página está mal.

> **Filosofía:** Premium · Profesional · Lujoso · High Ticket. El violeta es protagonista pero contenido. Tipografía con respeto. Cero "cheap UI" (gradientes saturados, sombras pesadas, animaciones rebotadas).

---

## 1. Theme system

La plataforma soporta **dos temas** que swappean vía la clase `.dark` en `<html>`. Todo lo que diseñes tiene que funcionar bien en ambos.

| Token base | Light (default) | Dark (`.dark`) |
|---|---|---|
| `--background` | `#F5F5F7` | `#000000` |
| `--card` | `#FFFFFF` | `#161617` |
| `--foreground` | `#1D1D1F` | `#F5F5F7` |
| `--muted-foreground` | `#6E6E73` | `#86868B` |
| `--border` | `#C7C7CC` | `#2A2A2C` |

**Regla:** nunca hardcodear `#FFFFFF` ni `#000000` como `bg`/`color` en componentes que tienen que funcionar en ambos temas. Usá la token correspondiente.

---

## 2. Violet tokens (theme-aware)

El violeta es el color de marca. **Alpha más alto en light** (compensa bg blanco) y **más sutil en dark** (sobre negro el violeta ya vibra).

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--violet-border` | `rgba(139,92,246,0.32)` | `rgba(139,92,246,0.18)` | Marcos de cards idle |
| `--violet-border-hover` | `rgba(139,92,246,0.58)` | `rgba(139,92,246,0.36)` | Marcos al hover |
| `--violet-glow-hover` | `rgba(139,92,246,0.22)` | `rgba(139,92,246,0.14)` | Halo del marco al hover |
| `--violet-text` | `#6D28D9` | `#A78BFA` | Acentos numéricos (%, contadores) |
| `--violet-text-strong` | `#5B21B6` | `#C4B5FD` | Labels en pills y badges |
| `--violet-pill-bg` | `rgba(139,92,246,0.08)` | `rgba(139,92,246,0.05)` | Fondo de pills |
| `--violet-pill-border` | `rgba(139,92,246,0.30)` | `rgba(139,92,246,0.20)` | Border de pills |
| `--wash-1/2/3` | `0.32 / 0.24 / 0.16` | `0.16 / 0.12 / 0.08` | Opacities del wash de fondo |

**Donde están definidos:** `src/styles.css`, dentro de `:root` (light) y `.dark` (dark).

**Regla:** si necesitás violeta en un componente nuevo, **reutilizá estos tokens**. No inventes nuevos rgba ad-hoc.

---

## 3. Clases globales reutilizables

Todas viven en `src/styles.css`. Aplicalas con `className="app-X"` y se comportan idénticas en cualquier ruta autenticada.

### `.app-violet-wash`
Wash atmosférico violeta de fondo. **Ya está montado en el layout autenticado** (`_authenticated.tsx`) — todas las rutas lo heredan automáticamente. No lo apliques manualmente en páginas nuevas.

### `.app-card`
Card premium con marco violeta sutil + lift al hover. Box-shadow de profundidad.

```tsx
<div className="app-card p-6">
  {/* contenido */}
</div>
```

- Idle: border `0.18` (dark) / `0.32` (light), box-shadow tenue
- Hover: lift `-3px`, border intensifica, halo violeta sutil
- Theme-aware automático

**Usalo para:** cards principales del dashboard, secciones grandes, contenedores destacados.

### `.app-mini-step`
Variante más liviana de `.app-card`. Border más sutil, lift menor (-2px).

**Usalo para:** mini-cards dentro de un container más grande (como las "Siguientes en tu ruta" o los pasos del Journey).

### `.app-pill-violet`
Pill/badge con accent violeta. Texto en `--violet-text-strong`, bg en `--violet-pill-bg`.

```tsx
<span className="app-pill-violet inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium">
  <Flame className="h-3 w-3" /> 13 días consecutivos
</span>
```

**Usalo para:** streaks, contadores, etiquetas tipo "RUTA IA PERSONALIZADA", "FALTAN 1h 30min", "APRENDIZ", "NUEVO".

### `.app-cta-primary`
Botón principal. **En dark:** blanco sobre negro. **En light:** violeta sólido `#6D28D9` → `#5B21B6` al hover.

```tsx
<button className="app-cta-primary">
  <Play className="h-4 w-4" /> Comenzar ahora
</button>
```

- Hover: lift -2px + halo violeta intenso (en ambos temas)
- **Usalo para:** la acción primaria de cada vista (CTA principal). Idealmente uno solo por sección.

### `.app-cta-ghost`
Botón secundario. Outline con marco violeta sutil, bg transparente, reacciona al hover.

```tsx
<button className="app-cta-ghost">
  <RefreshCw className="h-4 w-4" /> Regenerar ruta
</button>
```

**Usalo para:** acciones secundarias (cancelar, regenerar, ver más). Nunca como acción primaria.

### `.app-chip` / `.app-chip-active`
Filter chips premium (categorías, filtros, etc.).

```tsx
<button className={active ? "app-chip-active" : "app-chip"}>
  Marketing
</button>
```

### `.app-progress-track` + `.app-progress-fill`
Barra de progreso con fill violeta gradient.

```tsx
<div className="app-progress-track">
  <div className="app-progress-fill" style={{ width: `${pct}%` }} />
</div>
```

---

## 4. Tipografía

| Uso | Tamaño | Tracking | Weight | Notas |
|---|---|---|---|---|
| H1 (saludo dashboard, título de sección grande) | `44px` | `-0.02em` | `700` | Leading `1.05` |
| H2 (título dentro de card grande) | `26px` | `-0.01em` | `700` | Leading tight |
| H3 (subtítulo de card) | `17px-22px` | normal | `600` | |
| Subtitle / lead | `15px-16px` | normal | `400` | `leading-relaxed`, `max-w-[640px]` |
| Body | `13px-14px` | normal | `400` | |
| Meta / overline | `10px-11px` | `0.15em` | `600` | UPPERCASE, color `muted-foreground` |
| Tabular nums | usar `tabular-nums` o `font-variant-numeric: tabular-nums` | | | Para %, contadores, métricas |

**Font family:** `Inter` (300/400/500/600/700). Cargado desde Google Fonts.

**Featured tags:** `font-mono` para números de sección (01/02/03) cuando se usa orden editorial.

---

## 5. Espaciado y layout

- **Container principal de cada ruta:** `mx-auto max-w-[1340px] px-8 py-8`
- **Gap entre cards en grid:** `gap-6` (24px)
- **Gap entre mini-cards dentro de una card:** `gap-3` (12px)
- **Padding interno de `.app-card`:** `p-7` para hero / `p-5` para card chica
- **mb entre secciones grandes:** `mb-8` a `mb-12`
- **mb entre header y primera sección:** `mb-8`

**Regla:** generosidad sobre densidad. Si dudás entre `mb-6` y `mb-8`, andá con `mb-8`. Premium = aire.

---

## 6. Hairlines

Para separar secciones sin usar borders duros, usar **hairline gradient**:

```tsx
<div className="h-px w-full" style={{
  background: "linear-gradient(90deg, transparent, var(--border) 20%, var(--border) 80%, transparent)"
}} />
```

O en clases existentes: `<div className="my-5 h-px bg-gradient-to-r from-transparent via-border to-transparent" />`.

---

## 7. Microinteracciones

| Pattern | Easing | Duration | Use |
|---|---|---|---|
| Card hover lift | `cubic-bezier(0.16, 1, 0.3, 1)` | `380ms` | Spring-damped, premium |
| Border color shift | `ease` | `320ms` | Acompaña al lift |
| Box-shadow | `ease` | `380ms` | Acompaña al lift |
| Button hover | `ease` | `240ms` | Más rápido que cards |
| Pill/badge color | `ease` | `240ms` | Theme transitions |

**Regla:** todas las transiciones tienen que respetar `prefers-reduced-motion`. Las clases `.app-*` ya lo hacen, pero si agregás transiciones custom, agregá un `@media (prefers-reduced-motion: reduce)` que las deshabilite.

---

## 8. Lo que NUNCA tocar

- **`.card-orb-alive`** + sus keyframes: son los orbs/esferas de las cards del catálogo de soluciones. Quedan EXACTAMENTE como están.
- **`.premium-card`**: wrapper original de cards del catálogo. No mezclar con `.app-card`.
- **Imágenes/iconos de soluciones**: vienen del campo `cover_image_url` en Supabase. Se renderizan tal cual.
- **Logo en sidebar**: NO usar `hover:scale-*` ni transforms que aumenten el width — tapa el ThemeToggle. Solo opacity/color al hover.

---

## 9. Checklist para una página nueva

Antes de mergear una ruta nueva, validar:

- [ ] El wash violeta se ve al fondo (heredado del layout, no agregues vos)
- [ ] La acción primaria usa `.app-cta-primary`
- [ ] Las secundarias usan `.app-cta-ghost`
- [ ] Los chips/filtros usan `.app-chip` / `.app-chip-active`
- [ ] Las cards principales usan `.app-card`
- [ ] Los pills informativos (counters, badges, status) usan `.app-pill-violet`
- [ ] Las barras de progreso usan `.app-progress-track` + `.app-progress-fill`
- [ ] El layout tiene `mx-auto max-w-[1340px] px-8 py-8`
- [ ] H1 es 44px con tracking `-0.02em`
- [ ] La tipografía respeta los tamaños de la tabla del punto 4
- [ ] Probaste en LIGHT y DARK — funciona bien en ambos
- [ ] Los CTAs en light se ven violetas sólidos (no blancos), en dark blancos
- [ ] No hay `bg-white`, `text-black`, `#FFFFFF` o `#000000` hardcoded
- [ ] No hay `bg-primary` reemplazando un CTA principal (usar `.app-cta-primary`)

---

## 10. Mockup HTML como referencia

El mockup HTML standalone vive en `/tmp/dashboard-mockup.html` (también copiado a `Documents/dashboard-mockup.html`).

Para inspeccionarlo localmente:

```bash
cd /tmp && python3 -m http.server 8773 &
open http://localhost:8773/dashboard-mockup.html
```

Tiene un toggle de tema 🌗 arriba a la derecha para comparar dark/light side by side.

---

## 11. Cómo agregar un componente nuevo

1. **¿Encaja en una clase existente?** Probá primero `app-card`, `app-cta-primary`, etc.
2. **¿Necesita variante?** Definí en `styles.css` un nuevo `.app-X` que use los tokens violetas existentes. No metas rgba ad-hoc.
3. **¿Necesita color nuevo?** Primero pensá si podés expresarlo con los tokens existentes. Si realmente necesita un color nuevo, agregalo a `:root` Y `.dark` con valores theme-aware.
4. **Testeá en ambos temas** antes de pushear.

---

## 12. Stack técnico

- **Framework:** TanStack Start + TanStack Router (file-based routes)
- **UI:** React 19 + TypeScript + Tailwind CSS 4 + Vite 7
- **Components:** shadcn/ui (Radix) — uso medido, no abusar
- **Tokens:** CSS custom properties en `src/styles.css`
- **Fonts:** Inter (Google Fonts CDN)

---

**Última actualización:** PR #49 (`feat/premium-global`)
