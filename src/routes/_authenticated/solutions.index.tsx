import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { CATEGORIES, DIFFICULTY_LABEL, type CategoryKey, type Difficulty } from "@/lib/categories";
import { getLucideIcon } from "@/lib/icon";

type SolutionsSearch = { mode?: "builder" };

export const Route = createFileRoute("/_authenticated/solutions/")({
  validateSearch: (s: Record<string, unknown>): SolutionsSearch => ({
    mode: s.mode === "builder" ? "builder" : undefined,
  }),
  component: SolutionsList,
});

function SolutionsList() {
  const { mode } = Route.useSearch();
  const builderMode = mode === "builder";
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryKey | "all">("all");
  const [diff, setDiff] = useState<Difficulty | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["solutions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("solutions").select("*").order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: progressRows } = useQuery({
    queryKey: ["solutions-progress-all", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as never as typeof supabase)
        .from("solution_steps_progress" as never)
        .select("solution_id, completed")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as { solution_id: string; completed: boolean }[];
    },
  });

  const progressBySolution = useMemo(() => {
    const m: Record<string, number> = {};
    (progressRows ?? []).forEach((r) => {
      if (r.completed) m[r.solution_id] = (m[r.solution_id] ?? 0) + 1;
    });
    return m;
  }, [progressRows]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    (data ?? []).forEach((s) => { m[s.category] = (m[s.category] ?? 0) + 1; });
    return m;
  }, [data]);

  const visibleCategories = useMemo(
    () => CATEGORIES.filter((c) => (counts[c.key] ?? 0) > 0),
    [counts],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((s) => {
      if (cat !== "all" && s.category !== cat) return false;
      if (diff !== "all" && s.difficulty !== diff) return false;
      if (q && !`${s.title} ${s.short_description}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, q, cat, diff]);

  const comingSoon = [
    { label: "Operaciones y Logística", icon: "📦" },
    { label: "Legal y Contratos", icon: "⚖️" },
    { label: "E-commerce", icon: "🛒" },
    { label: "Educación", icon: "🎓" },
  ];

  return (
    <div className="mx-auto max-w-[960px] px-6 py-10">
      {builderMode && (
        <div className="mb-4 rounded-lg bg-foreground px-4 py-3 text-[13px] font-medium text-background">
          Elegí una solución para comenzar la implementación guiada →
        </div>
      )}
      <header>
        <h1 className="text-[1.5rem] font-semibold tracking-tight leading-tight">Soluciones</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Implementaciones reales y listas para tu empresa.
        </p>
      </header>

      <div className="sticky top-0 z-10 mt-4 space-y-3 bg-background/85 py-3 backdrop-blur">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar soluciones..."
            className="h-9 pl-9 text-[13px] rounded-lg"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={cat === "all"} onClick={() => setCat("all")}>
            Todas <span className="ml-1 opacity-60">({data?.length ?? 0})</span>
          </FilterChip>
          {visibleCategories.map((c) => (
            <FilterChip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>
              {c.label} <span className="ml-1 opacity-60">({counts[c.key]})</span>
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={diff === "all"} onClick={() => setDiff("all")}>Toda dificultad</FilterChip>
          {(["principiante","intermedio","avanzado"] as Difficulty[]).map((d) => (
            <FilterChip key={d} active={diff === d} onClick={() => setDiff(d)}>
              {DIFFICULTY_LABEL[d]}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[130px] animate-pulse rounded-[10px] bg-muted" />
            ))
          : filtered.map((s) => {
              const Icon = getLucideIcon(s.icon_name);
              const linkProps = builderMode
                ? { to: "/builder/$solutionId" as const, params: { solutionId: s.id } }
                : { to: "/solutions/$id" as const, params: { id: s.id } };
              return (
                <Link
                  key={s.id}
                  {...linkProps}
                  className="group flex min-h-[130px] flex-col rounded-[10px] border border-border bg-card p-4 transition hover:border-foreground"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                    <h3 className="line-clamp-1 text-[14px] font-semibold leading-tight">{s.title}</h3>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-muted-foreground">{s.short_description}</p>
                  <div className="mt-auto flex flex-wrap gap-1 pt-3">
                    <span className="rounded border border-border px-2 py-[2px] text-[11px] text-muted-foreground">
                      {CATEGORIES.find((c) => c.key === s.category)?.label}
                    </span>
                    <span className="rounded border border-border px-2 py-[2px] text-[11px] text-muted-foreground">
                      {DIFFICULTY_LABEL[s.difficulty as Difficulty]}
                    </span>
                  </div>
                </Link>
              );
            })}
      </div>
      {!isLoading && filtered.length === 0 && (
        <div className="mt-8 rounded-[10px] border border-dashed border-border p-10 text-center">
          <p className="text-[13px] text-muted-foreground">No encontramos soluciones con esos filtros.</p>
        </div>
      )}

      {/* Coming soon */}
      <section className="mt-12">
        <div className="mb-3">
          <h2 className="text-[14px] font-semibold tracking-tight text-muted-foreground">Próximamente</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {comingSoon.map((c) => (
            <div
              key={c.label}
              className="flex min-h-[130px] flex-col rounded-[10px] border border-border bg-muted/40 p-4"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-[16px]">🔒</span>
                <h3 className="text-[14px] font-medium text-foreground/80">{c.label}</h3>
              </div>
              <span className="mt-auto text-[11px] uppercase tracking-wider text-muted-foreground">
                En desarrollo
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-7 rounded-full border px-3 text-[12px] transition ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
