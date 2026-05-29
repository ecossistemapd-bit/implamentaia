import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PLANS, type PlanFeatureKey, type PlanKey } from "@/lib/plans";

type ProfilePlanRow = {
  plan_key: PlanKey;
  mentorship_tickets_remaining: number;
  mentorship_tickets_period_start: string;
};

export function usePlan() {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user-plan", user?.id],
    enabled: !!user && !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("plan_key, mentorship_tickets_remaining, mentorship_tickets_period_start")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfilePlanRow | null) ?? {
        plan_key: "starter" as PlanKey,
        mentorship_tickets_remaining: 0,
        mentorship_tickets_period_start: new Date().toISOString().slice(0, 10),
      };
    },
  });

  const planKey: PlanKey = data?.plan_key ?? "starter";
  const plan = PLANS[planKey];

  return {
    loading: authLoading || isLoading,
    planKey,
    plan,
    features: plan.features,
    quotas: plan.quotas,
    mentorshipTicketsRemaining: data?.mentorship_tickets_remaining ?? 0,
    mentorshipPeriodStart: data?.mentorship_tickets_period_start ?? null,
    hasFeature: (feature: PlanFeatureKey) => plan.features[feature],
  };
}
