import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, FolderKanban, Bookmark, Clock } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const firstName = (user?.email ?? "").split("@")[0];

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [saved, projects] = await Promise.all([
        supabase.from("saved_solutions").select("id", { count: "exact", head: true }),
        supabase.from("builder_projects").select("id", { count: "exact", head: true }),
      ]);
      return {
        saved: saved.count ?? 0,
        projects: projects.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Soluciones guardadas", value: stats?.saved ?? 0, icon: Bookmark },
    { label: "Proyectos creados", value: stats?.projects ?? 0, icon: FolderKanban },
    { label: "Categorías", value: CATEGORIES.length, icon: Sparkles },
    { label: "Horas estimadas ahorradas", value: (stats?.projects ?? 0) * 8, icon: Clock },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Hola, {firstName}</h1>
      <p className="mt-2 text-muted-foreground">Empezá donde lo dejaste o explorá el catálogo.</p>

      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <div className="mt-4 text-3xl font-semibold tracking-tight">{c.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
            </div>
          );
        })}
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-medium">Categorías populares</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              to="/solutions"
              search={{ category: cat.key } as never}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm transition hover:bg-accent"
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Explorar el catálogo</h2>
          <Link to="/solutions" className="text-sm text-muted-foreground hover:text-foreground">
            Ver todas →
          </Link>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          36 soluciones listas con guía paso a paso, prompts e integraciones.
        </p>
      </section>

      <ContinuarAprendiendo />
    </div>
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
    <section className="mt-14">
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
