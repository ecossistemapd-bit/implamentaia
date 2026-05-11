import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cursos/$courseId")({
  component: CourseDetailPage,
});

type Course = { id: string; title: string; description: string | null };
type Module = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  order_index: number;
};

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
        .select("id, title, description")
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

  const toggleComplete = async () => {
    if (!selected || !user) return;
    const isDone = !!progress?.[selected.id];
    await supabase.from("user_progress" as never).upsert(
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

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <Link to="/cursos" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <h1 className="truncate text-xl font-bold text-gray-900">{course?.title}</h1>
        <span className="text-sm text-gray-500">
          {done} / {total} completados
        </span>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[65%_35%]">
          <div>
            {selected?.video_url ? (
              <iframe
                src={selected.video_url}
                allow="autoplay; fullscreen"
                className="aspect-video w-full rounded-xl bg-gray-900"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-gray-900">
                <span className="text-sm text-white/60">
                  {selected ? "Este módulo no tiene video todavía" : "Seleccioná un módulo para comenzar"}
                </span>
              </div>
            )}
            {selected && (
              <>
                <h2 className="mt-4 text-lg font-semibold text-gray-900">{selected.title}</h2>
                {selected.description && (
                  <p className="mt-1 text-sm text-gray-500">{selected.description}</p>
                )}
                <Button
                  onClick={toggleComplete}
                  variant={progress?.[selected.id] ? "outline" : "default"}
                  className="mt-4 w-full"
                >
                  {progress?.[selected.id] ? "✓ Completado" : "Marcar como completado ✓"}
                </Button>
              </>
            )}
          </div>

          <div>
            <div className="mb-3 text-xs font-semibold tracking-widest text-gray-400">MÓDULOS</div>
            <div className="space-y-1">
              {(modules ?? []).map((m) => {
                const isDone = !!progress?.[m.id];
                const isActive = m.id === selectedId;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50 ${
                      isActive ? "bg-gray-50" : ""
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        isDone
                          ? "bg-black text-white"
                          : isActive
                            ? "border-2 border-black"
                            : "border-2 border-gray-300"
                      }`}
                    >
                      {isDone && <Check className="h-3 w-3" strokeWidth={3} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900">{m.title}</div>
                      {m.duration_minutes != null && (
                        <div className="text-xs text-gray-400">{m.duration_minutes} min</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {modules && modules.length === 0 && (
                <p className="px-3 py-6 text-sm text-gray-400">Próximamente. Estamos preparando los módulos.</p>
              )}
            </div>

            <div className="mt-6">
              <div className="text-xs text-gray-400">
                {done} de {total} módulos completados
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded bg-gray-100">
                <div className="h-full bg-black" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
