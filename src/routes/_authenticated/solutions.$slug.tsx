import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Bookmark, BookmarkCheck, Rocket, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, DIFFICULTY_LABEL, type Difficulty } from "@/lib/categories";
import { getLucideIcon } from "@/lib/icon";

export const Route = createFileRoute("/_authenticated/solutions/$slug")({
  component: SolutionDetail,
});

function SolutionDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: s, isLoading } = useQuery({
    queryKey: ["solution", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("solutions").select("*").eq("slug", slug).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: saved } = useQuery({
    queryKey: ["saved", slug, user?.id],
    enabled: !!s && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_solutions")
        .select("id")
        .eq("user_id", user!.id)
        .eq("solution_id", s!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!s || !user) return;
      if (saved) {
        await supabase.from("saved_solutions").delete().eq("user_id", user.id).eq("solution_id", s.id);
      } else {
        await supabase.from("saved_solutions").insert({ user_id: user.id, solution_id: s.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved", slug] });
      toast.success(saved ? "Removido de guardados" : "Guardado");
    },
  });

  if (isLoading || !s) {
    return <div className="mx-auto max-w-5xl px-6 py-16"><div className="h-8 w-64 animate-pulse rounded bg-muted" /></div>;
  }

  const Icon = getLucideIcon(s.icon_name);
  const catLabel = CATEGORIES.find((c) => c.key === s.category)?.label;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:py-16">
      <Link to="/solutions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver al catálogo
      </Link>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <Icon className="h-10 w-10" strokeWidth={1.5} />
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">{s.title}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">{catLabel}</Badge>
            <Badge variant="outline">{DIFFICULTY_LABEL[s.difficulty as Difficulty]}</Badge>
          </div>
          <div className="prose-mono mt-8">
            <ReactMarkdown>{s.long_description}</ReactMarkdown>
          </div>

          <div className="mt-10">
            <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Herramientas necesarias
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {s.tools_required.map((t: string) => (
                <span key={t} className="rounded-full border border-border bg-card px-3 py-1 text-xs">{t}</span>
              ))}
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <Row k="Dificultad" v={DIFFICULTY_LABEL[s.difficulty as Difficulty]} />
            <Row k="Tiempo estimado" v={s.estimated_time} />
            <Row k="ROI estimado" v={s.roi_estimate} />
            <Button
              size="lg"
              className="w-full rounded-full"
              onClick={() => navigate({ to: "/builder", search: { source: s.slug } as never })}
            >
              <Rocket className="mr-1 h-4 w-4" /> Configurar con Builder
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => toggleSave.mutate()}
              disabled={toggleSave.isPending}
            >
              {saved ? <BookmarkCheck className="mr-1 h-4 w-4" /> : <Bookmark className="mr-1 h-4 w-4" />}
              {saved ? "Guardado" : "Guardar"}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className="mt-1 text-sm font-medium">{v}</div>
    </div>
  );
}
