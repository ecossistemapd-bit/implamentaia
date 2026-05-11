import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Sparkles, Clock, Layers, Tag } from "lucide-react";

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

const BENEFITS = [
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
    <div className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
      <Link to="/solutions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Soluciones
      </Link>

      <div className="mt-8 flex flex-wrap gap-2">
        <Badge variant="secondary">{catLabel}</Badge>
        <Badge variant="outline" className={DIFFICULTY_BADGE[diff]}>
          {DIFFICULTY_LABEL[diff]}
        </Badge>
      </div>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight lg:text-5xl">{s.title}</h1>
      <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{s.short_description}</p>

      {/* Thumbnail */}
      <div className="mt-8 flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-black">
        <Icon className="h-24 w-24 text-white/90" strokeWidth={1.25} />
      </div>

      {/* Metrics */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Tag} label="Categoría" value={catLabel} />
        <MetricCard icon={Layers} label="Nivel" value={DIFFICULTY_LABEL[diff]} />
        <MetricCard icon={Clock} label="Tiempo estimado" value={s.estimated_time} />
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Herramientas
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {s.tools_required.slice(0, 4).map((t: string) => (
              <span key={t} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px]">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Generate prompt */}
        <div className="rounded-2xl border-2 border-foreground bg-background p-8">
          <h2 className="text-2xl font-semibold tracking-tight">Generá tu prompt para Lovable</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Personalizá esta solución con tu contexto y obtené un prompt listo para usar.
          </p>
          <div className="mt-6 space-y-2">
            <Label htmlFor="context">¿Cuál es tu industria o contexto?</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ej: Tienda de e-commerce de indumentaria con 5.000 clientes activos…"
              rows={4}
            />
          </div>
          <Button
            className="mt-6 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
            size="lg"
            onClick={() => alert("Próximamente")}
          >
            ✦ Generar Prompt para Lovable
          </Button>
        </div>

        {/* Right: Expert implementation */}
        <div className="rounded-2xl bg-foreground p-8 text-background">
          <h2 className="text-2xl font-semibold tracking-tight">Implementación por expertos</h2>
          <p className="mt-2 text-sm text-background/70">
            ¿Preferís que un experto lo implemente por vos? Llave en mano.
          </p>
          <ul className="mt-6 space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 text-3xl font-semibold">Desde $500 USD</div>
          <Button
            variant="secondary"
            size="lg"
            className="mt-6 w-full rounded-full bg-background text-foreground hover:bg-background/90"
            onClick={() => navigate({ to: "/solutions/$id/contratar", params: { id } })}
          >
            Contratar Implementador →
          </Button>
        </div>
      </div>

      {/* About */}
      <section className="mt-14">
        <h3 className="text-2xl font-semibold tracking-tight">Sobre esta solución</h3>
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
          {s.long_description}
        </p>
      </section>

      {/* Tools */}
      <section className="mt-10">
        <h4 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Herramientas necesarias
        </h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {s.tools_required.map((t: string) => (
            <span key={t} className="rounded-full border border-border bg-card px-3 py-1 text-xs">
              {t}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-3 text-base font-medium">{value}</div>
    </div>
  );
}
