import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/projects")({
  component: Projects,
});

function Projects() {
  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("builder_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Mis proyectos</h1>
      <p className="mt-2 text-muted-foreground">Tus implementaciones generadas con el Builder.</p>

      <div className="mt-10 space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)
          : (data ?? []).map((p) => (
              <Link
                key={p.id}
                to="/builder/$id"
                params={{ id: p.id }}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition hover:shadow-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <Badge variant={p.status === "ready" ? "default" : p.status === "error" ? "destructive" : "secondary"}>
                  {p.status}
                </Badge>
              </Link>
            ))}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            Todavía no tenés proyectos. <Link to="/builder" className="underline">Abrí el Builder</Link>.
          </div>
        )}
      </div>
    </div>
  );
}
