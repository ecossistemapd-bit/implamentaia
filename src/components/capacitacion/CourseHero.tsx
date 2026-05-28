import { Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Layers, Clock } from "lucide-react";

type Stats = {
  modulesCount: number;
  lessonsCount: number;
  totalSeconds: number;
  lessonsRemaining: number;
  secondsRemaining: number;
  progressPct: number;
};

type Props = {
  title: string;
  description: string | null;
  stats: Stats;
};

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export function CourseHero({ title, description, stats }: Props) {
  return (
    <section className="app-card relative overflow-hidden p-8 md:p-10">
      {/* Texto fantasma decorativo atrás del título */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span
          className="select-none whitespace-nowrap text-[clamp(80px,12vw,180px)] font-bold opacity-[0.04] tracking-[-0.04em]"
          style={{ color: "var(--violet-text)" }}
        >
          {title}
        </span>
      </div>

      <div className="relative">
        <Link
          to="/cursos"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Capacitación
        </Link>

        <h1 className="mt-6 text-[44px] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground">
          {title}
        </h1>

        {description && (
          <p className="page-subtitle mt-3 max-w-[640px] leading-relaxed">{description}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-2 tabular-nums">
            <Layers className="h-4 w-4" />
            {stats.modulesCount} Módulos
          </span>
          <span className="inline-flex items-center gap-2 tabular-nums">
            <BookOpen className="h-4 w-4" />
            {stats.lessonsCount} Lecciones
          </span>
          <span className="inline-flex items-center gap-2 tabular-nums">
            <Clock className="h-4 w-4" />
            {formatDuration(stats.totalSeconds)}
          </span>
          {stats.lessonsRemaining > 0 && (
            <>
              <span
                className="inline-flex items-center gap-2 tabular-nums"
                style={{ color: "var(--violet-text)" }}
              >
                <Clock className="h-4 w-4" />
                {formatDuration(stats.secondsRemaining)} restantes
              </span>
              <span
                className="inline-flex items-center gap-2 tabular-nums"
                style={{ color: "var(--violet-text)" }}
              >
                <BookOpen className="h-4 w-4" />
                {stats.lessonsRemaining} lecciones restantes
              </span>
            </>
          )}
        </div>

        {stats.lessonsCount > 0 && (
          <div className="mt-8 max-w-[640px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Tu progreso
              </span>
              <span
                className="text-[14px] font-semibold tabular-nums"
                style={{ color: "var(--violet-text)" }}
              >
                {stats.progressPct}% completado
              </span>
            </div>
            <div className="app-progress-track mt-2">
              <div
                className="app-progress-fill"
                style={{ width: `${stats.progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
