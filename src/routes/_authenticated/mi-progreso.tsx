import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, BookOpen, Sparkles, Trophy, ArrowRight, FolderKanban, Rocket,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/mi-progreso")({
  component: MiProgreso,
});

const STEP_ORDER = ["herramientas", "archivos", "video", "comentarios", "conclusion"] as const;
const STEP_LABELS: Record<string, string> = {
  herramientas: "Herramientas",
  archivos: "Archivos",
  video: "Video",
  comentarios: "Comentarios",
  conclusion: "Conclusión",
};

const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  assigned: { label: "Asignado", cls: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  in_progress: { label: "En curso", cls: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  completed: { label: "Completado", cls: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  generating: { label: "Generando", cls: "bg-zinc-600/20 text-zinc-400 border-zinc-600/30" },
  ready: { label: "Listo", cls: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  error: { label: "Error", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
};

function MiProgreso() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["mi-progreso", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [stepsRes, modulesProgRes, modulesAllRes, projectsRes, solutionsRes, coursesRes] = await Promise.all([
        supabase
          .from("solution_steps_progress" as never)
          .select("solution_id, step, completed"),
        supabase
          .from("user_progress" as never)
          .select("module_id, completed, modules:module_id(course_id)")
          .eq("user_id", user!.id),
        supabase.from("modules" as never).select("id, course_id"),
        supabase
          .from("builder_projects")
          .select("id, title, status, created_at, source_solution_id, solutions:source_solution_id(title)")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase.from("solutions").select("id, title, slug, icon_name"),
        supabase.from("courses" as never).select("id, title, thumbnail_url"),
      ]);

      type Step = { solution_id: string; step: string; completed: boolean };
      const steps = ((stepsRes as { data: Step[] | null }).data) ?? [];
      const stepsBySolution: Record<string, Set<string>> = {};
      steps.forEach((s) => {
        if (!s.completed) return;
        (stepsBySolution[s.solution_id] ??= new Set()).add(s.step);
      });
      const solutionsList = ((solutionsRes.data ?? []) as Array<{ id: string; title: string; slug: string }>);
      const solutionsInProgress = Object.entries(stepsBySolution)
        .map(([sid, set]) => {
          const sol = solutionsList.find((x) => x.id === sid);
          if (!sol) return null;
          const completed = set.size;
          const nextIdx = STEP_ORDER.findIndex((k) => !set.has(k));
          return {
            id: sid,
            title: sol.title,
            completed,
            currentStep: nextIdx === -1 ? "Completado" : STEP_LABELS[STEP_ORDER[nextIdx]],
          };
        })
        .filter((x): x is NonNullable<typeof x> => !!x)
        .sort((a, b) => b.completed - a.completed);

      const solutionsCompleted = solutionsInProgress.filter((s) => s.completed >= 5).length;
      const solutionsActive = solutionsInProgress.filter((s) => s.completed < 5).length;

      const modProg = ((modulesProgRes.data ?? []) as Array<{ module_id: string; completed: boolean; modules: { course_id: string } | null }>);
      const allMods = ((modulesAllRes.data ?? []) as Array<{ id: string; course_id: string }>);
      const startedCourseSet = new Set<string>();
      const completedByCourse: Record<string, number> = {};
      modProg.forEach((p) => {
        if (p.modules?.course_id) {
          startedCourseSet.add(p.modules.course_id);
          if (p.completed) completedByCourse[p.modules.course_id] = (completedByCourse[p.modules.course_id] ?? 0) + 1;
        }
      });
      const totalByCourse: Record<string, number> = {};
      allMods.forEach((m) => { totalByCourse[m.course_id] = (totalByCourse[m.course_id] ?? 0) + 1; });
      const completedCourseSet = new Set<string>();
      Object.keys(totalByCourse).forEach((cid) => {
        if (totalByCourse[cid] > 0 && completedByCourse[cid] === totalByCourse[cid]) completedCourseSet.add(cid);
      });

      const coursesList = ((coursesRes.data ?? []) as Array<{ id: string; title: string }>);
      const coursesInProgress = Array.from(startedCourseSet).map((cid) => {
        const c = coursesList.find((x) => x.id === cid);
        return {
          id: cid,
          title: c?.title ?? "Curso",
          done: completedByCourse[cid] ?? 0,
          total: totalByCourse[cid] ?? 0,
        };
      }).sort((a, b) => b.done - a.done);

      const projects = projectsRes.data ?? [];
      return {
        solutionsActive,
        solutionsCompleted,
        coursesStarted: startedCourseSet.size,
        coursesCompleted: completedCourseSet.size,
        projectsTotal: projects.length,
        projectsActive: projects.filter((p) => p.status !== "completed").length,
        solutionsInProgress,
        coursesInProgress,
        recentProjects: projects.slice(0, 3),
      };
    },
  });

  const cards = [
    { icon: Sparkles, label: "Soluciones iniciadas", value: data?.solutionsStarted ?? 0 },
    { icon: Trophy, label: "Soluciones completadas", value: data?.solutionsCompleted ?? 0 },
    { icon: BookOpen, label: "Cursos en progreso", value: data?.coursesStarted ?? 0 },
    { icon: TrendingUp, label: "Proyectos activos", value: data?.projectsActive ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Mi <span className="text-violet-400">Progreso</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Un resumen de todo lo que estás aprendiendo e implementando.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition duration-200 hover:scale-[1.02] hover:border-violet-500/50"
          >
            <c.icon className="h-5 w-5 text-violet-400" strokeWidth={1.75} />
            <div className="mt-3 text-3xl font-bold tracking-tight text-violet-400">
              {isLoading ? "—" : c.value}
            </div>
            <div className="mt-1 text-sm text-zinc-400">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Soluciones en progreso */}
      <Section title="Soluciones en progreso">
        {!isLoading && (data?.solutionsInProgress.length ?? 0) === 0 ? (
          <EmptyState
            icon={Sparkles}
            text="Todavía no iniciaste ninguna solución"
            cta="Ver soluciones"
            onClick={() => navigate({ to: "/solutions" })}
          />
        ) : (
          <div className="space-y-3">
            {(data?.solutionsInProgress ?? []).map((s) => {
              const pct = Math.round((s.completed / 5) * 100);
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-violet-500/50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-zinc-100">{s.title}</h3>
                        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-400">
                          En: {s.currentStep}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                          <div className="h-full bg-violet-400 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="shrink-0 text-xs text-zinc-400">{s.completed} de 5 pasos</span>
                      </div>
                    </div>
                    <Link
                      to="/solutions/$id"
                      params={{ id: s.id }}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 transition hover:border-violet-500 hover:text-violet-400"
                    >
                      Continuar <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Cursos en progreso */}
      <Section title="Cursos en progreso">
        {!isLoading && (data?.coursesInProgress.length ?? 0) === 0 ? (
          <EmptyState
            icon={BookOpen}
            text="Todavía no iniciaste ningún curso"
            cta="Ver cursos"
            onClick={() => navigate({ to: "/cursos" })}
          />
        ) : (
          <div className="space-y-3">
            {(data?.coursesInProgress ?? []).map((c) => {
              const pct = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-violet-500/50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-violet-400" />
                        <h3 className="font-semibold text-zinc-100">{c.title}</h3>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                          <div className="h-full bg-violet-400 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="shrink-0 text-xs text-zinc-400">{c.done} de {c.total} módulos</span>
                      </div>
                    </div>
                    <Link
                      to="/cursos"
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 transition hover:border-violet-500 hover:text-violet-400"
                    >
                      Continuar <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Proyectos recientes */}
      <Section title="Mis proyectos recientes">
        {!isLoading && (data?.recentProjects.length ?? 0) === 0 ? (
          <EmptyState
            icon={FolderKanban}
            text="Todavía no creaste ningún proyecto"
            cta="Ir al Builder"
            onClick={() => navigate({ to: "/solutions" })}
          />
        ) : (
          <div className="space-y-3">
            {((data?.recentProjects ?? []) as Array<{
              id: string; title: string; status: string; created_at: string;
              solutions: { title: string } | null;
            }>).map((p) => {
              const meta = PROJECT_STATUS[p.status] ?? PROJECT_STATUS.pending;
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-violet-500/50"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-zinc-100">{p.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span>{p.solutions?.title ?? "Sin solución"}</span>
                      <span>·</span>
                      <span>{new Date(p.created_at).toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                    </div>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${meta.cls}`}>
                    {meta.label}
                  </span>
                  <Link
                    to="/projects"
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 transition hover:border-violet-500 hover:text-violet-400"
                  >
                    Ver proyecto <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({
  icon: Icon, text, cta, onClick,
}: { icon: typeof Rocket; text: string; cta: string; onClick: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center">
      <Icon className="mx-auto h-8 w-8 text-zinc-600" strokeWidth={1.5} />
      <p className="mt-3 text-sm text-zinc-400">{text}</p>
      <button
        onClick={onClick}
        className="mt-4 inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-400 transition hover:bg-violet-500/20"
      >
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
