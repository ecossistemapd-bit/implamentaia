import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects")({
  component: Projects,
});

type SessionRow = {
  id: string;
  solution_id: string;
  current_step: number;
  status: string;
  updated_at: string;
  generated_prompt: string | null;
  solutions: { title: string; category: string } | null;
};

type ProjectRow = {
  id: string;
  title: string;
  status: string;
  type: string | null;
  builder_session_id: string | null;
  created_at: string;
  source_solution_id: string | null;
  solutions: { title: string; category: string } | null;
};

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "hace instantes";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [promptModal, setPromptModal] = useState<{ open: boolean; content: string }>(
    { open: false, content: "" },
  );

  const { data: inProgress, isLoading: loadingSessions } = useQuery({
    queryKey: ["builder-sessions-in-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("builder_sessions")
        .select("id, solution_id, current_step, status, updated_at, generated_prompt, solutions(title, category)")
        .in("status", ["in_progress", "paused"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SessionRow[];
    },
  });

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ["builder-projects-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("builder_projects")
        .select("id, title, status, type, builder_session_id, created_at, source_solution_id, solutions:source_solution_id(title, category)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectRow[];
    },
  });

  const openPrompt = async (sessionId: string) => {
    const { data } = await supabase
      .from("builder_sessions")
      .select("generated_prompt")
      .eq("id", sessionId)
      .maybeSingle();
    setPromptModal({ open: true, content: data?.generated_prompt ?? "Sin prompt generado." });
  };

  return (
    <div className="mx-auto max-w-[960px] px-6 py-10">
      <h1 className="text-[1.75rem] font-bold tracking-tight">Mis proyectos</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Tus implementaciones en curso y completadas.
      </p>

      {/* En progreso */}
      <section className="mt-8">
        <h2 className="text-[14px] font-semibold uppercase tracking-wider text-muted-foreground">
          En progreso
        </h2>
        <div className="mt-3 space-y-2">
          {loadingSessions ? (
            <div className="h-20 animate-pulse rounded-[10px] bg-muted" />
          ) : (inProgress ?? []).length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-border p-6 text-center text-[12px] text-muted-foreground">
              No tenés implementaciones en curso.
            </div>
          ) : (
            (inProgress ?? []).map((s) => {
              const pct = Math.round(((s.current_step ?? 1) / 5) * 100);
              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-3 rounded-[10px] border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-[14px] font-semibold">
                        {s.solutions?.title ?? "Solución"}
                      </div>
                      {s.status === "paused" && (
                        <Badge variant="secondary" className="text-[10px]">Pausada</Badge>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                        Paso {s.current_step ?? 1} de 5
                      </div>
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="mt-1.5 text-[11px] text-muted-foreground">
                      Última actividad: {timeAgo(s.updated_at)}
                    </div>
                  </div>
                  <Button
                    className="h-9 shrink-0 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-[12px]"
                    onClick={() => {
                      try {
                        localStorage.setItem(`builder_session_${s.solution_id}`, s.id);
                      } catch {}
                      navigate({ to: "/builder/$solutionId", params: { solutionId: s.solution_id } });
                    }}
                  >
                    Continuar <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Completados */}
      <section className="mt-10">
        <h2 className="text-[14px] font-semibold uppercase tracking-wider text-muted-foreground">
          Completados
        </h2>
        <div className="mt-3 space-y-2">
          {loadingProjects ? (
            <div className="h-20 animate-pulse rounded-[10px] bg-muted" />
          ) : (projects ?? []).length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-border p-6 text-center text-[12px] text-muted-foreground">
              Todavía no tenés proyectos completados.
            </div>
          ) : (
            (projects ?? []).map((p) => {
              const isImpl = p.type === "implementador";
              const statusInfo =
                p.status === "ready" || p.status === "completed"
                  ? { label: "Completado", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" }
                  : p.status === "pending"
                    ? { label: "Pendiente", cls: "bg-amber-100 text-amber-700 border-amber-200" }
                    : p.status === "generating"
                      ? { label: "En curso", cls: "bg-sky-100 text-sky-700 border-sky-200" }
                      : { label: p.status, cls: "bg-muted text-foreground border-border" };
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 rounded-[10px] border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">
                      {p.solutions?.title ?? p.title}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {p.solutions?.category && (
                        <span className="text-[11px] text-muted-foreground capitalize">
                          {p.solutions.category}
                        </span>
                      )}
                      <Badge
                        className={`text-[10px] ${
                          isImpl
                            ? "bg-foreground text-background hover:bg-foreground/90"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        }`}
                      >
                        {isImpl ? "Implementador" : "DIY"}
                      </Badge>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${statusInfo.cls}`}
                      >
                        {statusInfo.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("es", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  {p.builder_session_id && (
                    <Button
                      variant="outline"
                      className="h-8 shrink-0 rounded-lg text-[11px]"
                      onClick={() => openPrompt(p.builder_session_id!)}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" /> Ver prompt generado
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      <Dialog open={promptModal.open} onOpenChange={(o) => setPromptModal((s) => ({ ...s, open: o }))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prompt generado</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-muted/60 p-4 font-mono text-[12px] whitespace-pre-wrap">
            {promptModal.content}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
