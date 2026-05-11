import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartHandshake, CheckCircle2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/contratar-experto")({
  component: ContratarExperto,
});

function ContratarExperto() {
  const benefits = [
    "Implementación llave en mano de cualquier solución del catálogo",
    "Acompañamiento 1 a 1 con un especialista certificado",
    "Integración con tus sistemas y datos reales",
    "Soporte post-implementación durante 30 días",
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/10 p-8 shadow-lg md:p-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <HeartHandshake className="h-3.5 w-3.5" /> Servicio profesional
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Contratá un experto para implementar por vos
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Si preferís delegar la implementación, conectamos tu proyecto con un implementador
          verificado que se encarga de todo, de punta a punta.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {benefits.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 rounded-lg border border-border bg-background/40 p-3 text-sm text-foreground"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/solutions"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Elegir una solución <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/projects"
            className="inline-flex items-center rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            Ver mis proyectos
          </Link>
        </div>
      </div>
    </div>
  );
}
