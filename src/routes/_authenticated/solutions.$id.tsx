import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Wrench,
  FolderOpen,
  Video,
  MessageSquare,
  Trophy,
  Check,
  Link2,
  Copy,
  Download,
  Clock,
  Play,
  Award,
  FileText,
  Lock,
  Loader2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { CATEGORIES, CATEGORY_LABEL, DIFFICULTY_LABEL, type CategoryKey, type Difficulty } from "@/lib/categories";
import { FEATURES } from "@/lib/features";
import confetti from "canvas-confetti";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/solutions/$id")({
  component: SolutionByIdDetail,
});

type StepKey = "herramientas" | "archivos" | "video" | "comentarios" | "conclusion";

type SolutionToolItem = {
  is_essential: boolean;
  display_order: number | null;
  tool: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    website: string | null;
    logo_url: string | null;
    monthly_cost_usd: number | null;
    cost_label: string | null;
  };
};

const STEPS: { key: StepKey; label: string; Icon: typeof Wrench }[] = [
  { key: "herramientas", label: "Herramientas", Icon: Wrench },
  { key: "archivos", label: "Archivos", Icon: FolderOpen },
  { key: "video", label: "Video", Icon: Video },
  { key: "comentarios", label: "Comentarios", Icon: MessageSquare },
  { key: "conclusion", label: "Conclusión", Icon: Trophy },
];

const PRIOR_STEPS: StepKey[] = ["herramientas", "archivos", "video", "comentarios"];

function SolutionByIdDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeStep, setActiveStep] = useState<StepKey | null>(null);
  const [savingStep, setSavingStep] = useState<StepKey | null>(null);
  const [view, setView] = useState<"overview" | "journey">("overview");
  const initializedRef = useRef(false);
  const viewInitializedRef = useRef(false);
  const confettiFiredRef = useRef(false);

  const { data: s, isLoading, isError } = useQuery({
    queryKey: ["solution-by-id", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solutions")
        .select(`*, solution_tools (is_essential, display_order, tool:tools (id, name, slug, description, website, logo_url, monthly_cost_usd, cost_label))`)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        id: string;
        title: string;
        short_description: string;
        long_description: string | null;
        category: CategoryKey | string;
        difficulty: Difficulty | string;
        estimated_time: string | null;
        cover_image_url: string | null;
        platform_investment: string | null;
        development_time_minutes: number | null;
        tokens_per_execution: number | null;
        tools_required: string[];
        integrations: string[];
        video_url: string | null;
        resources: { title: string; url: string; type?: string; description?: string; domain?: string }[] | null;
        solution_tools: SolutionToolItem[] | null;
        lovable_remix_url: string | null;
        status: string | null;
      };
    },
  });

  const {
    data: progress,
    isLoading: progressLoading,
    isError: progressError,
    refetch: refetchProgress,
  } = useQuery({
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
  const allPriorDone = PRIOR_STEPS.every((k) => completedSet.has(k));

  // Initialize active step from DB once
  useEffect(() => {
    if (initializedRef.current || progressLoading || !progress) return;
    initializedRef.current = true;
    const firstIncomplete = STEPS.find((s) => !completedSet.has(s.key));
    setActiveStep(firstIncomplete ? firstIncomplete.key : "conclusion");
  }, [progress, progressLoading, completedSet]);

  // If user already has progress, jump straight into journey view (skip for in-dev solutions)
  useEffect(() => {
    if (viewInitializedRef.current || progressLoading || !progress) return;
    if (s?.status === "en_desarrollo") {
      viewInitializedRef.current = true;
      return;
    }
    viewInitializedRef.current = true;
    if (completedSet.size > 0) {
      setView("journey");
      toast.success("Continuando implementación", {
        description: "Redirigiendo a donde lo dejaste...",
        duration: 4000,
      });
    }
  }, [progress, progressLoading, completedSet, s?.status]);

  // Confetti when reaching conclusion with all prior done
  useEffect(() => {
    if (
      activeStep === "conclusion" &&
      allPriorDone &&
      !confettiFiredRef.current
    ) {
      confettiFiredRef.current = true;
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.3 },
        colors: ["#22c55e", "#8b5cf6", "#ffffff"],
      });
    }
  }, [activeStep, allPriorDone]);

  // Redirect from conclusion to first incomplete if user lands there without completing
  useEffect(() => {
    if (activeStep === "conclusion" && !allPriorDone && !progressLoading) {
      const firstIncomplete = PRIOR_STEPS.find((k) => !completedSet.has(k));
      if (firstIncomplete) setActiveStep(firstIncomplete);
    }
  }, [activeStep, allPriorDone, completedSet, progressLoading]);

  const markStepCompleted = async (step: StepKey): Promise<boolean> => {
    if (!user) return false;
    setSavingStep(step);
    const { error } = await (supabase as never as typeof supabase)
      .from("solution_steps_progress" as never)
      .upsert(
        { user_id: user.id, solution_id: id, step, completed: true, completed_at: new Date().toISOString() } as never,
        { onConflict: "user_id,solution_id,step" } as never,
      );
    setSavingStep(null);
    if (error) {
      toast.error("No pudimos guardar tu progreso. Intentá de nuevo.", { duration: 4000 });
      return false;
    }
    await qc.invalidateQueries({ queryKey: ["solution-step-progress", id, user.id] });
    qc.invalidateQueries({ queryKey: ["solutions-progress-all", user.id] });
    return true;
  };

  const advanceTo = (next: StepKey) => {
    setActiveStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStepComplete = async (step: StepKey, next: StepKey) => {
    const ok = await markStepCompleted(step);
    if (!ok) return;
    toast.success("¡Paso completado! Avanzando...", { duration: 4000 });
    advanceTo(next);
  };

  useEffect(() => {
    if (!isLoading && (isError || !s)) navigate({ to: "/solutions" });
  }, [isLoading, isError, s, navigate]);

  if (isLoading || !s || activeStep === null) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-900" />
        <div className="mt-6 h-24 w-full animate-pulse rounded bg-zinc-900" />
      </div>
    );
  }

  if (progressError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-zinc-300">No pudimos cargar tu progreso.</p>
        <Button onClick={() => refetchProgress()} className="mt-4 bg-white text-black hover:bg-zinc-100">
          Reintentar
        </Button>
      </div>
    );
  }

  const categoryMeta = CATEGORIES.find((c) => c.key === s.category);
  const CategoryIcon = categoryMeta?.icon ?? Sparkles;
  const categoryLabel = (CATEGORY_LABEL as Record<string, string>)[s.category] ?? s.category;
  const difficultyLabel =
    (DIFFICULTY_LABEL as Record<string, string>)[s.difficulty as Difficulty] ?? s.difficulty;
  const longDesc = s.long_description ?? s.short_description ?? "";

  const goToJourney = () => {
    setView("journey");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goToOverview = () => {
    setView("overview");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const inDev = s.status === "en_desarrollo";

  if (view === "overview" || inDev) {
    return (
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <Link to="/solutions" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Soluciones
        </Link>

        {/* Header — 2 columns */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[3fr_2fr] md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300">
                <CategoryIcon className="h-3.5 w-3.5" /> {categoryLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300">
                {difficultyLabel}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white md:text-5xl">{s.title}</h1>
            {s.short_description && (
              <p className="mt-3 max-w-xl text-base text-zinc-400">{s.short_description}</p>
            )}
            {!inDev && (
              <Button
                onClick={goToJourney}
                className="mt-6 rounded-lg bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-600"
              >
                Continuar Solución <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
            {s.cover_image_url ? (
              <img
                src={s.cover_image_url}
                alt={s.title}
                className="h-full max-h-[260px] w-full object-cover"
              />
            ) : (
              <div className="flex h-[220px] w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
                <CategoryIcon className="h-20 w-20 text-zinc-700" strokeWidth={1.2} />
              </div>
            )}
          </div>
        </div>

        {/* Stat cards — 2 rows of 3 */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Categoría" value={categoryLabel} />
          <StatCard label="Nivel" value={difficultyLabel} />
          <StatCard label="Tiempo Estimado" value={s.estimated_time || "Variable"} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Inversión de la Plataforma"
            value={s.platform_investment || "—"}
            hint="Valor que la plataforma invirtió para que tengas esta solución."
          />
          <StatCard
            label="Tiempo de Desarrollo"
            value={s.development_time_minutes ? `${s.development_time_minutes} min` : "—"}
            hint="Tiempo dedicado a elaborar y estructurar esta solución."
          />
          <StatCard
            label="Tokens por Ejecución"
            value={s.tokens_per_execution ? s.tokens_per_execution.toLocaleString() : "—"}
            hint="Promedio de tokens usados en cada ejecución."
          />
        </div>

        {/* About + Experto */}
        <div className={`mt-6 grid grid-cols-1 gap-4 ${FEATURES.MARKETPLACE ? "lg:grid-cols-[7fr_3fr]" : ""}`}>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <h2 className="text-xl font-bold text-white">Sobre esta solución</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
              {longDesc || "Sin descripción disponible."}
            </p>
          </div>

          {FEATURES.MARKETPLACE && (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <div className="flex items-center -space-x-2">
              {["bg-violet-500", "bg-emerald-500", "bg-amber-500"].map((c, i) => (
                <div
                  key={i}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-900 ${c} text-xs font-bold text-white`}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Verificados
            </span>
            <h3 className="mt-3 text-lg font-bold text-white">Implementador Partner</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Conectá con un especialista dedicado para implementar esta solución en tu negocio.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              {[
                "Implementador dedicado a tu proyecto",
                "Acompañamiento completo del proceso",
                "Soporte durante la implementación",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => navigate({ to: "/contratar-experto" })}
              className="mt-5 w-full rounded-lg bg-teal-500 py-2.5 text-sm font-semibold text-white hover:bg-teal-600"
            >
              Contratar Implementador <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
          )}
        </div>

        {inDev && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
              <Lock className="h-4 w-4" />
            </div>
            <h3 className="mt-3 text-lg font-semibold text-white">Solución en desarrollo</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
              Estamos puliendo los últimos detalles. Suscribite para recibir un aviso cuando esté disponible.
            </p>
            <Button
              onClick={() => toast.success("Te avisaremos al email cuando esté lista.", { duration: 4000 })}
              className="mt-5 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-zinc-100"
            >
              Avisarme cuando esté lista
            </Button>
          </div>
        )}
      </div>
    );
  }

  // VIEW 2 — Journey
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      {/* Minimal header */}
      <button
        onClick={goToOverview}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Soluciones
      </button>
      <h1 className="mt-4 text-2xl font-bold text-white md:text-3xl">{s.title}</h1>

      {/* Progress summary */}
      <div className="mt-6 rounded-xl border border-white/8 bg-[#111111] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">Tu progreso</div>
            <div className="mt-1 text-2xl font-semibold text-white">{progressPct}%</div>
          </div>
          <div className="text-xs text-zinc-500">
            {completedCount} de {STEPS.length} etapas completadas
          </div>
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/8">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Step navigator */}
      <div className="mt-6">
        <div className="flex items-start">
          {STEPS.map((step, i) => {
            const isCompleted = completedSet.has(step.key);
            const isActive = activeStep === step.key;
            const prevCompleted = i > 0 && completedSet.has(STEPS[i - 1].key);
            const Icon = step.Icon;
            return (
              <div key={step.key} className="relative flex flex-1 flex-col items-center">
                {/* Connector lines (behind, top half aligned with circle center) */}
                {i > 0 && (
                  <div className={`absolute left-0 top-[18px] h-px w-1/2 -translate-y-1/2 ${prevCompleted ? "bg-green-500" : "bg-white/8"}`} />
                )}
                {i < STEPS.length - 1 && (
                  <div className={`absolute right-0 top-[18px] h-px w-1/2 -translate-y-1/2 ${isCompleted ? "bg-green-500" : "bg-white/8"}`} />
                )}
                <button
                  type="button"
                  onClick={() => setActiveStep(step.key)}
                  aria-label={step.label}
                  className="group relative z-10 flex flex-col items-center gap-2.5 rounded-lg px-2 py-1 transition"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
                      isCompleted
                        ? "border-green-500 bg-green-500 text-white"
                        : isActive
                        ? "border-violet-500 bg-violet-500 text-white"
                        : "border-white/10 bg-background text-zinc-600 group-hover:border-white/20"
                    }`}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span
                    className={`text-center text-xs transition group-hover:text-white ${
                      isActive ? "text-white font-medium" : isCompleted ? "text-green-500" : "text-zinc-600"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="mt-6">
        {activeStep === "herramientas" && (
          <StepHerramientas
            solutionId={id}
            userId={user?.id ?? ""}
            tools={s.solution_tools ?? []}
            isCompleted={completedSet.has("herramientas")}
            saving={savingStep === "herramientas"}
            onComplete={() => handleStepComplete("herramientas", "archivos")}
          />
        )}
        {activeStep === "archivos" && (
          <StepArchivos
            solutionId={id}
            resources={s.resources ?? []}
            lovableRemixUrl={s.lovable_remix_url}
            isCompleted={completedSet.has("archivos")}
            saving={savingStep === "archivos"}
            onComplete={() => handleStepComplete("archivos", "video")}
          />
        )}
        {activeStep === "video" && (
          <StepVideo
            videoUrl={s.video_url}
            title={s.title}
            isCompleted={completedSet.has("video")}
            saving={savingStep === "video"}
            onComplete={() => handleStepComplete("video", "comentarios")}
          />
        )}
        {activeStep === "comentarios" && (
          <StepComentarios
            solutionId={id}
            isCompleted={completedSet.has("comentarios")}
            saving={savingStep === "comentarios"}
            onComplete={() => handleStepComplete("comentarios", "conclusion")}
          />
        )}
        {activeStep === "conclusion" && allPriorDone && (
          <StepConclusion
            solutionId={id}
            solutionTitle={s.title}
            completedSet={completedSet}
            saving={savingStep === "conclusion"}
            onFinalize={async () => {
              const ok = await markStepCompleted("conclusion");
              if (!ok) return;
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

function CompleteButton({
  onClick,
  saving,
  disabled,
  isCompleted,
  disabledLabel,
  label = "Marcar paso como completado",
}: {
  onClick: () => void;
  saving: boolean;
  disabled?: boolean;
  isCompleted: boolean;
  disabledLabel?: string;
  label?: string;
}) {
  if (isCompleted) {
    return (
      <Button disabled className="rounded-lg bg-zinc-800 px-6 py-2 text-zinc-400">
        <Check className="mr-1.5 h-4 w-4" /> Paso completado
      </Button>
    );
  }
  return (
    <Button
      onClick={onClick}
      disabled={disabled || saving}
      className="rounded-lg bg-violet-500 px-6 py-2 text-white hover:bg-violet-600 disabled:opacity-40"
    >
      {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
      {disabled && !saving ? disabledLabel ?? label : label}
    </Button>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#111111] p-4">
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
      {hint && <div className="mt-1.5 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

function SectionHeader({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-bold text-white">{text}</h2>
      {action}
    </div>
  );
}

function getToolInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
  return letters.toUpperCase().slice(0, 2) || "?";
}

const TOOL_DOMAIN: Record<string, string> = {
  // Order matters: more specific keys first (substring match below).
  "google calendar": "calendar.google.com",
  "google sheets": "sheets.google.com",
  "google search console": "search.google.com",
  "meta business": "business.facebook.com",
  "meta ads": "business.facebook.com",
  "whatsapp business": "business.whatsapp.com",
  "openai whisper": "openai.com",
  "openai gpt": "openai.com",
  "chat gpt": "openai.com",
  chatgpt: "openai.com",
  "z-api": "z-api.io",
  zapi: "z-api.io",
  "evolution api": "evolution-api.com",
  evolution: "evolution-api.com",
  heygen: "heygen.com",
  elevenlabs: "elevenlabs.io",
  whatsapp: "whatsapp.com",
  instagram: "instagram.com",
  facebook: "facebook.com",
  linkedin: "linkedin.com",
  gmail: "google.com",
  google: "google.com",
  meta: "meta.com",
  openai: "openai.com",
  gpt: "openai.com",
  claude: "anthropic.com",
  anthropic: "anthropic.com",
  gemini: "gemini.google.com",
  hubspot: "hubspot.com",
  kommo: "kommo.com",
  pipedrive: "pipedrive.com",
  salesforce: "salesforce.com",
  supabase: "supabase.com",
  n8n: "n8n.io",
  zapier: "zapier.com",
  make: "make.com",
  airtable: "airtable.com",
  notion: "notion.so",
  slack: "slack.com",
  twilio: "twilio.com",
  stripe: "stripe.com",
  lovable: "lovable.dev",
  telegram: "telegram.org",
  discord: "discord.com",
};

function getToolDomain(name: string): string | null {
  const key = name.trim().toLowerCase();
  if (TOOL_DOMAIN[key]) return TOOL_DOMAIN[key];
  for (const [k, v] of Object.entries(TOOL_DOMAIN)) {
    if (key.includes(k)) return v;
  }
  // Fallback: guess <slug>.com from a single-word name
  const slug = key.replace(/[^a-z0-9]/g, "");
  if (slug.length >= 3 && !key.includes(" ")) return `${slug}.com`;
  return null;
}

function ToolLogo({ name, logoUrl, website }: { name: string; logoUrl?: string | null; website?: string | null }) {
  const initials = getToolInitials(name);
  const domain = website || getToolDomain(name);

  const sources = useMemo(() => {
    const list: string[] = [];
    if (logoUrl) list.push(logoUrl);
    if (domain) {
      list.push(`https://icon.horse/icon/${domain}`);
      list.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    }
    return list;
  }, [logoUrl, domain]);

  const [srcIndex, setSrcIndex] = useState(0);
  const src = sources[srcIndex];

  useEffect(() => {
    setSrcIndex(0);
  }, [sources]);

  if (!src) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-900">
        <span className="text-lg font-bold tracking-tight text-white">{initials}</span>
      </div>
    );
  }
  return (
    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white p-2">
      <img
        src={src}
        alt={name}
        className="h-full w-full object-contain"
        onError={() => setSrcIndex((i) => i + 1)}
      />
    </div>
  );
}

type ToolDisplayItem = {
  name: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  cost_label: string | null;
  type: "essential" | "optional";
};

function StepHerramientas({
  tools,
  isCompleted,
  saving,
  onComplete,
}: {
  solutionId: string;
  userId: string;
  tools: SolutionToolItem[];
  isCompleted: boolean;
  saving: boolean;
  onComplete: () => void;
}) {
  const items: ToolDisplayItem[] = useMemo(
    () =>
      (tools ?? [])
        .slice()
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((st) => ({
          name: st.tool.name,
          description: st.tool.description,
          website: st.tool.website,
          logo_url: st.tool.logo_url,
          cost_label: st.tool.cost_label,
          type: st.is_essential ? ("essential" as const) : ("optional" as const),
        })),
    [tools],
  );

  // Visual-only state — resets on reload (per spec)
  const [understood, setUnderstood] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isCompleted && items.length > 0) setUnderstood(new Set(items.map((i) => i.name)));
  }, [isCompleted, items]);

  const toggle = (name: string) => {
    setUnderstood((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const allDone = items.length === 0 || understood.size >= items.length;

  return (
    <div>
      <SectionHeader
        text="Herramientas de la Solución"
        action={
          <CompleteButton
            onClick={onComplete}
            saving={saving}
            disabled={!allDone}
            disabledLabel="Marcá todas las herramientas primero"
            label="Marcar paso como completado →"
            isCompleted={isCompleted}
          />
        }
      />
      <p className="mt-2 text-sm text-zinc-400">
        Conocé las herramientas que usaremos en esta implementación.
      </p>

      {items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-10 text-center text-sm text-zinc-400">
          No hay herramientas asignadas a esta solución.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((tool) => {
            const isOk = understood.has(tool.name);
            const isOptional = tool.type === "optional";
            const officialUrl = tool.website
              ? tool.website.startsWith("http")
                ? tool.website
                : `https://${tool.website}`
              : null;
            return (
              <button
                key={tool.name}
                onClick={() => toggle(tool.name)}
                className={`group relative overflow-hidden rounded-xl border p-5 text-left transition duration-200 ${
                  isOk
                    ? "border-green-500 bg-secondary"
                    : "border-white/8 bg-secondary hover:border-white/20"
                }`}
              >
                {isOk && <span className="pointer-events-none absolute inset-0 bg-green-500/10" />}

                {/* Type badge */}
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isOptional ? "bg-amber-400" : "bg-green-500"
                    }`}
                  />
                  {isOptional ? "Opcional" : "Esencial"}
                </span>

                {/* Top-right: cost badge + check */}
                <div className="absolute right-3 top-3 flex items-center gap-2">
                  {tool.cost_label && (
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                      {tool.cost_label}
                    </span>
                  )}
                  {isOk && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>

                {/* Logo */}
                <div className="relative mx-auto mt-8 flex items-center justify-center">
                  <ToolLogo name={tool.name} logoUrl={tool.logo_url} website={tool.website} />
                </div>

                <div className="relative mt-3 text-center text-base font-semibold text-white">
                  {tool.name}
                </div>
                {tool.description && (
                  <p className="relative mt-1 text-center text-xs text-zinc-400 line-clamp-2">
                    {tool.description}
                  </p>
                )}

                <div
                  className={`relative mt-2 text-center text-xs ${
                    isOk ? "font-medium text-green-500" : "text-zinc-500"
                  }`}
                >
                  {isOk ? "Entendido ✓" : "Click para marcar como entendido"}
                </div>

                {officialUrl && (
                  <div className="relative mt-3 text-center">
                    <a
                      href={officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-zinc-500 hover:text-white"
                    >
                      Sitio oficial →
                    </a>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StepArchivos({
  solutionId: _solutionId,
  resources,
  lovableRemixUrl,
  isCompleted,
  saving,
  onComplete,
}: {
  solutionId: string;
  resources: { title: string; url: string; type?: string; description?: string; domain?: string }[];
  lovableRemixUrl?: string | null;
  isCompleted: boolean;
  saving: boolean;
  onComplete: () => void;
}) {
  const cards: { title: string; description: string; url: string; domain?: string }[] = [];
  if (lovableRemixUrl) {
    cards.push({
      title: "Link de remix de Lovable",
      description: "Link para remixear el proyecto en Lovable",
      url: lovableRemixUrl,
      domain: "LOVABLE.DEV",
    });
  }
  for (const r of resources ?? []) {
    if (!r?.url) continue;
    let domain = (r.domain || "").trim();
    if (!domain) {
      try {
        domain = new URL(r.url).hostname.replace(/^www\./, "");
      } catch {
        domain = r.url;
      }
    }
    cards.push({
      title: r.title || r.url,
      description: r.description || "",
      url: r.url,
      domain: domain.toUpperCase(),
    });
  }

  return (
    <div>
      <SectionHeader
        text="Materiales y Recursos"
        action={
          <CompleteButton
            onClick={onComplete}
            saving={saving}
            isCompleted={isCompleted}
            label="Marcar paso como completado →"
          />
        }
      />
      <p className="mt-2 text-sm text-zinc-400">
        Descargá los materiales necesarios para implementar esta solución.
      </p>

      <div className="mt-8">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <LinkIcon className="h-4 w-4 text-zinc-400" />
          Links Auxiliares
        </h3>
        {cards.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-10 text-center text-sm text-zinc-500">
            Recursos disponibles próximamente
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {cards.map((c) => (
              <div
                key={c.url}
                className="flex items-center gap-4 rounded-xl border border-white/8 bg-secondary p-4 transition hover:border-white/20"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                  <LinkIcon className="h-5 w-5 text-zinc-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{c.title}</div>
                  {c.description && (
                    <div className="truncate text-xs text-zinc-400">{c.description}</div>
                  )}
                  {c.domain && (
                    <div className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                      {c.domain}
                    </div>
                  )}
                </div>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:border-white/30 hover:bg-zinc-800"
                >
                  Acceder
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepVideo({
  videoUrl,
  title,
  isCompleted,
  saving,
  onComplete,
}: {
  videoUrl: string | null;
  title: string;
  isCompleted: boolean;
  saving: boolean;
  onComplete: () => void;
}) {
  return (
    <div>
      <SectionHeader
        text="Video de Implementación"
        action={
          <CompleteButton onClick={onComplete} saving={saving} isCompleted={isCompleted} label="Marcar como visto" />
        }
      />
      <p className="mt-2 text-sm text-zinc-400">Seguí el tutorial paso a paso.</p>

      <div className="mt-6">
        {videoUrl ? (
          <>
            <iframe
              src={videoUrl}
              className="aspect-video w-full overflow-hidden rounded-xl bg-zinc-900"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
            <p className="mt-2 text-sm text-zinc-400">{title}</p>
          </>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/20 ring-2 ring-violet-500/30">
              <Play className="h-9 w-9 fill-violet-400 text-violet-400" />
            </div>
            <p className="text-sm font-medium text-zinc-300">Video de implementación próximamente</p>
            <p className="text-xs text-zinc-600">Estamos preparando el tutorial de esta solución.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StepComentarios({
  solutionId,
  isCompleted,
  saving,
  onComplete,
}: {
  solutionId: string;
  isCompleted: boolean;
  saving: boolean;
  onComplete: () => void;
}) {
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
      return (data ?? []) as {
        id: string;
        user_id: string;
        rating: number | null;
        comment: string | null;
        created_at: string;
      }[];
    },
  });

  const myComment = useMemo(
    () => (comments ?? []).find((c) => c.user_id === user?.id) ?? null,
    [comments, user?.id],
  );

  const submit = async () => {
    if (!user || rating === null) {
      toast.error("Elegí una puntuación", { duration: 4000 });
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as never as typeof supabase)
      .from("solution_comments" as never)
      .insert({
        user_id: user.id,
        solution_id: solutionId,
        rating,
        comment: comment || null,
      } as never);
    setSubmitting(false);
    if (error) {
      toast.error("Error al enviar evaluación", { duration: 4000 });
      return;
    }
    setComment("");
    setRating(null);
    toast.success("¡Gracias por tu evaluación!", { duration: 4000 });
    qc.invalidateQueries({ queryKey: ["solution-comments", solutionId] });
  };

  const canComplete = isCompleted || !!myComment;

  return (
    <div>
      <SectionHeader
        text="Comentarios de la Solución"
        action={
          <CompleteButton
            onClick={onComplete}
            saving={saving}
            isCompleted={isCompleted}
            disabled={!canComplete}
            disabledLabel="Enviá tu evaluación primero"
          />
        }
      />
      <p className="mt-2 text-sm text-zinc-400">Dejá tu evaluación y mirá qué piensan otros.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-sm font-semibold text-white">Tu evaluación</div>

          {myComment ? (
            <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <Check className="h-4 w-4" /> Ya enviaste tu evaluación
              </div>
              <div className="mt-3 text-2xl font-bold text-white">{myComment.rating}/10</div>
              {myComment.comment && (
                <p className="mt-2 text-sm text-zinc-300">{myComment.comment}</p>
              )}
            </div>
          ) : (
            <>
              <p className="mt-1 text-xs text-zinc-400">
                ¿Qué tan probable es que recomiendes esta solución?
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {Array.from({ length: 11 }).map((_, n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className={`h-11 w-11 rounded-lg text-sm font-medium transition ${
                      rating === n
                        ? "scale-110 bg-violet-500 text-white shadow-md shadow-violet-500/30"
                        : "bg-zinc-800 text-zinc-300 hover:bg-violet-500 hover:text-white"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-zinc-600">
                <span>Nada probable</span>
                <span>Muy probable</span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comentario sobre tu implementación (opcional)..."
                className="mt-5 min-h-24 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
              />
              <Button
                onClick={submit}
                disabled={submitting}
                className="mt-4 h-11 w-full rounded-lg bg-violet-500 text-white hover:bg-violet-600"
              >
                {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Enviar evaluación
              </Button>
            </>
          )}
        </div>

        <div>
          <div className="flex items-center text-sm font-semibold text-white">
            Comentarios de la comunidad
            <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
              {comments?.length ?? 0}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {!comments || comments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm text-zinc-600">
                Sé el primero en comentar.
              </p>
            ) : (
              comments.slice(0, 5).map((c) => {
                const time = relativeTime(c.created_at);
                return (
                  <div key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-300">
                        U
                      </div>
                      <span className="text-sm font-medium text-white">Usuario</span>
                      <span className="text-xs text-zinc-600">{time}</span>
                      {c.rating !== null && (
                        <span className="ml-auto rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-300">
                          {c.rating}/10
                        </span>
                      )}
                    </div>
                    {c.comment && <p className="mt-2 text-sm text-zinc-300">{c.comment}</p>}
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
  solutionId,
  solutionTitle,
  completedSet,
  saving,
  onFinalize,
}: {
  solutionId: string;
  solutionTitle: string;
  completedSet: Set<StepKey>;
  saving: boolean;
  onFinalize: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: existingProject } = useQuery({
    queryKey: ["project-for-solution", solutionId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("builder_projects")
        .select("id")
        .eq("user_id", user!.id)
        .eq("source_solution_id", solutionId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-900/30 to-zinc-900 p-10 text-center">
        <div className="text-6xl">🏆</div>
        <h2 className="mt-4 text-3xl font-bold text-white">¡Implementación Completada!</h2>
        <p className="mt-2 text-sm text-zinc-300">
          Completaste los 5 pasos de <span className="font-semibold text-white">{solutionTitle}</span>.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white">Tu progreso</div>
            <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-400">
              100% COMPLETADO
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full w-full bg-green-500" />
          </div>
          <div className="mt-4 space-y-2">
            {STEPS.map((s) => (
              <div
                key={s.key}
                className="flex items-center gap-2 rounded-lg bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300"
              >
                <Check
                  className={`h-3.5 w-3.5 ${completedSet.has(s.key) ? "text-green-500" : "text-zinc-700"}`}
                />
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-sm font-semibold text-white">Próximos pasos</div>
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-3">
              <Award className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
              <div className="text-xs text-zinc-400">
                Revisá otras soluciones del catálogo para seguir avanzando.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
              <div className="text-xs text-zinc-400">
                Tu prompt personalizado está guardado en Mis Proyectos.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
              <div className="text-xs text-zinc-400">
                Compartí tu experiencia con la comunidad.
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <Button
              onClick={() => navigate({ to: "/solutions" })}
              className="h-11 w-full rounded-xl bg-white text-black hover:bg-zinc-100"
            >
              Ver todas las soluciones →
            </Button>
            {existingProject && (
              <Button
                onClick={() => navigate({ to: "/projects" })}
                variant="outline"
                className="h-11 w-full rounded-xl border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800"
              >
                Ver mi proyecto →
              </Button>
            )}
            <Button
              onClick={onFinalize}
              disabled={saving || completedSet.has("conclusion")}
              variant="ghost"
              className="h-10 w-full text-xs text-zinc-500 hover:bg-zinc-800/50"
            >
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {completedSet.has("conclusion") ? "Finalizado" : "Marcar como finalizado"}
            </Button>
          </div>
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
