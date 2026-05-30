import { Check, Clock, Play } from "lucide-react";
import { useCourseCover } from "@/hooks/use-course-cover";

export type CapacitacionLesson = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  order_index: number;
  isCompleted: boolean;
};

type Props = {
  lesson: CapacitacionLesson;
  /** Número visible en el badge "Lección N" — basado en posición global en el curso, no en el módulo */
  displayNumber: number;
  /** Portada del curso para fallback si la lección no tiene la suya */
  courseFallbackThumbnail: string | null;
  onClick?: () => void;
};

function formatTime(seconds: number | null): string {
  if (!seconds || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

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
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-[56px] font-semibold leading-none"
          style={{ color: "var(--violet-text)", letterSpacing: "-0.02em" }}
        >
          {initial}
        </span>
      </div>
    </div>
  );
}

export function LessonCard({
  lesson,
  displayNumber,
  courseFallbackThumbnail,
  onClick,
}: Props) {
  const thumb = lesson.thumbnail_url ?? courseFallbackThumbnail;
  const { url: coverUrl, isLoading: coverLoading } = useCourseCover(thumb);
  const numberLabel = String(displayNumber).padStart(2, "0");

  return (
    <button
      onClick={onClick}
      className="app-card group flex w-full flex-col overflow-hidden text-left"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={lesson.title}
            className="h-full w-full object-cover transition-transform duration-[380ms]"
            style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
            loading="lazy"
          />
        ) : coverLoading ? (
          <div className="relative h-full w-full overflow-hidden bg-card">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.08) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "cover-shimmer 1.4s ease-in-out infinite",
              }}
            />
          </div>
        ) : (
          <FallbackCover title={lesson.title} />
        )}

        <span className="app-pill-violet absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
          Lección {numberLabel}
        </span>

        {lesson.isCompleted && (
          <span
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full"
            style={{
              background: "var(--violet-pill-bg)",
              border: "1px solid var(--violet-border-hover)",
            }}
          >
            <Check className="h-4 w-4" style={{ color: "var(--violet-text)" }} strokeWidth={3} />
          </span>
        )}

        {lesson.duration_seconds != null && (
          <span
            className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium tabular-nums backdrop-blur-sm"
            style={{
              background: "rgba(0,0,0,0.55)",
              color: "#F5F5F7",
            }}
          >
            <Clock className="h-3 w-3" />
            {formatTime(lesson.duration_seconds)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h4 className="line-clamp-2 text-[14px] font-semibold leading-snug text-foreground">
          {numberLabel}. {lesson.title}
        </h4>

        <div className="mt-3 flex items-center justify-end">
          <span
            className="inline-flex items-center gap-1 text-[13px] font-semibold"
            style={{ color: "var(--violet-text)" }}
          >
            <Play className="h-3.5 w-3.5 fill-current" /> Ver lección
          </span>
        </div>
      </div>
    </button>
  );
}
