import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingModal } from "@/components/onboarding-modal";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setFullName(data?.full_name ?? null));
  }, [user]);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats-v2", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [sessions, activeProjects, prompts, progress] = await Promise.all([
        supabase.from("builder_sessions").select("id", { count: "exact", head: true }),
        supabase
          .from("builder_projects")
          .select("id", { count: "exact", head: true })
          .neq("status", "completed"),
        supabase
          .from("builder_sessions")
          .select("id", { count: "exact", head: true })
          .not("generated_prompt", "is", null),
        supabase
          .from("user_progress" as never)
          .select("module_id, completed, modules:module_id(course_id)")
          .eq("user_id", user!.id)
          .eq("completed", true),
      ]);
      const courseIds = new Set<string>();
      ((progress.data ?? []) as Array<{ modules: { course_id: string } | null }>).forEach((p) => {
        if (p.modules?.course_id) courseIds.add(p.modules.course_id);
      });
      return {
        explored: prompts.count ?? 0,
        builders: sessions.count ?? 0,
        active: activeProjects.count ?? 0,
        courses: courseIds.size,
      };
    },
  });

  const cards = [
    { label: "Soluciones exploradas", value: stats?.explored ?? 0 },
    { label: "Builder iniciados", value: stats?.builders ?? 0 },
    { label: "Proyectos activos", value: stats?.active ?? 0 },
    { label: "Cursos en progreso", value: stats?.courses ?? 0 },
  ];

  const greeting = fullName?.split(" ")[0] || "bienvenido";

  return (
    <>
      <OnboardingModal />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-bold tracking-tight">Hola, {greeting} 👋</h1>
        <p className="mt-1 text-sm text-gray-500">Acá está el resumen de tu actividad en Implementa AI.</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-card p-4">
              <div className="text-2xl font-bold tracking-tight">{c.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>

        <section className="mt-8">
          <h2 className="text-base font-semibold">Acciones rápidas</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <QuickAction emoji="🔧" label="Nueva solución" to="/solutions" />
            <QuickAction emoji="📚" label="Continuar curso" to="/cursos" />
            <QuickAction emoji="📋" label="Mis proyectos" to="/projects" />
          </div>
        </section>

        <ContinuarAprendiendo />
      </div>
    </>
  );
}

function QuickAction({ emoji, label, to }: { emoji: string; label: string; to: "/solutions" | "/cursos" | "/projects" }) {
  return (
    <Link
      to={to}
      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 p-4 text-center text-sm font-medium transition hover:bg-gray-50"
    >
      <span className="text-lg">{emoji}</span>
      <span>{label}</span>
    </Link>
  );
}

const COURSE_EMOJI: Record<string, string> = {
  "No-Code": "🛠️",
  "Inteligencia Artificial": "🤖",
  "Automatización": "⚡",
};

function ContinuarAprendiendo() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["dashboard-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: courses } = await supabase
        .from("courses" as never)
        .select("id, title, category")
        .eq("is_published", true)
        .order("order_index")
        .limit(2);
      const list = (courses ?? []) as Array<{ id: string; title: string; category: string | null }>;
      const ids = list.map((c) => c.id);
      if (ids.length === 0) return [];
      const { data: mods } = await supabase
        .from("modules" as never)
        .select("id, course_id")
        .in("course_id", ids);
      const modList = (mods ?? []) as Array<{ id: string; course_id: string }>;
      const modIds = modList.map((m) => m.id);
      const { data: prog } = modIds.length
        ? await supabase
            .from("user_progress" as never)
            .select("module_id, completed")
            .eq("user_id", user!.id)
            .in("module_id", modIds)
        : { data: [] as Array<{ module_id: string; completed: boolean }> };
      const completedSet = new Set(
        ((prog ?? []) as Array<{ module_id: string; completed: boolean }>)
          .filter((p) => p.completed)
          .map((p) => p.module_id),
      );
      return list.map((c) => {
        const courseMods = modList.filter((m) => m.course_id === c.id);
        const total = courseMods.length;
        const done = courseMods.filter((m) => completedSet.has(m.id)).length;
        return { ...c, total, done };
      });
    },
  });

  const items = data ?? [];

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Continuar aprendiendo</h2>
        <Link to="/cursos" className="text-sm text-muted-foreground hover:text-foreground">
          Ver todos los cursos →
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((c) => {
          const pct = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
          return (
            <Link
              key={c.id}
              to="/cursos/$courseId"
              params={{ courseId: c.id }}
              className="flex h-20 items-center gap-4 rounded-xl border border-border bg-card px-4 transition hover:bg-accent"
            >
              <div className="text-2xl">{COURSE_EMOJI[c.category ?? ""] ?? "📘"}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{c.title}</div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded bg-muted">
                  <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.done} de {c.total} módulos
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
