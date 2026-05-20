import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, ArrowLeft, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================
// Implementa AI · Mentoría (Próximamente)
//
// Cuando el user nos pase capturas / modelo, esta página se
// convierte en catálogo de mentores con cards (foto, especialidad,
// CTA contratar).
// ============================================================

export const Route = createFileRoute("/_authenticated/mentoria/")({
  component: MentoriaComingSoon,
});

function MentoriaComingSoon() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      {/* Icono central */}
      <div className="mx-auto mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/20">
        <Compass className="h-10 w-10 text-primary" />
      </div>

      {/* Eyebrow */}
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
        <Sparkles className="h-3 w-3" />
        Próximamente
      </div>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
        Mentoría 1-a-1
      </h1>

      {/* Subtitle */}
      <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
        Conectá con mentores que ya implementaron IA en empresas LatAm.
        Sesiones recurrentes, feedback personalizado y acompañamiento desde
        la idea hasta el deploy.
      </p>

      {/* Highlights */}
      <div className="grid gap-3 md:grid-cols-3 max-w-2xl mx-auto mb-12">
        {[
          { title: "Mentores curados", desc: "Implementadores reales, no teóricos" },
          { title: "Cada 15 días", desc: "Sesiones de 60 min vía video" },
          { title: "Foco en tu caso", desc: "Roadmap personalizado de tu solución" },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-border bg-card p-4 text-left"
          >
            <div className="text-sm font-semibold text-foreground mb-1">
              {item.title}
            </div>
            <div className="text-xs text-muted-foreground">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button variant="outline" disabled className="gap-1.5 cursor-not-allowed opacity-60">
          <Mail className="h-3.5 w-3.5" />
          Avisame cuando esté
        </Button>
        <Button asChild variant="ghost" className="gap-1.5">
          <Link to="/dashboard">
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al Dashboard
          </Link>
        </Button>
      </div>

      {/* Helper notice */}
      <p className="mt-12 text-xs text-muted-foreground">
        Estamos seleccionando los primeros mentores. Lanzamos pronto.
      </p>
    </div>
  );
}
