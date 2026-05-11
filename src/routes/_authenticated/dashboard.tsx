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
    </div>
  );
}
