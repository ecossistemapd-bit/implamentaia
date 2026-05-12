import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Logo } from "@/components/logo";
import { z } from "zod";
import { FEATURES } from "@/lib/features";

const search = z.object({
  solution: z.string().optional().default(""),
  email: z.string().optional().default(""),
});

export const Route = createFileRoute("/contratar/confirmacion")({
  validateSearch: search,
  beforeLoad: () => {
    if (!FEATURES.MARKETPLACE) throw redirect({ to: "/dashboard" });
  },
  component: ConfirmacionPage,
});

const STEPS = [
  "Revisamos tu solicitud y asignamos el implementador más adecuado para tu industria y solución.",
  "El implementador te contacta para alinear alcance, plazos y presupuesto final. Sin compromiso.",
  "Una vez acordado, comienza la implementación con acompañamiento completo hasta la entrega.",
];

function ConfirmacionPage() {
  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <header className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-3">
        <Logo />
      </header>
      <main className="mx-auto max-w-[520px] px-6 pt-20 pb-16 text-center">
        <div
          className="mx-auto flex items-center justify-center rounded-full bg-foreground text-background"
          style={{ width: 56, height: 56 }}
        >
          <Check style={{ width: 24, height: 24 }} strokeWidth={3} />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">
          ¡Solicitud enviada!
        </h2>
        <p className="mt-2.5 text-[14px] leading-relaxed text-[#555]">
          Recibimos tu solicitud. Un implementador verificado te va a contactar
          en las próximas 24 horas hábiles.
        </p>

        <div className="mt-7 rounded-[10px] bg-[#f5f5f5] p-5 text-left">
          <p className="mb-3.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#999]">
            ¿Qué sigue?
          </p>
          <ol className="flex flex-col gap-3.5">
            {STEPS.map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e5e5e5] text-[12px] font-semibold text-[#555]">
                  {i + 1}
                </span>
                <span className="text-[13px] leading-relaxed text-[#333]">
                  {t}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mx-auto mt-7 flex max-w-[360px] flex-col gap-2.5">
          <Link
            to="/projects"
            className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-foreground text-[14px] font-semibold text-background hover:bg-foreground/90"
          >
            Ver mis proyectos →
          </Link>
          <Link
            to="/solutions"
            className="inline-flex h-11 w-full items-center justify-center rounded-[10px] border border-border bg-background text-[14px] font-medium hover:bg-muted"
          >
            Explorar más soluciones
          </Link>
        </div>
      </main>
    </div>
  );
}
