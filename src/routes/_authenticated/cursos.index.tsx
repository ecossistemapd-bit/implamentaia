import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/cursos/")({
  component: CursosPage,
});

const EMOJI: Record<string, string> = {
  "No-Code": "🛠️",
  "Inteligencia Artificial": "🤖",
  "Automatización": "⚡",
};

function CursosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses" as never)
        .select("*")
        .eq("is_published", true)
        .order("order_index");
      if (error) throw error;
      return data as Array<{ id: string; title: string; description: string | null; category: string | null; level: string | null }>;
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold text-gray-900">Cursos</h1>
        <span className="ml-2 rounded-full bg-black px-2 py-0.5 text-xs text-white">NUEVO</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Capacitación práctica en las herramientas que usan los mejores implementadores.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {(courses ?? []).map((c) => {
          const p = progressMap?.[c.id] ?? { total: 0, done: 0 };
          const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
          return (
            <button
              key={c.id}
              onClick={() => navigate({ to: "/cursos/$courseId", params: { courseId: c.id } })}
              className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:shadow-sm"
            >
              <div className="flex gap-2">
                {c.category && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{c.category}</span>
                )}
                {c.level && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{c.level}</span>
                )}
              </div>
              <div className="mb-2 mt-3 text-3xl">{EMOJI[c.category ?? ""] ?? "📘"}</div>
              <h3 className="text-base font-semibold text-gray-900">{c.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">{c.description}</p>
              <div className="mt-4">
                <div className="text-xs text-gray-400">
                  {p.done} de {p.total} módulos completados
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded bg-gray-100">
                  <div className="h-full bg-black" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span className="mt-3 inline-block text-xs font-medium text-black hover:underline">
                Ver curso →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
