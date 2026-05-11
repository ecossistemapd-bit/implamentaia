import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Logo } from "@/components/logo";
import { z } from "zod";

const search = z.object({
  solution: z.string().optional().default(""),
  email: z.string().optional().default(""),
});

export const Route = createFileRoute("/contratar/confirmacion")({
  validateSearch: search,
  component: ConfirmacionPage,
});

function ConfirmacionPage() {
  const { solution, email } = Route.useSearch();
  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <header className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-3">
        <Logo />
      </header>
      <main className="mx-auto max-w-[520px] px-6 pt-20 pb-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background">
          <Check className="h-7 w-7" strokeWidth={3} />
        </div>
        <h2 className="mt-5 text-2xl font-bold tracking-tight">
          ¡Solicitud enviada!
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-[#555]">
          Recibimos tu solicitud para implementar{" "}
          <span className="font-medium text-foreground">
            {solution || "tu solución"}
          </span>
          .
          <br />
          Un implementador verificado se va a comunicar con vos en las próximas
          24 horas hábiles
          {email ? (
            <>
              {" "}
              al email{" "}
              <span className="font-medium text-foreground">{email}</span>
            </>
          ) : null}
          .
        </p>

        <div className="mt-7 rounded-[10px] bg-[#f5f5f5] p-5 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#999]">
            ¿Qué sigue?
          </p>
          <ol className="mt-3 space-y-2.5 text-[13px]">
            {[
              "Revisamos tu solicitud y asignamos el mejor implementador para tu caso",
              "Te contactan para alinear alcance, plazos y presupuesto final",
              "Una vez acordado, comenzamos la implementación",
            ].map((t, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-7 flex flex-col gap-2.5">
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
