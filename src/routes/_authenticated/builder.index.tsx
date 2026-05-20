import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// ============================================================
// Implementa AI · Builder (Fase 1: UX + mock generation)
//
// Flow:
//   1. landing    → Hero + textarea + 3 cards de inspiración
//   2. analyzing  → Loading "Analizando tu idea" (mock 2.5s)
//   3. wizard     → 5 preguntas obligatorias + opcional 5 premium
//   4. confirm    → "¿Listo para generar?" — Generar / Responder más
//   5. generating → Loading "Diseñando tu solución" (mock 2.5s)
//   6. result     → Mock blueprint con 8 secciones (placeholder hasta AI)
//
// Cuando integremos AI (Fase 2 con Anthropic key) reemplazamos los
// mocks de loading + result por llamadas reales. La UX queda igual.
// ============================================================

export const Route = createFileRoute("/_authenticated/builder/")({
  component: BuilderPage,
});

type Step =
  | "landing"
  | "analyzing"
  | "wizard"
  | "confirm"
  | "generating"
  | "result";

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
  };

  // Auto-progress de analyzing → wizard (mock 2.5s)
  useEffect(() => {
    if (step !== "analyzing") return;
    const t = setTimeout(() => setStep("wizard"), 2500);
    return () => clearTimeout(t);
  }, [step]);

  // Auto-progress de generating → result (mock 2.5s)
  useEffect(() => {
    if (step !== "generating") return;
    const t = setTimeout(() => setStep("result"), 2500);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header del Builder con histórico (disabled) y soluciones del equipo */}
      {step === "landing" && (
        <BuilderHeader />
      )}

      {/* Step views */}
      {step === "landing" && (
        <LandingView idea={idea} setIdea={setIdea} onContinue={startAnalyzing} />
      )}

      {step === "analyzing" && <LoadingView title="Analizando tu idea…" subtitle="Entendiendo el contexto de tu proyecto." stage="Etapa 1 de 3 — Análisis" />}

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
            setCurrentQ(ESSENTIAL_QUESTIONS.length); // jump to first premium
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
        <ResultMockView idea={idea} answers={{ ...essentialAnswers, ...premiumAnswers }} onRestart={restart} />
      )}
    </div>
  );
}

