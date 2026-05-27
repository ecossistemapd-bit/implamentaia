import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES } from "@/lib/categories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CourseCarousel } from "@/components/capacitacion/CourseCarousel";
import type { CapacitacionCourse, CourseProgress } from "@/components/capacitacion/CourseCard";

export const Route = createFileRoute("/_authenticated/cursos/")({
  component: CapacitacionPage,
});

const SECTIONS = [
  { key: "herramientas", label: "Herramientas" },
  { key: "consejos", label: "Consejos y tutoriales" },
  { key: "detras_escena", label: "Detrás de escena" },
  { key: "dentro_de_poco", label: "Dentro de poco" },
] as const;

const FORMATS = ["Formación", "Tutorial"] as const;
const LEVELS = ["Principiante", "Intermedio", "Avanzado"] as const;

const STATUS = [
  { key: "all", label: "Todos los cursos" },
  { key: "in_progress", label: "En curso" },
  { key: "not_started", label: "No iniciado" },
  { key: "completed", label: "Completado" },
] as const;

type StatusKey = (typeof STATUS)[number]["key"];

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { key: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="h-10 w-full rounded-full border bg-card px-4 text-[13px] text-foreground transition-colors hover:bg-muted/30"
        style={{ borderColor: "var(--violet-pill-border)" }}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="border-border bg-popover text-popover-foreground">
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.key} value={o.key}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CapacitacionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [format, setFormat] = useState("all");
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState<StatusKey>("all");

  const { data: courses, isLoading } = useQuery({
    queryKey: ["capacitacion-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses" as never)
        .select(
          "id, title, description, category, level, thumbnail_url, instructor_name, format, section_key, student_count, coming_soon",
        )
        .eq("is_published", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as CapacitacionCourse[];
    },
  });

  const { data: progressMap } = useQuery({
    queryKey: ["capacitacion-progress", user?.id],
    enabled: !!user && !!courses,
    queryFn: async () => {
      const { data: modules } = await supabase
        .from("modules" as never)
        .select("id, course_id");
      const { data: progress } = await supabase
        .from("user_progress" as never)
        .select("module_id, completed")
        .eq("user_id", user!.id);
      const mods = (modules ?? []) as Array<{ id: string; course_id: string }>;
      const prog = (progress ?? []) as Array<{ module_id: string; completed: boolean }>;
      const completedSet = new Set(prog.filter((p) => p.completed).map((p) => p.module_id));
      const map: Record<string, CourseProgress> = {};
      mods.forEach((m) => {
        if (!map[m.course_id]) map[m.course_id] = { total: 0, done: 0 };
        map[m.course_id].total += 1;
        if (completedSet.has(m.id)) map[m.course_id].done += 1;
      });
      return map;
    },
  });

  const filtered = useMemo(() => {
    const list = courses ?? [];
    return list.filter((c) => {
      if (query) {
        const hay =
          `${c.title} ${c.description ?? ""} ${c.instructor_name ?? ""}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      if (area !== "all" && c.category !== area) return false;
      if (format !== "all" && c.format !== format) return false;
      if (level !== "all" && c.level !== level) return false;
      if (status !== "all") {
        const p = progressMap?.[c.id];
        const done = p?.done ?? 0;
        const total = p?.total ?? 0;
        if (status === "in_progress" && !(done > 0 && done < total)) return false;
        if (status === "not_started" && done !== 0) return false;
        if (status === "completed" && !(total > 0 && done === total)) return false;
      }
      return true;
    });
  }, [courses, query, area, format, level, status, progressMap]);

  const bySection = useMemo(() => {
    const map: Record<string, CapacitacionCourse[]> = {};
    SECTIONS.forEach((s) => (map[s.key] = []));
    filtered.forEach((c) => {
      const key = c.coming_soon ? "dentro_de_poco" : c.section_key || "herramientas";
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [filtered]);

  const goCourse = (id: string) =>
    navigate({ to: "/cursos/$courseId", params: { courseId: id } });

  const hasResults = filtered.length > 0;

  return (
    <div className="relative z-[1] mx-auto max-w-[1340px] px-8 py-8">
      {/* Header */}
      <div>
        <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground">
          Capacitación
        </h1>
        <p className="page-subtitle mt-3 max-w-[640px]">
          Aprendé las herramientas, procesos y prácticas que usan los mejores implementadores.
        </p>

        <div className="mt-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busque por nombre o descripción del curso"
              className="w-full rounded-full border bg-card py-2.5 pl-11 pr-4 text-[14px] text-foreground placeholder:text-muted-foreground outline-none transition-colors"
              style={{ borderColor: "var(--violet-pill-border)" }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--violet-border-hover)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--violet-pill-border)")
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <FilterSelect
              value={area}
              onChange={setArea}
              placeholder="Todas las áreas"
              options={CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
            />
            <FilterSelect
              value={format}
              onChange={setFormat}
              placeholder="Todos los formatos"
              options={FORMATS.map((f) => ({ key: f, label: f }))}
            />
            <FilterSelect
              value={level}
              onChange={setLevel}
              placeholder="Todos los niveles"
              options={LEVELS.map((l) => ({ key: l, label: l }))}
            />
            <FilterSelect
              value={status}
              onChange={(v) => setStatus(v as StatusKey)}
              placeholder="Todos los cursos"
              options={STATUS.filter((s) => s.key !== "all").map((s) => ({
                key: s.key,
                label: s.label,
              }))}
            />
          </div>
        </div>
      </div>

      <div
        className="my-8 h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--border) 20%, var(--border) 80%, transparent)",
        }}
      />

      {/* Loading skeleton */}
      {isLoading && (
        <section className="space-y-10">
          {[0, 1].map((row) => (
            <div key={row}>
              <div className="mb-5 h-7 w-48 animate-pulse rounded bg-muted" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="app-card overflow-hidden"
                  >
                    <div className="aspect-[3/4] animate-pulse bg-muted" />
                    <div className="space-y-2 p-5">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Sections */}
      {!isLoading && hasResults && (
        <div>
          {SECTIONS.map((s) => (
            <CourseCarousel
              key={s.key}
              title={s.label}
              courses={bySection[s.key] ?? []}
              progressMap={progressMap ?? {}}
              onCourseClick={goCourse}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !hasResults && (
        <div className="app-card mt-10 p-10 text-center text-muted-foreground">
          No encontramos cursos con esos filtros.
        </div>
      )}
    </div>
  );
}
