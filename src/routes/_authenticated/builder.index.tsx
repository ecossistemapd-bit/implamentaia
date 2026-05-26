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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  icon: typeof Sparkles;
  accent: string;
  color: string;
}[] = [
  { key: "base_conocimientos", num: "01", title: "Base de conocimientos", icon: Sparkles, accent: "from-emerald-500/20 to-emerald-500/5", color: "text-emerald-500" },
  { key: "estructura",         num: "02", title: "Estructura",            icon: Database, accent: "from-purple-500/20 to-purple-500/5", color: "text-purple-500" },
  { key: "arquitectura",       num: "03", title: "Arquitectura y flujos", icon: Network,  accent: "from-blue-500/20 to-blue-500/5",   color: "text-blue-500"   },
  { key: "herramientas",       num: "04", title: "Herramientas",          icon: Wrench,   accent: "from-amber-500/20 to-amber-500/5", color: "text-amber-500"  },
  { key: "plan_accion",        num: "05", title: "Plan de acción",        icon: ListChecks, accent: "from-cyan-500/20 to-cyan-500/5", color: "text-cyan-500"   },
  { key: "rapido_adorable",    num: "06", title: "Rápido y adorable",     icon: Rocket,   accent: "from-pink-500/20 to-pink-500/5",  color: "text-pink-500"   },
  { key: "contenido",          num: "07", title: "Contenido",             icon: BookOpen, accent: "from-orange-500/20 to-orange-500/5", color: "text-orange-500" },
  { key: "economia",           num: "08", title: "Economía",              icon: PiggyBank, accent: "from-teal-500/20 to-teal-500/5", color: "text-teal-500"   },
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

  const activeSectionMeta = BLUEPRINT_SECTIONS.find((s) => s.key === openSection);
  const ActiveSectionIcon = activeSectionMeta?.icon ?? null;

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
          <span className="hidden sm:inline">Volver al inicio</span>
          <span className="sm:hidden">Volver</span>
        </button>
        <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium shrink-0">
          ✨ Generado con IA
        </span>
      </div>

      {/* Título + descripción + tags */}
      <div className="mb-8 sm:mb-10">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Tu solución</div>
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

      {/* Grid de 8 secciones — clic abre el Sheet de detalle */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {BLUEPRINT_SECTIONS.map((s) => {
          const Icon = s.icon;
          const content = blueprint.secciones?.[s.key] ?? "";
          // Primer párrafo como preview
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

      {/* Sheet de detalle de sección */}
      <Sheet open={openSection !== null} onOpenChange={(o) => !o && setOpenSection(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          {activeSectionMeta && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${activeSectionMeta.accent}`}>
                    {ActiveSectionIcon && <ActiveSectionIcon className={`h-4 w-4 ${activeSectionMeta.color}`} />}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{activeSectionMeta.num}</p>
                    <SheetTitle className="text-base">{activeSectionMeta.title}</SheetTitle>
                  </div>
                </div>
              </SheetHeader>
              <ScrollArea className="flex-1 px-6 py-5">
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-code:text-primary prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                  <ReactMarkdown>
                    {blueprint.secciones?.[openSection!] ?? ""}
                  </ReactMarkdown>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