// ============================================================
// Header del Builder (sólo en landing)
// ============================================================
function BuilderHeader() {
  return (
    <div className="border-b border-border bg-card/30 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wand2 className="h-4 w-4" />
          <span className="font-medium text-foreground">Builder</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled
            className="gap-1.5 cursor-not-allowed opacity-50"
            title="Próximamente"
          >
            <History className="h-3.5 w-3.5" />
            Histórico
            <Lock className="h-3 w-3 ml-1" />
          </Button>
          <Button variant="outline" size="sm" disabled className="gap-1.5 cursor-not-allowed opacity-50" title="Próximamente">
            <Users2 className="h-3.5 w-3.5" />
            Soluciones del Equipo
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Vista 1: Landing
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

  // Auto-focus textarea
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const onPickInspiration = (insp: Inspiration) => {
    setIdea(insp.prefill);
    textareaRef.current?.focus();
  };

  const canContinue = idea.trim().length >= 20;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-3 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
          BUILDER
        </h1>
        <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
          ¿Qué vamos a <span className="text-primary">construir</span>?
        </h2>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Describí tu problema o proceso y la IA va a diseñar la solución completa.
        </p>
      </div>

      {/* Textarea principal */}
      <div className="relative rounded-2xl border border-border bg-card shadow-lg overflow-hidden focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition">
        <Textarea
          ref={textareaRef}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Ej: Quiero automatizar la calificación de leads que llegan por Instagram y enviar propuestas por WhatsApp…"
          className="min-h-[140px] resize-none border-0 bg-transparent text-base p-6 pr-20 focus-visible:ring-0 focus-visible:ring-offset-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canContinue) {
              e.preventDefault();
              onContinue();
            }
          }}
        />
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/30">
          <span className="text-[11px] text-muted-foreground">
            ⌘ + Enter
          </span>
          <Button
            size="sm"
            disabled={!canContinue}
            onClick={onContinue}
            className="gap-1.5"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            Continuar
          </Button>
        </div>
      </div>

      {/* Inspiraciones */}
      <div className="mt-10">
        <p className="text-sm text-muted-foreground mb-4">O empezá con una inspiración</p>
        <div className="grid gap-4 md:grid-cols-3">
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
// Vista 2: Loading (genérica para analyzing + generating)
// ============================================================
function LoadingView({
  title,
  subtitle,
  stage,
}: {
  title: string;
  subtitle: string;
  stage: string;
}) {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center px-6">
      {/* Orb central tipo LUNA — gold pulse */}
      <div className="relative mb-10">
        <div
          className="h-32 w-32 rounded-full bg-gradient-to-br from-primary/80 via-primary to-primary/60 shadow-[0_0_60px_-10px_var(--primary)] animate-pulse"
          aria-hidden
        />
        <div
          className="absolute inset-0 rounded-full border border-primary/30 animate-ping"
          aria-hidden
        />
      </div>

      <h2 className="text-2xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-8">{subtitle}</p>

      {/* Progress bar simulado */}
      <div className="w-full max-w-xs h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-primary/60 animate-[progressbar_2.5s_ease-in-out_forwards] w-0" />
      </div>
      <p className="mt-6 text-xs text-muted-foreground tracking-wider uppercase">
        {stage}
      </p>

      <style>{`
        @keyframes progressbar {
          from { width: 0; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Vista 3: Wizard
// ============================================================
function WizardView({
  idea,
  questions,
  currentQ,
  setCurrentQ,
  answers,
  setAnswer,
  onFinish,
  onClose,
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
    if (isLast) {
      onFinish();
    } else {
      setCurrentQ(currentQ + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentQ(currentQ - 1);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Header con progress + close */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Wand2 className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">Builder</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>
            Pregunta {currentQ + 1} de {total} · obligatoria
          </span>
          <span>{Math.round(progress)} %</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* "Tu idea" sticky banner */}
      <div className="mb-8 rounded-lg border border-border bg-card/50 px-4 py-2.5">
        <span className="text-xs text-muted-foreground">Tu idea: </span>
        <span className="text-xs text-foreground line-clamp-1">{idea}</span>
      </div>

      {/* Pregunta */}
      <div className="mb-8">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-5xl font-bold text-muted-foreground/30 tabular-nums">
            {String(currentQ + 1).padStart(2, "0")}
          </span>
          <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
            {q.category}
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground leading-snug mb-6">
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
          <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground">
            {answer.length}/2000
          </span>
        </div>
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handlePrev}
          disabled={isFirst}
          className="gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Button>
        <Button onClick={handleNext} disabled={!canContinue} className="gap-1.5">
          {isLast ? (
            <>
              <Zap className="h-3.5 w-3.5" />
              Listo
            </>
          ) : (
            <>
              Próximo
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>

      {/* Dots progress */}
      <div className="mt-12 flex items-center justify-center gap-2">
        {questions.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all ${
              i === currentQ
                ? "w-8 bg-primary"
                : i < currentQ
                  ? "w-2 bg-primary/60"
                  : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Vista 4: Confirmación "¿Listo para generar?"
// ============================================================
function ConfirmView({
  onGenerate,
  onAddPremium,
  onBack,
  premiumAdded,
}: {
  onGenerate: () => void;
  onAddPremium: () => void;
  onBack: () => void;
  premiumAdded: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <div className="mx-auto mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Wand2 className="h-8 w-8" />
      </div>

      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
        ¿Listo para generar?
      </h2>
      <p className="text-muted-foreground max-w-xl mx-auto mb-12">
        {premiumAdded
          ? "Ya respondiste todas las preguntas. Tu blueprint va a tener máxima precisión."
          : "Ya respondiste las 5 preguntas esenciales. Podés generar ahora o sumar 5 preguntas más para un blueprint más detallado."}
      </p>

      <div className="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto mb-8">
        {/* Generar ahora */}
        <button
          onClick={onGenerate}
          className="group rounded-2xl border-2 border-primary bg-primary/5 p-6 text-left hover:bg-primary/10 transition"
        >
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Generar ahora</h3>
          <p className="text-sm text-muted-foreground">
            La IA ya tiene información suficiente para diseñar tu solución.
          </p>
        </button>

        {/* Responder más (sólo si no se agregó premium) */}
        {!premiumAdded ? (
          <button
            onClick={onAddPremium}
            className="group rounded-2xl border border-border bg-card p-6 text-left hover:border-foreground/40 transition"
          >
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
              <Plus className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Responder más</h3>
            <p className="text-sm text-muted-foreground">
              + 5 preguntas para un blueprint aún más detallado.
            </p>
          </button>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-left">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-muted-foreground mb-1">
              Modo premium activo
            </h3>
            <p className="text-sm text-muted-foreground">
              Todas las preguntas respondidas. Mejor precisión.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-foreground transition"
      >
        ← Volver a la pregunta anterior
      </button>
    </div>
  );
}

// ============================================================
// Vista 5: Result Mock (placeholder hasta integración AI)
// ============================================================
const BLUEPRINT_SECTIONS = [
  { num: "01", title: "Base de conocimientos", icon: Sparkles, desc: "Diagnóstico del problema, usuarios y contexto", accent: "from-emerald-500/20 to-emerald-500/5", color: "text-emerald-500" },
  { num: "02", title: "Estructura", icon: Database, desc: "5 pilares de la implementación", accent: "from-purple-500/20 to-purple-500/5", color: "text-purple-500" },
  { num: "03", title: "Arquitectura y flujos", icon: Network, desc: "Mapa mental para tu MVP", accent: "from-blue-500/20 to-blue-500/5", color: "text-blue-500" },
  { num: "04", title: "Herramientas", icon: Wrench, desc: "Stack recomendado · esenciales + alternativas", accent: "from-amber-500/20 to-amber-500/5", color: "text-amber-500" },
  { num: "05", title: "Plan de acción", icon: ListChecks, desc: "Kanban con tareas, sprints y prioridades", accent: "from-cyan-500/20 to-cyan-500/5", color: "text-cyan-500" },
  { num: "06", title: "Rápido y adorable", icon: Rocket, desc: "Prompts listos para pegar en Lovable", accent: "from-pink-500/20 to-pink-500/5", color: "text-pink-500" },
  { num: "07", title: "Contenido", icon: BookOpen, desc: "Lecciones recomendadas por IA", accent: "from-orange-500/20 to-orange-500/5", color: "text-orange-500" },
  { num: "08", title: "Economía", icon: PiggyBank, desc: "ROI vs contratar profesionales", accent: "from-teal-500/20 to-teal-500/5", color: "text-teal-500" },
];

function ResultMockView({
  idea,
  answers,
  onRestart,
}: {
  idea: string;
  answers: Record<string, string>;
  onRestart: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al inicio
        </button>
        <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 text-xs font-medium">
          🚧 Preview · sin AI todavía
        </span>
      </div>

      {/* Aviso mock */}
      <div className="mb-10 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-5">
        <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
          Esto es una vista previa
        </h3>
        <p className="text-sm text-muted-foreground">
          Cuando conectemos Anthropic Claude (Fase 2), acá vas a ver tu blueprint
          completo generado dinámicamente. Por ahora te mostramos el esqueleto
          con las 8 secciones que vas a recibir.
        </p>
      </div>

      {/* Recap de la idea */}
      <div className="mb-10">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
          Tu idea
        </div>
        <p className="text-lg text-foreground italic">
          "{idea}"
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {Object.values(answers)
            .filter(Boolean)
            .slice(0, 5)
            .map((a, i) => (
              <span
                key={i}
                className="rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground line-clamp-1 max-w-[200px]"
                title={a}
              >
                {a.substring(0, 30)}{a.length > 30 ? "…" : ""}
              </span>
            ))}
        </div>
      </div>

      {/* Grid de 8 secciones */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {BLUEPRINT_SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.num}
              className="group rounded-2xl border border-border bg-card p-5 opacity-60 cursor-not-allowed relative overflow-hidden"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-50`}
                aria-hidden
              />
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl font-bold text-muted-foreground/40 tabular-nums">
                    {s.num}
                  </span>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
                <span className="mt-3 inline-block text-[10px] uppercase tracking-wider text-muted-foreground">
                  Próximamente
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
