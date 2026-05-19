import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { FEATURES } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute(
  "/_authenticated/implementador/proyecto/$projectId",
)({
  beforeLoad: () => {
    if (!FEATURES.MARKETPLACE) throw redirect({ to: "/dashboard" });
  },
  component: ProjectDetail,
});

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-muted text-muted-foreground border-border" },
  assigned: { label: "Asignado", cls: "bg-muted text-muted-foreground border-border" },
  in_progress: { label: "En curso", cls: "bg-primary text-primary border-primary" },
  completed: { label: "Completado", cls: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelado", cls: "bg-muted text-muted-foreground border-border" },
};

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const { loading: roleLoading, isImplementer } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roleLoading && !isImplementer) navigate({ to: "/dashboard" });
  }, [roleLoading, isImplementer, navigate]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["impl-project", projectId],
    enabled: !!user && isImplementer,
    queryFn: async () => {
      const { data: project, error } = await supabase
        .from("builder_projects")
        .select("*, solutions:source_solution_id(title, long_description, checklist_items)")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      if (!project) return null;

      type Sess = { generated_prompt: string | null; answers: Record<string, unknown> };
      let session: Sess | null = null;
      if (project.source_solution_id && project.user_id) {
        const { data: s } = await supabase
          .from("builder_sessions")
          .select("generated_prompt, answers")
          .eq("solution_id", project.source_solution_id)
          .eq("user_id", project.user_id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        session = s ? ({ generated_prompt: s.generated_prompt, answers: (s.answers ?? {}) as Record<string, unknown> }) : null;
      }
      return { project, session };
    },
  });

  const [status, setStatus] = useState<string>("pending");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (data?.project) {
      setStatus(data.project.status ?? "pending");
      setNote(data.project.status_note ?? "");
    }
  }, [data]);

  const checklist = useMemo(
    () => (data?.project?.solutions?.checklist_items as string[] | null) ?? [],
    [data],
  );
  const allChecked = checklist.length > 0 && checklist.every((_, i) => checked[i]);

  if (roleLoading || isLoading) {
    return <div className="p-10 text-sm text-muted-foreground">Cargando…</div>;
  }
  if (!data || !data.project) {
    return (
      <div className="p-10 text-sm text-muted-foreground">
        Proyecto no encontrado.{" "}
        <button className="underline" onClick={() => navigate({ to: "/implementador" })}>Volver</button>
      </div>
    );
  }

  const p = data.project;
  const s = data.session;
  const meta = STATUS_META[p.status] ?? STATUS_META.pending;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("builder_projects")
      .update({ status: status as never, status_note: note, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    setSaving(false);
    if (error) {
      toast.error("Error al guardar: " + error.message, { duration: 4000 });
      return;
    }
    toast.success("Cambios guardados ✓", { duration: 4000 });
    refetch();
  };

  const copyPrompt = async () => {
    if (!s?.generated_prompt) return;
    await navigator.clipboard.writeText(s.generated_prompt);
    toast.success("Prompt copiado", { duration: 4000 });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-primary">
        <div className="mx-auto flex max-w-[1100px] items-center gap-4 px-6 py-4">
          <button
            onClick={() => navigate({ to: "/implementador" })}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold text-muted-foreground">
              {p.company_name ?? p.contact_name ?? "Proyecto"} · {p.solutions?.title ?? "—"}
            </div>
          </div>
          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
            {meta.label}
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[3fr_2fr]">
        {/* LEFT */}
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-primary p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Datos del cliente</div>
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Nombre" value={p.contact_name ?? "—"} />
              <Row
                label="Email"
                value={
                  p.contact_email ? (
                    <a href={`mailto:${p.contact_email}`} className="text-muted-foreground hover:underline">
                      {p.contact_email}
                    </a>
                  ) : ("—")
                }
              />
              <Row label="Empresa" value={p.company_name ?? "—"} />
              <Row
                label="Mensaje inicial"
                value={
                  p.context_message ? (
                    <span className="italic text-muted-foreground">{p.context_message}</span>
                  ) : ("—")
                }
              />
              <Row
                label="Fecha"
                value={new Date(p.created_at).toLocaleString("es", {
                  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-muted p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Prompt generado por el cliente
              </div>
              {s?.generated_prompt && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={copyPrompt}>
                  <Copy className="mr-1 h-3 w-3" /> Copiar prompt
                </Button>
              )}
            </div>
            {s?.generated_prompt ? (
              <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-primary p-3 font-mono text-xs text-muted-foreground">
                {s.generated_prompt}
              </pre>
            ) : (
              <div className="mt-3 text-sm text-muted-foreground">El cliente no completó el Builder.</div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-primary p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Respuestas del Builder</div>
            {s?.answers && Object.keys(s.answers).length > 0 ? (
              <div className="mt-3 space-y-3">
                {Object.entries(s.answers).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-xs uppercase text-muted-foreground">{k}</div>
                    <div className="text-sm text-muted-foreground">
                      {typeof v === "string" ? v : JSON.stringify(v)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-muted-foreground">El cliente no completó el diagnóstico.</div>
            )}
          </section>
        </div>

        {/* RIGHT */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-xl border border-border bg-primary p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gestión del proyecto</div>

            <div className="mt-4">
              <div className="mb-1 text-xs text-muted-foreground">Estado actual</div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="assigned">Asignado - En contacto con el cliente</SelectItem>
                  <SelectItem value="in_progress">En curso - Implementando</SelectItem>
                  <SelectItem value="completed">Completado - Entregado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4">
              <div className="mb-1 text-xs text-muted-foreground">Nota interna</div>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej: Cliente contactado el 10/5, esperando accesos..."
                className="min-h-24 resize-none rounded-lg border p-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <Button
              className="mt-4 w-full bg-foreground text-background hover:bg-foreground/90"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </section>

          <section className="rounded-xl border border-border bg-primary p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Checklist</div>
            {checklist.length === 0 ? (
              <div className="text-sm text-muted-foreground">Esta solución no tiene checklist.</div>
            ) : (
              <div className="space-y-2">
                {checklist.map((item, i) => (
                  <label key={i} className="flex cursor-pointer items-start gap-2">
                    <Checkbox
                      checked={!!checked[i]}
                      onCheckedChange={(v) => setChecked((c) => ({ ...c, [i]: !!v }))}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </label>
                ))}
                {allChecked && (
                  <div className="mt-3 text-sm font-medium text-muted-foreground">
                    ✓ Implementación lista para entregar
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <div className="w-32 shrink-0 text-xs uppercase text-muted-foreground">{label}</div>
      <div className="flex-1 text-muted-foreground">{value}</div>
    </div>
  );
}
