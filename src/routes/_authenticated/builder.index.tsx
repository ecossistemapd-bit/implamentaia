import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Wand2,
  MessageSquare,
  FileText,
  Network,
  History,
  Users2,
  Lock,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  X,
  Zap,
  Plus,
  Sparkles,
  Database,
  Wrench,
  ListChecks,
  Rocket,
  BookOpen,
  PiggyBank,
  ChevronRight,
  Trash2,
  Clock,
  Copy,
  Check,
  TrendingUp,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// Implementa AI · Builder
//
// Flow:
//   1. landing    → Hero + textarea + 3 cards de inspiración
//   2. analyzing  → Loading "Analizando tu idea" (mock 2.5s)
//   3. wizard     → 5 preguntas obligatorias + opcional 5 premium
//   4. confirm    → "¿Listo para generar?" — Generar / Responder más
//   5. generating → Llama a la edge function builder-generate (Anthropic)
//   6. result     → Blueprint REAL: título + descripción + tags + 8 secciones detalladas
//
// Extras:
//   - Histórico: lista de blueprints guardados por el usuario
//   - Detalle de sección: Sheet con markdown completo por sección
// ============================================================

interface Blueprint {
  titulo: string;
  descripcion: string;
  tags: string[];
  secciones: {
    base_conocimientos: string;
    estructura: string;
    arquitectura: string;
    herramientas: string;
    plan_accion: string;
    rapido_adorable: string;
    contenido: string;
    economia: string;
  };
}

interface SavedBlueprint {
  id: string;
  idea: string;
  blueprint: Blueprint;
  created_at: string;
}

// ============================================================
// Helpers para parsear el contenido de las secciones
// ============================================================

/** Extrae prompts de la sección rapido_adorable.
 *  Soporta formato ### Título\n```\ncontenido\n``` (nuevo)
 *  y ## Título\n```\ncontenido\n``` (legacy)
 */
function parsePrompts(markdown: string): { title: string; content: string }[] {
  const results: { title: string; content: string }[] = [];
  const headingRegex = /^#{2,3}\s+(.+)$/gm;
  const matches: { title: string; index: number; length: number }[] = [];
  let m;
  while ((m = headingRegex.exec(markdown)) !== null) {
    matches.push({ title: m[1].trim(), index: m.index, length: m[0].length });
  }
  if (matches.length === 0) return [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].length;
    const end = i < matches.length - 1 ? matches[i + 1].index : markdown.length;
    const section = markdown.slice(start, end).trim();
    const code = section.match(/```(?:\w+)?\n?([\s\S]*?)```/);
    const content = code
      ? code[1].trim()
      : section.replace(/\*\*[^*]+\*\*:?\s*/g, "").trim();
    if (content.length > 30) results.push({ title: matches[i].title, content });
  }
  return results;
}

