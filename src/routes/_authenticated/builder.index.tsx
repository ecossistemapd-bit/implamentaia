import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PremiumMarkdown } from "@/components/builder/premium-markdown";
import { LunaLoader } from "@/components/builder/luna-loader";
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
  DollarSign,
  FolderKanban,
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
//   - Detalle de sección: página full-screen con markdown completo
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

/** Extrae prompts de la sección rapido_adorable. */
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
function parseSprints(markdown: string): { title: string; tasks: string[] }[] {
  const sprintRegex = /^#{1,3}\s*(Sprint\s*[123]|Fase\s*[123]|Etapa\s*[123])[^\n]*/gim;
  const matches: { title: string; index: number; length: number }[] = [];
  let m;
  while ((m = sprintRegex.exec(markdown)) !== null) {
    matches.push({ title: m[0].replace(/^#+\s+/, "").trim(), index: m.index, length: m[0].length });
  }
  if (matches.length < 2) return [];
  return matches.slice(0, 3).map((match, i) => {
    const start = match.index + match.length;
    const end = i < Math.min(matches.length, 3) - 1 ? matches[i + 1].index : markdown.length;
    const content = markdown.slice(start, end);
    const tasks = content
      .split("\n")
      .map((l) => l.replace(/^[-*✓☐]\s+/, "").replace(/^\[[ x]\]\s+/i, "").trim())
      .filter((l) => l.length > 5 && !l.startsWith("#") && !l.startsWith("**"));
    return { title: match.title, tasks: tasks.slice(0, 7) };
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

// ============================================================
// localStorage key + TTL (24 h) para el estado en-progreso del wizard
// ============================================================
const DRAFT_KEY = "implementa_builder_draft_v1";
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 horas

interface DraftState {
  step: "landing" | "wizard" | "confirm";
  idea: string;
  essentialAnswers: Record<string, string>;
  premiumAnswers: Record<string, string>;
  includePremium: boolean;
  currentQ: number;
  ts: number;
}

function saveDraft(draft: DraftState) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* storage full */ }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
}

function loadDraft(): DraftState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d: DraftState = JSON.parse(raw);
    if (Date.now() - (d.ts || 0) > DRAFT_TTL) { clearDraft(); return null; }
    return d;
  } catch { return null; }
}

function BuilderPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("landing");
  const [idea, setIdea] = useState("");
  const [essentialAnswers, setEssentialAnswers] = useState<Record<string, string>>({});
  const [premiumAnswers, setPremiumAnswers] = useState<Record<string, string>>({});
  const [includePremium, setIncludePremium] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  const [savedBlueprints, setSavedBlueprints] = useState<SavedBlueprint[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  // Mientras cargamos el estado inicial (localStorage + DB) mostramos spinner
  const [initLoading, setInitLoading] = useState(true);

  const questions = includePremium
    ? [...ESSENTIAL_QUESTIONS, ...PREMIUM_QUESTIONS]
    : ESSENTIAL_QUESTIONS;

  // ── Carga inicial al montar ────────────────────────────────────
  // Orden de prioridad:
  //   1. Si hay un borrador activo en localStorage → restaurar el wizard
  //   2. Si hay blueprints guardados en DB → mostrar el más reciente
  //   3. Si no hay nada → mostrar landing vacío
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. localStorage
      const draft = loadDraft();
      if (draft) {
        if (!cancelled) {
          setIdea(draft.idea || "");
          setEssentialAnswers(draft.essentialAnswers || {});
          setPremiumAnswers(draft.premiumAnswers || {});
          setIncludePremium(draft.includePremium || false);
          setCurrentQ(draft.currentQ || 0);
          setStep(draft.step || "landing");
          setInitLoading(false);
        }
        return;
      }
      // 2. DB — último blueprint guardado
      try {
        const { data } = await supabase
          .from("builder_blueprints")
          .select("id, idea, blueprint, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled && data) {
          const saved = data as unknown as SavedBlueprint;
          setIdea(saved.idea);
          setBlueprint(saved.blueprint as Blueprint);
          setStep("result");
        }
      } catch { /* sin conexión o sin datos */ }
      if (!cancelled) setInitLoading(false);
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persistir wizard en-progreso en localStorage ──────────────
  useEffect(() => {
    if (!["landing", "wizard", "confirm"].includes(step)) return;
    saveDraft({
      step: step as DraftState["step"],
      idea, essentialAnswers, premiumAnswers, includePremium, currentQ,
      ts: Date.now(),
    });
  }, [step, idea, essentialAnswers, premiumAnswers, includePremium, currentQ]);

  // ── Limpiar borrador cuando el blueprint fue generado ─────────
  useEffect(() => {
    if (step === "result" && blueprint) clearDraft();
  }, [step, blueprint]);

  const startAnalyzing = () => {
    if (!idea.trim()) return;
    setStep("analyzing");
  };

  const restart = () => {
    clearDraft();
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
    setSavedBlueprints((data as unknown as SavedBlueprint[]) ?? []);
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

  useEffect(() => {
    if (step !== "analyzing") return;
    const t = setTimeout(() => setStep("wizard"), 2500);
    return () => clearTimeout(t);
  }, [step]);

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

  // ── Spinner de carga inicial (antes del primer render real) ───
  if (initLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-[var(--violet-pill-bg)] border border-[var(--violet-border)] animate-pulse" />
            <Wand2 className="absolute inset-0 m-auto h-8 w-8 [color:var(--violet-text)]" />
          </div>
          <p className="text-[14px] text-muted-foreground tracking-[0.04em]">Cargando tus proyectos…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      {(step === "landing" || step === "historico" || step === "result") && (
        <BuilderHeader onHistorico={openHistorico} activeHistorico={step === "historico"} onNuevo={restart} showNuevo={step === "result"} />
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
          subtitle="Armando el blueprint completo con IA."
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
          onGoToProjects={() => navigate({ to: "/projects" })}
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
  onNuevo,
  showNuevo = false,
}: {
  onHistorico: () => void;
  activeHistorico: boolean;
  onNuevo?: () => void;
  showNuevo?: boolean;
}) {
  return (
    <div className="border-b border-border bg-card/40 backdrop-blur-xl sticky top-0 z-30">
      <div className="mx-auto flex max-w-[1340px] items-center justify-between gap-2 px-8 py-3">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 [color:var(--violet-text)]" />
          <span className="text-sm font-semibold text-foreground tracking-tight">Builder</span>
        </div>
        <div className="flex items-center gap-2">
          {showNuevo && onNuevo && (
            <button
              onClick={onNuevo}
              className="app-cta-primary text-sm px-3 py-1.5 h-8"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          )}
          <button
            onClick={onHistorico}
            className={activeHistorico ? "app-cta-primary text-sm px-3 py-1.5 h-8" : "app-cta-ghost text-sm px-3 py-1.5 h-8"}
          >
            <History className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Mis blueprints</span>
          </button>
          <button
            disabled
            className="app-cta-ghost text-sm px-3 py-1.5 h-8 opacity-40 cursor-not-allowed"
            title="Próximamente"
          >
            <Users2 className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Equipo</span>
            <Lock className="h-3 w-3 ml-1 hidden sm:inline" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Vista: Histórico
// ============================================================
function HistoricoView({
  blueprints, loading, onOpen, onDelete, onBack,
}: {
  blueprints: SavedBlueprint[];
  loading: boolean;
  onOpen: (b: SavedBlueprint) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-[1340px] px-8 py-8">
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>
        <div className="my-0 h-px bg-gradient-to-r from-transparent via-border to-transparent w-8" />
        <h2 className="text-[26px] font-bold tracking-[-0.01em] leading-tight text-foreground">Mis blueprints</h2>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 rounded-full border-2 border-[var(--violet-text)] border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && blueprints.length === 0 && (
        <div className="text-center py-20">
          <History className="h-12 w-12 mx-auto mb-4 opacity-20 [color:var(--violet-text)]" />
          <p className="text-base text-muted-foreground mb-2">Todavía no generaste ningún blueprint.</p>
          <button onClick={onBack} className="text-sm [color:var(--violet-text)] hover:opacity-80 transition font-medium">
            Crear el primero →
          </button>
        </div>
      )}

      {!loading && blueprints.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blueprints.map((b) => (
            <button
              key={b.id}
              onClick={() => onOpen(b)}
              className="app-card p-5 text-left group flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground leading-snug line-clamp-2">
                  {b.blueprint?.titulo || "Blueprint sin título"}
                </h3>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => onDelete(b.id, e)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition opacity-0 group-hover:opacity-100"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:[color:var(--violet-text)] transition" />
                </div>
              </div>
              <p className="text-[13px] text-muted-foreground line-clamp-1 italic">
                "{b.idea}"
              </p>
              {b.blueprint?.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {b.blueprint.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="app-pill-violet inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold [color:var(--violet-text-strong)]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-auto">
                <Clock className="h-3 w-3" />
                {new Date(b.created_at).toLocaleDateString("es-AR", {
                  day: "numeric", month: "short", year: "numeric",
                })}
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
  idea, setIdea, onContinue,
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
    <div className="mx-auto max-w-[1340px] px-8 py-12 sm:py-20">
      {/* Hero */}
      <div className="text-center mb-12">
        <span className="app-pill-violet inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.12em] uppercase [color:var(--violet-text-strong)] mb-5">
          <Wand2 className="h-3 w-3 mr-1.5" />
          Implementa AI Builder
        </span>
        <h1 className="text-[44px] font-bold tracking-[-0.02em] leading-[1.05] text-foreground mb-4">
          ¿Qué vamos a{" "}
          <span className="[color:var(--violet-text)]">construir</span>?
        </h1>
        <p className="text-[16px] text-muted-foreground leading-relaxed max-w-[560px] mx-auto">
          Describí tu problema o proceso y la IA va a diseñar la solución completa: arquitectura, stack, plan de acción y más.
        </p>
      </div>

      {/* Textarea */}
      <div className="app-card p-0 overflow-hidden focus-within:border-[var(--violet-border-hover)] transition-colors max-w-3xl mx-auto mb-12">
        <Textarea
          ref={textareaRef}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Ej: Quiero automatizar la calificación de leads que llegan por Instagram y enviar propuestas por WhatsApp…"
          className="min-h-[140px] resize-none border-0 bg-transparent text-[15px] p-6 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground/50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canContinue) {
              e.preventDefault();
              onContinue();
            }
          }}
        />
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--violet-border)] bg-[var(--violet-pill-bg)]">
          <span className="text-[11px] text-muted-foreground hidden sm:inline tracking-[0.05em]">⌘ + Enter para continuar</span>
          <span aria-hidden className="sm:hidden" />
          <button
            disabled={!canContinue}
            onClick={onContinue}
            className="app-cta-primary ml-auto"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            Continuar
          </button>
        </div>
      </div>

      {/* Inspiraciones */}
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mb-4">
          O empezá con una inspiración
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {INSPIRATIONS.map((insp) => {
            const Icon = insp.icon;
            return (
              <button
                key={insp.id}
                onClick={() => onPickInspiration(insp)}
                className="app-card p-5 text-left group"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--violet-pill-bg)] border border-[var(--violet-pill-border)] [color:var(--violet-text)] group-hover:bg-[var(--violet-glow-hover)] transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-foreground mb-1 text-[14px]">{insp.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{insp.desc}</p>
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
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 py-16 text-center">
      {/* Luna — la IA de Implementa pensando */}
      <div className="mb-10">
        <LunaLoader size={128} />
      </div>
      <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--violet-text-strong)" }}>
        <span
          className="block h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--violet-text)", boxShadow: "0 0 8px var(--violet-text)" }}
        />
        Luna · IA de Implementa
      </div>
      <h2 className="text-[28px] font-bold tracking-[-0.015em] text-foreground mb-2">{title}</h2>
      <p className="text-[15px] text-muted-foreground mb-10 max-w-[440px] leading-relaxed">{subtitle}</p>
      <div className="w-full max-w-xs">
        <div className="app-progress-track">
          <div className="app-progress-fill animate-[progressbar_3s_ease-in-out_forwards] w-0" />
        </div>
      </div>
      <p className="mt-5 text-[11px] text-muted-foreground tracking-[0.15em] uppercase font-semibold">{stage}</p>
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
    <div className="mx-auto max-w-3xl px-8 py-10">
      {/* Progress header */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 [color:var(--violet-text)]" />
            <span className="text-sm font-semibold text-foreground">Builder</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition p-1 -m-1 rounded-lg" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2 tracking-[0.05em]">
          <span>Pregunta {currentQ + 1} de {total}</span>
          <span className="font-mono tabular-nums">{Math.round(progress)}%</span>
        </div>
        <div className="app-progress-track">
          <div className="app-progress-fill transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Idea recap */}
      <div className="app-card px-4 py-3 mb-8">
        <span className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] font-semibold">Tu idea: </span>
        <span className="text-[13px] text-foreground line-clamp-1">{idea}</span>
      </div>

      {/* Question */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-5">
          <span className="font-mono text-[44px] font-bold leading-[1] text-muted-foreground/20 tabular-nums">
            {String(currentQ + 1).padStart(2, "0")}
          </span>
          <span className="app-pill-violet inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold [color:var(--violet-text-strong)]">
            {q.category}
          </span>
        </div>
        <h2 className="text-[22px] font-semibold text-foreground leading-snug mb-6">
          {q.text}
        </h2>
        <div className="relative">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            placeholder={q.placeholder}
            maxLength={2000}
            className="min-h-[160px] resize-none border-border bg-card text-[15px] p-4 focus-visible:ring-[var(--violet-border-hover)]"
            autoFocus
          />
          <span className="absolute bottom-3 right-3 text-[11px] text-muted-foreground font-mono tabular-nums">{answer.length}/2000</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => !isFirst && setCurrentQ(currentQ - 1)}
          disabled={isFirst}
          className="app-cta-ghost disabled:opacity-30"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>
        <button onClick={handleNext} disabled={!canContinue} className="app-cta-primary disabled:opacity-40">
          {isLast ? <><Zap className="h-3.5 w-3.5" />Listo</> : <>Próximo<ArrowRight className="h-3.5 w-3.5" /></>}
        </button>
      </div>

      {/* Step dots */}
      <div className="mt-12 flex items-center justify-center gap-1.5">
        {questions.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentQ ? "w-8 bg-[var(--violet-text)]" : i < currentQ ? "w-2 bg-[var(--violet-text)]/50" : "w-2 bg-muted"
            }`}
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
    <div className="mx-auto max-w-3xl px-8 py-20 text-center">
      <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--violet-pill-bg)] border border-[var(--violet-border)] [color:var(--violet-text)]">
        <Wand2 className="h-8 w-8" />
      </div>
      <h2 className="text-[44px] font-bold tracking-[-0.02em] leading-[1.05] text-foreground mb-4">
        ¿Listo para generar?
      </h2>
      <p className="text-[16px] text-muted-foreground leading-relaxed max-w-[520px] mx-auto mb-12">
        {premiumAdded
          ? "Ya respondiste todas las preguntas. Tu blueprint va a tener máxima precisión."
          : "Respondiste las 5 preguntas esenciales. Podés generar ahora o sumar 5 más para un blueprint más detallado."}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto mb-10">
        <button
          onClick={onGenerate}
          className="app-card p-6 text-left border-[var(--violet-border-hover)] group hover:border-[var(--violet-border-hover)]"
        >
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--violet-pill-bg)] border border-[var(--violet-pill-border)] [color:var(--violet-text)]">
            <Zap className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-foreground mb-1.5 text-[17px]">Generar ahora</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed">La IA ya tiene información suficiente para diseñar tu solución completa.</p>
        </button>

        {!premiumAdded ? (
          <button
            onClick={onAddPremium}
            className="app-card p-6 text-left group"
          >
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted [color:var(--muted-foreground)]">
              <Plus className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-foreground mb-1.5 text-[17px]">Más contexto</h3>
            <p className="text-[13px] text-muted-foreground leading-relaxed">+ 5 preguntas para un blueprint aún más detallado y preciso.</p>
          </button>
        ) : (
          <div className="app-card p-6 text-left opacity-60">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted [color:var(--muted-foreground)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-muted-foreground mb-1.5 text-[17px]">Modo premium activo</h3>
            <p className="text-[13px] text-muted-foreground">Todas las preguntas respondidas.</p>
          </div>
        )}
      </div>

      <button onClick={onBack} className="text-[13px] text-muted-foreground hover:text-foreground transition">
        ← Volver a la pregunta anterior
      </button>
    </div>
  );
}

// ============================================================
// Vista: Result — Tipo y metadatos de secciones
// ============================================================
type SectionKey = keyof Blueprint["secciones"];

const BLUEPRINT_SECTIONS: {
  key: SectionKey;
  num: string;
  title: string;
  shortTitle: string;
  icon: typeof Sparkles;
}[] = [
  { key: "base_conocimientos", num: "01", title: "Base de conocimientos", shortTitle: "Base",       icon: Sparkles   },
  { key: "estructura",         num: "02", title: "Estructura",            shortTitle: "Estructura", icon: Database   },
  { key: "arquitectura",       num: "03", title: "Arquitectura",          shortTitle: "Arq.",       icon: Network    },
  { key: "herramientas",       num: "04", title: "Herramientas",          shortTitle: "Herram.",    icon: Wrench     },
  { key: "plan_accion",        num: "05", title: "Plan de acción",        shortTitle: "Plan",       icon: ListChecks },
  { key: "rapido_adorable",    num: "06", title: "Rápido y adorable",     shortTitle: "Rápido",     icon: Rocket     },
  { key: "contenido",          num: "07", title: "Contenido",             shortTitle: "Contenido",  icon: BookOpen   },
  { key: "economia",           num: "08", title: "Economía",              shortTitle: "Economía",   icon: PiggyBank  },
];

function ResultView({
  idea, blueprint, error, openSection, setOpenSection, onRestart, onRetry, onGoToProjects,
}: {
  idea: string;
  blueprint: Blueprint | null;
  error: string | null;
  openSection: SectionKey | null;
  setOpenSection: (k: SectionKey | null) => void;
  onRestart: () => void;
  onRetry: () => void;
  onGoToProjects: () => void;
}) {
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-8 py-20 text-center">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <X className="h-8 w-8" />
        </div>
        <h2 className="text-[26px] font-bold tracking-[-0.01em] text-foreground mb-3">No pudimos generar tu blueprint</h2>
        <p className="text-[15px] text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">{error}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={onRetry} className="app-cta-primary">
            <Zap className="h-3.5 w-3.5" />Reintentar
          </button>
          <button onClick={onRestart} className="app-cta-ghost">
            <ArrowLeft className="h-3.5 w-3.5" />Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!blueprint) return null;

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
    <div className="mx-auto max-w-[1340px] px-8 py-8">
      {/* Header nav */}
      <div className="mb-8 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Nueva idea
        </button>
        <span className="app-pill-violet inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold [color:var(--violet-text-strong)]">
          <Sparkles className="h-3 w-3" />
          Blueprint generado
        </span>
      </div>

      {/* Hero — título + descripción + tags */}
      <div className="mb-10">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mb-3">
          Tu solución de IA
        </p>
        <h1 className="text-[44px] font-bold tracking-[-0.02em] leading-[1.05] text-foreground mb-4">
          {blueprint.titulo}
        </h1>
        <p className="text-[16px] text-muted-foreground leading-relaxed max-w-[640px] mb-5">
          {blueprint.descripcion}
        </p>
        {blueprint.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {blueprint.tags.map((tag, i) => (
              <span key={i} className="app-pill-violet inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold [color:var(--violet-text-strong)]">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hairline */}
      <div className="my-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Recap idea */}
      <div className="app-card px-5 py-3.5 mb-8 flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] font-semibold shrink-0">Idea:</span>
        <span className="text-[13px] text-foreground italic line-clamp-1">"{idea}"</span>
      </div>

      {/* Grid de 8 secciones */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {BLUEPRINT_SECTIONS.map((s) => {
          const Icon = s.icon;
          const content = blueprint.secciones?.[s.key] ?? "";
          const preview = content.split("\n").find((l) => l.trim() && !l.startsWith("#")) || content.slice(0, 120);
          return (
            <button
              key={s.key}
              onClick={() => setOpenSection(s.key)}
              className="app-card p-5 text-left group flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[32px] font-bold leading-none text-muted-foreground/20 tabular-nums">
                  {s.num}
                </span>
                <div className="h-8 w-8 rounded-lg bg-[var(--violet-pill-bg)] border border-[var(--violet-pill-border)] flex items-center justify-center [color:var(--violet-text)] group-hover:bg-[var(--violet-glow-hover)] transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-[15px] mb-1.5">{s.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">{preview}</p>
              </div>
              <div className="flex items-center gap-1 text-[12px] [color:var(--violet-text)] opacity-0 group-hover:opacity-100 transition mt-auto font-medium">
                Ver detalle <ChevronRight className="h-3 w-3" />
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA principal */}
      <div className="mt-12 app-card p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[13px] font-semibold text-foreground">¿Querés implementar esta solución?</span>
          <span className="text-[13px] text-muted-foreground">Guardalo en tus proyectos para darle seguimiento y acceder cuando quieras.</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={onGoToProjects} className="app-cta-primary whitespace-nowrap">
            <FolderKanban className="h-4 w-4" />
            Ver en mis proyectos
          </button>
          <button onClick={() => setOpenSection("rapido_adorable")} className="app-cta-ghost whitespace-nowrap">
            <Rocket className="h-4 w-4" />
            Empezar a construir
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SectionDetailPage — Navegación full-page entre las 8 secciones
// ============================================================
function SectionDetailPage({
  blueprint, currentSection, onChangeSection, onBack,
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
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1340px] px-8">
          <div className="flex items-center justify-between py-3.5 gap-4">
            {/* Back */}
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Vista general</span>
              <span className="sm:hidden">Volver</span>
            </button>

            {/* Section identity */}
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 [color:var(--violet-text)]" />
                <span className="font-semibold text-foreground text-[15px] truncate">{meta.title}</span>
              </div>
              <span className="app-pill-violet inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold [color:var(--violet-text-strong)] font-mono">
                {String(currentIdx + 1).padStart(2, "0")} / {BLUEPRINT_SECTIONS.length}
              </span>
            </div>

            {/* Next */}
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 text-[13px] font-semibold [color:var(--violet-text)] hover:opacity-80 transition shrink-0"
            >
              {isLast ? (
                <><span className="hidden sm:inline">Finalizar</span><Check className="h-4 w-4" /></>
              ) : (
                <><span className="hidden sm:inline">Próximo</span><ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </button>
          </div>

          {/* Progress tabs */}
          <SectionProgressBar currentIdx={currentIdx} onSelect={(i) => onChangeSection(BLUEPRINT_SECTIONS[i].key)} />
        </div>
      </div>

      {/* Section content */}
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

      {/* Sticky bottom nav */}
      <div className="sticky bottom-0 border-t border-border bg-card/80 backdrop-blur-xl px-8 py-3">
        <div className="mx-auto max-w-[1340px] flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className="app-cta-ghost disabled:opacity-30"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Anterior
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-1">
            {BLUEPRINT_SECTIONS.map((_, i) => (
              <button
                key={i}
                onClick={() => onChangeSection(BLUEPRINT_SECTIONS[i].key)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIdx ? "w-6 bg-[var(--violet-text)]" : i < currentIdx ? "w-1.5 bg-[var(--violet-text)]/40" : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>

          <button onClick={handleNext} className="app-cta-primary">
            {isLast ? <><Check className="h-3.5 w-3.5" />Finalizar</> : <>Próximo<ArrowRight className="h-3.5 w-3.5" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SectionProgressBar — Los 8 iconos con líneas conectoras
// ============================================================
function SectionProgressBar({
  currentIdx, onSelect,
}: {
  currentIdx: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="overflow-x-auto pb-2.5 -mx-2 px-2">
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
                className="flex flex-col items-center gap-1 group"
              >
                <div
                  className={`
                    h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all
                    ${isCompleted
                      ? "bg-[var(--violet-pill-bg)] border-[var(--violet-border-hover)] [color:var(--violet-text)]"
                      : isCurrent
                      ? "bg-[var(--violet-text)] border-[var(--violet-text)] text-white shadow-[0_0_14px_-2px_rgba(139,92,246,0.6)]"
                      : "bg-card border-border text-muted-foreground hover:border-[var(--violet-border)] hover:[color:var(--violet-text)] transition"}
                  `}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                </div>
                <span
                  className={`text-[9px] leading-tight max-w-[52px] text-center hidden sm:block transition-colors font-mono ${
                    isCurrent ? "text-foreground font-medium" : "text-muted-foreground/50 group-hover:text-muted-foreground"
                  }`}
                >
                  {s.shortTitle}
                </span>
              </button>
              {i < BLUEPRINT_SECTIONS.length - 1 && (
                <div
                  className={`w-5 sm:w-8 h-px mx-0.5 sm:mx-1 transition-colors ${
                    i < currentIdx ? "bg-[var(--violet-border-hover)]" : "bg-border"
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
// DefaultMarkdownSection — Markdown con prose
// ============================================================
function DefaultMarkdownSection({ content }: { content: string }) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <PremiumMarkdown content={content} />
    </div>
  );
}

// ============================================================
// RapidoSection — Panel doble: lista de prompts + detalle
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

  if (prompts.length === 0) return <DefaultMarkdownSection content={content} />;

  const currentPrompt = prompts[selected];

  return (
    <div className="mx-auto max-w-[1340px] px-8 py-8">
      {/* Header de sección */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.01em] text-foreground mb-1">
            Construí el MVP en Lovable
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Pegá cada prompt en orden para construir tu solución paso a paso.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="app-pill-violet inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold [color:var(--violet-text-strong)] font-mono tabular-nums">
            {copiedSet.size} / {prompts.length} copiados
          </span>
          <button
            onClick={copyAll}
            className="app-cta-primary"
          >
            {copiedAll ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedAll ? "¡Copiado!" : "Copiar PRD completo"}
          </button>
        </div>
      </div>

      {/* Layout doble columna */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left — lista de pasos */}
        <div className="lg:col-span-2 space-y-2">
          {prompts.map((p, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full text-left rounded-xl p-3.5 flex items-start gap-3 border transition-all ${
                selected === i
                  ? "border-[var(--violet-border-hover)] bg-[var(--violet-pill-bg)] shadow-sm"
                  : "border-border bg-card hover:border-[var(--violet-border)] hover:bg-[var(--violet-pill-bg)]"
              }`}
            >
              {/* Step number / check */}
              <span
                className={`shrink-0 h-7 w-7 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors font-mono tabular-nums ${
                  copiedSet.has(i)
                    ? "bg-emerald-500/20 text-emerald-400"
                    : selected === i
                    ? "bg-[var(--violet-text)] text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {copiedSet.has(i) ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-semibold truncate ${selected === i ? "text-foreground" : "text-muted-foreground"}`}>
                  {p.title}
                </p>
                <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5 leading-relaxed">
                  {p.content.slice(0, 60)}…
                </p>
              </div>
              <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-colors mt-0.5 ${selected === i ? "[color:var(--violet-text)]" : "text-muted-foreground/30"}`} />
            </button>
          ))}
        </div>

        {/* Right — prompt seleccionado */}
        <div className="lg:col-span-3 app-card flex flex-col">
          <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-[var(--violet-border)]">
            <div>
              <span className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] font-semibold font-mono">
                Paso {selected + 1} de {prompts.length}
              </span>
              <h3 className="font-bold text-foreground text-[17px] leading-snug mt-1">
                {currentPrompt?.title}
              </h3>
            </div>
            <button
              onClick={() => copyPrompt(selected)}
              className={`app-cta-ghost shrink-0 transition-colors ${
                copied === selected ? "border-emerald-500/40 text-emerald-400" : ""
              }`}
            >
              {copied === selected ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === selected ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
          <ScrollArea className="flex-1 max-h-[520px]">
            <pre className="px-6 py-5 text-[13px] text-muted-foreground whitespace-pre-wrap break-words leading-relaxed font-mono">
              {currentPrompt?.content ?? ""}
            </pre>
          </ScrollArea>
        </div>
      </div>

      {/* Tip */}
      <div className="mt-6 rounded-xl border border-[var(--violet-border)] bg-[var(--violet-pill-bg)] px-5 py-4 flex items-start gap-3">
        <Zap className="h-4 w-4 [color:var(--violet-text)] shrink-0 mt-0.5" />
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Consejo:</span> Seguí las indicaciones en orden. Cada prompt hace referencia a tablas y componentes creados en el anterior.{" "}
          Pegá el <span className="font-semibold [color:var(--violet-text)]">primero en un proyecto nuevo de Lovable</span> y los demás como actualizaciones.
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

  const sprintLabels = ["Fundación", "MVP funcional", "Lanzamiento"];

  return (
    <div className="mx-auto max-w-[1340px] px-8 py-10">
      <div className="mb-8">
        <h2 className="text-[22px] font-bold tracking-[-0.01em] text-foreground mb-1">Plan de acción</h2>
        <p className="text-[14px] text-muted-foreground">3 sprints para llevar tu solución de idea a producción.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {sprints.map((sprint, i) => (
          <div key={i} className="app-card p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="app-pill-violet inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold [color:var(--violet-text-strong)]">
                Sprint {i + 1}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                {sprintLabels[i]}
              </span>
            </div>
            <div className="my-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <ul className="space-y-3">
              {sprint.tasks.map((task, j) => (
                <li key={j} className="flex items-start gap-2.5 group">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-[var(--violet-border)] bg-[var(--violet-pill-bg)] group-hover:border-[var(--violet-border-hover)] group-hover:bg-[var(--violet-glow-hover)] transition-colors" />
                  <span className="text-[13px] text-muted-foreground leading-relaxed">{task}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              <span className="font-mono text-[32px] font-bold text-muted-foreground/10 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
          </div>
        ))}
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
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-8">
        <h2 className="text-[22px] font-bold tracking-[-0.01em] text-foreground mb-1">Lo que necesitás aprender</h2>
        <p className="text-[14px] text-muted-foreground">Temas clave para implementar esta solución con éxito.</p>
      </div>
      <div className="space-y-4">
        {topics.map((topic, i) => (
          <div key={i} className="app-card p-5 flex items-start gap-5">
            {/* Number */}
            <span className="font-mono text-[40px] font-bold leading-none [color:var(--violet-text)] opacity-30 tabular-nums shrink-0 mt-1">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2.5 mb-2">
                <div className="shrink-0 h-7 w-7 rounded-lg bg-[var(--violet-pill-bg)] border border-[var(--violet-pill-border)] flex items-center justify-center [color:var(--violet-text)] mt-0.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                </div>
                <h3 className="font-bold text-foreground text-[17px] leading-snug">{topic.title}</h3>
              </div>
              <p className="text-[14px] text-muted-foreground leading-relaxed pl-9">{topic.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// EconomiaSection — ROI visual + markdown
// ============================================================
function EconomiaSection({ content }: { content: string }) {
  const moneyMatch = content.match(/\$\s?[\d.,]+(?:\s?[kKmM])?/);
  const hoursMatch = content.match(/(\d+)\s*horas?\s*(?:\/?\s*mes|ahorradas?)/i);
  const paybackMatch = content.match(/(\d+(?:[.,]\d+)?)\s*mes(?:es)?\s*(?:de\s*)?payback/i);
  const roiMatch = content.match(/ROI[^:]*:\s*(\d+\s*%)/i) ?? content.match(/(\d+\s*%).*?retorno/i);

  const hasMetrics = moneyMatch || hoursMatch || paybackMatch || roiMatch;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-8">
        <h2 className="text-[22px] font-bold tracking-[-0.01em] text-foreground mb-1">Economía de la solución</h2>
        <p className="text-[14px] text-muted-foreground">ROI proyectado y análisis de costos vs. beneficios.</p>
      </div>

      {hasMetrics && (
        <>
          <div className="grid gap-4 sm:grid-cols-3 mb-10">
            {moneyMatch && (
              <div className="app-card p-6 text-center flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-[var(--violet-pill-bg)] border border-[var(--violet-pill-border)] flex items-center justify-center [color:var(--violet-text)]">
                  <DollarSign className="h-5 w-5" />
                </div>
                <p className="text-[40px] font-bold tracking-[-0.02em] leading-none [color:var(--violet-text)] tabular-nums">
                  {moneyMatch[0]}
                </p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] font-semibold">Ahorro estimado</p>
              </div>
            )}
            {hoursMatch && (
              <div className="app-card p-6 text-center flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-[var(--violet-pill-bg)] border border-[var(--violet-pill-border)] flex items-center justify-center [color:var(--violet-text)]">
                  <Clock className="h-5 w-5" />
                </div>
                <p className="text-[40px] font-bold tracking-[-0.02em] leading-none [color:var(--violet-text)] tabular-nums">
                  {hoursMatch[1]}<span className="text-[22px]">h</span>
                </p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] font-semibold">Horas / mes</p>
              </div>
            )}
            {(paybackMatch || roiMatch) && (
              <div className="app-card p-6 text-center flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-[var(--violet-pill-bg)] border border-[var(--violet-pill-border)] flex items-center justify-center [color:var(--violet-text)]">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <p className="text-[40px] font-bold tracking-[-0.02em] leading-none [color:var(--violet-text)] tabular-nums">
                  {roiMatch ? roiMatch[1] : `${paybackMatch![1]}m`}
                </p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] font-semibold">
                  {roiMatch ? "ROI estimado" : "Payback"}
                </p>
              </div>
            )}
          </div>

          <div className="my-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </>
      )}

      {/* Markdown premium con cards, tablas, checklists, code blocks */}
      <PremiumMarkdown content={content} />
    </div>
  );
}
