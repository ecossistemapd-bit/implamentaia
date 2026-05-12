import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Play, Users, BookOpen, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/cursos/$courseId")({
  component: CourseDetailPage,
});

type Course = { id: string; title: string; description: string | null; category: string | null; level: string | null };
type Module = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  order_index: number;
};

function thumbGradient(title: string) {
  const t = title.toLowerCase();
  if (t.includes("lovable")) return { gradient: "from-purple-900 via-violet-800 to-zinc-900", initial: "L" };
  if (t.includes("claude")) return { gradient: "from-orange-900 via-amber-800 to-zinc-900", initial: "C" };
  if (t.includes("n8n")) return { gradient: "from-green-900 via-emerald-800 to-zinc-900", initial: "n8n" };
  return { gradient: "from-teal-900 via-sky-900 to-zinc-900", initial: "AI" };
}

function levelClass(level: string | null) {
  const l = (level ?? "").toLowerCase();
  if (l.includes("avanz")) return "bg-rose-500/20 text-rose-300 border-rose-500/40";
  if (l.includes("interm")) return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
}

function CourseDetailPage() {
  const { courseId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses" as never)
        .select("id, title, description, category, level")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data as Course | null;
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["course-modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules" as never)
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as Module[];
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["course-progress", courseId, user?.id],
    enabled: !!user && !!modules,
    queryFn: async () => {
      const ids = (modules ?? []).map((m) => m.id);
      if (ids.length === 0) return {} as Record<string, boolean>;
      const { data } = await supabase
        .from("user_progress" as never)
        .select("module_id, completed")
        .eq("user_id", user!.id)
        .in("module_id", ids);
      const map: Record<string, boolean> = {};
      ((data ?? []) as Array<{ module_id: string; completed: boolean }>).forEach((p) => {
        map[p.module_id] = p.completed;
      });
      return map;
    },
  });

  useEffect(() => {
    if (!selectedId && modules && modules.length > 0) setSelectedId(modules[0].id);
  }, [modules, selectedId]);

  const selected = modules?.find((m) => m.id === selectedId) ?? null;
  const total = modules?.length ?? 0;
  const done = Object.values(progress ?? {}).filter(Boolean).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const selectedIdx = modules?.findIndex((m) => m.id === selectedId) ?? -1;
  const nextModule = selectedIdx >= 0 && modules ? modules[selectedIdx + 1] : null;
  const style = useMemo(() => thumbGradient(course?.title ?? ""), [course?.title]);

  const toggleComplete = async () => {
    if (!selected || !user) return;
    const isDone = !!progress?.[selected.id];
    await (supabase.from("user_progress" as never) as unknown as {
      upsert: (v: unknown, o: unknown) => Promise<unknown>;
    }).upsert(
      {
        user_id: user.id,
        module_id: selected.id,
        completed: !isDone,
        completed_at: !isDone ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,module_id" },
    );
    qc.invalidateQueries({ queryKey: ["course-progress", courseId, user.id] });
  };

  if (!user) return null;

  const inProgress = done > 0;

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-900 bg-zinc-900/70 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/cursos" className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-teal-400">
            <ArrowLeft className="h-4 w-4" /> Cursos
          </Link>
          <span className="text-sm text-zinc-400">
            {done} / {total} completados
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto mt-6 max-w-6xl px-6">
        <div className={`relative overflow-hidden rounded-2xl border border-zinc-800/50 bg-gradient-to-br ${style.gradient} shadow-2xl shadow-black/40`}>
          <div className="relative aspect-[16/6] w-full">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15) 0, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0, transparent 40%)",
            }} />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex flex-wrap items-center gap-2">
                {course?.category && (
                  <span className="rounded-md border border-teal-500/40 bg-teal-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal-300">
                    {course.category}
                  </span>
                )}
                <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${levelClass(course?.level ?? null)}`}>
                  {course?.level ?? "Principiante"}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">{course?.title}</h1>
              {course?.description && (
                <p className="mt-2 max-w-3xl text-sm text-zinc-300">{course.description}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Sé el primero
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" /> {total > 0 ? `${total} módulos` : "Próximamente"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[65%_35%]">
          {/* Player */}
          <div>
            <div className="overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900 shadow-xl shadow-black/30">
              {selected?.video_url ? (
                <iframe
                  src={selected.video_url}
                  allow="autoplay; fullscreen"
                  className="aspect-video w-full bg-black"
                />
              ) : (
                <div className={`relative flex aspect-video w-full items-center justify-center bg-gradient-to-br ${style.gradient}`}>
                  <div className="absolute inset-0 bg-zinc-950/60" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                    <Play className="h-8 w-8 fill-white text-white" />
                  </div>
                  <span className="absolute bottom-4 text-sm text-white/70">
                    {selected ? "Video próximamente" : "Próximamente"}
                  </span>
                </div>
              )}
            </div>

            {selected && (
              <div className="mt-5 rounded-xl border border-zinc-800/50 bg-zinc-900/80 p-6 shadow-xl shadow-black/20">
                <h2 className="text-xl font-semibold text-zinc-100">{selected.title}</h2>
                {selected.description && (
                  <p className="mt-2 text-sm text-zinc-300">{selected.description}</p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    onClick={toggleComplete}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                      progress?.[selected.id]
                        ? "border border-teal-500/40 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20"
                        : "bg-gradient-to-r from-teal-500 to-sky-500 text-white shadow-lg shadow-teal-500/20 hover:scale-[1.02]"
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    {progress?.[selected.id] ? "Completado" : "Marcar como completado"}
                  </button>

                  {nextModule && (
                    <button
                      onClick={() => setSelectedId(nextModule.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-teal-500/50 hover:text-teal-300"
                    >
                      Siguiente módulo <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Progreso del curso</span>
                    <span>{done} de {total} completados</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full bg-teal-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modules sidebar */}
          <aside>
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/80 p-4 shadow-xl shadow-black/20">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Módulos</div>
                <button
                  onClick={() => modules && modules[0] && setSelectedId(modules[0].id)}
                  className="text-xs font-semibold text-teal-400 hover:text-teal-300"
                  disabled={!modules || modules.length === 0}
                >
                  {inProgress ? "Continuar donde lo dejé" : "Comenzar curso"}
                </button>
              </div>

              <div className="space-y-1">
                {(modules ?? []).map((m, idx) => {
                  const isDone = !!progress?.[m.id];
                  const isActive = m.id === selectedId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                        isActive
                          ? "border border-teal-500/40 bg-teal-500/10"
                          : "border border-transparent hover:bg-zinc-800/40"
                      }`}
                    >
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          isDone
                            ? "bg-teal-500 text-white"
                            : isActive
                              ? "border-2 border-teal-400 text-teal-300"
                              : "border-2 border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-sm font-medium ${isActive ? "text-teal-200" : "text-zinc-100"}`}>
                          {m.title}
                        </div>
                        {m.duration_minutes != null && (
                          <div className="text-xs text-zinc-600">{m.duration_minutes} min</div>
                        )}
                      </div>
                    </button>
                  );
                })}
                {modules && modules.length === 0 && (
                  <p className="px-3 py-8 text-center text-sm text-zinc-600">
                    Estamos preparando los módulos. Volvé pronto.
                  </p>
                )}
              </div>

              {total > 0 && (
                <div className="mt-5 border-t border-zinc-800/50 pt-4">
                  <div className="text-xs text-zinc-400">
                    {done} de {total} módulos completados
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full bg-teal-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