/** Extrae los 3 sprints del plan de acción */
function parseSprints(markdown: string): { title: string; color: string; tasks: string[] }[] {
  const sprintRegex = /^#{1,3}\s*(Sprint\s*[123]|Fase\s*[123]|Etapa\s*[123])[^\n]*/gim;
  const matches: { title: string; index: number; length: number }[] = [];
  let m;
  while ((m = sprintRegex.exec(markdown)) !== null) {
    matches.push({ title: m[0].replace(/^#+\s+/, "").trim(), index: m.index, length: m[0].length });
  }
  if (matches.length < 2) return [];
  const colors = ["text-cyan-400", "text-purple-400", "text-emerald-400"];
  return matches.slice(0, 3).map((match, i) => {
    const start = match.index + match.length;
    const end = i < Math.min(matches.length, 3) - 1 ? matches[i + 1].index : markdown.length;
    const content = markdown.slice(start, end);
    const tasks = content
      .split("\n")
      .map((l) => l.replace(/^[-*✓☐]\s+/, "").replace(/^\[[ x]\]\s+/i, "").trim())
      .filter((l) => l.length > 5 && !l.startsWith("#") && !l.startsWith("**"));
    return { title: match.title, color: colors[i] ?? "text-primary", tasks: tasks.slice(0, 7) };
  });
}

/** Extrae temas del contenido */
function parseTopics(markdown: string): { title: string; description: string }[] {
  const headingRegex = /^#{2,3}\s+(.+)$/gm;
  const matches: { title: string; index: number; length: number }[] = [];
  let m;
  while ((m = headingRegex.exec(markdown)) !== null) {
    matches.push({ title: m[1].trim(), index: m.index, length: m[0].length });
  }
  if (matches.length === 0) return [];
  return matches
    .map((match, i) => {
      const start = match.index + match.length;
      const end = i < matches.length - 1 ? matches[i + 1].index : markdown.length;
      const content = markdown.slice(start, end).trim();
      const description = content
        .split("\n")
        .filter((l) => l.trim() && !l.startsWith("#"))
        .join(" ")
        .replace(/[-*_`]/g, "")
        .slice(0, 280);
      return { title: match.title, description };
    })
    .filter((t) => t.description.length > 20);
}

export const Route = createFileRoute("/_authenticated/builder/")({
  component: BuilderPage,
});

type Step =
  | "landing"
  | "analyzing"
  | "wizard"
  | "confirm"
  | "generating"
  | "result"
  | "historico";

interface Question {
  id: string;
  category: string;
  text: string;
  placeholder?: string;
}

const ESSENTIAL_QUESTIONS: Question[] = [
  {
    id: "problema",
    category: "Problema central",
    text: "¿Cuál es el principal problema que querés resolver con esta automatización?",
    placeholder: "Ej: Pierdo leads porque no respondo a tiempo los mensajes de WhatsApp...",
  },
  {
    id: "usuarios",
    category: "Usuarios objetivo",
    text: "¿Quiénes son los principales usuarios o clientes que van a interactuar con esta solución?",
    placeholder: "Ej: Clientes B2B del sector inmobiliario que llegan por anuncios de Instagram...",
  },
  {
    id: "canales",
    category: "Canales de contacto",
    text: "¿En qué canales o plataformas viven hoy esos usuarios? (WhatsApp, web, email, Instagram, etc.)",
    placeholder: "Ej: WhatsApp Business + sitio web + formularios de Meta Ads...",
  },
  {
    id: "stack",
    category: "Stack actual",
    text: "¿Qué herramientas o sistemas ya usás y querés que se integren? (CRM, ERP, base de datos, etc.)",
    placeholder: "Ej: HubSpot CRM, Google Sheets para inventario, n8n para flujos...",
  },
  {
    id: "presupuesto",
    category: "Inversión",
    text: "¿Cuál es tu rango de inversión mensual estimado para esta solución?",
    placeholder: "Ej: Entre USD 50 y USD 200 al mes en herramientas + API...",
  },
];

const PREMIUM_QUESTIONS: Question[] = [
  {
    id: "volumen",
    category: "Volumen esperado",
    text: "¿Qué volumen de interacciones o mensajes esperás procesar por mes?",
    placeholder: "Ej: ~500 mensajes mensuales con picos en horario laboral...",
  },
  {
    id: "plazo",
    category: "Plazo deseado",
    text: "¿Para cuándo querés tener esta solución operativa?",
    placeholder: "Ej: En 3-4 semanas para arrancar con clientes piloto...",
  },
  {
    id: "datos",
    category: "Estructura de datos",
    text: "¿Cómo está organizada hoy la información que la IA va a necesitar consultar?",
    placeholder: "Ej: Catálogo en una planilla de Google Sheets, leads en HubSpot...",
  },
  {
    id: "equipo",
    category: "Equipo técnico",
    text: "¿Tu equipo tiene perfil técnico para mantener la solución o necesitás algo no-code?",
    placeholder: "Ej: No tenemos developers, todo tiene que ser configurable sin código...",
  },
  {
    id: "metricas",
    category: "Métricas de éxito",
    text: "¿Qué métricas vas a usar para saber si la solución funciona?",
    placeholder: "Ej: Tasa de respuesta < 1 min, conversión a reunión agendada > 15%...",
  },
];

interface Inspiration {
  id: string;
  icon: typeof MessageSquare;
  title: string;
  desc: string;
  prefill: string;
}

const INSPIRATIONS: Inspiration[] = [
  {
    id: "agente-ventas",
    icon: MessageSquare,
    title: "Agente de ventas WhatsApp",
    desc: "Califica leads y agenda reuniones 24/7.",
    prefill:
      "Quiero un agente de ventas que reciba mensajes en WhatsApp, califique al lead (presupuesto, urgencia, ajuste), responda dudas frecuentes con info de mi catálogo y agende reuniones automáticamente en mi calendario.",
  },
  {
    id: "blog-auto",
    icon: FileText,
    title: "Blog en piloto automático",
    desc: "Escribe y publica artículos SEO sin intervención.",
    prefill:
      "Quiero un sistema que detecte tendencias de búsqueda en mi nicho, redacte artículos SEO optimizados con IA, los publique en mi WordPress y comparta automáticamente en mis redes sociales.",
  },
  {
    id: "multicanal",
    icon: Network,
    title: "Atención multicanal IA",
    desc: "Unifica Instagram, WhatsApp, email y web chat.",
    prefill:
      "Quiero unificar la atención al cliente de Instagram DMs, WhatsApp, email y chat de mi web en una sola bandeja gestionada por IA que clasifique, derive a humanos cuando hace falta y mantenga contexto entre canales.",
  },
];

function BuilderPage() {
  const [step, setStep] = useState<Step>("landing");
  const [idea, setIdea] = useState("");
  const [essentialAnswers, setEssentialAnswers] = useState<Record<string, string>>({});
  const [premiumAnswers, setPremiumAnswers] = useState<Record<string, string>>({});
  const [includePremium, setIncludePremium] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  // Histórico
  const [savedBlueprints, setSavedBlueprints] = useState<SavedBlueprint[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const questions = includePremium
    ? [...ESSENTIAL_QUESTIONS, ...PREMIUM_QUESTIONS]
    : ESSENTIAL_QUESTIONS;

  const startAnalyzing = () => {
    if (!idea.trim()) return;
    setStep("analyzing");
  };

  const restart = () => {
    setStep("landing");
    setIdea("");
    setEssentialAnswers({});
    setPremiumAnswers({});
    setIncludePremium(false);
    setCurrentQ(0);
    setBlueprint(null);
    setGenError(null);
  };

  const openHistorico = async () => {
    setStep("historico");
    setLoadingHistorico(true);
    const { data } = await supabase
      .from("builder_blueprints")
      .select("id, idea, blueprint, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setSavedBlueprints((data as SavedBlueprint[]) ?? []);
    setLoadingHistorico(false);
  };

  const openSavedBlueprint = (saved: SavedBlueprint) => {
    setIdea(saved.idea);
    setBlueprint(saved.blueprint);
    setGenError(null);
    setStep("result");
  };

  const deleteSavedBlueprint = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("builder_blueprints").delete().eq("id", id);
    setSavedBlueprints((prev) => prev.filter((b) => b.id !== id));
  };

  // Auto-progress de analyzing → wizard (mock 2.5s)
  useEffect(() => {
    if (step !== "analyzing") return;
    const t = setTimeout(() => setStep("wizard"), 2500);
    return () => clearTimeout(t);
  }, [step]);

  // Generación REAL: llama a la edge function builder-generate (Anthropic)
  useEffect(() => {
    if (step !== "generating") return;
    let cancelled = false;
    (async () => {
      setGenError(null);
      try {
        const { data, error } = await supabase.functions.invoke("builder-generate", {
          body: { idea, answers: { ...essentialAnswers, ...premiumAnswers } },
        });
        if (cancelled) return;
        if (error) {
          let msg = "No pudimos generar el blueprint. Probá de nuevo.";
          try {
            const ctx = (error as { context?: Response }).context;
            if (ctx && typeof ctx.json === "function") {
              const body = await ctx.json();
              if (body?.error) msg = body.error;
            }
          } catch { /* noop */ }
          throw new Error(msg);
        }
        const bp = (data as { blueprint?: Blueprint })?.blueprint;
        if (!bp) throw new Error("La IA no devolvió un blueprint válido.");
        setBlueprint(bp);
        setStep("result");
      } catch (e) {
        if (cancelled) return;
        setGenError(e instanceof Error ? e.message : "Error generando el blueprint.");
        setStep("result");
      }
    })();
    return () => { cancelled = true; };
  }, [step, idea, essentialAnswers, premiumAnswers]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header del Builder */}
      {(step === "landing" || step === "historico") && (
        <BuilderHeader onHistorico={openHistorico} activeHistorico={step === "historico"} />
      )}

      {step === "landing" && (
        <LandingView idea={idea} setIdea={setIdea} onContinue={startAnalyzing} />
      )}

      {step === "historico" && (
        <HistoricoView
          blueprints={savedBlueprints}
          loading={loadingHistorico}
          onOpen={openSavedBlueprint}
          onDelete={deleteSavedBlueprint}
          onBack={() => setStep("landing")}
        />
      )}

      {step === "analyzing" && (
        <LoadingView title="Analizando tu idea…" subtitle="Entendiendo el contexto de tu proyecto." stage="Etapa 1 de 3 — Análisis" />
      )}

      {step === "wizard" && (
        <WizardView
          idea={idea}
          questions={questions}
          currentQ={currentQ}
          setCurrentQ={setCurrentQ}
          answers={includePremium ? { ...essentialAnswers, ...premiumAnswers } : essentialAnswers}
          setAnswer={(qid, val) => {
            if (includePremium && PREMIUM_QUESTIONS.some((q) => q.id === qid)) {
              setPremiumAnswers((prev) => ({ ...prev, [qid]: val }));
            } else {
              setEssentialAnswers((prev) => ({ ...prev, [qid]: val }));
            }
          }}
          onFinish={() => setStep("confirm")}
          onClose={restart}
        />
      )}

      {step === "confirm" && (
        <ConfirmView
          onGenerate={() => setStep("generating")}
          onAddPremium={() => {
            setIncludePremium(true);
            setCurrentQ(ESSENTIAL_QUESTIONS.length);
            setStep("wizard");
          }}
          onBack={() => {
            setCurrentQ(questions.length - 1);
            setStep("wizard");
          }}
          premiumAdded={includePremium}
        />
      )}

      {step === "generating" && (
        <LoadingView
          title="Diseñando tu solución…"
          subtitle="Armando el blueprint completo."
          stage="Etapa 3 de 3 — Generación"
        />
      )}

      {step === "result" && (
        <ResultView
          idea={idea}
          blueprint={blueprint}
          error={genError}
          openSection={openSection}
          setOpenSection={setOpenSection}
          onRestart={restart}
          onRetry={() => setStep("generating")}
        />
      )}
    </div>
  );
}

// ============================================================
// Header del Builder
// ============================================================
function BuilderHeader({
  onHistorico,
  activeHistorico,
}: {
  onHistorico: () => void;
  activeHistorico: boolean;
}) {
  return (
    <div className="border-b border-border bg-card/30 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wand2 className="h-4 w-4 shrink-0" />
          <span className="font-medium text-foreground">Builder</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeHistorico ? "default" : "outline"}
            size="sm"
            onClick={onHistorico}
            className="gap-1.5"
          >
            <History className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Histórico</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="gap-1.5 cursor-not-allowed opacity-50"
            title="Próximamente (Soluciones del Equipo)"
          >
            <Users2 className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Soluciones del Equipo</span>
            <Lock className="h-3 w-3 ml-1 hidden sm:inline" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Vista: Histórico
// ============================================================
function HistoricoView({
  blueprints,
  loading,
  onOpen,
  onDelete,
  onBack,
}: {
  blueprints: SavedBlueprint[];
  loading: boolean;
  onOpen: (b: SavedBlueprint) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>
        <h2 className="text-xl font-bold text-foreground">Mis blueprints</h2>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && blueprints.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Todavía no generaste ningún blueprint.</p>
          <button onClick={onBack} className="mt-4 text-sm text-primary hover:underline">
            Crear el primero →
          </button>
        </div>
      )}

      {!loading && blueprints.length > 0 && (
        <div className="space-y-3">
          {blueprints.map((b) => (
            <button
              key={b.id}
              onClick={() => onOpen(b)}
              className="group w-full text-left rounded-xl border border-border bg-card p-4 sm:p-5 hover:border-primary/40 hover:bg-card/80 transition flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {b.blueprint?.titulo || "Blueprint sin título"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">
                  "{b.idea}"
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {b.blueprint?.tags?.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(b.created_at).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => onDelete(b.id, e)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition opacity-0 group-hover:opacity-100"
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Vista: Landing
// ============================================================
function LandingView({
  idea,
  setIdea,
  onContinue,
}: {
  idea: string;
  setIdea: (v: string) => void;
  onContinue: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const onPickInspiration = (insp: Inspiration) => {
    setIdea(insp.prefill);
    textareaRef.current?.focus();
  };

  const canContinue = idea.trim().length >= 20;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-3 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
          BUILDER
        </h1>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground mb-3 sm:mb-4">
          ¿Qué vamos a <span className="text-primary">construir</span>?
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
          Describí tu problema o proceso y la IA va a diseñar la solución completa.
        </p>
      </div>

      <div className="relative rounded-2xl border border-border bg-card shadow-lg overflow-hidden focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition">
        <Textarea
          ref={textareaRef}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Ej: Quiero automatizar la calificación de leads que llegan por Instagram y enviar propuestas por WhatsApp…"
          className="min-h-[120px] sm:min-h-[140px] resize-none border-0 bg-transparent text-base p-4 sm:p-6 focus-visible:ring-0 focus-visible:ring-offset-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canContinue) {
              e.preventDefault();
              onContinue();
            }
          }}
        />
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-t border-border bg-muted/30">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">⌘ + Enter</span>
          <span className="text-[11px] text-muted-foreground sm:hidden" aria-hidden />
          <Button size="sm" disabled={!canContinue} onClick={onContinue} className="gap-1.5 ml-auto">
            <ArrowUp className="h-3.5 w-3.5" />
            Continuar
          </Button>
        </div>
      </div>

      <div className="mt-8 sm:mt-10">
        <p className="text-sm text-muted-foreground mb-4">O empezá con una inspiración</p>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INSPIRATIONS.map((insp) => {
            const Icon = insp.icon;
            return (
              <button
                key={insp.id}
                onClick={() => onPickInspiration(insp)}
                className="group text-left rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-card transition shadow-sm"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{insp.title}</h3>
                <p className="text-[13px] text-muted-foreground">{insp.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Vista: Loading
// ============================================================
function LoadingView({ title, subtitle, stage }: { title: string; subtitle: string; stage: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="relative mb-8 sm:mb-10">
        <div
          className="h-24 w-24 sm:h-32 sm:w-32 rounded-full bg-gradient-to-br from-primary/80 via-primary to-primary/60 shadow-[0_0_60px_-10px_var(--primary)] animate-pulse"
          aria-hidden
        />
        <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping" aria-hidden />
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-8">{subtitle}</p>
      <div className="w-full max-w-xs h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-primary/60 animate-[progressbar_2.5s_ease-in-out_forwards] w-0" />
      </div>
      <p className="mt-6 text-xs text-muted-foreground tracking-wider uppercase">{stage}</p>
      <style>{`@keyframes progressbar { from { width: 0; } to { width: 100%; } }`}</style>
    </div>
  );
}

// ============================================================
// Vista: Wizard
// ============================================================
function WizardView({
  idea, questions, currentQ, setCurrentQ, answers, setAnswer, onFinish, onClose,
}: {
  idea: string;
  questions: Question[];
  currentQ: number;
  setCurrentQ: (n: number) => void;
  answers: Record<string, string>;
  setAnswer: (qid: string, val: string) => void;
  onFinish: () => void;
  onClose: () => void;
}) {
  const q = questions[currentQ];
  const answer = answers[q.id] ?? "";
  const total = questions.length;
  const progress = ((currentQ + 1) / total) * 100;
  const canContinue = answer.trim().length > 0;
  const isLast = currentQ === total - 1;
  const isFirst = currentQ === 0;

  const handleNext = () => {
    if (!canContinue) return;
    if (isLast) onFinish();
    else setCurrentQ(currentQ + 1);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Wand2 className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">Builder</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition p-1 -m-1" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Pregunta {currentQ + 1} de {total}</span>
          <span>{Math.round(progress)} %</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mb-6 sm:mb-8 rounded-lg border border-border bg-card/50 px-3 sm:px-4 py-2.5">
        <span className="text-xs text-muted-foreground">Tu idea: </span>
        <span className="text-xs text-foreground line-clamp-1">{idea}</span>
      </div>

      <div className="mb-6 sm:mb-8">
        <div className="flex items-baseline gap-3 mb-3 sm:mb-4">
          <span className="text-4xl sm:text-5xl font-bold text-muted-foreground/30 tabular-nums">
            {String(currentQ + 1).padStart(2, "0")}
          </span>
          <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
            {q.category}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground leading-snug mb-5 sm:mb-6">
          {q.text}
        </h2>
        <div className="relative">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            placeholder={q.placeholder}
            maxLength={2000}
            className="min-h-[160px] resize-none border-border bg-card text-base p-4"
            autoFocus
          />
          <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground">{answer.length}/2000</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => !isFirst && setCurrentQ(currentQ - 1)} disabled={isFirst} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Button>
        <Button onClick={handleNext} disabled={!canContinue} className="gap-1.5">
          {isLast ? <><Zap className="h-3.5 w-3.5" />Listo</> : <>Próximo<ArrowRight className="h-3.5 w-3.5" /></>}
        </Button>
      </div>

      <div className="mt-12 flex items-center justify-center gap-2">
        {questions.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all ${i === currentQ ? "w-8 bg-primary" : i < currentQ ? "w-2 bg-primary/60" : "w-2 bg-muted"}`}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Vista: Confirmación
// ============================================================
function ConfirmView({ onGenerate, onAddPremium, onBack, premiumAdded }: {
  onGenerate: () => void;
  onAddPremium: () => void;
  onBack: () => void;
  premiumAdded: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20 text-center">
      <div className="mx-auto mb-6 sm:mb-8 inline-flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Wand2 className="h-7 w-7 sm:h-8 sm:w-8" />
      </div>
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">¿Listo para generar?</h2>
      <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-8 sm:mb-12">
        {premiumAdded
          ? "Ya respondiste todas las preguntas. Tu blueprint va a tener máxima precisión."
          : "Ya respondiste las 5 preguntas esenciales. Podés generar ahora o sumar 5 preguntas más para un blueprint más detallado."}
      </p>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 max-w-2xl mx-auto mb-8">
        <button
          onClick={onGenerate}
          className="group rounded-2xl border-2 border-primary bg-primary/5 p-6 text-left hover:bg-primary/10 transition"
        >
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Generar ahora</h3>
          <p className="text-sm text-muted-foreground">La IA ya tiene información suficiente para diseñar tu solución.</p>
        </button>

        {!premiumAdded ? (
          <button
            onClick={onAddPremium}
            className="group rounded-2xl border border-border bg-card p-6 text-left hover:border-foreground/40 transition"
          >
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
              <Plus className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Responder más</h3>
            <p className="text-sm text-muted-foreground">+ 5 preguntas para un blueprint aún más detallado.</p>
          </button>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-left">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-muted-foreground mb-1">Modo premium activo</h3>
            <p className="text-sm text-muted-foreground">Todas las preguntas respondidas. Mejor precisión.</p>
          </div>
        )}
      </div>

      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition">
        ← Volver a la pregunta anterior
      </button>
    </div>
  );
}

// ============================================================
// Vista: Result
// ============================================================
type SectionKey = keyof Blueprint["secciones"];

const BLUEPRINT_SECTIONS: {
  key: SectionKey;
  num: string;
  title: string;
  shortTitle: string;
  icon: typeof Sparkles;
  accent: string;
  color: string;
  borderColor: string;
}[] = [
  { key: "base_conocimientos", num: "01", title: "Base de conocimientos", shortTitle: "Base",       icon: Sparkles,   accent: "from-emerald-500/20 to-emerald-500/5",  color: "text-emerald-400",  borderColor: "border-emerald-500/30" },
  { key: "estructura",         num: "02", title: "Estructura",            shortTitle: "Estructura", icon: Database,   accent: "from-purple-500/20 to-purple-500/5",    color: "text-purple-400",   borderColor: "border-purple-500/30"  },
  { key: "arquitectura",       num: "03", title: "Arquitectura",          shortTitle: "Arquitect.", icon: Network,    accent: "from-blue-500/20 to-blue-500/5",        color: "text-blue-400",     borderColor: "border-blue-500/30"    },
  { key: "herramientas",       num: "04", title: "Herramientas",          shortTitle: "Herram.",    icon: Wrench,     accent: "from-amber-500/20 to-amber-500/5",      color: "text-amber-400",    borderColor: "border-amber-500/30"   },
  { key: "plan_accion",        num: "05", title: "Plan de acción",        shortTitle: "Plan",       icon: ListChecks, accent: "from-cyan-500/20 to-cyan-500/5",        color: "text-cyan-400",     borderColor: "border-cyan-500/30"    },
  { key: "rapido_adorable",    num: "06", title: "Rápido y adorable",     shortTitle: "Rápido",     icon: Rocket,     accent: "from-pink-500/20 to-pink-500/5",        color: "text-pink-400",     borderColor: "border-pink-500/30"    },
  { key: "contenido",          num: "07", title: "Contenido",             shortTitle: "Contenido",  icon: BookOpen,   accent: "from-orange-500/20 to-orange-500/5",    color: "text-orange-400",   borderColor: "border-orange-500/30"  },
  { key: "economia",           num: "08", title: "Economía",              shortTitle: "Economía",   icon: PiggyBank,  accent: "from-teal-500/20 to-teal-500/5",        color: "text-teal-400",     borderColor: "border-teal-500/30"    },
];

function ResultView({
  idea, blueprint, error, openSection, setOpenSection, onRestart, onRetry,
}: {
  idea: string;
  blueprint: Blueprint | null;
  error: string | null;
  openSection: SectionKey | null;
  setOpenSection: (k: SectionKey | null) => void;
  onRestart: () => void;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20 text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <X className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">No pudimos generar tu blueprint</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">{error}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={onRetry} className="gap-1.5"><Zap className="h-3.5 w-3.5" />Reintentar</Button>
          <Button variant="ghost" onClick={onRestart} className="gap-1.5"><ArrowLeft className="h-3.5 w-3.5" />Volver al inicio</Button>
        </div>
      </div>
    );
  }

  if (!blueprint) return null;

  // Navegación full-page de sección
  if (openSection !== null) {
    return (
      <SectionDetailPage
        blueprint={blueprint}
        currentSection={openSection}
        onChangeSection={setOpenSection}
        onBack={() => setOpenSection(null)}
        onRestart={onRestart}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nueva idea</span>
          <span className="sm:hidden">Nueva</span>
        </button>
        <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium shrink-0">
          ✨ Blueprint generado
        </span>
      </div>

      {/* Título + descripción + tags */}
      <div className="mb-8 sm:mb-10">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Tu solución de IA</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">{blueprint.titulo}</h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">{blueprint.descripcion}</p>
        {blueprint.tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {blueprint.tags.map((tag, i) => (
              <span key={i} className="rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recap idea */}
      <div className="mb-6 sm:mb-8 rounded-lg border border-border bg-card/50 px-3 sm:px-4 py-3">
        <span className="text-xs text-muted-foreground">Tu idea: </span>
        <span className="text-xs text-foreground italic">"{idea}"</span>
      </div>

      {/* Grid de 8 secciones */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {BLUEPRINT_SECTIONS.map((s) => {
          const Icon = s.icon;
          const content = blueprint.secciones?.[s.key] ?? "";
          const preview = content.split("\n").find((l) => l.trim() && !l.startsWith("#")) || content.slice(0, 120);
          return (
            <button
              key={s.key}
              onClick={() => setOpenSection(s.key)}
              className="group text-left rounded-2xl border border-border bg-card p-4 sm:p-5 relative overflow-hidden hover:border-primary/40 transition"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-40`} aria-hidden />
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl font-bold text-muted-foreground/40 tabular-nums">{s.num}</span>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{preview}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition">
                  Ver detalle <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA Explorar */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">Hacé clic en cualquier sección para ver el plan completo</p>
        <Button onClick={() => setOpenSection("rapido_adorable")} className="gap-2">
          <Rocket className="h-4 w-4" />
          Empezar por Rápido y adorable
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// SectionDetailPage — Navegación full-page entre las 8 secciones
// ============================================================
function SectionDetailPage({
  blueprint,
  currentSection,
  onChangeSection,
  onBack,
  onRestart,
}: {
  blueprint: Blueprint;
  currentSection: SectionKey;
  onChangeSection: (k: SectionKey | null) => void;
  onBack: () => void;
  onRestart: () => void;
}) {
  const currentIdx = BLUEPRINT_SECTIONS.findIndex((s) => s.key === currentSection);
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === BLUEPRINT_SECTIONS.length - 1;
  const meta = BLUEPRINT_SECTIONS[currentIdx];
  const Icon = meta.icon;
  const content = blueprint.secciones[currentSection] ?? "";

  const handlePrev = () => { if (!isFirst) onChangeSection(BLUEPRINT_SECTIONS[currentIdx - 1].key); };
  const handleNext = () => { if (isLast) onBack(); else onChangeSection(BLUEPRINT_SECTIONS[currentIdx + 1].key); };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Barra superior: navegación + título de sección */}
      <div className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Fila superior: volver + título + próximo */}
          <div className="flex items-center justify-between py-3 gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Vista general</span>
              <span className="sm:hidden">Volver</span>
            </button>

            <div className="text-center min-w-0">
              <div className={`flex items-center justify-center gap-2 ${meta.color}`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="font-semibold text-foreground text-sm sm:text-base truncate">{meta.title}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Paso {currentIdx + 1} de {BLUEPRINT_SECTIONS.length}</p>
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition shrink-0"
            >
              {isLast ? (
                <><span className="hidden sm:inline">Finalizar</span><Check className="h-4 w-4" /></>
              ) : (
                <><span className="hidden sm:inline">Próximo</span><ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </button>
          </div>

          {/* Progress bar con los 8 pasos */}
          <SectionProgressBar
            currentIdx={currentIdx}
            onSelect={(i) => onChangeSection(BLUEPRINT_SECTIONS[i].key)}
          />
        </div>
      </div>

      {/* Contenido de la sección */}
      <div className="flex-1 overflow-auto">
        {currentSection === "rapido_adorable" ? (
          <RapidoSection content={content} blueprintTitle={blueprint.titulo} />
        ) : currentSection === "economia" ? (
          <EconomiaSection content={content} />
        ) : currentSection === "plan_accion" ? (
          <PlanAccionSection content={content} />
        ) : currentSection === "contenido" ? (
          <ContenidoSection content={content} />
        ) : (
          <DefaultMarkdownSection content={content} />
        )}
      </div>

      {/* Barra inferior de navegación */}
      <div className="sticky bottom-0 border-t border-border bg-card/80 backdrop-blur-xl px-4 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handlePrev} disabled={isFirst} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Anterior
          </Button>
          <div className="flex items-center gap-1">
            {BLUEPRINT_SECTIONS.map((_, i) => (
              <button
                key={i}
                onClick={() => onChangeSection(BLUEPRINT_SECTIONS[i].key)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentIdx ? "w-6 bg-primary" : i < currentIdx ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>
          <Button size="sm" onClick={handleNext} className="gap-1.5">
            {isLast ? (
              <><Check className="h-3.5 w-3.5" />Finalizar</>
            ) : (
              <>Próximo<ArrowRight className="h-3.5 w-3.5" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SectionProgressBar — Los 8 iconos conectados con líneas
// ============================================================
function SectionProgressBar({
  currentIdx,
  onSelect,
}: {
  currentIdx: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="overflow-x-auto pb-2 -mx-2 px-2">
      <div className="flex items-center justify-center gap-0 min-w-max">
        {BLUEPRINT_SECTIONS.map((s, i) => {
          const Icon = s.icon;
          const isCompleted = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={s.key} className="flex items-center">
              <button
                onClick={() => onSelect(i)}
                title={s.title}
                className="flex flex-col items-center gap-0.5 group"
              >
                <div
                  className={`
                    h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all
                    ${isCompleted
                      ? "bg-primary/20 border-primary/60 text-primary"
                      : isCurrent
                      ? "bg-primary border-primary text-primary-foreground shadow-[0_0_12px_-2px_var(--primary)]"
                      : "bg-card border-border text-muted-foreground hover:border-muted-foreground/50"}
                  `}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span
                  className={`text-[9px] leading-tight max-w-[52px] text-center hidden sm:block transition-colors ${
                    isCurrent ? "text-foreground font-medium" : "text-muted-foreground/60 group-hover:text-muted-foreground"
                  }`}
                >
                  {s.shortTitle}
                </span>
              </button>
              {i < BLUEPRINT_SECTIONS.length - 1 && (
                <div
                  className={`w-5 sm:w-8 h-px mx-0.5 sm:mx-1 transition-colors ${
                    i < currentIdx ? "bg-primary/50" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// DefaultMarkdownSection — Renderiza markdown con prose
// ============================================================
function DefaultMarkdownSection({ content }: { content: string }) {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-code:text-primary prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-strong:text-foreground">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

// ============================================================
// RapidoSection — Panel doble: lista de prompts + detalle con copia
// ============================================================
function RapidoSection({ content, blueprintTitle }: { content: string; blueprintTitle: string }) {
  const prompts = parsePrompts(content);
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSet, setCopiedSet] = useState<Set<number>>(new Set());

  const copyPrompt = async (idx: number) => {
    try {
      await navigator.clipboard.writeText(prompts[idx]?.content ?? "");
      setCopied(idx);
      setCopiedSet((prev) => new Set(prev).add(idx));
      setTimeout(() => setCopied(null), 2000);
    } catch { /* noop */ }
  };

  const copyAll = async () => {
    try {
      const all = prompts.map((p, i) => `### Paso ${i + 1}: ${p.title}\n\n${p.content}`).join("\n\n---\n\n");
      await navigator.clipboard.writeText(all);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch { /* noop */ }
  };

  // Fallback si no se pudieron parsear prompts
  if (prompts.length === 0) return <DefaultMarkdownSection content={content} />;

  const currentPrompt = prompts[selected];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      {/* Barra superior: instrucción + copiar todo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Pegá cada indicación en Lovable en el orden en que aparece.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground">
            {copiedSet.size} / {prompts.length} copiados
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={copyAll}
            className="gap-1.5 h-8"
          >
            {copiedAll ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedAll ? "¡Copiado!" : "Copiar el PRD completo"}
          </Button>
        </div>
      </div>

      {/* Layout doble columna */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: lista de prompts */}
        <div className="lg:col-span-2 space-y-1.5">
          {prompts.map((p, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full text-left rounded-xl p-3 flex items-start gap-3 border transition-all ${
                selected === i
                  ? "border-primary/60 bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-border/80 hover:bg-card/80"
              }`}
            >
              <span
                className={`shrink-0 h-6 w-6 rounded-full text-xs font-semibold flex items-center justify-center transition-colors ${
                  copiedSet.has(i)
                    ? "bg-emerald-500/20 text-emerald-400"
                    : selected === i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {copiedSet.has(i) ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium truncate ${selected === i ? "text-foreground" : "text-muted-foreground"}`}>
                  {p.title}
                </p>
                <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
                  {p.content.slice(0, 55)}…
                </p>
              </div>
              <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-colors ${selected === i ? "text-primary" : "text-muted-foreground/40"}`} />
            </button>
          ))}
        </div>

        {/* Right: prompt seleccionado */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card flex flex-col">
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-border">
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">
                Paso {selected + 1} de {prompts.length}
              </p>
              <h3 className="font-semibold text-foreground text-sm sm:text-base leading-tight">
                {currentPrompt?.title}
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyPrompt(selected)}
              className={`gap-1.5 h-8 shrink-0 transition-colors ${
                copied === selected ? "border-emerald-500/40 text-emerald-400" : ""
              }`}
            >
              {copied === selected ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === selected ? "¡Copiado!" : "Copiar"}
            </Button>
          </div>
          <ScrollArea className="flex-1 max-h-[460px]">
            <pre className="px-5 py-4 text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed font-mono">
              {currentPrompt?.content ?? ""}
            </pre>
          </ScrollArea>
        </div>
      </div>

      {/* Tip */}
      <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-2">
        <Zap className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/90">
          <span className="font-semibold">Consejo:</span> Seguí las indicaciones en orden. Cada prompt hace referencia a tablas y componentes creados en el anterior. Pegá el <strong>primero en un proyecto nuevo de Lovable</strong> y los demás como actualizaciones.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// PlanAccionSection — Kanban de sprints
// ============================================================
function PlanAccionSection({ content }: { content: string }) {
  const sprints = parseSprints(content);

  if (sprints.length < 2) return <DefaultMarkdownSection content={content} />;

  const sprintStyles = [
    { bg: "bg-cyan-500/10", border: "border-cyan-500/30", badge: "bg-cyan-500/20 text-cyan-400" },
    { bg: "bg-purple-500/10", border: "border-purple-500/30", badge: "bg-purple-500/20 text-purple-400" },
    { bg: "bg-emerald-500/10", border: "border-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-400" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="grid gap-4 md:grid-cols-3">
        {sprints.map((sprint, i) => {
          const style = sprintStyles[i] ?? sprintStyles[0];
          return (
            <div
              key={i}
              className={`rounded-2xl border ${style.border} ${style.bg} p-5`}
            >
              <div className="mb-4">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
                  {sprint.title}
                </span>
              </div>
              <ul className="space-y-2.5">
                {sprint.tasks.map((task, j) => (
                  <li key={j} className="flex items-start gap-2.5 group">
                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-border bg-background/50 group-hover:border-primary/40 transition" />
                    <span className="text-sm text-muted-foreground leading-snug">{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ============================================================
// ContenidoSection — Cards de temas a aprender
// ============================================================
function ContenidoSection({ content }: { content: string }) {
  const topics = parseTopics(content);

  if (topics.length === 0) return <DefaultMarkdownSection content={content} />;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="space-y-3">
        {topics.map((topic, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex items-start gap-4 hover:border-primary/30 transition"
          >
            <div className="shrink-0 h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground mb-1 leading-snug">{topic.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{topic.description}</p>
            </div>
            <span className="shrink-0 text-2xl font-bold text-muted-foreground/20 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// EconomiaSection — ROI visual con número prominente + markdown
// ============================================================
function EconomiaSection({ content }: { content: string }) {
  // Intentar extraer número principal de ahorro
  const moneyMatch = content.match(/\$\s?[\d.,]+(?:\s?[kKmM])?/);
  const hoursMatch = content.match(/(\d+)\s*horas?\s*(?:\/?\s*mes|ahorradas?)/i);
  const paybackMatch = content.match(/(\d+(?:[.,]\d+)?)\s*mes(?:es)?\s*(?:de\s*)?payback/i);
  const roiMatch = content.match(/ROI[^:]*:\s*(\d+\s*%)/i) ?? content.match(/(\d+\s*%).*?retorno/i);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      {/* Hero metrics */}
      {(moneyMatch || hoursMatch) && (
        <div className="grid gap-3 sm:grid-cols-3 mb-8">
          {moneyMatch && (
            <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-5 text-center">
              <TrendingUp className="h-5 w-5 text-teal-400 mx-auto mb-2" />
              <p className="text-3xl sm:text-4xl font-bold text-teal-400">{moneyMatch[0]}</p>
              <p className="text-xs text-muted-foreground mt-1">Ahorro estimado</p>
            </div>
          )}
          {hoursMatch && (
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-5 text-center">
              <Clock className="h-5 w-5 text-purple-400 mx-auto mb-2" />
              <p className="text-3xl sm:text-4xl font-bold text-purple-400">{hoursMatch[1]}h</p>
              <p className="text-xs text-muted-foreground mt-1">Horas ahorradas / mes</p>
            </div>
          )}
          {(paybackMatch || roiMatch) && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
              <PiggyBank className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-3xl sm:text-4xl font-bold text-emerald-400">
                {roiMatch ? roiMatch[1] : `${paybackMatch![1]}m`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{roiMatch ? "ROI estimado" : "Payback"}</p>
            </div>
          )}
        </div>
      )}

      {/* Markdown completo */}
      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-code:text-primary prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-strong:text-foreground">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
