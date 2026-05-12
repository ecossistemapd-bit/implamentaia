import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { HeartHandshake, CheckCircle2, ArrowRight } from "lucide-react";
import { FEATURES } from "@/lib/features";

export const Route = createFileRoute("/_authenticated/contratar-experto")({
  beforeLoad: () => {
    if (!FEATURES.MARKETPLACE) throw redirect({ to: "/dashboard" });
  },
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
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-8 md:p-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-300">
          <HeartHandshake className="h-3.5 w-3.5" /> Servicio profesional
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
          Contratá un experto para implementar por vos
        </h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-400">
          Si preferís delegar la implementación, conectamos tu proyecto con un implementador
          verificado que se encarga de todo, de punta a punta.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {benefits.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-sm text-zinc-200"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/solutions"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-100"
          >
            Elegir una solución <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/projects"
            className="inline-flex items-center rounded-xl border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            Ver mis proyectos
          </Link>
        </div>
      </div>
    </div>
  );
}
