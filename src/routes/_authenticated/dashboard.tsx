import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Clock,
  Flame,
  RefreshCw,
  Play,
  Command,
  Bell,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingModal } from "@/components/onboarding-modal";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

// =============================================================================
// Dashboard v2 — Premium dark + violet glows (alineado al landing).
// El platform usa design tokens Apple monocromáticos; los violetas viven inline
// solo en esta ruta (atmósferas + accents puntuales) hasta migrar tokens globales.
// =============================================================================
function Dashboard() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, created_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.full_name ?? null);
        if (data?.created_at) setMemberSince(new Date(data.created_at));
      });
  }, [user]);

  const { data } = useQuery({
    queryKey: ["dashboard-v2", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [steps, projects, allSolutions] = await Promise.all([
        supabase
          .from("solution_steps_progress" as never)
          .select("solution_id, step, completed, completed_at")
          .eq("user_id", user!.id),
        supabase.from("builder_projects").select("id, status").eq("user_id", user!.id),
        supabase
          .from("solutions")
          .select("id, title, slug, short_description, icon_name, featured, status, created_at")
          .order("created_at", { ascending: false }),
      ]);

      type Step = { solution_id: string; step: string; completed: boolean; completed_at: string | null };
      const stepRows = ((steps as { data: Step[] | null }).data) ?? [];
      const stepsBySol: Record<string, Set<string>> = {};
      stepRows.forEach((s) => {
        if (!s.completed) return;
        (stepsBySol[s.solution_id] ??= new Set()).add(s.step);
      });

      const solsList = (allSolutions.data ?? []) as Array<{
        id: string; title: string; slug: string; short_description: string;
        icon_name: string; featured: boolean | null; status: string | null; created_at: string;
      }>;

      const completed = Object.values(stepsBySol).filter((s) => s.size >= 5).length;
      const inProgressCount = Object.values(stepsBySol).filter((s) => s.size > 0 && s.size < 5).length;
      const activeProjects = (projects.data ?? []).filter((p) => p.status !== "completed").length;

      // ── ACTIVE IMPLEMENTATIONS (lista, no sólo count) ───────────────────
      // Soluciones con 1-4 steps completados, enriquecidas con última actividad.
      const stepDates = stepRows
        .filter((s) => s.completed && s.completed_at)
        .map((s) => ({ solution_id: s.solution_id, ts: new Date(s.completed_at!).getTime() }));

      const lastActivityBySol: Record<string, number> = {};
      stepDates.forEach((s) => {
        lastActivityBySol[s.solution_id] = Math.max(
          lastActivityBySol[s.solution_id] ?? 0,
          s.ts,
        );
      });

      const inProgressSolutions = Object.entries(stepsBySol)
        .filter(([, set]) => set.size > 0 && set.size < 5)
        .map(([solId, set]) => {
          const sol = solsList.find((s) => s.id === solId);
          if (!sol) return null;
          return {
            id: sol.id,
            title: sol.title,
            slug: sol.slug,
            completedSteps: set.size,
            totalSteps: 5,
            progressPct: (set.size / 5) * 100,
            lastActivity: lastActivityBySol[solId] ?? Date.now(),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => b.lastActivity - a.lastActivity)
        .slice(0, 3);

      // ── IMPACT (esta semana + acumulado total) ──────────────────────────
      // Heurística simple por ahora: cada step = 2.5h + $350 ahorrado.
      // Cada solución 5/5 completada = +12h/$1800 mensuales ongoing.
      // TODO: cuando solutions tenga campos `time_saved_hours_per_step` y
      // `dollar_value_per_step` reales, usar esos.
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const stepsThisWeek = stepDates.filter((s) => s.ts >= weekAgo).length;
      const totalStepsCompleted = stepDates.length;

      const HOURS_PER_STEP = 2.5;
      const DOLLARS_PER_STEP = 350;
      const HOURS_PER_COMPLETED_MONTHLY = 12;
      const DOLLARS_PER_COMPLETED_MONTHLY = 1800;

      const weekImpact = {
        stepsThisWeek,
        hoursThisWeek: stepsThisWeek * HOURS_PER_STEP,
        dollarsThisWeek: stepsThisWeek * DOLLARS_PER_STEP,
      };
      const lifetimeImpact = {
        stepsTotal: totalStepsCompleted,
        hoursLifetime:
          totalStepsCompleted * HOURS_PER_STEP +
          completed * HOURS_PER_COMPLETED_MONTHLY,
        dollarsLifetime:
          totalStepsCompleted * DOLLARS_PER_STEP +
          completed * DOLLARS_PER_COMPLETED_MONTHLY,
      };

      // Solución recomendada para el hero "Ruta IA":
      // primero busca CRM por slug; si no hay progreso, sino primer featured no iniciada.
      const startedIds = new Set(Object.keys(stepsBySol).filter((id) => (stepsBySol[id]?.size ?? 0) > 0));
      const crm = solsList.find((s) => s.slug === "crm-inteligente-ia");
      const recommended =
        (crm && !startedIds.has(crm.id) ? crm : null) ??
        solsList.find((s) => s.featured && s.status === "disponible" && !startedIds.has(s.id)) ??
        solsList.find((s) => s.status === "disponible" && !startedIds.has(s.id)) ??
        solsList[0] ??
        null;

      const nextInRoute = solsList
        .filter((s) => s.featured && s.status === "disponible" && s.id !== recommended?.id)
        .slice(0, 2);

      const newest = solsList[0] ?? null;
      const totalSolutions = solsList.length;

      return {
        completed,
        inProgressCount,
        activeProjects,
        recommended,
        nextInRoute,
        newest,
        totalSolutions,
        inProgressSolutions,
        weekImpact,
        lifetimeImpact,
      };
    },
  });

  const hour = new Date().getHours();
  const tod = hour < 12 ? "Buen día" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  // Fallback chain: profiles.full_name → user_metadata.full_name → user_metadata.name → email prefix
  const metaName =
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name ??
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.name ??
    null;
  const emailLocal = user?.email?.split("@")[0] ?? null;
  const rawName = fullName ?? metaName ?? emailLocal ?? "bienvenido";
  // Siempre capitalizar la primera palabra (sirve para "gino", "gino altamirano", "GINO", etc.)
  const firstWord = rawName.split(" ")[0];
  const greetName = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  const streakDays = memberSince
    ? Math.max(1, Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 1;

  const completed = data?.completed ?? 0;

  return (
    <>
      <OnboardingModal />

      <div className="mx-auto max-w-[1340px] px-8 py-8">
        {/* HEADER */}
        <header className="mb-8">
          <span className="app-pill-violet inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium">
            <Flame className="h-3 w-3" /> {streakDays} días consecutivos
          </span>
          <h1 className="mt-4 text-[44px] font-bold leading-[1.05] tracking-[-0.02em]">
            {tod}, {greetName}
          </h1>
          <p className="mt-3 max-w-[640px] text-[16px] leading-relaxed text-muted-foreground">
            Tu ruta personalizada está lista. Empezás por la solución con mayor match.
          </p>
        </header>

        {/* HERO + PRÓXIMA MENTORÍA */}
        <section className="grid grid-cols-12 gap-6">
          <HeroRutaIA recommended={data?.recommended ?? null} nextInRoute={data?.nextInRoute ?? []} />
          <NextMentoria />
        </section>

        {/* IMPLEMENTACIONES ACTIVAS — reemplaza los 4 KPIs genéricos */}
        <ActiveImplementations
          items={data?.inProgressSolutions ?? []}
          completed={completed}
        />

        {/* IMPACTO REAL — sólo aparece si hay actividad (≥1 step completado alguna vez) */}
        {(data?.lifetimeImpact?.stepsTotal ?? 0) > 0 && (
          <ImpactHero
            week={data!.weekImpact}
            lifetime={data!.lifetimeImpact}
          />
        )}

        {/* TU JOURNEY */}
        <TuJourney recommended={data?.recommended ?? null} />

        {/* LO QUE ESTÁ PASANDO */}
        <LoQueEstaPasando newest={data?.newest ?? null} />

        <div className="h-10" />
      </div>
    </>
  );
}

// =============================================================================
// Hero "Ruta IA Personalizada"
// =============================================================================
function HeroRutaIA({
  recommended,
  nextInRoute,
}: {
  recommended: { id: string; title: string; short_description: string; slug: string } | null;
  nextInRoute: Array<{ id: string; title: string; short_description: string }>;
}) {
  return (
    <div className="app-card col-span-12 flex flex-col lg:col-span-8" style={{ padding: "32px 36px" }}>
      {/* ETIQUETA limpia, sin meta duplicado */}
      <span className="app-pill-violet self-start rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase">
        Ruta IA · Personalizada por Luna
      </span>

      {/* TÍTULO con jerarquía: kicker chico + nombre de la solución protagonista */}
      <div className="mt-5">
        <p className="text-[13px] font-medium tracking-wide text-muted-foreground">
          Tu próxima implementación
        </p>
        <h2 className="mt-1.5 text-[34px] font-bold leading-[1.1] tracking-[-0.015em] text-foreground">
          {recommended?.title ?? "CRM Inteligente con IA"}
        </h2>
      </div>

      {/* STATS como chips visuales separados */}
      <div className="mt-6 flex flex-wrap gap-2.5">
        <div className="app-hero-stat">
          <div className="app-hero-stat-num">
            94<span className="text-[16px] opacity-70">%</span>
          </div>
          <div className="app-hero-stat-label">Match con tu perfil</div>
        </div>
        <div className="app-hero-stat">
          <div className="app-hero-stat-num">
            $4.200<span className="ml-1 text-[14px] opacity-70">/mes</span>
          </div>
          <div className="app-hero-stat-label">ROI estimado</div>
        </div>
        <div className="app-hero-stat">
          <div className="app-hero-stat-num">
            32<span className="text-[16px] opacity-70">h</span>
          </div>
          <div className="app-hero-stat-label">Ahorro por mes</div>
        </div>
      </div>

      {/* CTAs limpios + meta info en línea aparte */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        {recommended ? (
          <Link to="/solutions/$id" params={{ id: recommended.id }} className="app-cta-primary">
            <Play className="h-4 w-4 fill-current" /> Comenzar ahora
          </Link>
        ) : (
          <Link to="/solutions" className="app-cta-primary">
            <Play className="h-4 w-4 fill-current" /> Explorar soluciones
          </Link>
        )}
        <Link to="/builder" className="app-cta-ghost">
          <RefreshCw className="h-4 w-4" /> Regenerar
        </Link>
      </div>
      <div className="mt-3 text-[11px] tracking-wide text-muted-foreground/70">
        45-60 min · Intermedio · 3 herramientas
      </div>

      {/* Hairline */}
      <div className="my-7 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* SIGUIENTES — header con CTA secundario "Ver todas →" */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/70">
          Sigue tu ruta
        </div>
        <Link to="/solutions" className="text-[11px] tracking-wide text-muted-foreground/70 transition-colors hover:text-foreground">
          Ver todas →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {nextInRoute.length > 0 ? (
          nextInRoute.map((s, idx) => (
            <Link
              key={s.id}
              to="/solutions/$id"
              params={{ id: s.id }}
              className="app-mini-step flex items-center gap-3 p-3"
            >
              <StepNum muted>{String(idx + 2).padStart(2, "0")}</StepNum>
              <div className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                {s.title}
              </div>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--violet-text)" }}>
                {idx === 0 ? "87%" : "82%"}
              </span>
            </Link>
          ))
        ) : (
          <div className="col-span-2 rounded-xl border border-dashed border-border p-4 text-center text-[12px] text-muted-foreground/70">
            Tu ruta se completa a medida que avanzás.
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Próxima Mentoría — placeholder hasta que esté la tabla `mentorias`
// Layout: Próxima Mentoría grupal → FALTAN → HOY · hora → título → Q&A abierto →
// Anotarme · te avisamos antes → HOY YA HUBO 09:00/10:30/14:00 + Grabaciones →
// 4 mentorías por día · entrá a todas.
// =============================================================================
function NextMentoria() {
  // TODO(mentorías): leer próxima mentoría + slots pasados de tabla `mentorias`.
  // 4 slots por día: 09:00 / 10:30 / 14:00 / 15:30 ART.
  const nextSlot = { hora: "15:30", faltan: "1h 30min", titulo: "Mentoría grupal de IA" };
  const pastSlotsHoy = ["09:00", "10:30", "14:00"];

  return (
    <div className="app-card col-span-12 p-5 lg:col-span-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/70">
          PRÓXIMA MENTORÍA
        </span>
        <span className="app-pill-violet inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium">
          <Clock className="h-3 w-3" /> FALTAN {nextSlot.faltan}
        </span>
      </div>
      <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#8B5CF6" }} />
        HOY · {nextSlot.hora} ART
      </div>
      <h3 className="mt-1 text-[22px] font-bold leading-tight">{nextSlot.titulo}</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">Q&amp;A abierto · entrá cuando quieras</p>
      <Link
        to="/mentoria"
        className="app-cta-primary mt-4 w-full justify-center"
      >
        <Bell className="h-4 w-4" /> Anotarme · te avisamos antes
      </Link>
      <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/70">
        HOY YA HUBO
      </div>
      <div className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
        {pastSlotsHoy.map((s, i) => (
          <span key={s} className="inline-flex items-center gap-2">
            <span className="tabular-nums">{s}</span>
            {i < pastSlotsHoy.length - 1 && <span className="text-muted-foreground/40">·</span>}
          </span>
        ))}
        <Link to="/mentoria" className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition hover:text-foreground">
          Grabaciones <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="text-[11px] text-muted-foreground">
        4 mentorías por día · entrá a todas las que quieras
      </div>
    </div>
  );
}

// =============================================================================
// Active Implementations — reemplaza los 4 KPIs genéricos.
// Si hay 0 en curso: empty state CTA. Si hay 1+: cards con progreso real.
// =============================================================================
function ActiveImplementations({
  items,
  completed,
}: {
  items: Array<{
    id: string;
    title: string;
    slug: string;
    completedSteps: number;
    totalSteps: number;
    progressPct: number;
    lastActivity: number;
  }>;
  completed: number;
}) {
  // ── Empty state: el user todavía no arrancó ninguna ─────────
  if (items.length === 0) {
    return (
      <section className="mt-6">
        <div className="app-card flex flex-col items-start justify-between gap-5 p-7 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
              Implementaciones activas
            </div>
            <h3 className="mt-2 text-[20px] font-semibold leading-tight text-foreground">
              {completed > 0
                ? `Llevás ${completed} implementada${completed > 1 ? "s" : ""} · ¿arrancamos otra?`
                : "Todavía no arrancaste una implementación"}
            </h3>
            <p className="mt-2 max-w-[520px] text-[14px] leading-relaxed text-muted-foreground">
              Cuando arranques una solución, vas a ver acá el progreso en tiempo real, la última actividad y los próximos pasos.
            </p>
          </div>
          <Link to="/solutions" className="app-cta-primary shrink-0">
            Ver soluciones <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  // ── Estado activo: hasta 3 implementaciones en curso ─────────
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
          Implementaciones activas
        </div>
        <span className="text-[11px] text-muted-foreground/70 tabular-nums">
          {items.length} en curso
          {completed > 0
            ? ` · ${completed} completada${completed > 1 ? "s" : ""}`
            : ""}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.id}
            to="/solutions/$id"
            params={{ id: item.id }}
            className="app-card block p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h4 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
                {item.title}
              </h4>
              <span
                className="shrink-0 text-[11px] font-semibold tabular-nums"
                style={{ color: "var(--violet-text)" }}
              >
                {item.completedSteps}/{item.totalSteps}
              </span>
            </div>
            <div className="app-progress-track mt-4" style={{ height: 4 }}>
              <div
                className="app-progress-fill"
                style={{ width: `${item.progressPct}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground/70">
                {relativeShort(new Date(item.lastActivity).toISOString())}
              </span>
              <span
                className="font-medium"
                style={{ color: "var(--violet-text)" }}
              >
                Continuar →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// Impact Hero — métrica REAL (no aspiracional).
// Sólo aparece cuando el user tiene actividad (≥1 step completado lifetime).
// =============================================================================
function ImpactHero({
  week,
  lifetime,
}: {
  week: {
    stepsThisWeek: number;
    hoursThisWeek: number;
    dollarsThisWeek: number;
  };
  lifetime: {
    stepsTotal: number;
    hoursLifetime: number;
    dollarsLifetime: number;
  };
}) {
  return (
    <section className="mt-6">
      <div className="app-card flex flex-col gap-6 p-7 md:flex-row md:items-center md:gap-8">
        {/* IZQUIERDA — métrica grande de la semana */}
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
            Tu impacto esta semana
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className="text-[48px] font-bold leading-none tracking-[-0.02em] tabular-nums"
              style={{ color: "var(--violet-text-strong)" }}
            >
              {Math.round(week.hoursThisWeek)}
              <span className="text-[24px] opacity-70">h</span>
            </span>
            <span className="text-[15px] text-muted-foreground">
              ahorradas con IA
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Equivale a{" "}
            <strong className="text-foreground tabular-nums">
              USD {week.dollarsThisWeek.toLocaleString("es-AR")}
            </strong>{" "}
            en eficiencia ·{" "}
            <span className="tabular-nums">{week.stepsThisWeek}</span>{" "}
            {week.stepsThisWeek === 1 ? "paso completado" : "pasos completados"}
          </p>
        </div>

        {/* DIVISOR vertical en desktop, horizontal en mobile */}
        <div className="hidden h-16 w-px self-center bg-border md:block" />
        <div className="block h-px w-full bg-border md:hidden" />

        {/* DERECHA — acumulado total */}
        <div className="flex-none md:min-w-[200px]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            Acumulado total
          </div>
          <div className="mt-2 text-[24px] font-bold leading-none tabular-nums text-foreground">
            {lifetime.hoursLifetime}
            <span className="text-[14px] font-normal text-muted-foreground/70">h</span>
          </div>
          <div className="mt-1.5 text-[13px] tabular-nums text-muted-foreground">
            USD {lifetime.dollarsLifetime.toLocaleString("es-AR")}
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// KPI Card (legacy — ya no se usa en el dashboard, mantenido por si reaparece)
// =============================================================================
function KpiCard({
  label, value, prefix, suffix, sub, progressPct, footer, badge, sparkline,
}: {
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  sub: string;
  progressPct?: number;
  footer?: string;
  badge?: string;
  sparkline?: boolean;
}) {
  return (
    <div className="app-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/70">
          {label}
        </span>
        {badge && (
          <span className="rounded border border-border bg-card/60 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.10em] text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-[16px] text-muted-foreground">{prefix}</span>}
        <span className="text-[36px] font-bold leading-none tracking-tight tabular-nums">{value}</span>
        {suffix && <span className="text-[16px] text-muted-foreground">{suffix}</span>}
      </div>
      <div className="mt-1 text-[12px] text-muted-foreground">{sub}</div>
      {typeof progressPct === "number" && (
        <div className="mt-4 h-[5px] overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(90deg,#8B5CF6,#A78BFA)",
            }}
          />
        </div>
      )}
      {sparkline && (
        <svg viewBox="0 0 120 30" className="mt-4 h-7 w-full">
          <path
            d="M0,22 L15,20 L30,18 L45,14 L60,12 L75,9 L90,7 L105,4 L120,2"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </svg>
      )}
      {footer && <div className="mt-2 text-[11px] text-muted-foreground/70">{footer}</div>}
    </div>
  );
}

// =============================================================================
// Tu Journey
// =============================================================================
function TuJourney({
  recommended,
}: {
  recommended: { id: string; title: string } | null;
}) {
  return (
    <section className="app-card mt-6 overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-5">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/70">
            TU JOURNEY
          </div>
          <div className="mt-0.5 text-[17px] font-semibold">Próximos pasos</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded border border-border bg-card/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            <Command className="h-3 w-3" /> K
          </span>
          <span className="text-[12px] text-muted-foreground/70">para acción rápida</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-3">
        <JourneyCard
          step="01"
          time="10 min"
          title="Conectá tus herramientas"
          subtitle="Slack · Gmail · Calendar"
          cta="Conectar"
          to="/settings"
        />
        <JourneyCard
          step="02"
          time="45 min"
          title={recommended ? `Implementá ${recommended.title.slice(0, 28)}${recommended.title.length > 28 ? "…" : ""}` : "Implementá tu primera solución"}
          subtitle="Tu solución recomendada"
          cta="Empezar"
          to={recommended ? "/solutions/$id" : "/solutions"}
          params={recommended ? { id: recommended.id } : undefined}
        />
        <JourneyCard
          step="03"
          time="15:30 hoy"
          title="Entrá a la mentoría"
          subtitle="Q&A grupal abierto"
          cta="Anotarme"
          to="/mentoria"
        />
      </div>
    </section>
  );
}

function JourneyCard({
  step, time, title, subtitle, cta, to, params,
}: {
  step: string; time: string; title: string; subtitle: string; cta: string;
  to: "/settings" | "/solutions/$id" | "/solutions" | "/mentoria";
  params?: { id: string };
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      className="app-mini-step block p-4"
    >
      <div className="mb-3 flex items-center gap-3">
        <StepNum>{step}</StepNum>
        <span className="text-[12px] text-muted-foreground/70">{time}</span>
      </div>
      <div className="text-[15px] font-medium text-foreground">{title}</div>
      <div className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</div>
      <div className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-foreground">
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

// =============================================================================
// Lo que está pasando
// =============================================================================
function LoQueEstaPasando({
  newest,
}: {
  newest: { id: string; title: string; created_at: string; short_description: string } | null;
}) {
  // TODO: ranking de comunidad + eventos en vivo cuando exista la tabla.
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[15px] font-semibold">Lo que está pasando</div>
        <div className="text-[12px] text-muted-foreground/70">en Implementa IA · esta semana</div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <PassingCard
          badge="NUEVA"
          subBadge={newest ? relativeShort(newest.created_at) : "hace 3 días"}
          title={newest?.title ?? "Plataforma de Recompra y Suscripción"}
          subtitle={newest?.short_description?.slice(0, 60) ?? "Solución recién agregada"}
          cta="Ver solución"
          to={newest ? "/solutions/$id" : "/solutions"}
          params={newest ? { id: newest.id } : undefined}
        />
        <PassingCard
          badge="COMUNIDAD"
          subBadge="esta semana"
          title="143 implementadores activos"
          subtitle="LatAm · empresas B2B"
          cta="Ver ranking"
          to="/solutions"
        />
        <PassingCard
          badge="EN VIVO"
          subBadge="Jue 5 jun · 19h ART"
          title="Workshop: Builder no-code"
          subtitle="Carlos Sánchez · 60 min"
          cta="Inscribirme"
          to="/mentoria"
        />
      </div>
    </section>
  );
}

function PassingCard({
  badge, subBadge, title, subtitle, cta, to, params,
}: {
  badge: string; subBadge: string; title: string; subtitle: string; cta: string;
  to: "/solutions/$id" | "/solutions" | "/mentoria";
  params?: { id: string };
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      className="app-card block p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded border border-border bg-card/60 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.10em] text-muted-foreground">
          {badge}
        </span>
        <span className="text-[11px] text-muted-foreground/70">{subBadge}</span>
      </div>
      <div className="text-[14px] font-medium text-foreground">{title}</div>
      <div className="mt-1 text-[12px] text-muted-foreground">{subtitle}</div>
      <div className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-foreground">
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

// =============================================================================
// Helpers
// =============================================================================
function StepNum({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className="grid h-7 w-7 place-content-center rounded-lg text-[12px] font-semibold tabular-nums"
      style={
        muted
          ? {
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.45)",
            }
          : {
              background: "rgba(139,92,246,0.10)",
              border: "1px solid rgba(139,92,246,0.25)",
              color: "#C4B5FD",
            }
      }
    >
      {children}
    </span>
  );
}

function relativeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  return `hace ${Math.floor(days / 30)} mes`;
}

