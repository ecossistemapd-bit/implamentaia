import { Users, BookOpen, ChevronRight } from "lucide-react";
import { useCourseCover } from "@/hooks/use-course-cover";

export type CapacitacionCourse = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  thumbnail_url: string | null;
  instructor_name: string | null;
  format: string | null;
  section_key: string | null;
  student_count: number;
  coming_soon: boolean;
};

export type CourseProgress = { total: number; done: number };

type Props = {
  course: CapacitacionCourse;
  progress: CourseProgress;
  onClick?: () => void;
};

function FallbackCover({ title }: { title: string }) {
  const initial = (title.charAt(0) || "·").toUpperCase();
  return (
    <div className="relative h-full w-full bg-card">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(65% 50% at 30% 30%, var(--violet-pill-bg), transparent 70%), radial-gradient(55% 45% at 75% 75%, var(--violet-pill-bg), transparent 70%)",
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[68px] font-semibold leading-none"
          style={{ color: "var(--violet-text)", letterSpacing: "-0.02em" }}
        >
          {initial}
        </span>
        <span className="mt-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Capacitación
        </span>
      </div>
    </div>
  );
}

export function CourseCard({ course, progress, onClick }: Props) {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const inProgress = progress.done > 0 && !course.coming_soon;
  const hasModules = progress.total > 0;
  const coverUrl = useCourseCover(course.thumbnail_url);

  return (
    <button
      onClick={onClick}
      disabled={course.coming_soon}
      className="app-card group flex w-full flex-col overflow-hidden text-left disabled:cursor-not-allowed"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-[380ms]"
            style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
            loading="lazy"
          />
        ) : (
          <FallbackCover title={course.title} />
        )}
        {course.coming_soon && (
          <span className="app-pill-violet absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em]">
            Dentro de poco
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug text-foreground">
          {course.title}
        </h3>

        {course.instructor_name && (
          <p className="mt-1 text-[12px] text-muted-foreground">
            Con {course.instructor_name}
          </p>
        )}

        <div className="mt-3 flex items-center gap-4 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Users className="h-3.5 w-3.5" />
            {course.student_count > 0
              ? `${course.student_count} estudiantes`
              : "Sé el primero"}
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <BookOpen className="h-3.5 w-3.5" />
            {hasModules ? `${progress.total} lecciones` : "0 lecciones"}
          </span>
        </div>

        {inProgress && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                style={{ color: "var(--violet-text-strong)" }}
              >
                En curso
              </span>
              <span
                className="text-[12px] font-semibold tabular-nums"
                style={{ color: "var(--violet-text)" }}
              >
                {pct}%
              </span>
            </div>
            <div className="app-progress-track mt-1.5">
              <div className="app-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end">
          {course.coming_soon ? (
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted-foreground">
              Dentro de poco <ChevronRight className="h-4 w-4" />
            </span>
          ) : inProgress ? (
            <span
              className="inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums"
              style={{ color: "var(--violet-text)" }}
            >
              Continuar · {pct}% <ChevronRight className="h-4 w-4" />
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[13px] font-semibold transition-colors"
              style={{ color: "var(--violet-text)" }}
            >
              Mira ahora <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
