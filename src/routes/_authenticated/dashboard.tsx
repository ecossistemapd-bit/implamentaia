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
  // Si el "nombre" parece un email/slug (sin espacios y todo minúscula), capitalizamos
  // el primer caracter para que se vea humano. Si tiene espacios, tomamos la primera palabra.
  const greetName = rawName.includes(" ")
    ? rawName.split(" ")[0]
    : rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const streakDays = memberSince
    ? Math.max(1, Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 1;

  // Nivel basado en soluciones completadas (heurística simple)
  const completed = data?.completed ?? 0;
  const level =
    completed >= 10 ? { name: "Experto", next: "Maestro", curr: completed * 30, ceil: 1000, pct: 80 } :
    completed >= 3  ? { name: "Especialista", next: "Experto", curr: 380 + (completed - 3) * 50, ceil: 800, pct: 50 } :
                      { name: "Aprendiz", next: "Especialista", curr: 120 + completed * 60, ceil: 380, pct: Math.min(100, (120 + completed * 60) / 380 * 100) };

  // Estimaciones aspirational (TODO: leer de solution.development_time_minutes / platform_investment)
  const horasIA = Math.max(8, completed * 12 + (data?.inProgressCount ?? 0) * 4);
  const roi = Math.max(1200, completed * 1500 + (data?.inProgressCount ?? 0) * 800);

  return (
    <>
      <OnboardingModal />

      {/* Wash violeta fijo detrás del área del dashboard. No reacciona al hover. */}
      <div className="dashboard-violet-wash" aria-hidden />

      <div className="relative z-[2] mx-auto max-w-[1340px] px-8 py-8">
        {/* HEADER COMPACTO */}
        <header className="mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Flame className="h-3 w-3" /> {streakDays} días consecutivos
          </span>
          <h1 className="mt-3 text-[36px] font-bold leading-tight tracking-tight">
            {tod}, {greetName}
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Tu ruta personalizada está lista. Empezás por la solución con mayor match.
          </p>
        </header>

        {/* HERO + PRÓXIMA MENTORÍA */}
        <section className="grid grid-cols-12 gap-6">
          <HeroRutaIA recommended={data?.recommended ?? null} nextInRoute={data?.nextInRoute ?? []} />
          <NextMentoria />
        </section>

        {/* KPIs */}
        <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            label="TU PROGRESO"
            value={completed}
            suffix={`/${data?.totalSolutions ?? 93}`}
            sub="soluciones completadas"
            progressPct={Math.min(100, (completed / (data?.totalSolutions ?? 93)) * 100)}
            footer={`Meta: 3 soluciones en 30 días`}
          />
          <KpiCard
            label="TU NIVEL"
            value={level.curr}
            suffix="XP"
            sub={`Siguiente: ${level.next} (${level.ceil} XP)`}
            progressPct={level.pct}
            footer={`Top 32% de implementadores`}
            badge={level.name.toUpperCase()}
          />
          <KpiCard
            label="HORAS IA / MES"
            value={horasIA}
            suffix="h"
            sub="estimadas con tu ruta"
            sparkline
          />
          <KpiCard
            label="ROI ESTIMADO"
            value={roi.toLocaleString("es-AR")}
            prefix="USD"
            suffix="/mes"
            sub="si implementás tu ruta"
            sparkline
          />
        </section>

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
    <div
      className="col-span-12 rounded-2xl border border-border bg-card p-7 transition-shadow duration-500 lg:col-span-8"
      style={{ boxShadow: "0 0 60px -10px rgba(139,92,246,0.14)" }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 100px -10px rgba(139,92,246,0.32)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 60px -10px rgba(139,92,246,0.14)")}
    >
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded border border-border bg-card/60 px-2 py-0.5 text-[10px] font-bold tracking-[0.10em] text-muted-foreground">
            RUTA IA PERSONALIZADA
          </span>
          <span className="text-[12px] text-muted-foreground/70">Generada por Nina · hace unos minutos</span>
        </div>
        <h2 className="text-[26px] font-bold leading-tight text-foreground">
          Para tu empresa, te recomendamos arrancar por{" "}
          <span className="text-foreground">{recommended?.title ?? "CRM Inteligente con IA"}</span>
        </h2>
        <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-muted-foreground">
          El <span className="font-semibold text-foreground">78%</span> de empresas como la tuya (B2B, equipo
          &lt;20) implementa esta solución en el primer mes. Tu match:{" "}
          <span className="font-semibold text-foreground">94%</span>. ROI estimado en 30 días:{" "}
          <span className="font-semibold text-foreground">USD 4.200/mes</span> ahorrando ~32h de trabajo
          manual.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {recommended ? (
            <Link
              to="/solutions/$id"
              params={{ id: recommended.id }}
              className="inline-flex items-center gap-2 rounded-[10px] bg-white px-4 py-[11px] text-[14px] font-semibold text-[#060608] transition hover:bg-zinc-200"
            >
              <Play className="h-4 w-4 fill-current" /> Comenzar ahora
            </Link>
          ) : (
            <Link
              to="/solutions"
              className="inline-flex items-center gap-2 rounded-[10px] bg-white px-4 py-[11px] text-[14px] font-semibold text-[#060608] transition hover:bg-zinc-200"
            >
              <Play className="h-4 w-4 fill-current" /> Explorar soluciones
            </Link>
          )}
          <Link
            to="/builder"
            className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-white/[0.04] px-4 py-[11px] text-[14px] font-semibold text-foreground transition hover:bg-white/[0.07]"
          >
            <RefreshCw className="h-4 w-4" /> Regenerar ruta
          </Link>
          <span className="text-[12px] text-muted-foreground/70">⏱ 45-60 min · Intermedio · 3 herramientas</span>
        </div>

        {/* Hairline */}
        <div className="my-5 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="mb-3 text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/70">
          SIGUIENTES EN TU RUTA
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {nextInRoute.length > 0 ? (
            nextInRoute.map((s, idx) => (
              <Link
                key={s.id}
                to="/solutions/$id"
                params={{ id: s.id }}
                className="flex items-center gap-3 rounded-xl border border-border bg-white/[0.015] p-3 transition hover:border-white/20"
              >
                <StepNum muted>{String(idx + 2).padStart(2, "0")}</StepNum>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-foreground">{s.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground/70">
                    {s.short_description?.slice(0, 60) ?? ""}
                  </div>
                </div>
                <span className="text-[11px] tabular-nums text-muted-foreground/70">
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
    <div
      className="col-span-12 rounded-2xl border border-border bg-card p-5 transition-shadow duration-500 lg:col-span-4"
      style={{ boxShadow: "0 0 60px -10px rgba(139,92,246,0.14)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/70">
          PRÓXIMA MENTORÍA
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
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
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-white px-4 py-[11px] text-[14px] font-semibold text-[#060608] transition hover:bg-zinc-200"
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
// KPI Card
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
    <div className="rounded-2xl border border-border bg-card p-5">
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
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
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
      className="block rounded-xl border border-border bg-white/[0.015] p-4 transition hover:border-white/20"
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
      className="block rounded-2xl border border-border bg-card p-4 transition hover:border-white/20"
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

