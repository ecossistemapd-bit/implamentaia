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
        supabase.from("solution_steps_progress" as never).select("solution_id, step, completed").eq("user_id", user!.id),
        supabase.from("builder_projects").select("id, status").eq("user_id", user!.id),
        supabase.from("user_progress" as never).select("module_id, completed, modules:module_id(course_id)").eq("user_id", user!.id),
        supabase.from("modules" as never).select("id, course_id"),
        supabase.from("solutions").select("id, title, slug, short_description, icon_name").limit(20),
        supabase.from("solution_comments").select("solution_id, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
      ]);

      type Step = { solution_id: string; step: string; completed: boolean };
      const stepRows = ((steps as { data: Step[] | null }).data) ?? [];
      const stepsBySol: Record<string, Set<string>> = {};
      stepRows.forEach((s) => {
        if (!s.completed) return;
        (stepsBySol[s.solution_id] ??= new Set()).add(s.step);
      });
      const solsList = (allSolutions.data ?? []) as Array<{ id: string; title: string; slug: string; short_description: string; icon_name: string }>;
      const inProgress = Object.entries(stepsBySol)
        .filter(([, set]) => set.size > 0 && set.size < 5)
        .map(([sid, set]) => {
          const sol = solsList.find((s) => s.id === sid);
          return sol ? { ...sol, completed: set.size } : null;
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

      const startedSolIds = new Set(Object.keys(stepsBySol));
      const recommendation = solsList.find((s) => !startedSolIds.has(s.id)) ?? solsList[0] ?? null;

      // Recent activity: last completed steps + comments
      type Activity = { type: "step" | "comment"; label: string; date: string; solId?: string };
      const recentSteps: Activity[] = stepRows
        .filter((s) => s.completed)
        .slice(-5)
        .map((s) => {
          const sol = solsList.find((x) => x.id === s.solution_id);
          return { type: "step", label: `Completaste "${s.step}" en ${sol?.title ?? "una solución"}`, date: new Date().toISOString(), solId: s.solution_id };
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
        recommendation,
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/20 px-3 py-1 text-xs font-medium text-orange-400">
              <Flame className="h-3.5 w-3.5" /> {streakDays} días consecutivos
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">
              {tod}, <span className="text-teal-400">{greetName}</span>! 👋
            </h1>
            <p className="mt-2 max-w-lg text-sm text-slate-400">
              Seguí construyendo tu negocio con IA. Explorá soluciones, avanzá en tus cursos.
            </p>
            <Link
              to="/solutions"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:scale-[1.02] hover:shadow-teal-500/40"
            >
              Explorar Soluciones <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-2xl border border-teal-500/30 bg-slate-800 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-400">
                <Calendar className="h-4 w-4" /> Próxima Sesión
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-red-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> Live
              </span>
            </div>
            <div className="mt-4 flex flex-col items-center justify-center py-4 text-center">
              <Calendar className="h-10 w-10 text-slate-600" strokeWidth={1.5} />
              <p className="mt-2 text-sm text-slate-300">Sesiones en vivo próximamente</p>
            </div>
            <div className="mt-3 rounded-xl bg-teal-500/10 p-3 text-sm text-slate-400">
              Las sesiones se anuncian por email
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-800 p-5 transition hover:scale-[1.02] hover:border-teal-500/50">
              <s.icon className="h-5 w-5 text-teal-400" strokeWidth={1.75} />
              <div className="mt-3 text-3xl font-bold text-teal-400">{s.value}</div>
              <div className="mt-1 text-xs text-slate-400">{s.label}</div>
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-700">
                <div className="h-full bg-teal-400 transition-all" style={{ width: `${Math.min(100, s.value * 20)}%` }} />
              </div>
            </div>
          ))}
        </section>

        {/* En Progreso + Recomendación */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <EnProgreso inProgress={data?.inProgress ?? []} />
          <Recomendacion sol={data?.recommendation ?? null} />
        </section>

        {/* Actividad reciente */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-white">Actividad reciente</h2>
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
            {(data?.recent.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Tu actividad aparecerá aquí mientras avanzás.
              </div>
            ) : (
              <ul className="divide-y divide-slate-700/40">
                {(data?.recent ?? []).map((a, i) => (
                  <li key={i} className="flex items-center gap-3 py-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/10 text-teal-400">
                      <Activity className="h-4 w-4" />
                    </div>
                    <span className="flex-1 text-slate-200">{a.label}</span>
                    <span className="text-xs text-slate-500">{relativeTime(a.date)}</span>
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
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-700/50">
        {([["sol", "Soluciones"], ["cur", "Cursos"]] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 pb-2 text-sm transition ${
              tab === k
                ? "border-teal-400 text-teal-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
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
                  className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-3 transition hover:border-teal-500/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-100">{s.title}</div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-700">
                      <div className="h-full bg-teal-400" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">{s.completed} de 5 pasos</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 py-10 text-center">
      <Sparkles className="h-8 w-8 text-slate-600" />
      <p className="mt-2 text-sm text-slate-400">{text}</p>
      <Link
        to={to}
        className="mt-3 inline-flex items-center gap-1 rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-400 hover:bg-teal-500/20"
      >
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function Recomendacion({ sol }: { sol: { id: string; title: string; short_description: string } | null }) {
  return (
    <div className="rounded-2xl border border-teal-500/20 bg-slate-800 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-teal-400">
          <Bot className="h-4 w-4" /> Recomendación de IA
        </div>
        <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-400">
          ANÁLISIS INTELIGENTE
        </span>
      </div>
      {sol ? (
        <Link
          to="/solutions/$id"
          params={{ id: sol.id }}
          className="mt-4 block rounded-xl border border-slate-700 bg-slate-900/50 p-4 transition hover:border-teal-500/50"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-100">{sol.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{sol.short_description}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-teal-400" />
          </div>
        </Link>
      ) : (
        <p className="mt-4 text-sm text-slate-400">Cargando recomendación…</p>
      )}
    </div>
  );
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `hace ${d} d`;
  const mo = Math.floor(d / 30);
  return `hace ${mo} mes${mo > 1 ? "es" : ""}`;
}
