import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, BookOpen, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/cursos/")({
  component: CursosPage,
});

type Course = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
};

type ThumbStyle = {
  gradient: string;
  badge: string;
  initial: string;
  tagline: string;
};

const THUMB_BY_KEY: Record<string, ThumbStyle> = {
  lovable: {
    gradient: "from-purple-900 via-violet-800 to-zinc-900",
    badge: "bg-violet-500/20 text-violet-300 border-violet-500/40",
    initial: "L",
    tagline: "Formación Lovable",
  },
  claude: {
    gradient: "from-orange-900 via-amber-800 to-zinc-900",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    initial: "C",
    tagline: "Formación Claude",
  },
  n8n: {
    gradient: "from-green-900 via-emerald-800 to-zinc-900",
    badge: "bg-green-500/20 text-emerald-300 border-green-500/40",
    initial: "n8n",
    tagline: "Formación n8n",
  },
  default: {
    gradient: "from-violet-900 via-sky-900 to-zinc-900",
    badge: "bg-violet-500/20 text-violet-300 border-violet-500/40",
    initial: "AI",
    tagline: "Formación IA",
  },
};

function thumbFor(c: { title: string; category?: string | null }): ThumbStyle {
  const t = c.title.toLowerCase();
  if (t.includes("lovable")) return THUMB_BY_KEY.lovable;
  if (t.includes("claude")) return THUMB_BY_KEY.claude;
  if (t.includes("n8n")) return THUMB_BY_KEY.n8n;
  return THUMB_BY_KEY.default;
}

const FILTERS = ["Todos", "No-Code", "IA", "Automatización"] as const;
type Filter = (typeof FILTERS)[number];

const COMING_SOON = [
  { title: "ChatGPT para Negocios", category: "IA", gradient: "from-green-900 via-teal-800 to-zinc-900" },
  { title: "Make (Integromat)", category: "Automatización", gradient: "from-fuchsia-900 via-purple-800 to-zinc-900" },
  { title: "WhatsApp Business API", category: "Automatización", gradient: "from-green-900 via-lime-800 to-zinc-900" },
  { title: "Meta Ads con IA", category: "Marketing", gradient: "from-blue-900 via-indigo-800 to-zinc-900" },
];

function categoryMatches(filter: Filter, cat: string | null) {
  if (filter === "Todos") return true;
  if (!cat) return false;
  const c = cat.toLowerCase();
  if (filter === "No-Code") return c.includes("no-code") || c.includes("nocode");
  if (filter === "IA") return c.includes("ia") || c.includes("inteligencia") || c.includes("ai");
  if (filter === "Automatización") return c.includes("autom");
  return false;
}

function Thumbnail({
  style,
  size = "md",
  locked = false,
}: {
  style: ThumbStyle;
  size?: "md" | "lg";
  locked?: boolean;
}) {
  return (
    <div className={`course-card-gradient relative w-full overflow-hidden ${size === "lg" ? "aspect-[16/10]" : "aspect-video"} bg-gradient-to-br ${style.gradient}`}>
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage:
          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15) 0, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0, transparent 40%)",
      }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <div className={`flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 font-bold ${size === "lg" ? "h-24 w-24 text-5xl" : "h-16 w-16 text-3xl"}`}>
          {style.initial}
        </div>
        <div className={`mt-3 font-semibold tracking-tight ${size === "lg" ? "text-2xl" : "text-base"}`}>
          {style.tagline}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm">
          <Lock className="h-8 w-8 text-zinc-300" />
        </div>
      )}
    </div>
  );
}

function CursosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("Todos");
  const [query, setQuery] = useState("");

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses" as never)
        .select("*")
        .eq("is_published", true)
        .order("order_index");
      if (error) throw error;
      return data as Course[];
    },
  });

  const { data: progressMap } = useQuery({
    queryKey: ["courses-progress", user?.id],
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
      const map: Record<string, { total: number; done: number }> = {};
      mods.forEach((m) => {
        if (!map[m.course_id]) map[m.course_id] = { total: 0, done: 0 };
        map[m.course_id].total += 1;
        if (completedSet.has(m.id)) map[m.course_id].done += 1;
      });
      return map;
    },
  });

  const filtered = useMemo(() => {
    return (courses ?? []).filter((c) => {
      if (!categoryMatches(filter, c.category)) return false;
      if (query && !`${c.title} ${c.description ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [courses, filter, query]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  const goCourse = (id: string) => navigate({ to: "/cursos/$courseId", params: { courseId: id } });

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-zinc-100">
          Cursos de <span className="text-violet-400">IA</span>
        </h1>
        <p className="mt-2 text-zinc-400">
          Capacitación práctica en las herramientas que usan los mejores implementadores.
        </p>

        <div className="relative mt-6">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cursos..."
            className="w-full rounded-md py-3 pl-11 pr-4 outline-none transition-colors duration-200"
            style={{
              backgroundColor: "#1C2333",
              border: "1px solid rgba(201,168,76,0.12)",
              color: "#E8EDF5",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.12)")}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="rounded-full px-4 py-1.5 text-sm transition-all duration-200"
                style={{
                  backgroundColor: active ? "rgba(201,168,76,0.15)" : "#1C2333",
                  border: active ? "1px solid #C9A84C" : "1px solid rgba(255,255,255,0.08)",
                  color: active ? "#C9A84C" : "#A0AABF",
                  fontWeight: active ? 600 : 500,
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured */}
      {featured && (
        <section className="mt-10">
          <div className="mb-3 flex items-center gap-3 border-l-4 border-violet-500 pl-3">
            <h2 className="text-xl font-semibold text-zinc-100">Destacado</h2>
          </div>
          <FeaturedCard
            course={featured}
            progress={progressMap?.[featured.id] ?? { total: 0, done: 0 }}
            onClick={() => goCourse(featured.id)}
          />
        </section>
      )}

      {/* Tools grid */}
      {rest.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-center gap-3 border-l-4 border-violet-500 pl-3">
            <h2 className="text-xl font-semibold text-zinc-100">Herramientas de IA</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                progress={progressMap?.[c.id] ?? { total: 0, done: 0 }}
                onClick={() => goCourse(c.id)}
              />
            ))}
          </div>
        </section>
      )}

      {filtered.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center text-zinc-400">
          No encontramos cursos con esos filtros.
        </div>
      )}

      {/* Coming soon */}
      <section className="mt-14">
        <div className="mb-4 flex items-center gap-3 border-l-4 border-violet-500 pl-3">
          <h2 className="text-xl font-semibold text-zinc-100">Próximamente</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {COMING_SOON.map((c) => (
            <div
              key={c.title}
              className="overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/60"
            >
              <Thumbnail
                style={{
                  gradient: c.gradient,
                  badge: "",
                  initial: "AI",
                  tagline: c.title,
                }}
                locked
              />
              <div className="p-4">
                <span className="inline-block rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-amber-300">
                  MUY PRONTO
                </span>
                <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-zinc-100">{c.title}</h3>
                <p className="mt-1 text-xs text-zinc-600">Disponible próximamente</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function levelBadgeClass(level: string | null) {
  const l = (level ?? "").toLowerCase();
  if (l.includes("avanz")) return "bg-rose-500/20 text-rose-300 border-rose-500/40";
  if (l.includes("interm")) return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  return "bg-green-500/20 text-emerald-300 border-green-500/40";
}

function CourseCard({
  course,
  progress,
  onClick,
}: {
  course: Course;
  progress: { total: number; done: number };
  onClick: () => void;
}) {
  const style = thumbFor(course);
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const inProgress = progress.done > 0;
  const hasModules = progress.total > 0;

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/80 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/50 hover:shadow-2xl hover:shadow-black/50"
    >
      <div className="relative overflow-hidden">
        <div className="transition-transform duration-200 group-hover:scale-[1.03]">
          <Thumbnail style={style} />
        </div>
        <span className={`absolute left-3 top-3 rounded-md border px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm ${levelBadgeClass(course.level)}`}>
          {course.level ?? "Principiante"}
        </span>
        {inProgress && (
          <span className="absolute right-3 top-3 rounded-md border border-violet-500/50 bg-violet-500/30 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-teal-200 backdrop-blur-sm">
            EN PROGRESO
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-white">{course.title}</h3>

        <div className="mt-2 flex items-center gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Sé el primero
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            {hasModules ? `${progress.total} módulos` : "Próximamente"}
          </span>
        </div>

        {inProgress ? (
          <div className="mt-4">
            <div className="text-xs text-zinc-400">
              {progress.done} de {progress.total} módulos completados
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full bg-violet-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : (
          <div className="mt-4 h-1.5" />
        )}

        <div className="mt-4">
          {inProgress ? (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-violet-400">
              Continuar →
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors group-hover:border-violet-500/50 group-hover:text-violet-300">
              Ver curso →
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function FeaturedCard({
  course,
  progress,
  onClick,
}: {
  course: Course;
  progress: { total: number; done: number };
  onClick: () => void;
}) {
  const style = thumbFor(course);
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const inProgress = progress.done > 0;
  const hasModules = progress.total > 0;

  return (
    <div className={`overflow-hidden rounded-2xl border border-zinc-800/50 bg-gradient-to-br ${style.gradient} shadow-2xl shadow-black/40`}>
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Thumbnail style={style} size="lg" />
        </div>
        <div className="flex flex-col justify-center bg-zinc-900/70 p-8 backdrop-blur-sm lg:col-span-2">
          <div className="flex items-center gap-2">
            {course.category && (
              <span className="rounded-md border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-300">
                {course.category}
              </span>
            )}
            <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${levelBadgeClass(course.level)}`}>
              {course.level ?? "Principiante"}
            </span>
          </div>
          <h3 className="mt-3 text-3xl font-bold text-white">{course.title}</h3>
          {course.description && (
            <p className="mt-2 line-clamp-3 text-sm text-zinc-300">{course.description}</p>
          )}
          <div className="mt-4 flex items-center gap-5 text-sm text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Sé el primero
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              {hasModules ? `${progress.total} módulos` : "Próximamente"}
            </span>
          </div>

          {inProgress && (
            <div className="mt-5">
              <div className="text-xs text-zinc-400">
                {progress.done} de {progress.total} completados
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full bg-violet-400" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          <button
            onClick={onClick}
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-white text-black hover:bg-zinc-100"
          >
            <Sparkles className="h-4 w-4" />
            {inProgress ? "Continuar donde lo dejé" : "Comenzar curso"}
          </button>
        </div>
      </div>
    </div>
  );
}
