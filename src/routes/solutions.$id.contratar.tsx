import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronDown, FileText, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/solutions/$id/contratar")({
  component: ContratarPage,
});

const INCLUDED = [
  "Implementador dedicado a tu proyecto",
  "Análisis de tu negocio incluido",
  "Configuración completa end-to-end",
  "Integraciones con tus herramientas",
  "Capacitación a tu equipo",
  "Soporte post-implementación 30 días",
];

function ContratarPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [accepted, setAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [context, setContext] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user, email]);

  const { data: solution } = useQuery({
    queryKey: ["solution-contratar", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solutions")
        .select("id, title, category, slug")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const canSubmit =
    accepted && name.trim() && email.trim() && company.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    try {
      const sessionId =
        typeof window !== "undefined"
          ? localStorage.getItem(`builder_session_${id}`)
          : null;

      const { error } = await supabase.from("builder_projects").insert({
        user_id: user.id,
        source_solution_id: id,
        title: solution?.title ?? "Solicitud de implementación",
        type: "implementador",
        status: "pending",
        contact_name: name.trim(),
        contact_email: email.trim(),
        company_name: company.trim(),
        context_message: context.trim() || null,
        builder_session_id: sessionId || null,
      });
      if (error) throw error;

      if (sessionId) {
        await supabase
          .from("builder_sessions")
          .update({ status: "converted" })
          .eq("id", sessionId);
      }

      navigate({
        to: "/contratar/confirmacion",
        search: { solution: solution?.title ?? "", email: email.trim() },
      });
    } catch (e) {
      console.error(e);
      toast.error("Hubo un error. Intentá de nuevo.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
        <Logo />
        <Link
          to="/solutions/$id"
          params={{ id }}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver
        </Link>
      </header>

      <main className="mx-auto grid max-w-[1000px] gap-10 px-6 py-10 lg:grid-cols-[55fr_45fr]">
        {/* Left column */}
        <section className="order-2 lg:order-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Implementación profesional
          </p>
          <h1 className="mt-2 text-[2rem] font-bold leading-[1.2] tracking-tight">
            Conectate con tu
            <br />
            Implementador Verificado
          </h1>
          <p className="mt-3 max-w-[460px] text-[14px] leading-relaxed text-[#555]">
            Asignamos un especialista que configura esta solución en tu empresa
            de principio a fin. Vos solo acompañás el proceso.
          </p>

          {/* Resumen del pedido */}
          <div className="mt-8 rounded-[10px] border border-[#e5e5e5] bg-white p-5">
            <Badge
              variant="outline"
              className="rounded-full border-foreground/20 px-2.5 py-0.5 text-[10px] uppercase tracking-wider"
            >
              {solution?.category ?? "—"}
            </Badge>
            <div className="mt-1.5 text-[15px] font-semibold">
              {solution?.title ?? "Cargando…"}
            </div>
          </div>

          {/* Próximos pasos */}
          <div className="mt-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#999]">
              Próximos pasos
            </p>
            <ol className="relative mt-4 space-y-5 border-l border-border pl-6">
              <Step
                num="01"
                badge="AHORA"
                active
                title="Confirmá la solicitud"
                desc="Enviá tu solicitud. Sin pago por adelantado hasta acordar el alcance."
              />
              <Step
                num="02"
                title="Contacto en 24 horas"
                desc="El implementador asignado te escribe para alinear detalles, plazos y presupuesto final."
              />
              <Step
                num="03"
                title="Implementación y entrega"
                desc="El implementador configura todo y te entrega la solución funcionando. Con soporte incluido."
              />
            </ol>
          </div>

          {/* Incluido */}
          <div className="mt-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#999]">
              Incluido en el servicio
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {INCLUDED.map((it) => (
                <div key={it} className="flex items-start gap-2 text-[13px]">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  <span>{it}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right column — checkout card */}
        <aside className="order-1 lg:order-2">
          <div className="rounded-[14px] border-[1.5px] border-[#e5e5e5] bg-white p-6 lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold">Resumen</div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                🔒 Solicitud gratuita
              </span>
            </div>

            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#999]">
                Inversión estimada
              </p>
              <div className="mt-1 text-[28px] font-bold leading-tight">
                Desde $500 USD
              </div>
              <p className="mt-1 text-[12px] text-[#666]">
                El precio final se acuerda con el implementador según el
                alcance de tu proyecto.
              </p>
            </div>

            <div className="my-4 h-px bg-border" />

            {/* Términos */}
            <button
              type="button"
              onClick={() => setShowTerms((s) => !s)}
              className="flex w-full items-center justify-between text-[13px] font-medium"
            >
              <span className="inline-flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" /> Términos del servicio
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showTerms ? "rotate-180" : ""
                }`}
              />
            </button>
            {showTerms && (
              <div className="mt-2 max-h-[140px] overflow-y-auto rounded-lg bg-[#f9f9f9] p-3 text-[12px] leading-relaxed text-[#555]">
                <p>
                  • Implementa AI actúa como intermediaria entre la empresa y
                  el implementador independiente.
                  <br />• El pago se realiza en garantía (escrow) hasta la
                  confirmación de entrega por ambas partes.
                  <br />• Tenés 5 días hábiles para validar la entrega una vez
                  completada.
                  <br />• El silencio tras ese plazo se considera aceptación.
                  <br />• Los implementadores son profesionales verificados por
                  Implementa AI.
                  <br />• Implementa AI no garantiza resultados específicos
                  pero actúa con diligencia en la selección de los socios.
                </p>
              </div>
            )}

            <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px]">
              <Checkbox
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
                className="mt-0.5"
              />
              <span>Leí y acepto los Términos del Servicio</span>
            </label>

            <div className="mt-3.5 space-y-2.5">
              <Field label="Tu nombre completo">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-lg border-[1.5px] border-[#e5e5e5] text-[13px]"
                />
              </Field>
              <Field label="Email de contacto">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-lg border-[1.5px] border-[#e5e5e5] text-[13px]"
                />
              </Field>
              <Field label="Nombre de tu empresa">
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-10 rounded-lg border-[1.5px] border-[#e5e5e5] text-[13px]"
                />
              </Field>
              <Field label="¿Qué querés lograr con esta implementación?">
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={3}
                  placeholder="Contanos brevemente tu situación actual y qué resultado esperás..."
                  className="rounded-lg border-[1.5px] border-[#e5e5e5] text-[13px]"
                />
              </Field>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="mt-5 h-12 w-full rounded-[10px] bg-foreground text-[15px] font-semibold text-background hover:bg-foreground/90 disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando
                  solicitud...
                </>
              ) : (
                <>Solicitar Implementador →</>
              )}
            </Button>

            <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[11px] text-[#999]">
              <Lock className="h-3 w-3" /> Sin pago por adelantado · Tu
              información está protegida
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-[12px] font-medium text-[#555]">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Step({
  num,
  badge,
  active,
  title,
  desc,
}: {
  num: string;
  badge?: string;
  active?: boolean;
  title: string;
  desc: string;
}) {
  return (
    <li className="relative">
      <span
        className={`absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
          active
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {num}
      </span>
      <div className="flex items-center gap-2">
        <h3 className="text-[14px] font-semibold">{title}</h3>
        {badge && (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-[#666]">{desc}</p>
    </li>
  );
}
