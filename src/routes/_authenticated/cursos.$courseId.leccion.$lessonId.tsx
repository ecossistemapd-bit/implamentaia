import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cursos/$courseId/leccion/$lessonId")({
  component: LessonPlayerPlaceholder,
});

/**
 * Placeholder de la página de reproducción de una lección.
 * El player y el sidebar de progreso van en el PR #2.
 */
function LessonPlayerPlaceholder() {
  const { courseId } = Route.useParams();
  return (
    <div className="relative z-[1] mx-auto max-w-[1340px] px-8 py-8">
      <Link
        to="/cursos/$courseId"
        params={{ courseId }}
        className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al curso
      </Link>

      <div className="app-card mt-8 p-10 text-center">
        <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-foreground">
          Reproductor en construcción
        </h1>
        <p className="page-subtitle mt-3 max-w-[480px] mx-auto">
          La página de reproducción de lecciones llega en la próxima entrega.
          Por ahora, podés navegar por los módulos y lecciones desde el curso.
        </p>
      </div>
    </div>
  );
}
