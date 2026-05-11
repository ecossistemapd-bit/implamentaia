import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, type Difficulty, type CategoryKey } from "@/lib/categories";
import { getLucideIcon } from "@/lib/icon";

export const Route = createFileRoute("/_authenticated/solutions/$id")({
  component: SolutionByIdDetail,
});

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  principiante: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900",
  intermedio: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-900",
  avanzado: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
};

const EXPERT_BENEFITS = [
  "Análisis personalizado de tu negocio",
  "Implementación end-to-end por expertos",
  "Integraciones con tus herramientas actuales",
  "Capacitación a tu equipo",
  "Soporte post-implementación 30 días",
];

function SolutionByIdDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);

  const { data: s, isLoading, isError } = useQuery({
    queryKey: ["solution-by-id", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("solutions").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

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

  const Icon = getLucideIcon(s.icon_name);
  const diff = s.difficulty as Difficulty;
  const catLabel = CATEGORY_LABEL[s.category as CategoryKey];

  return (
    <div className="mx-auto max-w-[960px] px-6 py-8">
      <Link to="/solutions" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Soluciones
      </Link>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        <span className="rounded border border-border px-2 py-[2px] text-[11px] text-muted-foreground">{catLabel}</span>
        <span className={`rounded border px-2 py-[2px] text-[11px] ${DIFFICULTY_BADGE[diff]}`}>
          {DIFFICULTY_LABEL[diff]}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Icon className="h-6 w-6 shrink-0" strokeWidth={1.75} />
        <h1 className="text-[1.75rem] font-bold tracking-tight leading-tight">{s.title}</h1>
      </div>
      <p className="mt-2 max-w-[600px] text-[14px] leading-relaxed text-foreground/70">{s.short_description}</p>

      {/* Metrics */}
      <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MetricCard label="Categoría" value={catLabel} />
        <MetricCard label="Nivel" value={DIFFICULTY_LABEL[diff]} />
        <MetricCard label="Tiempo" value={s.estimated_time} />
        <MetricCard label="Herramientas" value={`${s.tools_required.length} apps`} />
      </div>

      {/* CTAs */}
      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
        {/* Left: DIY (PRIMARY) */}
        <div className="rounded-[10px] border border-foreground bg-background p-5">
          <h2 className="text-[1rem] font-bold tracking-tight">Implementá vos mismo</h2>
          <p className="mt-1 text-sm text-gray-500">
            Guía paso a paso con prompt personalizado para tu empresa.
          </p>
          <Button
            className="mt-4 h-11 w-full rounded-lg bg-foreground text-background hover:bg-foreground/90 text-[14px] font-semibold"
            onClick={() => navigate({ to: "/builder/$solutionId", params: { solutionId: id } })}
          >
            Comenzar implementación guiada →
          </Button>
          <p className="mt-2 text-[12px] text-muted-foreground">
            El Builder te guía paso a paso en 15 minutos.
          </p>
        </div>

        {/* Right: Contratar (SECONDARY) */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-widest text-gray-400">
            ¿Preferís delegar?
          </p>
          <h3 className="mt-2 text-sm font-semibold text-gray-700">
            Contratar implementador
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Un experto configura todo por vos.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 h-8 rounded-lg text-[12px]"
            onClick={() => navigate({ to: "/solutions/$id/contratar", params: { id } })}
          >
            Ver opciones →
          </Button>
        </div>
      </div>

      {/* About */}
      <section className="mt-10">
        <h3 className="text-[15px] font-semibold tracking-tight">Sobre esta solución</h3>
        <p className="mt-2 whitespace-pre-line text-[13px] leading-[1.6] text-muted-foreground">
          {s.long_description}
        </p>
      </section>

      {/* Tools */}
      <section className="mt-6">
        <h4 className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
          Herramientas necesarias
        </h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {s.tools_required.map((t: string) => (
            <span key={t} className="rounded border border-border bg-card px-2.5 py-[3px] text-[12px]">
              {t}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-card px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-[14px] font-semibold leading-tight">{value}</div>
    </div>
  );
}
