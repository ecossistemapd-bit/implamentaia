import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowRight, Eye, Trash2, FolderKanban } from "lucide-react";
import { toast } from "sonner";

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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-l-4 border-teal-500 pl-4">
      <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-zinc-400">{subtitle}</p>}
    </div>
  );
}

function statusInfo(s: string) {
  if (s === "ready" || s === "completed")
    return { label: "Completado", cls: "bg-teal-500/15 text-teal-300 border-teal-500/30" };
  if (s === "pending")
    return { label: "Pendiente", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  if (s === "generating")
    return { label: "En curso", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
  return { label: s, cls: "bg-zinc-800/50 text-zinc-300 border-zinc-700/40" };
}

function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [promptModal, setPromptModal] = useState<{ open: boolean; content: string }>(
    { open: false, content: "" },
  );
  const [confirm, setConfirm] = useState<
    | { open: true; kind: "session" | "project"; id: string; label: string }
    | { open: false }
  >({ open: false });

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

  const handleConfirmDelete = async () => {
    if (!confirm.open || !user) return;
    const { kind, id } = confirm;
    if (kind === "project") {
      // Optimistic update
      qc.setQueryData<ProjectRow[]>(
        ["builder-projects-all", user.id],
        (old) => (old ?? []).filter((p) => p.id !== id),
      );
      const { error } = await supabase
        .from("builder_projects")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) {
        toast.error("No se pudo eliminar");
        qc.invalidateQueries({ queryKey: ["builder-projects-all", user.id] });
      } else {
        toast.success("Proyecto eliminado");
      }
    } else {
      qc.setQueryData<SessionRow[]>(
        ["builder-sessions-in-progress", user.id],
        (old) => (old ?? []).filter((s) => s.id !== id),
      );
      const { error } = await supabase
        .from("builder_sessions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) {
        toast.error("No se pudo eliminar");
        qc.invalidateQueries({ queryKey: ["builder-sessions-in-progress", user.id] });
      } else {
        toast.success("Sesión eliminada");
      }
    }
    setConfirm({ open: false });
  };

  return (
    <div className="mx-auto max-w-[960px] px-6 py-10">
      <div className="border-l-4 border-teal-500 pl-4">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Mis <span className="text-teal-400">proyectos</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Tus implementaciones en curso y completadas.
        </p>
      </div>

      {/* En progreso */}
      <section className="mt-10">
        <SectionHeader title="En progreso" subtitle="Sesiones del Builder activas" />
        <div className="mt-4 space-y-3">
          {loadingSessions ? (
            <div className="h-20 animate-pulse rounded-xl bg-zinc-900/60" />
          ) : (inProgress ?? []).length === 0 ? (
            <EmptyState text="No tenés implementaciones en curso." />
          ) : (
            (inProgress ?? []).map((s) => {
              const pct = Math.round(((s.current_step ?? 1) / 5) * 100);
              return (
                <div
                  key={s.id}
                  className="group relative flex flex-col gap-3 rounded-xl border border-zinc-800/50 bg-zinc-900/80 p-4 shadow-lg shadow-black/20 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-teal-500/40 hover:shadow-2xl hover:shadow-black/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold text-zinc-100">
                        {s.solutions?.title ?? "Solución"}
                      </div>
                      {s.status === "paused" && (
                        <span className="rounded-md border border-zinc-700/40 bg-zinc-800/40 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                          Pausada
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="whitespace-nowrap text-xs text-zinc-400">
                        Paso {s.current_step ?? 1} de 5
                      </div>
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-zinc-800">
                        <div className="h-full bg-teal-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="mt-1.5 text-xs text-zinc-600">
                      Última actividad: {timeAgo(s.updated_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      className="h-9 shrink-0 rounded-xl bg-white text-black hover:bg-zinc-100"
                      onClick={() => {
                        try {
                          localStorage.setItem(`builder_session_${s.solution_id}`, s.id);
                        } catch {}
                        navigate({ to: "/builder/$solutionId", params: { solutionId: s.solution_id } });
                      }}
                    >
                      Continuar <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                    <button
                      onClick={() =>
                        setConfirm({
                          open: true,
                          kind: "session",
                          id: s.id,
                          label: s.solutions?.title ?? "esta sesión",
                        })
                      }
                      title="Eliminar"
                      aria-label="Eliminar"
                      className="rounded-lg p-2 text-zinc-400 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Completados */}
      <section className="mt-12">
        <SectionHeader title="Completados" subtitle="Tus proyectos finalizados" />
        <div className="mt-4 space-y-3">
          {loadingProjects ? (
            <div className="h-20 animate-pulse rounded-xl bg-zinc-900/60" />
          ) : (projects ?? []).length === 0 ? (
            <EmptyState text="Todavía no tenés proyectos completados." />
          ) : (
            (projects ?? []).map((p) => {
              const isImpl = p.type === "implementador";
              const st = statusInfo(p.status);
              return (
                <div
                  key={p.id}
                  className="group relative flex flex-col gap-2 rounded-xl border border-zinc-800/50 bg-zinc-900/80 p-4 shadow-lg shadow-black/20 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-teal-500/40 hover:shadow-2xl hover:shadow-black/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-zinc-100">
                      {p.solutions?.title ?? p.title}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {p.solutions?.category && (
                        <span className="text-xs capitalize text-zinc-400">
                          {p.solutions.category}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          isImpl
                            ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                            : "bg-zinc-800/40 text-zinc-300 border border-zinc-700/40"
                        }`}
                      >
                        {isImpl ? "Implementador" : "DIY"}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${st.cls}`}
                      >
                        {st.label}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {new Date(p.created_at).toLocaleDateString("es", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.builder_session_id && (
                      <Button
                        variant="outline"
                        className="h-8 shrink-0 rounded-xl border-zinc-700 bg-transparent text-xs text-zinc-300 hover:border-teal-500 hover:text-teal-400"
                        onClick={() => openPrompt(p.builder_session_id!)}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" /> Ver prompt generado
                      </Button>
                    )}
                    <button
                      onClick={() =>
                        setConfirm({
                          open: true,
                          kind: "project",
                          id: p.id,
                          label: p.solutions?.title ?? p.title,
                        })
                      }
                      title="Eliminar"
                      aria-label="Eliminar"
                      className="rounded-lg p-2 text-zinc-400 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <Dialog open={promptModal.open} onOpenChange={(o) => setPromptModal((s) => ({ ...s, open: o }))}>
        <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Prompt generado</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-zinc-900/60 p-4 font-mono text-xs whitespace-pre-wrap text-zinc-200">
            {promptModal.content}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirm.open}
        onOpenChange={(o) => !o && setConfirm({ open: false })}
      >
        <AlertDialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar proyecto?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Esta acción no se puede deshacer. El proyecto y toda su configuración se eliminarán permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white hover:bg-red-500"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/60 bg-zinc-900/40 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/15">
        <FolderKanban className="h-7 w-7 text-teal-400" />
      </div>
      <p className="mt-3 font-medium text-zinc-300">{text}</p>
      <p className="mt-1 text-sm text-zinc-600">
        Cuando inicies una implementación, va a aparecer acá.
      </p>
    </div>
  );
}
