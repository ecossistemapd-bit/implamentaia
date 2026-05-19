import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Trophy, Rocket, BookOpen, FolderKanban, Calendar, Sparkles,
  ArrowRight, Bot, Activity, Flame,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingModal } from "@/components/onboarding-modal";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

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
    queryKey: ["dashboard-v3", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [steps, projects, modProg, allMods, allSolutions, solComments] = await Promise.all([
        supabase.from("solution_steps_progress" as never).select("solution_id, step, completed, completed_at").eq("user_id", user!.id),
        supabase.from("builder_projects").select("id, status").eq("user_id", user!.id),
        supabase.from("user_progress" as never).select("module_id, completed, modules:module_id(course_id)").eq("user_id", user!.id),
        supabase.from("modules" as never).select("id, course_id"),
        // Sin .limit(): el catálogo tiene 90+ soluciones. Con limit(20) la
        // solución del usuario podía no estar en el lote → el join por id
        // fallaba → "no iniciaste ninguna solución" y "en una solución"
        // genérico pese a tener progreso real.
        supabase.from("solutions").select("id, title, slug, short_description, icon_name"),
        supabase.from("solution_comments").select("solution_id, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
      ]);

      type Step = { solution_id: string; step: string; completed: boolean; completed_at: string | null };
      const stepRows = ((steps as { data: Step[] | null }).data) ?? [];
      const stepsBySol: Record<string, Set<string>> = {};
      stepRows.forEach((s) => {
        if (!s.completed) return;
        (stepsBySol[s.solution_id] ??= new Set()).add(s.step);
      });
      const solsList = (allSolutions.data ?? []) as Array<{ id: string; title: string; slug: string; short_description: string; icon_name: string }>;
      const STEP_ORDER = ["herramientas", "archivos", "video", "comentarios", "conclusion"] as const;
      const STEP_LABELS: Record<string, string> = {
        herramientas: "Herramientas", archivos: "Archivos", video: "Video",
        comentarios: "Comentarios", conclusion: "Conclusión",
      };
      const inProgress = Object.entries(stepsBySol)
        .filter(([, set]) => set.size > 0 && set.size < 5)
        .map(([sid, set]) => {
          const sol = solsList.find((s) => s.id === sid);
          if (!sol) return null;
          const nextKey = STEP_ORDER.find((k) => !set.has(k));
          return { ...sol, completed: set.size, nextStepLabel: nextKey ? STEP_LABELS[nextKey] : "" };
        })
        .filter((x): x is NonNullable<typeof x> => !!x);
      const completed = Object.values(stepsBySol).filter((s) => s.size >= 5).length;

      const modProgRows = ((modProg.data ?? []) as Array<{ module_id: string; completed: boolean; modules: { course_id: string } | null }>);
      const allModsRows = ((allMods.data ?? []) as Array<{ id: string; course_id: string }>);
      const startedCourses = new Set<string>();
      const doneByCourse: Record<string, number> = {};
      modProgRows.forEach((p) => {
        if (p.modules?.course_id) {
          startedCourses.add(p.modules.course_id);
          if (p.completed) doneByCourse[p.modules.course_id] = (doneByCourse[p.modules.course_id] ?? 0) + 1;
        }
      });
      const totalByCourse: Record<string, number> = {};
      allModsRows.forEach((m) => { totalByCourse[m.course_id] = (totalByCourse[m.course_id] ?? 0) + 1; });

      const projectRows = projects.data ?? [];
      const activeProjects = projectRows.filter((p) => p.status !== "completed").length;

      // Recent activity: last completed steps + comments
      type Activity = { type: "step" | "comment"; label: string; date: string; solId?: string };
      const recentSteps: Activity[] = stepRows
        .filter((s) => s.completed && s.completed_at)
        .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
        .slice(0, 5)
        .map((s) => {
          const sol = solsList.find((x) => x.id === s.solution_id);
          return { type: "step", label: `Completaste "${s.step}" en ${sol?.title ?? "una solución"}`, date: s.completed_at as string, solId: s.solution_id };
        });
      const commentRows = (solComments.data ?? []) as Array<{ solution_id: string; created_at: string }>;
      const recentComments: Activity[] = commentRows.map((c) => {
        const sol = solsList.find((x) => x.id === c.solution_id);
        return { type: "comment", label: `Comentaste en ${sol?.title ?? "una solución"}`, date: c.created_at, solId: c.solution_id };
      });
      const recent = [...recentSteps, ...recentComments]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

      return {
        completed,
        inProgress,
        coursesStarted: startedCourses.size,
        activeProjects,
        recent,
      };
    },
  });

  const hour = new Date().getHours();
  const tod = hour < 12 ? "Buen día" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const greetName = fullName?.split(" ")[0] || "bienvenido";
  const streakDays = memberSince
    ? Math.max(1, Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 1;

  const stats = [
    { icon: Trophy, label: "Soluciones completadas", value: data?.completed ?? 0 },
    { icon: Rocket, label: "Soluciones en progreso", value: data?.inProgress.length ?? 0 },
    { icon: BookOpen, label: "Cursos en progreso", value: data?.coursesStarted ?? 0 },
    { icon: FolderKanban, label: "Proyectos activos", value: data?.activeProjects ?? 0 },
  ];

  return (
    <>
      <OnboardingModal />
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Hero */}
        <section className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Flame className="h-3.5 w-3.5" /> {streakDays} días consecutivos
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground">
              {tod}, <span className="text-foreground">{greetName}</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Seguí construyendo tu negocio con IA. Explorá soluciones, avanzá en tus cursos.
            </p>
            <Link
              to="/solutions"
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all duration-200 ease-out hover:opacity-90"
            >
              Explorar Soluciones <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Calendar className="h-4 w-4" /> Próxima Sesión
              </div>
            </div>
            <div className="mt-4 flex flex-col items-center justify-center py-4 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-2 text-sm text-muted-foreground">Sesiones en vivo próximamente</p>
            </div>
            <div className="mt-3 rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground">
              Las sesiones se anuncian por email
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="premium-card p-5">
              <s.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
              <div className="mt-3 text-[2.5rem] font-bold leading-[1.1] text-foreground">
                {s.value}
              </div>
              <div className="mt-1 text-[13px] text-muted-foreground">{s.label}</div>
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, s.value * 20)}%` }}
                />
              </div>
            </div>
          ))}
        </section>

        {/* En Progreso + Próximos pasos */}
        <section className={`mt-8 grid gap-6 ${(data?.inProgress.length ?? 0) > 0 ? "lg:grid-cols-[1.4fr_1fr]" : ""}`}>
          <EnProgreso inProgress={data?.inProgress ?? []} />
          {(data?.inProgress.length ?? 0) > 0 && <ProximosPasos next={data!.inProgress[0]} />}
        </section>

        {/* Actividad reciente */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Actividad reciente</h2>
          <div className="rounded-2xl border border-border bg-card p-4">
            {(data?.recent.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Tu actividad aparecerá aquí mientras avanzás.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {(data?.recent ?? []).map((a, i) => (
                  <li key={i} className="flex items-center gap-3 py-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Activity className="h-4 w-4" />
                    </div>
                    <span className="flex-1 text-foreground">{a.label}</span>
                    <span className="text-xs text-muted-foreground">{relativeTime(a.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function EnProgreso({ inProgress }: { inProgress: Array<{ id: string; title: string; completed: number }> }) {
  const [tab, setTab] = useState<"sol" | "cur">("sol");
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 inline-flex items-center gap-1 rounded-full border border-border bg-background p-1">
        {([["sol", "Soluciones"], ["cur", "Cursos"]] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              tab === k
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "sol" ? (
        inProgress.length === 0 ? (
          <Empty text="Todavía no iniciaste ninguna solución" cta="Ver soluciones" to="/solutions" />
        ) : (
          <div className="space-y-3">
            {inProgress.slice(0, 4).map((s) => {
              const pct = Math.round((s.completed / 5) * 100);
              return (
                <Link
                  key={s.id}
                  to="/solutions/$id"
                  params={{ id: s.id }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{s.title}</div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{s.completed} de 5 pasos</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        )
      ) : (
        <Empty text="Continuá tu aprendizaje" cta="Ver cursos" to="/cursos" />
      )}
    </div>
  );
}

function Empty({ text, cta, to }: { text: string; cta: string; to: "/solutions" | "/cursos" }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
      <Sparkles className="h-8 w-8 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      <Link
        to={to}
        className="mt-3 inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
      >
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function ProximosPasos({ next }: { next: { id: string; title: string; nextStepLabel: string; completed: number } }) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-card p-6">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
        <Bot className="h-4 w-4" /> Próximo paso sugerido
      </div>
      <Link
        to="/solutions/$id"
        params={{ id: next.id }}
        className="mt-4 block rounded-xl border border-border bg-card p-4 transition hover:border-primary/50"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground">{next.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Continuá en: <span className="text-primary">{next.nextStepLabel || "siguiente paso"}</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{next.completed} de 5 pasos completados</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
        </div>
      </Link>
    </div>
  );
}

function relativeTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
  } catch {
    return "";
  }
}
