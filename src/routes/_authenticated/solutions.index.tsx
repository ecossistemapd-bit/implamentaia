import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import * as Lucide from "lucide-react";
import { Search, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { CATEGORIES, DIFFICULTY_LABEL, type CategoryKey, type Difficulty } from "@/lib/categories";

// Icono distintivo por tarjeta: primero el icon_name de la solución (si es
// un icono lucide válido), si no el icono de su categoría, y como último
// recurso Sparkles. Así las 90+ tarjetas se diferencian visualmente.
function resolveCardIcon(iconName: string | null | undefined, category: string): LucideIcon {
  if (iconName) {
    const byName = (Lucide as unknown as Record<string, LucideIcon>)[iconName];
    if (byName) return byName;
  }
  const cat = CATEGORIES.find((c) => c.key === category);
  return cat?.icon ?? Lucide.Sparkles;
}

// Paleta por categoría — un color por familia para diferenciar de un
// vistazo (en vez de la misma imagen "planeta" violeta en todas).
const CAT_COLOR: Record<string, string> = {
  ventas: "#34D399",
  marketing: "#FB923C",
  atencion: "#38BDF8",
  finanzas: "#2DD4BF",
  operaciones: "#94A3B8",
  rrhh: "#F472B6",
  modelos_ia: "#C9A84C",
  juridico: "#818CF8",
  default: "#C9A84C",
};
function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

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
  const railRef = useRef<HTMLDivElement>(null);
  const scrollRail = (dir: number) => {
    const el = railRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + 16 : 356; // ancho tarjeta + gap
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["solutions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solutions")
        .select("*")
        .order("featured", { ascending: false })
        .order("category")
        .order("title");
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
        <h1 className="text-xl font-semibold tracking-tight text-white">Soluciones</h1>
        <p className="mt-1 text-sm text-zinc-500">
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
            className="h-10 pl-9 text-sm"
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

      {(() => {
        const renderCard = (s: NonNullable<typeof data>[number]) => {
          const Icon = resolveCardIcon(s.icon_name, s.category);
          const cc = CAT_COLOR[s.category] ?? CAT_COLOR.default;
          const linkProps = { to: "/solutions/$id" as const, params: { id: s.id } };
          const completed = progressBySolution[s.id] ?? 0;
          const pct = Math.min(100, (completed / 5) * 100);
          const isDone = completed >= 5;
          const catColor = CATEGORY_COLOR[s.category as CategoryKey] ?? CATEGORY_COLOR.default;
          const diffColor = DIFFICULTY_COLOR[s.difficulty as Difficulty];
          const inDev = (s as { status?: string }).status === "en_desarrollo";
          const showProgress = !isDone && !inDev && completed > 0;
          const ctaLabel = isDone ? null : completed > 0 ? "Continuar →" : "Comenzar →";
          return (
            <Link
              key={s.id}
              {...linkProps}
              className={`group relative flex flex-col overflow-hidden transition-all duration-[250ms] ease-out ${inDev ? "opacity-75 hover:opacity-90" : ""}`}
              style={{
                backgroundColor: "#111827",
                border: "1px solid rgba(201,168,76,0.12)",
                borderRadius: "8px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)";
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(201,168,76,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(201,168,76,0.12)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                className="relative flex aspect-video w-full items-center justify-center overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${hexA(cc, inDev ? 0.06 : 0.13)} 0%, #0B0F19 72%)`,
                }}
              >
                <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1">
                  {isDone && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-400">
                      ✓ Completada
                    </span>
                  )}
                  {inDev && (
                    <span className="inline-flex items-center rounded-md bg-zinc-800/60 px-2 py-0.5 text-[10px] font-medium text-zinc-400 backdrop-blur">
                      Próximamente
                    </span>
                  )}
                </div>
                <div
                  className="flex h-[68px] w-[68px] items-center justify-center rounded-2xl transition-transform duration-300 ease-out group-hover:scale-110"
                  style={{
                    backgroundColor: hexA(cc, inDev ? 0.08 : 0.15),
                    border: `1px solid ${hexA(cc, inDev ? 0.18 : 0.34)}`,
                  }}
                >
                  <Icon
                    className="h-8 w-8"
                    strokeWidth={1.5}
                    style={{ color: inDev ? hexA(cc, 0.55) : cc }}
                  />
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
                  <span
                    className={catColor}
                    style={{
                      backgroundColor: hexA(cc, 0.1),
                      color: cc,
                      border: `1px solid ${hexA(cc, 0.28)}`,
                      borderRadius: "4px",
                    }}
                  >
                    {CATEGORIES.find((c) => c.key === s.category)?.label}
                  </span>
                  <span className={diffColor} style={DIFF_TAG_STYLE}>
                    {DIFFICULTY_LABEL[s.difficulty as Difficulty]}
                  </span>
                </div>
                {showProgress && ctaLabel && (
                  <div className="mt-3">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
                      <span>{completed} de 5 pasos</span>
                      <span className="font-medium text-violet-400">{ctaLabel}</span>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          );
        };

        const featured = (data ?? []).filter((s) => (s as { featured?: boolean }).featured);
        const showFeatured = cat === "all" && diff === "all" && !q && featured.length > 0;

        const knownCats = new Set(CATEGORIES.map((c) => c.key));
        const groupedByCat = CATEGORIES.map((c) => ({
          cat: c,
          items: filtered.filter((s) => s.category === c.key),
        })).filter((g) => g.items.length > 0);
        const otherItems = filtered.filter(
          (s) => !knownCats.has(s.category as CategoryKey),
        );

        return (
          <>
            {showFeatured && !isLoading && (
              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                      Más Implementadas
                    </h2>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                      {featured.length}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        scrollRail(-1);
                      }}
                      aria-label="Anterior"
                      className="grid h-9 w-9 place-items-center rounded-full text-lg leading-none text-zinc-300 transition hover:bg-[#262f44] hover:text-white"
                      style={{
                        backgroundColor: "#1C2333",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        scrollRail(1);
                      }}
                      aria-label="Siguiente"
                      className="grid h-9 w-9 place-items-center rounded-full text-lg leading-none text-zinc-300 transition hover:bg-[#262f44] hover:text-white"
                      style={{
                        backgroundColor: "#1C2333",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      ›
                    </button>
                  </div>
                </div>
                <div
                  ref={railRef}
                  className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {featured.map((s) => (
                    <div
                      key={s.id}
                      className="w-[300px] shrink-0 snap-start sm:w-[340px]"
                    >
                      {renderCard(s)}
                    </div>
                  ))}
                </div>
                <div className="my-8 h-px w-full bg-zinc-800" />
              </section>
            )}

            {isLoading ? (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[200px] animate-pulse rounded-xl bg-zinc-900"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center">
                <p className="text-sm text-zinc-400">
                  No encontramos soluciones con esos filtros.
                </p>
              </div>
            ) : (
              <div className="mt-8 space-y-12">
                {groupedByCat.map(({ cat: c, items }) => {
                  const CIcon = c.icon;
                  return (
                    <section key={c.key}>
                      <div className="mb-4 flex items-center gap-3">
                        <div
                          className="grid h-9 w-9 place-items-center rounded-lg"
                          style={{
                            backgroundColor: "rgba(201,168,76,0.1)",
                            border: "1px solid rgba(201,168,76,0.25)",
                          }}
                        >
                          <CIcon
                            className="h-4 w-4"
                            style={{ color: "#C9A84C" }}
                            strokeWidth={1.5}
                          />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                          {c.label}
                        </h2>
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                          {items.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map(renderCard)}
                      </div>
                    </section>
                  );
                })}
                {otherItems.length > 0 && (
                  <section>
                    <div className="mb-4 flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-white">Otras</h2>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                        {otherItems.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {otherItems.map(renderCard)}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        );
      })()}


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

const CAT_TAG = "rounded text-[11px] font-semibold px-2 py-0.5";
const CATEGORY_COLOR: Record<string, string> = {
  ventas: CAT_TAG,
  marketing: CAT_TAG,
  atencion: CAT_TAG,
  finanzas: CAT_TAG,
  operaciones: CAT_TAG,
  rrhh: CAT_TAG,
  default: CAT_TAG,
};
const DIFF_TAG = "rounded text-[11px] font-semibold px-2 py-0.5";
const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  principiante: DIFF_TAG,
  intermedio: DIFF_TAG,
  avanzado: DIFF_TAG,
};
const DIFF_TAG_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(59,130,246,0.1)",
  color: "#3B82F6",
  border: "1px solid rgba(59,130,246,0.25)",
  borderRadius: "4px",
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
      className="h-8 rounded-full px-3.5 text-xs transition-all duration-200"
      style={{
        backgroundColor: active ? "rgba(201,168,76,0.15)" : "#1C2333",
        border: active ? "1px solid #C9A84C" : "1px solid rgba(255,255,255,0.08)",
        color: active ? "#C9A84C" : "#A0AABF",
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  );
}
