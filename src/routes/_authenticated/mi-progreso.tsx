import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, BookOpen, Sparkles, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/mi-progreso")({
  component: MiProgreso,
});

function MiProgreso() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["mi-progreso", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [stepsRes, modulesProgRes, modulesAllRes, projectsRes] = await Promise.all([
        (supabase as never as typeof supabase)
          .from("solution_steps_progress" as never)
          .select("solution_id, completed")
          .eq("user_id", user!.id),
        supabase
          .from("user_progress" as never)
          .select("module_id, completed, modules:module_id(course_id)")
          .eq("user_id", user!.id),
        supabase.from("modules" as never).select("id, course_id"),
        supabase
          .from("builder_projects")
          .select("id, status")
          .eq("user_id", user!.id),
      ]);

      const steps = ((stepsRes as { data: { solution_id: string; completed: boolean }[] | null }).data) ?? [];
      const completedBySolution: Record<string, number> = {};
      steps.forEach((s) => {
        if (s.completed) completedBySolution[s.solution_id] = (completedBySolution[s.solution_id] ?? 0) + 1;
      });
      const solutionsStarted = Object.keys(completedBySolution).length;
      const solutionsCompleted = Object.values(completedBySolution).filter((n) => n >= 5).length;

      const modProg = ((modulesProgRes.data ?? []) as Array<{ module_id: string; completed: boolean; modules: { course_id: string } | null }>);
      const allMods = ((modulesAllRes.data ?? []) as Array<{ id: string; course_id: string }>);
      const completedCourseSet = new Set<string>();
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
      Object.keys(totalByCourse).forEach((cid) => {
        if (totalByCourse[cid] > 0 && completedByCourse[cid] === totalByCourse[cid]) completedCourseSet.add(cid);
      });

      const projects = projectsRes.data ?? [];
      return {
        solutionsStarted,
        solutionsCompleted,
        coursesStarted: startedCourseSet.size,
        coursesCompleted: completedCourseSet.size,
        projectsTotal: projects.length,
        projectsActive: projects.filter((p) => p.status !== "completed").length,
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Progreso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Un resumen de todo lo que estás aprendiendo e implementando.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-border bg-card p-5 shadow-lg transition duration-200 hover:scale-[1.01] hover:border-primary/50"
          >
            <c.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
            <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">
              {isLoading ? "—" : c.value}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      {!isLoading && (data?.solutionsStarted ?? 0) === 0 && (data?.coursesStarted ?? 0) === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no empezaste ninguna solución ni curso.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              to="/solutions"
              className="rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Explorar soluciones
            </Link>
            <Link
              to="/cursos"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              Ver cursos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
