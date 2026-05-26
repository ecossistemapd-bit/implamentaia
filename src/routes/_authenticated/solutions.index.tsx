import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Search, LayoutGrid, Rows3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { CATEGORIES, DIFFICULTY_LABEL, type CategoryKey, type Difficulty } from "@/lib/categories";

// Cards premium estilo Apple: portada (cover_image_url) o placeholder
// monocromo con el monograma "IA". Cero color por categoría / íconos AI.

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
  const [viewMode, setViewMode] = useState<"carousel" | "grid">(() => {
    if (typeof window === "undefined") return "carousel";
    return localStorage.getItem("solutions-view-mode") === "grid" ? "grid" : "carousel";
  });

  const changeViewMode = (m: "carousel" | "grid") => {
    setViewMode(m);
    if (typeof window !== "undefined") localStorage.setItem("solutions-view-mode", m);
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
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Soluciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={diff === "all"} onClick={() => setDiff("all")}>Toda dificultad</FilterChip>
            {(["principiante","intermedio","avanzado"] as Difficulty[]).map((d) => (
              <FilterChip key={d} active={diff === d} onClick={() => setDiff(d)}>
                {DIFFICULTY_LABEL[d]}
              </FilterChip>
            ))}
          </div>
          <ViewModeToggle mode={viewMode} onChange={changeViewMode} />
        </div>
      </div>

      {(() => {
        const renderCard = (s: NonNullable<typeof data>[number]) => {
          const linkProps = { to: "/solutions/$id" as const, params: { id: s.id } };
          const completed = progressBySolution[s.id] ?? 0;
          const pct = Math.min(100, (completed / 5) * 100);
          const isDone = completed >= 5;
          const inDev = (s as { status?: string }).status === "en_desarrollo";
          const showProgress = !isDone && !inDev && completed > 0;
          const cover = (s as { cover_image_url?: string | null }).cover_image_url;
          return (
            <Link
              key={s.id}
              {...linkProps}
              className={`premium-card group relative flex cursor-pointer flex-col overflow-hidden ${
                inDev ? "opacity-70" : ""
              }`}
            >
              <div className="relative aspect-video w-full overflow-hidden">
                <div className="absolute right-3 top-3 z-10">
                  {isDone && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
                      ✓ Completada
                    </span>
                  )}
                  {inDev && (
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Próximamente
                    </span>
                  )}
                </div>
                {cover ? (
                  <img
                    src={cover}
                    alt={s.title}
                    loading="lazy"
                    className="card-orb-alive h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="card-orb-alive relative flex h-full w-full items-center justify-center"
                    style={{
                      background:
                        "radial-gradient(120% 120% at 50% 30%, var(--secondary) 0%, var(--card) 72%)",
                    }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(55% 50% at 50% 42%, rgba(99,108,150,0.10), transparent 70%)",
                      }}
                    />
                    <svg
                      viewBox="0 0 64 64"
                      className="h-10 w-auto text-foreground opacity-[0.14]"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M4 58 L13 58 L33 8 L29 4 Z" />
                      <path d="M60 58 L51 58 L35 8 L31 4 Z" />
                      <path d="M22 58 L30 58 L40 30 L36 26 Z" />
                      <path d="M50 58 L42 58 L40 30 L44 26 Z" />
                      <path d="M32 0 L37 11 L32 22 L27 11 Z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {CATEGORIES.find((c) => c.key === s.category)?.label}
                </span>
                <h3 className="mt-2.5 line-clamp-1 text-[15px] font-semibold leading-tight text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                  {s.short_description}
                </p>
                <div className="mt-auto">
                  <div className="my-4 h-px w-full bg-border" />
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">
                      {DIFFICULTY_LABEL[s.difficulty as Difficulty]}
                    </span>
                    {isDone ? (
                      <span className="font-medium text-muted-foreground">
                        Completada
                      </span>
                    ) : (
                      <span className="font-semibold text-foreground">
                        {completed > 0 ? "Continuar" : "Ver solución"} →
                      </span>
                    )}
                  </div>
                  {showProgress && (
                    <div className="mt-3">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-foreground transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1.5 text-[11px] text-muted-foreground">
                        {completed} de 5 pasos
                      </div>
                    </div>
                  )}
                </div>
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
            {viewMode === "carousel" && showFeatured && !isLoading && (
              <div className="mt-6">
                <CardRail
                  header={
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                        Más Implementadas
                      </h2>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {featured.length}
                      </span>
                    </div>
                  }
                >
                  {featured.map((s) => (
                    <div
                      key={s.id}
                      className="w-[300px] shrink-0 snap-start sm:w-[340px]"
                    >
                      {renderCard(s)}
                    </div>
                  ))}
                </CardRail>
                <div className="my-8 h-px w-full bg-border" />
              </div>
            )}

            {isLoading ? (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[200px] animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-border bg-card p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No encontramos soluciones con esos filtros.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="mt-8 space-y-12">
                {/* Más Implementadas — siempre arriba si no hay filtros activos */}
                {showFeatured && (
                  <section>
                    <div className="mb-4 flex items-center gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                        Más Implementadas
                      </h2>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {featured.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {featured.map((s) => renderCard(s))}
                    </div>
                    <div className="mt-12 h-px w-full bg-border" />
                  </section>
                )}
                {/* Cada categoría con header + grid de 3 cols */}
                {groupedByCat.map(({ cat: c, items }) => {
                  const CIcon = c.icon;
                  return (
                    <section key={c.key}>
                      <div className="mb-4 flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-secondary">
                          <CIcon
                            className="h-4 w-4 text-muted-foreground"
                            strokeWidth={1.5}
                          />
                        </div>
                        <h2 className="text-lg font-semibold text-foreground">
                          {c.label}
                        </h2>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {items.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((s) => renderCard(s))}
                      </div>
                    </section>
                  );
                })}
                {/* Otras (categorías huérfanas) */}
                {otherItems.length > 0 && (
                  <section>
                    <div className="mb-4 flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-foreground">
                        Otras
                      </h2>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {otherItems.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {otherItems.map((s) => renderCard(s))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="mt-8 space-y-12">
                {groupedByCat.map(({ cat: c, items }) => {
                  const CIcon = c.icon;
                  return (
                    <CardRail
                      key={c.key}
                      header={
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-secondary">
                            <CIcon
                              className="h-4 w-4 text-muted-foreground"
                              strokeWidth={1.5}
                            />
                          </div>
                          <h2 className="text-lg font-semibold text-foreground">
                            {c.label}
                          </h2>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {items.length}
                          </span>
                        </div>
                      }
                    >
                      {items.map((s) => (
                        <div
                          key={s.id}
                          className="w-[300px] shrink-0 snap-start sm:w-[340px]"
                        >
                          {renderCard(s)}
                        </div>
                      ))}
                    </CardRail>
                  );
                })}
                {otherItems.length > 0 && (
                  <CardRail
                    header={
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-foreground">
                          Otras
                        </h2>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {otherItems.length}
                        </span>
                      </div>
                    }
                  >
                    {otherItems.map((s) => (
                      <div
                        key={s.id}
                        className="w-[300px] shrink-0 snap-start sm:w-[340px]"
                      >
                        {renderCard(s)}
                      </div>
                    ))}
                  </CardRail>
                )}
              </div>
            )}
          </>
        );
      })()}


      {/* Coming soon */}
      <section className="mt-12">
        <div className="mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Próximamente
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {comingSoon.map((c) => (
            <div
              key={c.label}
              className="flex min-h-[120px] flex-col rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2 text-foreground">
                <span className="text-base">{c.icon}</span>
                <h3 className="text-sm font-medium">{c.label}</h3>
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

// Riel horizontal reutilizable: cada sección (Más Implementadas, cada
// categoría, Otras) es un carrusel con su propio ref y botones ‹ ›.
function CardRail({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + 16 : 356; // ancho tarjeta + gap
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">{header}</div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              scroll(-1);
            }}
            aria-label="Anterior"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-secondary text-lg leading-none text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              scroll(1);
            }}
            aria-label="Siguiente"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-secondary text-lg leading-none text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            ›
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}


// Segmented control para alternar entre carrusel por categoría y grilla flat.
function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: "carousel" | "grid";
  onChange: (m: "carousel" | "grid") => void;
}) {
  const item =
    "flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors duration-150";
  // Usamos tint de foreground (10%) para que el pill activo sea visible
  // en LIGHT (foreground=dark) y en DARK (foreground=light). Cero raw hex.
  const active = "bg-foreground/10 text-foreground shadow-sm";
  const idle = "text-muted-foreground hover:text-foreground";
  return (
    <div
      role="tablist"
      aria-label="Vista de soluciones"
      className="inline-flex shrink-0 items-center rounded-full border border-border bg-secondary p-0.5"
    >
      <button
        role="tab"
        aria-selected={mode === "carousel"}
        onClick={() => onChange("carousel")}
        className={`${item} ${mode === "carousel" ? active : idle}`}
      >
        <Rows3 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Carrusel</span>
      </button>
      <button
        role="tab"
        aria-selected={mode === "grid"}
        onClick={() => onChange("grid")}
        className={`${item} ${mode === "grid" ? active : idle}`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Grilla</span>
      </button>
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
      className={`h-8 rounded-full border px-3.5 text-xs transition-all duration-200 ${
        active
          ? "border-primary bg-primary font-semibold text-primary-foreground"
          : "border-border bg-secondary font-medium text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
