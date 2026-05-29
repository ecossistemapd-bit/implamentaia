/**
 * Definición de los 3 planes de Implementa AI.
 * Hardcoded a propósito: cambios requieren PR + deploy (más seguro que tabla editable).
 */

export type PlanKey = "starter" | "pro" | "enterprise";

export type PlanFeatureKey =
  | "academia" // /cursos
  | "comunidad" // (externa, se muestra info)
  | "builder" // /builder
  | "catalogo" // /solutions
  | "mentorias" // /mentoria
  | "eventos"; // (cantidad de ingresos; redención afuera)

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  tagline: string;
  priceUsd: number;
  bestSeller?: boolean;
  features: Record<PlanFeatureKey, boolean>;
  /** Cantidades por feature (0 = no incluido) */
  quotas: {
    eventTickets: number;
    mentorshipTicketsPerMonth: number;
  };
};

export const PLANS: Record<PlanKey, PlanDefinition> = {
  starter: {
    key: "starter",
    name: "Starter",
    tagline: "Para quien quiere aprender y empezar a construir con IA",
    priceUsd: 2500,
    features: {
      academia: true,
      comunidad: true,
      builder: true,
      catalogo: false,
      mentorias: false,
      eventos: false,
    },
    quotas: {
      eventTickets: 0,
      mentorshipTicketsPerMonth: 0,
    },
  },
  pro: {
    key: "pro",
    name: "Pro",
    tagline: "La solución completa para escalar tu negocio sin un departamento técnico",
    priceUsd: 9000,
    bestSeller: true,
    features: {
      academia: true,
      comunidad: true,
      builder: true,
      catalogo: true,
      mentorias: false,
      eventos: true,
    },
    quotas: {
      eventTickets: 2,
      mentorshipTicketsPerMonth: 0,
    },
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    tagline: "Para quien quiere un departamento de IA completo dentro de su empresa",
    priceUsd: 15000,
    features: {
      academia: true,
      comunidad: true,
      builder: true,
      catalogo: true,
      mentorias: true,
      eventos: true,
    },
    quotas: {
      eventTickets: 4,
      mentorshipTicketsPerMonth: 40,
    },
  },
};

export const PLAN_ORDER: PlanKey[] = ["starter", "pro", "enterprise"];

export const PLAN_LABEL: Record<PlanKey, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

/**
 * Cuál es el plan mínimo que tiene una feature determinada.
 * Útil para el copy del Paywall ("Disponible en plan X o superior").
 */
export function minPlanForFeature(feature: PlanFeatureKey): PlanKey | null {
  for (const key of PLAN_ORDER) {
    if (PLANS[key].features[feature]) return key;
  }
  return null;
}
