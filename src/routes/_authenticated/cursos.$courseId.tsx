import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CourseHero } from "@/components/capacitacion/CourseHero";
import { ModuleCarousel } from "@/components/capacitacion/ModuleCarousel";
import { LessonCarousel } from "@/components/capacitacion/LessonCarousel";
import type { CapacitacionModule } from "@/components/capacitacion/ModuleCard";
import type { CapacitacionLesson } from "@/components/capacitacion/LessonCard";

export const Route = createFileRoute("/_authenticated/cursos/$courseId")({
  component: CourseDetailPage,
});

type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
};

type ModuleRow = {
  id: string;
  title: string;
  order_index: number;
};

type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  order_index: number;
};

function CourseDetailPage() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Curso
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses" as never)
        .select("id, title, description, thumbnail_url")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data as Course | null;
    },
  });

  // Módulos del curso
  const { data: modules } = useQuery({
    queryKey: ["course-modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules" as never)
        .select("id, title, order_index")
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as ModuleRow[];
    },
  });

  // Lecciones de TODOS los módulos del curso
  const { data: lessons } = useQuery({
    queryKey: ["course-lessons", courseId, modules?.length ?? 0],
    enabled: !!modules,
    queryFn: async () => {
      const moduleIds = (modules ?? []).map((m) => m.id);
      if (moduleIds.length === 0) return [] as LessonRow[];
      const { data, error } = await supabase
        .from("lessons" as never)
        .select("id, module_id, title, description, thumbnail_url, duration_seconds, order_index")
        .in("module_id", moduleIds)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as LessonRow[];
    },
  });

  // Progreso del usuario sobre las lecciones del curso
  const { data: completedSet } = useQuery({
    queryKey: ["course-lessons-progress", courseId, user?.id, lessons?.length ?? 0],
    enabled: !!user && !!lessons,
    queryFn: async () => {
      const lessonIds = (lessons ?? []).map((l) => l.id);
      if (lessonIds.length === 0) return new Set<string>();
      const { data } = await supabase
        .from("user_progress" as never)
        .select("lesson_id, completed")
        .eq("user_id", user!.id)
        .in("lesson_id", lessonIds);
      const rows = (data ?? []) as Array<{ lesson_id: string | null; completed: boolean }>;
      return new Set(rows.filter((r) => r.completed && r.lesson_id).map((r) => r.lesson_id!));
    },
  });

  // Auto-seleccionar primer módulo
  useEffect(() => {
    if (!selectedModuleId && modules && modules.length > 0) {
      setSelectedModuleId(modules[0].id);
    }
  }, [modules, selectedModuleId]);

  // Agregar lecciones por módulo (para counts en cards)
  const moduleStats = useMemo(() => {
    const stats: Record<string, { count: number; done: number; offsetInCourse: number }> = {};
    let runningOffset = 0;
    (modules ?? []).forEach((m) => {
      const ofMod = (lessons ?? []).filter((l) => l.module_id === m.id);
      const done = ofMod.filter((l) => completedSet?.has(l.id)).length;
      stats[m.id] = { count: ofMod.length, done, offsetInCourse: runningOffset };
      runningOffset += ofMod.length;
    });
    return stats;
  }, [modules, lessons, completedSet]);

  // Cards para el carrusel de módulos
  const moduleCards: CapacitacionModule[] = useMemo(() => {
    return (modules ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      order_index: m.order_index,
      lessonsCount: moduleStats[m.id]?.count ?? 0,
      lessonsDone: moduleStats[m.id]?.done ?? 0,
    }));
  }, [modules, moduleStats]);

  // Lecciones del módulo seleccionado
  const selectedModule = modules?.find((m) => m.id === selectedModuleId) ?? null;
  const selectedLessons: CapacitacionLesson[] = useMemo(() => {
    if (!selectedModule) return [];
    return (lessons ?? [])
      .filter((l) => l.module_id === selectedModule.id)
      .map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        thumbnail_url: l.thumbnail_url,
        duration_seconds: l.duration_seconds,
        order_index: l.order_index,
        isCompleted: completedSet?.has(l.id) ?? false,
      }));
  }, [lessons, selectedModule, completedSet]);

  const selectedModuleOffset = selectedModuleId
    ? moduleStats[selectedModuleId]?.offsetInCourse ?? 0
    : 0;

  // Stats globales del curso
  const stats = useMemo(() => {
    const lessonsList = lessons ?? [];
    const total = lessonsList.length;
    const done = lessonsList.filter((l) => completedSet?.has(l.id)).length;
    const totalSeconds = lessonsList.reduce((s, l) => s + (l.duration_seconds ?? 0), 0);
    const secondsRemaining = lessonsList
      .filter((l) => !completedSet?.has(l.id))
      .reduce((s, l) => s + (l.duration_seconds ?? 0), 0);
    return {
      modulesCount: modules?.length ?? 0,
      lessonsCount: total,
      totalSeconds,
      lessonsRemaining: total - done,
      secondsRemaining,
      progressPct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [modules, lessons, completedSet]);

  const goLesson = (lessonId: string) =>
    navigate({
      to: "/cursos/$courseId/leccion/$lessonId",
      params: { courseId, lessonId },
    });

  if (courseLoading) {
    return (
      <div className="relative z-[1] mx-auto max-w-[1340px] px-8 py-8">
        <div className="app-card h-64 animate-pulse" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="relative z-[1] mx-auto max-w-[1340px] px-8 py-8">
        <div className="app-card p-10 text-center text-muted-foreground">
          Curso no encontrado.
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-[1] mx-auto max-w-[1340px] px-8 py-8">
      <CourseHero
        title={course.title}
        description={course.description}
        stats={stats}
      />

      {(modules?.length ?? 0) > 0 ? (
        <>
          <ModuleCarousel
            modules={moduleCards}
            selectedId={selectedModuleId}
            onSelect={setSelectedModuleId}
          />
          {selectedModule && (
            <LessonCarousel
              moduleTitle={selectedModule.title}
              lessons={selectedLessons}
              numberingOffset={selectedModuleOffset}
              courseFallbackThumbnail={course.thumbnail_url}
              onLessonClick={goLesson}
            />
          )}
        </>
      ) : (
        <div className="app-card mt-10 p-10 text-center text-muted-foreground">
          Estamos preparando los módulos de este curso. Volvé pronto.
        </div>
      )}
    </div>
  );
}
