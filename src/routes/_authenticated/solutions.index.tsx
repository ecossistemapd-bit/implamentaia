import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, DIFFICULTY_LABEL, type CategoryKey, type Difficulty } from "@/lib/categories";
import { getLucideIcon } from "@/lib/icon";

export const Route = createFileRoute("/_authenticated/solutions/")({
  component: SolutionsList,
});

function SolutionsList() {
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
    <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Soluciones</h1>
        <p className="mt-2 text-muted-foreground">
          Implementaciones reales y listas para tu empresa.
        </p>
      </header>

      <div className="sticky top-0 z-10 mt-8 space-y-4 bg-background/80 py-4 backdrop-blur">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar soluciones..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={cat === "all"} onClick={() => setCat("all")}>
            Todas <span className="ml-1 opacity-60">({data?.length ?? 0})</span>
          </FilterChip>
          {visibleCategories.map((c) => (
            <FilterChip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>
              {c.label} <span className="ml-1 opacity-60">({counts[c.key]})</span>
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={diff === "all"} onClick={() => setDiff("all")} small>Toda dificultad</FilterChip>
          {(["principiante","intermedio","avanzado"] as Difficulty[]).map((d) => (
            <FilterChip key={d} active={diff === d} onClick={() => setDiff(d)} small>
              {DIFFICULTY_LABEL[d]}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
            ))
          : filtered.map((s) => {
              const Icon = getLucideIcon(s.icon_name);
              return (
                <Link
                  key={s.id}
                  to="/solutions/$id"
                  params={{ id: s.id }}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:shadow-sm"
                >
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                  <h3 className="mt-5 line-clamp-2 text-lg font-medium leading-snug">{s.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.short_description}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
                    <Badge variant="secondary">{CATEGORIES.find((c) => c.key === s.category)?.label}</Badge>
                    <Badge variant="outline">{DIFFICULTY_LABEL[s.difficulty as Difficulty]}</Badge>
                  </div>
                </Link>
              );
            })}
      </div>
      {!isLoading && filtered.length === 0 && (
        <div className="mt-12 rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No encontramos soluciones con esos filtros.</p>
        </div>
      )}

      {/* Coming soon */}
      <section className="mt-20">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Próximamente</h2>
          <p className="mt-1 text-sm text-muted-foreground">Más soluciones en camino.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {comingSoon.map((c) => (
            <div
              key={c.label}
              className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-neutral-950 p-6 text-neutral-100 dark:bg-neutral-900"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg">
                🔒
              </div>
              <h3 className="text-base font-medium">{c.label}</h3>
              <span className="mt-auto rounded-full border border-white/20 px-2 py-0.5 text-[11px] text-white/70">
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
  small,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 ${small ? "py-1 text-xs" : "py-1.5 text-sm"} transition ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
