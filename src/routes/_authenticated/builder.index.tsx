import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

type Search = { source?: string };

export const Route = createFileRoute("/_authenticated/builder/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    source: typeof s.source === "string" ? s.source : undefined,
  }),
  component: BuilderWizard,
});

const TOTAL = 5;
const LOADING_MSGS = [
  "Analizando tu contexto...",
  "Diseñando arquitectura...",
  "Seleccionando herramientas...",
  "Redactando prompts...",
  "Generando assets...",
];

function BuilderWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { source } = Route.useSearch();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const [form, setForm] = useState({
    objective: "",
    company_name: "",
    role: "",
    industry: "",
    team_size: "",
    company_what: "",
    tools_used: [] as string[],
    budget: "",
    tech_level: "",
    kpis: [] as string[],
    goal: "",
    notes: "",
  });

  useEffect(() => {
    if (!source) return;
    supabase.from("solutions").select("*").eq("slug", source).single().then(({ data }) => {
      if (data) {
        setForm((f) => ({
          ...f,
          objective: f.objective || `Implementar: ${data.title}. ${data.short_description}`,
        }));
      }
    });
  }, [source]);

  useEffect(() => {
    if (!submitting) return;
    const t = setInterval(() => setLoadingMsgIdx((i) => (i + 1) % LOADING_MSGS.length), 1800);
    return () => clearInterval(t);
  }, [submitting]);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const canNext = () => {
    if (step === 1) return form.objective.trim().length > 10;
    if (step === 2) return form.company_name && form.role && form.industry && form.team_size;
    if (step === 3) return form.budget && form.tech_level;
    if (step === 4) return form.kpis.length > 0;
    return true;
  };

  const generate = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const sourceSolution = source
        ? (await supabase.from("solutions").select("id").eq("slug", source).maybeSingle()).data
        : null;

      const { data: project, error } = await supabase
        .from("builder_projects")
        .insert({
          user_id: user.id,
          title: form.objective.slice(0, 80),
          source_solution_id: sourceSolution?.id ?? null,
          inputs: form,
          status: "generating",
        })
        .select()
        .single();
      if (error) throw error;

      const { error: fnErr } = await supabase.functions.invoke("generate-builder-output", {
        body: { builder_project_id: project.id, inputs: form },
      });
      if (fnErr) throw fnErr;

      toast.success("Plan generado");
      navigate({ to: "/builder/$id", params: { id: project.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hubo un problema. Reintentar.");
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="h-6 w-6 rounded-full border-2 border-background border-t-transparent"
            />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Generando tu plan</h2>
          <AnimatePresence mode="wait">
            <motion.p
              key={loadingMsgIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4 }}
              className="mt-3 text-sm text-muted-foreground"
            >
              {LOADING_MSGS[loadingMsgIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 lg:py-20">
      <Progress value={(step / TOTAL) * 100} className="mb-10" />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.3 }}
        >
          {step === 1 && (
            <Step title="¿Qué querés lograr?" subtitle="Describe en una frase el problema que querés resolver con IA.">
              <Textarea
                rows={6}
                placeholder="Ej: Quiero que un agente conteste mis WhatsApps fuera de horario y agende reuniones..."
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
              />
            </Step>
          )}
          {step === 2 && (
            <Step title="Tu contexto" subtitle="Necesitamos entender tu empresa para personalizar el plan.">
              <Input placeholder="Nombre de tu empresa" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              <Input placeholder="Tu rol (CEO, Marketing Manager...)" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              <Input placeholder="Industria" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              <Input placeholder="Tamaño del equipo (ej: 5-15)" value={form.team_size} onChange={(e) => setForm({ ...form, team_size: e.target.value })} />
              <Textarea rows={3} placeholder="¿Qué hace tu empresa?" value={form.company_what} onChange={(e) => setForm({ ...form, company_what: e.target.value })} />
            </Step>
          )}
          {step === 3 && (
            <Step title="Restricciones" subtitle="Adaptamos la solución a tu stack y presupuesto.">
              <Input placeholder="Herramientas que ya usás (separadas por coma)" value={form.tools_used.join(", ")} onChange={(e) => setForm({ ...form, tools_used: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
              <Select label="Presupuesto mensual estimado" value={form.budget} onChange={(v) => setForm({ ...form, budget: v })} options={["<$50", "$50–$200", "$200–$500", "$500+"]} />
              <Select label="Nivel técnico del equipo" value={form.tech_level} onChange={(v) => setForm({ ...form, tech_level: v })} options={["Sin programación", "Básico", "Intermedio", "Avanzado"]} />
            </Step>
          )}
          {step === 4 && (
            <Step title="¿Cómo medirás el éxito?" subtitle="Definí los KPIs que querés mover.">
              <Input placeholder="KPIs a impactar (separados por coma)" value={form.kpis.join(", ")} onChange={(e) => setForm({ ...form, kpis: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
              <Input placeholder="Meta numérica si aplica" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
              <Textarea rows={3} placeholder="Cualquier detalle adicional (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Step>
          )}
          {step === 5 && (
            <Step title="Todo listo" subtitle="Vamos a generar tu plan de implementación personalizado.">
              <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                Crearemos un plan paso a paso, prompts del sistema, integraciones recomendadas y assets descargables.
              </div>
            </Step>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={back} disabled={step === 1} className="rounded-full">Atrás</Button>
        {step < TOTAL ? (
          <Button onClick={next} disabled={!canNext()} className="rounded-full">Siguiente</Button>
        ) : (
          <Button onClick={generate} className="rounded-full">Generar plan</Button>
        )}
      </div>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              value === opt
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
