import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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
import {
  Wand2,
  Trash2,
  ChevronRight,
  Plus,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects")({
  component: Projects,
});

// ── Types ──────────────────────────────────────────────────────
interface Blueprint {
  titulo: string;
  descripcion: string;
  tags: string[];
  secciones: Record<string, string>;
}

interface BlueprintRow {
  id: string;
  idea: string;
  blueprint: Blueprint;
  created_at: string;
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "hace instantes";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

// ── Page ──────────────────────────────────────────────────────
function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const { data: blueprints, isLoading } = useQuery({
    queryKey: ["blueprints-projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("builder_blueprints")
        .select("id, idea, blueprint, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BlueprintRow[];
    },
  });

  const handleDelete = async () => {
    if (!deleteTarget || !user) return;
    const { id } = deleteTarget;
    qc.setQueryData<BlueprintRow[]>(
      ["blueprints-projects", user.id],
      (old) => (old ?? []).filter((b) => b.id !== id),
    );
    const { error } = await supabase
      .from("builder_blueprints")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar", { duration: 4000 });
      qc.invalidateQueries({ queryKey: ["blueprints-projects", user?.id] });
    } else {
      toast.success("Blueprint eliminado", { duration: 4000 });
    }
    setDeleteTarget(null);
  };

  const openBlueprint = (b: BlueprintRow) => {
    // Navegar al builder y auto-cargar el blueprint (lo toma de la DB al montar)
    navigate({ to: "/builder" });
  };

  return (
    <div className="mx-auto max-w-[1340px] px-8 py-10">

      {/* Header */}
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mb-2">
            Mis proyectos
          </p>
          <h1 className="text-[44px] font-bold tracking-[-0.02em] leading-[1.05] text-foreground">
            Tus <span className="[color:var(--violet-text)]">blueprints</span>
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground max-w-[480px] leading-relaxed">
            Cada blueprint es un plan completo de implementación de IA generado por el Builder.
          </p>
        </div>
        <button
          onClick={() => navigate({ to: "/builder" })}
          className="app-cta-primary shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo blueprint</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : !blueprints || blueprints.length === 0 ? (
        <EmptyState onNew={() => navigate({ to: "/builder" })} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blueprints.map((b) => (
            <BlueprintCard
              key={b.id}
              blueprint={b}
              onOpen={() => openBlueprint(b)}
              onDelete={() => setDeleteTarget({ id: b.id, title: b.blueprint?.titulo ?? b.idea })}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar blueprint?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleteTarget?.title}"</strong> se va a eliminar permanentemente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── BlueprintCard ──────────────────────────────────────────────
function BlueprintCard({
  blueprint: b,
  onOpen,
  onDelete,
}: {
  blueprint: BlueprintRow;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const bp = b.blueprint;
  const sectionCount = bp?.secciones ? Object.keys(bp.secciones).filter((k) => bp.secciones[k]?.length > 0).length : 0;

  return (
    <div className="app-card group flex flex-col gap-0 overflow-hidden">
      {/* Card body — clickable */}
      <button
        onClick={onOpen}
        className="flex-1 text-left p-5 flex flex-col gap-3"
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="h-9 w-9 rounded-xl bg-[var(--violet-pill-bg)] border border-[var(--violet-pill-border)] flex items-center justify-center [color:var(--violet-text)] shrink-0">
            <Wand2 className="h-4 w-4" />
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:[color:var(--violet-text)] transition mt-0.5 shrink-0" />
        </div>

        {/* Title */}
        <div>
          <h3 className="font-bold text-foreground text-[15px] leading-snug line-clamp-2 mb-1.5">
            {bp?.titulo || "Blueprint sin título"}
          </h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
            {bp?.descripcion || b.idea}
          </p>
        </div>

        {/* Tags */}
        {bp?.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bp.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="app-pill-violet inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium [color:var(--violet-text-strong)]">
                {tag}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[var(--violet-border)]/40 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(b.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {sectionCount}/8 secciones
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition opacity-0 group-hover:opacity-100"
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────
function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
      <div className="h-20 w-20 rounded-2xl bg-[var(--violet-pill-bg)] border border-[var(--violet-border)] flex items-center justify-center [color:var(--violet-text)]">
        <Wand2 className="h-9 w-9" />
      </div>
      <div>
        <h2 className="text-[22px] font-bold text-foreground mb-2">Todavía no tenés blueprints</h2>
        <p className="text-[14px] text-muted-foreground max-w-[360px] leading-relaxed">
          Usá el Builder para describir tu idea y la IA va a generar un plan completo de implementación.
        </p>
      </div>
      <button onClick={onNew} className="app-cta-primary">
        <Plus className="h-4 w-4" />
        Crear mi primer blueprint
      </button>
    </div>
  );
}
