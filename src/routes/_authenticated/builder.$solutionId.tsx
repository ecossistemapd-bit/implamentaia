import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, ExternalLink, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FEATURES } from "@/lib/features";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/builder/$solutionId")({
  component: BuilderWizard,
});

type BQ = {
  id: string;
  label: string;
  type: "select" | "text";
  options?: string[];
  placeholder?: string;
};

const STEP_LABELS = ["Diagnóstico", "Tu stack", "Prompt Lovable", "Config n8n", "Checklist"];

const STACK_GROUPS: { label: string; tools: string[] }[] = [
  { label: "Automatización", tools: ["n8n", "Make", "Zapier", "Ninguna"] },
  { label: "WhatsApp", tools: ["Z-API", "Evolution API", "Meta API oficial", "Ninguna"] },
  { label: "CRM", tools: ["HubSpot", "Kommo", "Salesforce", "Ninguna"] },
  { label: "IA", tools: ["OpenAI", "Anthropic Claude", "Google Gemini", "Ninguna"] },
  { label: "Base de datos", tools: ["Supabase", "Firebase", "PostgreSQL propio", "Ninguna"] },
];

function BuilderWizard() {
  const { solutionId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stack, setStack] = useState<Record<string, string[]>>({});
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checks, setChecks] = useState<boolean[]>([]);
  const [resumeOffer, setResumeOffer] = useState<null | {
    sessionId: string;
    step: number;
    answers: Record<string, string>;
    stack: Record<string, string[]>;
    checklist: boolean[];
    generatedPrompt: string | null;
  }>(null);
  const initRef = useRef(false);

  const lsKey = `builder_session_${solutionId}`;

  const { data: solution, isLoading } = useQuery({
    queryKey: ["solution-builder", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solutions")
        .select("*")
        .eq("id", solutionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const createNewSession = async () => {
    if (!user || !solution) return;
    const { data, error } = await supabase
      .from("builder_sessions")
      .insert({
        user_id: user.id,
        solution_id: solution.id,
        current_step: 1,
        answers: {},
      })
      .select("id")
      .single();
    if (!error && data) {
      setSessionId(data.id);
      try { localStorage.setItem(lsKey, data.id); } catch {}
    }
  };

  // On mount: try to resume from localStorage, otherwise create new session
  useEffect(() => {
    if (!user || !solution || initRef.current) return;
    initRef.current = true;
    (async () => {
      let existingId: string | null = null;
      try { existingId = localStorage.getItem(lsKey); } catch {}
      if (existingId) {
        const { data: s } = await supabase
          .from("builder_sessions")
          .select("*")
          .eq("id", existingId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (s && (s.status === "in_progress" || s.status === "paused")) {
          const ans = (s.answers as Record<string, unknown>) ?? {};
          setResumeOffer({
            sessionId: s.id,
            step: s.current_step ?? 1,
            answers: (ans.step1 as Record<string, string>) ?? {},
            stack: (ans.step2 as Record<string, string[]>) ?? {},
            checklist: (ans.checklist as boolean[]) ?? [],
            generatedPrompt: s.generated_prompt ?? null,
          });
          return;
        }
        try { localStorage.removeItem(lsKey); } catch {}
      }
      await createNewSession();
    })();
  }, [user, solution]); // eslint-disable-line

  // Init checklist
  useEffect(() => {
    if (solution?.checklist_items) {
      setChecks(new Array(solution.checklist_items.length).fill(false));
    }
  }, [solution]);

  const builderQuestions = (solution?.builder_questions ?? []) as BQ[];

  const canAdvance = useMemo(() => {
    if (step === 1) return builderQuestions.every((q) => (answers[q.id] ?? "").trim().length > 0);
    if (step === 2) return STACK_GROUPS.every((g) => (stack[g.label] ?? []).length > 0);
    if (step === 3) return !!generatedPrompt && !generatingPrompt;
    return true;
  }, [step, builderQuestions, answers, stack, generatedPrompt, generatingPrompt]);

  type SessionUpdate = Database["public"]["Tables"]["builder_sessions"]["Update"];
  const persist = async (patch: SessionUpdate) => {
    if (!sessionId) return;
    await supabase.from("builder_sessions").update(patch).eq("id", sessionId);
  };

  const goNext = async () => {
    const nextStep = Math.min(step + 1, 5);
    const baseAnswers = { step1: answers, step2: stack, checklist: checks };
    if (step === 3) {
      await persist({ current_step: nextStep, answers: baseAnswers, generated_prompt: generatedPrompt });
    } else {
      await persist({ current_step: nextStep, answers: baseAnswers });
    }
    setStep(nextStep);
  };

  const hireImplementador = async () => {
    if (!sessionId || !user || !solution) {
      navigate({ to: "/solutions/$id/contratar", params: { id: solutionId } });
      return;
    }
    await supabase
      .from("builder_sessions")
      .update({ status: "paused", answers: { step1: answers, step2: stack, checklist: checks } })
      .eq("id", sessionId);
    await supabase
      .from("builder_projects")
      .insert({
        user_id: user.id,
        source_solution_id: solution.id,
        title: solution.title,
        status: "pending",
        type: "implementador",
        builder_session_id: sessionId,
        inputs: { diagnostico: answers, stack },
      } as never);
    try { localStorage.setItem(lsKey, sessionId); } catch {}
    navigate({ to: "/solutions/$id/contratar", params: { id: solutionId } });
  };

  const resumeSession = () => {
    if (!resumeOffer) return;
    setSessionId(resumeOffer.sessionId);
    setStep(resumeOffer.step);
    setAnswers(resumeOffer.answers);
    setStack(resumeOffer.stack);
    if (resumeOffer.checklist.length) setChecks(resumeOffer.checklist);
    if (resumeOffer.generatedPrompt) setGeneratedPrompt(resumeOffer.generatedPrompt);
    supabase
      .from("builder_sessions")
      .update({ status: "in_progress" })
      .eq("id", resumeOffer.sessionId)
      .then(() => {});
    setResumeOffer(null);
  };

  const startOver = async () => {
    try { localStorage.removeItem(lsKey); } catch {}
    setResumeOffer(null);
    await createNewSession();
  };

  // Auto-generate prompt when entering step 3
  useEffect(() => {
    if (step !== 3 || !solution || generatedPrompt || generatingPrompt) return;
    setGeneratingPrompt(true);
    (async () => {
      try {
        const userContext = JSON.stringify({ diagnostico: answers, stack });
        const { data, error } = await supabase.functions.invoke("generate-solution-prompt", {
          body: { solution_id: solution.id, user_context: userContext },
        });
        if (error) throw error;
        setGeneratedPrompt((data as { prompt?: string })?.prompt ?? null);
      } catch (e) {
        setGeneratedPrompt("No pudimos generar el prompt. Intentá de nuevo.\n\n" + String(e));
      } finally {
        setGeneratingPrompt(false);
      }
    })();
  }, [step, solution, answers, stack, generatedPrompt, generatingPrompt]);

  // Persist checklist progress
  useEffect(() => {
    if (step !== 5 || !sessionId) return;
    persist({ answers: { step1: answers, step2: stack, checklist: checks } });
  }, [checks, step]); // eslint-disable-line

  // Auto-complete on full checklist
  useEffect(() => {
    if (step !== 5 || !sessionId || checks.length === 0) return;
    if (checks.every(Boolean)) {
      (async () => {
        await supabase
          .from("builder_sessions")
          .update({ status: "completed" })
          .eq("id", sessionId);
        if (user && solution) {
          await supabase.from("builder_projects").insert({
            user_id: user.id,
            source_solution_id: solution.id,
            title: solution.title,
            status: "ready",
            type: "diy",
            builder_session_id: sessionId,
            inputs: { diagnostico: answers, stack },
            output: { plan_md: generatedPrompt ?? "" },
          } as never);
          try { localStorage.removeItem(lsKey); } catch {}
        }
      })();
    }
  }, [checks, step, sessionId]); // eslint-disable-line

  if (isLoading || !solution) {
    return (
      <div className="mx-auto max-w-[760px] px-6 py-10">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px] px-6 py-8">
      <Link
        to="/solutions/$id"
        params={{ id: solution.id }}
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {solution.title}
      </Link>

      <div className="mt-4">
        <h1 className="text-[1.5rem] font-bold tracking-tight leading-tight">Implementación guiada</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{solution.title}</p>
      </div>

      {resumeOffer && (
        <div className="mt-6 rounded-[12px] border border-border bg-muted/40 p-4">
          <h3 className="text-[14px] font-semibold">Tenés una implementación en curso</h3>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Quedaste en el paso {resumeOffer.step} de 5. ¿Querés continuarla?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              className="h-8 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-[12px]"
              onClick={resumeSession}
            >
              Continuar donde lo dejé
            </Button>
            <Button variant="outline" className="h-8 rounded-lg text-[12px]" onClick={startOver}>
              Empezar de nuevo
            </Button>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="mt-6">
        <div className="flex gap-1.5">
          {STEP_LABELS.map((_, i) => {
            const idx = i + 1;
            const done = idx < step;
            const active = idx === step;
            return (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  done || active ? "bg-foreground" : "bg-muted"
                }`}
              />
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {STEP_LABELS.map((l, i) => (
            <div
              key={l}
              className={`text-[11px] ${
                i + 1 === step ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="mt-8">
        {step === 1 && (
          <Step
            title="Contanos sobre tu empresa"
            subtitle="Estas respuestas personalizan toda la implementación."
          >
            <div className="space-y-5">
              {builderQuestions.map((q) => (
                <div key={q.id} className="space-y-1.5">
                  <Label className="text-[13px]">{q.label}</Label>
                  {q.type === "select" ? (
                    <Select
                      value={answers[q.id] ?? ""}
                      onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                    >
                      <SelectTrigger className="h-10 text-[13px] rounded-lg">
                        <SelectValue placeholder="Elegí una opción" />
                      </SelectTrigger>
                      <SelectContent>
                        {q.options?.map((opt) => (
                          <SelectItem key={opt} value={opt} className="text-[13px]">
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Textarea
                      value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      placeholder={q.placeholder}
                      className="min-h-[80px] text-[13px] rounded-lg"
                    />
                  )}
                </div>
              ))}
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step
            title="¿Qué herramientas ya tenés?"
            subtitle="Marcá las que ya usás. Adaptamos la implementación a tu stack."
          >
            <div className="space-y-5">
              {STACK_GROUPS.map((g) => (
                <div key={g.label}>
                  <div className="mb-2 text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
                    {g.label}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {g.tools.map((tool) => {
                      const selected = (stack[g.label] ?? []).includes(tool);
                      return (
                        <button
                          key={tool}
                          type="button"
                          onClick={() => {
                            setStack((s) => {
                              const cur = s[g.label] ?? [];
                              const next = selected
                                ? cur.filter((t) => t !== tool)
                                : [...cur, tool];
                              return { ...s, [g.label]: next };
                            });
                          }}
                          className={`relative flex h-[60px] flex-col items-center justify-center gap-0.5 rounded-lg border px-2 transition ${
                            selected
                              ? "border-foreground bg-foreground/5"
                              : "border-border hover:border-foreground/40"
                          }`}
                        >
                          <span className="text-[14px] font-semibold">{tool[0]}</span>
                          <span className="text-[11px] text-muted-foreground line-clamp-1">{tool}</span>
                          {selected && (
                            <Check className="absolute right-1.5 top-1.5 h-3 w-3 text-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step
            title="Tu prompt personalizado para Lovable"
            subtitle="Generado con tus respuestas. Copiá y pegalo en Lovable."
          >
            {generatingPrompt && !generatedPrompt && (
              <div className="space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-32 animate-pulse rounded bg-muted" />
                <p className="text-[12px] text-muted-foreground">Generando tu prompt…</p>
              </div>
            )}
            {generatedPrompt && (
              <>
                <div className="max-h-[400px] overflow-y-auto rounded-lg bg-muted/60 p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
                  {generatedPrompt}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    className="h-9 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-[13px]"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPrompt);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    }}
                  >
                    {copied ? <><Check className="mr-1.5 h-3.5 w-3.5" /> Copiado!</> : <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar prompt</>}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 rounded-lg text-[13px]"
                    onClick={() => window.open("https://lovable.dev", "_blank")}
                  >
                    Abrir Lovable <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Este prompt ya incluye tu stack y contexto. Pegalo en Lovable para que construya
                  exactamente lo que tu empresa necesita.
                </p>
              </>
            )}
          </Step>
        )}

        {step === 4 && (
          <Step
            title="Configuración del flujo de automatización"
            subtitle="Los workflows que necesitás crear en n8n para esta solución."
          >
            <N8nTemplate template={solution.n8n_template ?? ""} />
            {FEATURES.MARKETPLACE && (
            <div className="mt-6 rounded-[10px] bg-muted/60 p-4">
              <h4 className="text-[13px] font-semibold">¿Necesitás ayuda con n8n?</h4>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Si los flujos de automatización te resultan complejos, un implementador puede
                configurarlos por vos.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-8 rounded-lg text-[12px]"
                onClick={() =>
                  hireImplementador()
                }
              >
                Contratar implementador →
              </Button>
            </div>
            )}
          </Step>
        )}

        {step === 5 && (
          <Step
            title="¿Todo funciona? Validá tu implementación"
            subtitle="Tachá cada punto a medida que lo verificás."
          >
            <Checklist items={solution.checklist_items ?? []} checks={checks} setChecks={setChecks} />
            {checks.length > 0 && checks.every(Boolean) && (
              <div className="mt-6 rounded-[12px] bg-foreground p-6 text-center text-background">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-background/10">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-[18px] font-bold">¡Implementación completada!</h3>
                <p className="mt-1 text-[13px] text-background/70">
                  Tu solución está lista. Guardamos el progreso en Mis Proyectos.
                </p>
                <Button
                  className="mt-4 h-9 rounded-lg bg-background text-foreground hover:bg-background/90 text-[13px]"
                  onClick={() => navigate({ to: "/projects" })}
                >
                  Ver mis proyectos →
                </Button>
              </div>
            )}

            <div className="mt-6 rounded-lg border border-border bg-muted p-4">
              <div className="flex items-start gap-3">
                <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    ¿Necesitás ayuda para terminar?
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Si llegaste hasta acá y preferís que un experto complete la configuración,
                    podemos asignarte uno.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 h-8 rounded-lg text-[12px]"
                    onClick={() => hireImplementador()}
                  >
                    Solicitar ayuda →
                  </Button>
                </div>
              </div>
            </div>
          </Step>
        )}
      </div>

      {/* Nav */}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
        <Button
          variant="ghost"
          className="h-9 rounded-lg text-[13px]"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          Atrás
        </Button>
        {step < 5 && (
          <Button
            className="h-9 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-[13px]"
            onClick={goNext}
            disabled={!canAdvance}
          >
            Siguiente →
          </Button>
        )}
      </div>
    </div>
  );
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[18px] font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function N8nTemplate({ template }: { template: string }) {
  if (!template) {
    return <p className="text-[13px] text-muted-foreground">Esta solución no tiene template de n8n configurado.</p>;
  }
  const lines = template.split("\n");
  const blocks: { type: "workflow" | "node" | "vars" | "text"; content: string[] }[] = [];
  let current: { type: "workflow" | "node" | "vars" | "text"; content: string[] } | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^WORKFLOW\b/i.test(line)) {
      if (current) blocks.push(current);
      current = { type: "workflow", content: [line] };
    } else if (/^NODO\b/i.test(line)) {
      if (current) blocks.push(current);
      current = { type: "node", content: [line] };
    } else if (/^VARIABLES/i.test(line)) {
      if (current) blocks.push(current);
      current = { type: "vars", content: [] };
    } else {
      if (!current) current = { type: "text", content: [] };
      current.content.push(line);
    }
  }
  if (current) blocks.push(current);

  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        if (b.type === "workflow") {
          return (
            <h3 key={i} className="text-[14px] font-bold tracking-tight border-b border-border pb-2">
              {b.content[0]}
            </h3>
          );
        }
        if (b.type === "node") {
          const [header, ...rest] = b.content;
          return (
            <div key={i} className="rounded-lg border border-border bg-card p-3">
              <div className="text-[13px] font-semibold">{header}</div>
              {rest.filter((l) => l.trim()).map((l, j) => (
                <div key={j} className="mt-1 text-[12px] text-muted-foreground">{l}</div>
              ))}
            </div>
          );
        }
        if (b.type === "vars") {
          const rows = b.content
            .filter((l) => l.trim().startsWith("-"))
            .map((l) => {
              const m = l.replace(/^-\s*/, "").split(":");
              return { name: m[0]?.trim() ?? "", desc: m.slice(1).join(":").trim() };
            });
          return (
            <div key={i}>
              <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Variables a configurar
              </h4>
              <div className="mt-2 overflow-hidden rounded-lg border border-border">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Variable</th>
                      <th className="px-3 py-2 text-left font-medium">Para qué sirve</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, j) => (
                      <tr key={j} className="border-t border-border">
                        <td className="px-3 py-2 font-mono">{r.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }
        return (
          <div key={i} className="text-[12px] text-muted-foreground whitespace-pre-line">
            {b.content.join("\n")}
          </div>
        );
      })}
    </div>
  );
}

function Checklist({
  items,
  checks,
  setChecks,
}: {
  items: string[];
  checks: boolean[];
  setChecks: (c: boolean[]) => void;
}) {
  const done = checks.filter(Boolean).length;
  const pct = items.length === 0 ? 0 : Math.round((done / items.length) * 100);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-[12px] text-muted-foreground">
        <span>{done} de {items.length} verificados</span>
        <span>{pct}%</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-muted transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => {
                const next = [...checks];
                next[i] = !next[i];
                setChecks(next);
              }}
              className="flex w-full items-start gap-2.5 rounded-lg border border-border bg-card p-3 text-left transition hover:border-foreground/40"
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  checks[i]
                    ? "border-border bg-muted text-foreground"
                    : "border-border bg-background"
                }`}
              >
                {checks[i] && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span
                className={`text-[13px] ${
                  checks[i] ? "line-through text-muted-foreground dark:text-muted-foreground" : "text-foreground"
                }`}
              >
                {item}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
