import { type ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { minPlanForFeature, PLANS, type PlanFeatureKey } from "@/lib/plans";
import { usePlan } from "@/hooks/use-plan";

type Props = {
  feature: PlanFeatureKey;
  /** Contenido que se muestra blureado debajo del overlay. Puede ser la página entera. */
  children: ReactNode;
};

/**
 * Si el usuario no tiene la feature, renderiza `children` blureado con un overlay
 * que invita a mejorar de plan. Si la tiene, renderiza `children` normal.
 */
export function Paywall({ feature, children }: Props) {
  const { loading, hasFeature } = usePlan();

  if (loading) return <>{children}</>;
  if (hasFeature(feature)) return <>{children}</>;

  const minPlan = minPlanForFeature(feature);
  const planDef = minPlan ? PLANS[minPlan] : null;

  return (
    <div className="relative">
      <div
        className="pointer-events-none select-none"
        style={{ filter: "blur(8px) saturate(0.7)", opacity: 0.45 }}
      >
        {children}
      </div>

      {/* Overlay fixed: el CTA queda arriba de la viewport, siempre visible
       * incluso al scrollear la página blureada de fondo.
       * lg:left-[220px] respeta el sidebar autenticado. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 bottom-0 z-10 flex items-start justify-center px-6 pt-16 md:pt-20 lg:left-[220px]">
        <div className="app-card pointer-events-auto relative max-w-md p-8 text-center shadow-2xl shadow-black/40">
          <div
            className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              background: "var(--violet-pill-bg)",
              border: "1px solid var(--violet-border-hover)",
            }}
          >
            <Lock className="h-6 w-6" style={{ color: "var(--violet-text)" }} />
          </div>

          <h3 className="mt-5 text-[22px] font-semibold tracking-tight text-foreground">
            Función disponible en plan {planDef?.name ?? "superior"}
          </h3>

          {planDef && (
            <p className="page-subtitle mt-2 text-[14px]">{planDef.tagline}</p>
          )}

          <a
            href="https://implementaia.com/planes"
            target="_blank"
            rel="noopener noreferrer"
            className="app-cta-primary mt-6 inline-flex"
          >
            <Sparkles className="h-4 w-4" />
            Mejorá tu plan
          </a>

          {planDef && (
            <div className="mt-3 text-[12px] text-muted-foreground tabular-nums">
              Desde USD {planDef.priceUsd.toLocaleString("es-AR")} / año
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
