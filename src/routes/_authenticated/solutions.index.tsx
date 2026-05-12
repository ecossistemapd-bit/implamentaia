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
  Route.useSearch();

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
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white">Soluciones de <span className="text-white">IA</span></h1>
        <p className="mt-1 text-sm text-zinc-400">
          Implementaciones reales y listas para tu empresa.
        </p>
      </header>

      <div className="sticky top-0 z-10 mt-4 space-y-3 bg-background/85 py-3 backdrop-blur">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar soluciones..."
            className="h-10 rounded-lg border-zinc-800 bg-zinc-900 pl-9 text-sm text-white placeholder:text-zinc-600"
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

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[200px] animate-pulse rounded-xl bg-zinc-900" />
            ))
          : filtered.map((s) => {
              const Icon = getLucideIcon(s.icon_name);
              const linkProps = { to: "/solutions/$id" as const, params: { id: s.id } };
              const completed = progressBySolution[s.id] ?? 0;
              const pct = Math.min(100, (completed / 5) * 100);
              const catColor = CATEGORY_COLOR[s.category as CategoryKey] ?? CATEGORY_COLOR.default;
              const diffColor = DIFFICULTY_COLOR[s.difficulty as Difficulty];
              return (
                <Link
                  key={s.id}
                  {...linkProps}
                  className="group flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition duration-200 hover:border-zinc-700"
                >
                  {/* Card header with icon */}
                  <div className="flex h-28 items-center justify-center bg-zinc-950">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
                      <Icon className="h-9 w-9 text-zinc-300" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-1 text-base font-semibold leading-tight text-white">
                      {s.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-snug text-zinc-400">
                      {s.short_description}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${catColor}`}>
                        {CATEGORIES.find((c) => c.key === s.category)?.label}
                      </span>
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${diffColor}`}>
                        {DIFFICULTY_LABEL[s.difficulty as Difficulty]}
                      </span>
                    </div>
                    {completed > 0 && (
                      <div className="mt-3">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-green-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-1.5 text-[11px] text-zinc-400">
                          {completed} de 5 pasos
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
      </div>
      {!isLoading && filtered.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center">
          <p className="text-sm text-zinc-400">No encontramos soluciones con esos filtros.</p>
        </div>
      )}

      {/* Coming soon */}
      <section className="mt-12">
        <div className="mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Próximamente
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {comingSoon.map((c) => (
            <div
              key={c.label}
              className="flex min-h-[120px] flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="text-base">{c.icon}</span>
                <h3 className="text-sm font-medium">{c.label}</h3>
              </div>
              <span className="mt-auto text-[11px] uppercase tracking-wider text-zinc-600">
                En desarrollo
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const CATEGORY_COLOR: Record<string, string> = {
  ventas: "border-zinc-700 bg-zinc-800 text-zinc-300",
  marketing: "border-zinc-700 bg-zinc-800 text-zinc-300",
  atencion: "border-zinc-700 bg-zinc-800 text-zinc-300",
  finanzas: "border-zinc-700 bg-zinc-800 text-zinc-300",
  operaciones: "border-zinc-700 bg-zinc-800 text-zinc-300",
  rrhh: "border-zinc-700 bg-zinc-800 text-zinc-300",
  default: "border-zinc-700 bg-zinc-800 text-zinc-300",
};

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  principiante: "border-zinc-700 bg-zinc-800 text-zinc-300",
  intermedio: "border-zinc-700 bg-zinc-800 text-zinc-300",
  avanzado: "border-zinc-700 bg-zinc-800 text-zinc-300",
};

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
      className={`h-8 rounded-full border px-3.5 text-xs font-medium transition ${
        active
          ? "border-white bg-white text-black"
          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
