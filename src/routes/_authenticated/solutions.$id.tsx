import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Wrench, FolderOpen, Video, MessageSquare, Trophy, Check, Link2, Copy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/solutions/$id")({
  component: SolutionByIdDetail,
});

type StepKey = "herramientas" | "archivos" | "video" | "comentarios" | "conclusion";

const STEPS: { key: StepKey; label: string; Icon: typeof Wrench }[] = [
  { key: "herramientas", label: "Herramientas", Icon: Wrench },
  { key: "archivos", label: "Archivos", Icon: FolderOpen },
  { key: "video", label: "Video", Icon: Video },
  { key: "comentarios", label: "Comentarios", Icon: MessageSquare },
  { key: "conclusion", label: "Conclusión", Icon: Trophy },
];

function SolutionByIdDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeStep, setActiveStep] = useState<StepKey>("herramientas");

  const { data: s, isLoading, isError } = useQuery({
    queryKey: ["solution-by-id", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("solutions").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as {
        id: string;
        title: string;
        short_description: string;
        tools_required: string[];
        integrations: string[];
        video_url: string | null;
        resources: { title: string; url: string; type?: string }[] | null;
      };
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["solution-step-progress", id, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as never as typeof supabase)
        .from("solution_steps_progress" as never)
        .select("step, completed")
        .eq("user_id", user!.id)
        .eq("solution_id", id);
      if (error) throw error;
      return (data ?? []) as { step: StepKey; completed: boolean }[];
    },
  });

  const completedSet = useMemo(
    () => new Set((progress ?? []).filter((p) => p.completed).map((p) => p.step)),
    [progress],
  );
  const completedCount = completedSet.size;
  const progressPct = Math.round((completedCount / STEPS.length) * 100);

  const markStepCompleted = async (step: StepKey) => {
    if (!user) return;
    const { error } = await (supabase as never as typeof supabase)
      .from("solution_steps_progress" as never)
      .upsert(
        { user_id: user.id, solution_id: id, step, completed: true, completed_at: new Date().toISOString() } as never,
        { onConflict: "user_id,solution_id,step" } as never,
      );
    if (error) {
      toast.error("Error al guardar progreso");
      return;
    }
    qc.invalidateQueries({ queryKey: ["solution-step-progress", id, user.id] });
    qc.invalidateQueries({ queryKey: ["solutions-progress-all", user.id] });
  };

  const advance = (next: StepKey) => setActiveStep(next);

  useEffect(() => {
    if (!isLoading && (isError || !s)) navigate({ to: "/solutions" });
  }, [isLoading, isError, s, navigate]);

  if (isLoading || !s) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <Link to="/solutions" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Soluciones
        </Link>
        <h1 className="flex-1 text-center text-lg font-bold truncate">{s.title}</h1>
        <span className="text-sm text-gray-500 whitespace-nowrap">{completedCount}/5 completados</span>
      </div>

      {/* Navigator */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <div className="text-right">
            <div className="text-sm font-mono text-foreground">PROGRESO {progressPct}%</div>
            <div className="mt-1 h-1 w-32 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full bg-foreground transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start">
          {STEPS.map((step, i) => {
            const isCompleted = completedSet.has(step.key);
            const isActive = activeStep === step.key;
            const prevCompleted = i > 0 && completedSet.has(STEPS[i - 1].key);
            const Icon = step.Icon;
            return (
              <div key={step.key} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  {i > 0 && (
                    <div className={`h-px flex-1 ${prevCompleted ? "bg-foreground" : "bg-gray-200"}`} />
                  )}
                  <button
                    onClick={() => setActiveStep(step.key)}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      isCompleted
                        ? "border-foreground bg-foreground text-background"
                        : isActive
                        ? "border-foreground bg-background text-foreground"
                        : "border-gray-300 bg-background text-gray-300"
                    }`}
                    aria-label={step.label}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px flex-1 ${isCompleted ? "bg-foreground" : "bg-gray-200"}`} />
                  )}
                </div>
                <span className={`mt-2 text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="mt-10">
        {activeStep === "herramientas" && (
          <StepHerramientas
            tools={[...(s.tools_required ?? []), ...(s.integrations ?? [])]}
            onComplete={async () => {
              await markStepCompleted("herramientas");
              advance("archivos");
            }}
          />
        )}
        {activeStep === "archivos" && (
          <StepArchivos
            solutionId={id}
            resources={s.resources ?? []}
            onComplete={async () => {
              await markStepCompleted("archivos");
              advance("video");
            }}
          />
        )}
        {activeStep === "video" && (
          <StepVideo
            videoUrl={s.video_url}
            title={s.title}
            onComplete={async () => {
              await markStepCompleted("video");
              advance("comentarios");
            }}
          />
        )}
        {activeStep === "comentarios" && (
          <StepComentarios
            solutionId={id}
            onComplete={async () => {
              await markStepCompleted("comentarios");
              advance("conclusion");
            }}
          />
        )}
        {activeStep === "conclusion" && (
          <StepConclusion
            solutionId={id}
            completedSet={completedSet}
            onFinalize={async () => {
              await markStepCompleted("conclusion");
              if (user) {
                await (supabase as never as typeof supabase)
                  .from("builder_projects")
                  .insert({
                    user_id: user.id,
                    source_solution_id: id,
                    type: "diy",
                    status: "completed",
                    title: s.title,
                  } as never);
              }
              navigate({ to: "/projects" });
            }}
          />
        )}
      </div>
    </div>
  );
}

const TOOL_ICON: { match: RegExp; render: () => React.ReactNode }[] = [
  { match: /n8n/i, render: () => <span className="font-bold text-orange-500">n8n</span> },
  { match: /openai|gpt/i, render: () => <span className="text-2xl">🤖</span> },
  { match: /whatsapp|z-?api|evolution/i, render: () => <span className="text-2xl">💬</span> },
  { match: /hubspot|kommo/i, render: () => <span className="text-2xl">📊</span> },
  { match: /supabase/i, render: () => <span className="text-2xl">⚡</span> },
  { match: /claude/i, render: () => <span className="text-2xl">🧠</span> },
  { match: /meta|facebook/i, render: () => <span className="text-2xl">📱</span> },
  { match: /elevenlabs/i, render: () => <span className="text-2xl">🎙️</span> },
  { match: /heygen/i, render: () => <span className="text-2xl">🎬</span> },
];

function renderToolIcon(name: string) {
  const m = TOOL_ICON.find((t) => t.match.test(name));
  if (m) return m.render();
  return <span className="text-2xl">🔧</span>;
}

function StepHerramientas({ tools, onComplete }: { tools: string[]; onComplete: () => void }) {
  const [understood, setUnderstood] = useState<Set<string>>(new Set());
  const unique = Array.from(new Set(tools.filter(Boolean)));
  const toggle = (t: string) => {
    setUnderstood((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };
  return (
    <div>
      <h2 className="text-xl font-bold">Herramientas de la solución</h2>
      <p className="mt-1 text-sm text-muted-foreground">Conocé las herramientas que usaremos en esta implementación.</p>

      {unique.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No hay herramientas asignadas a esta solución.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {unique.map((t) => {
            const isOk = understood.has(t);
            return (
              <button
                key={t}
                onClick={() => toggle(t)}
                className={`relative rounded-xl border p-6 text-center transition ${
                  isOk ? "border-green-200 bg-green-50" : "border-gray-200 bg-white hover:border-foreground"
                }`}
              >
                <span className="absolute left-3 top-3 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold tracking-widest text-gray-400">
                  ESENCIAL
                </span>
                {isOk && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <div className="mx-auto mt-3 flex h-[60px] w-[60px] items-center justify-center rounded-xl border border-gray-100 bg-gray-50">
                  {renderToolIcon(t)}
                </div>
                <div className="mt-3 text-sm font-semibold text-gray-900">{t}</div>
                <div className="mt-1 text-xs text-gray-400">Click para marcar como entendido</div>
              </button>
            );
          })}
        </div>
      )}

      <Button onClick={onComplete} className="mt-8 h-11 w-full rounded-lg bg-foreground text-background hover:bg-foreground/90">
        Marcar paso como completado →
      </Button>
    </div>
  );
}

function StepArchivos({
  solutionId,
  resources,
  onComplete,
}: {
  solutionId: string;
  resources: { title: string; url: string; type?: string }[];
  onComplete: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: session } = useQuery({
    queryKey: ["builder-session", solutionId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("builder_sessions")
        .select("generated_prompt")
        .eq("solution_id", solutionId)
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const copyPrompt = () => {
    if (!session?.generated_prompt) return;
    navigator.clipboard.writeText(session.generated_prompt);
    toast.success("Prompt copiado");
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Materiales y Recursos</h2>
      <p className="mt-1 text-sm text-muted-foreground">Descargá los materiales necesarios para implementar esta solución.</p>

      <h3 className="mt-6 text-sm font-semibold">Links útiles</h3>
      {resources.length === 0 ? (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white py-8 text-center text-sm text-gray-400">
          Los recursos estarán disponibles próximamente.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {resources.map((r, i) => {
            let domain = "";
            try { domain = new URL(r.url).hostname; } catch { domain = r.url; }
            return (
              <div key={i} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Link2 className="h-4 w-4 shrink-0 text-gray-500" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.title}</div>
                    <div className="truncate text-xs text-gray-400">{domain}</div>
                  </div>
                </div>
                <a href={r.url} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">Acceder →</Button>
                </a>
              </div>
            );
          })}
        </div>
      )}

      <h3 className="mt-8 text-sm font-semibold">Tu prompt personalizado</h3>
      {session?.generated_prompt ? (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
            <span className="text-xs text-gray-500">Generado por el Builder</span>
            <Button variant="ghost" size="sm" onClick={copyPrompt}>
              <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
            </Button>
          </div>
          <pre className="max-h-72 overflow-auto p-4 font-mono text-xs whitespace-pre-wrap">{session.generated_prompt}</pre>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-500">Generá tu prompt personalizado con el Builder.</p>
          <Button onClick={() => navigate({ to: "/builder/$solutionId", params: { solutionId } })} className="mt-3">
            Ir al Builder →
          </Button>
        </div>
      )}

      <Button onClick={onComplete} className="mt-8 h-11 w-full rounded-lg bg-foreground text-background hover:bg-foreground/90">
        Marcar paso como completado →
      </Button>
    </div>
  );
}

function StepVideo({ videoUrl, title, onComplete }: { videoUrl: string | null; title: string; onComplete: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-bold">Video de la solución</h2>
      <p className="mt-1 text-sm text-muted-foreground">Seguí el tutorial paso a paso.</p>

      <div className="mt-6">
        {videoUrl ? (
          <>
            <iframe
              src={videoUrl}
              className="w-full aspect-video rounded-xl bg-gray-900"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
            <p className="mt-2 text-sm text-gray-500">{title}</p>
          </>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-100">
            <span className="text-4xl">🎬</span>
            <p className="mt-2 text-sm text-gray-500">Video próximamente</p>
            <p className="text-xs text-gray-400">Estamos preparando el tutorial de esta solución.</p>
          </div>
        )}
      </div>

      <Button onClick={onComplete} className="mt-8 h-11 w-full rounded-lg bg-foreground text-background hover:bg-foreground/90">
        Marcar como visto →
      </Button>
    </div>
  );
}

function StepComentarios({ solutionId, onComplete }: { solutionId: string; onComplete: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: comments } = useQuery({
    queryKey: ["solution-comments", solutionId],
    queryFn: async () => {
      const { data, error } = await (supabase as never as typeof supabase)
        .from("solution_comments" as never)
        .select("id, user_id, rating, comment, created_at")
        .eq("solution_id", solutionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; user_id: string; rating: number | null; comment: string | null; created_at: string }[];
    },
  });

  const submit = async () => {
    if (!user || rating === null) {
      toast.error("Elegí una puntuación");
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as never as typeof supabase)
      .from("solution_comments" as never)
      .insert({ user_id: user.id, solution_id: solutionId, rating, comment: comment || null } as never);
    setSubmitting(false);
    if (error) {
      toast.error("Error al enviar");
      return;
    }
    setComment("");
    setRating(null);
    qc.invalidateQueries({ queryKey: ["solution-comments", solutionId] });
    onComplete();
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Comentarios de la solución</h2>
      <p className="mt-1 text-sm text-muted-foreground">Dejá tu evaluación y mirá qué piensan otros.</p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr]">
        <div>
          <div className="text-sm font-semibold mb-3">Tu evaluación</div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 11 }).map((_, n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={`h-9 w-9 rounded-lg border text-sm transition ${
                  rating === n
                    ? "border-foreground bg-foreground text-background"
                    : "border-gray-200 bg-white hover:bg-gray-100"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>Nada probable</span>
            <span>Muy probable</span>
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentario sobre tu implementación (opcional)..."
            className="mt-4 w-full min-h-24 p-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-foreground"
          />

          <Button
            onClick={submit}
            disabled={submitting}
            className="mt-4 h-11 w-full rounded-lg bg-foreground text-background hover:bg-foreground/90"
          >
            Enviar evaluación
          </Button>
        </div>

        <div>
          <div className="flex items-center text-sm font-semibold">
            Comentarios
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">{comments?.length ?? 0}</span>
          </div>
          <div className="mt-3">
            {!comments || comments.length === 0 ? (
              <p className="text-sm text-gray-400">Sé el primero en comentar.</p>
            ) : (
              comments.map((c) => {
                const initial = "U";
                const time = relativeTime(c.created_at);
                return (
                  <div key={c.id} className="border-b border-gray-100 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                        {initial}
                      </div>
                      <span className="text-sm font-medium">Usuario</span>
                      <span className="text-xs text-gray-400">{time}</span>
                      {c.rating !== null && (
                        <span className="ml-auto rounded bg-foreground px-2 py-0.5 text-xs text-background">{c.rating}</span>
                      )}
                    </div>
                    {c.comment && <p className="mt-1 text-sm text-gray-600">{c.comment}</p>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepConclusion({
  completedSet,
  onFinalize,
}: {
  solutionId: string;
  completedSet: Set<StepKey>;
  onFinalize: () => void;
}) {
  const allFour = (["herramientas", "archivos", "video", "comentarios"] as StepKey[]);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-10 text-center">
        <div className="text-6xl">🏆</div>
        <h2 className="mt-4 text-2xl font-bold">¡Implementación Completada!</h2>
        <p className="mt-2 text-sm text-gray-500">Felicitaciones. Completaste todas las etapas de esta solución.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-6">
          <div className="text-sm font-semibold mb-3">Tu Progreso</div>
          <span className="rounded-full bg-foreground px-3 py-1 text-xs text-background">100% COMPLETADO</span>
          <div className="mt-3 h-1.5 w-full rounded-full bg-foreground" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {allFour.map((k) => (
              <div key={k} className="flex items-center gap-2 rounded-lg border border-gray-100 px-2 py-1.5 text-xs">
                <Check className={`h-3.5 w-3.5 ${completedSet.has(k) ? "text-green-600" : "text-gray-300"}`} />
                <span className="capitalize">{k}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 p-6">
          <div className="text-sm font-semibold mb-4">Lo que recibís</div>
          <div className="space-y-3">
            <div>
              <div className="text-sm">🏅 Acceso permanente</div>
              <div className="text-xs text-gray-400">Volvé a los materiales cuando quieras.</div>
            </div>
            <div>
              <div className="text-sm">📋 Prompt personalizado</div>
              <div className="text-xs text-gray-400">Tu configuración guardada en Mis Proyectos.</div>
            </div>
          </div>
          <Button onClick={onFinalize} className="mt-6 h-11 w-full rounded-lg bg-foreground text-background hover:bg-foreground/90">
            Finalizar implementación
          </Button>
        </div>
      </div>
    </div>
  );
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "hace 1 día";
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months === 1) return "hace 1 mes";
  return `hace ${months} meses`;
}
