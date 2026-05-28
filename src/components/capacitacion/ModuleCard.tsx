import { Check, BookOpen } from "lucide-react";

export type CapacitacionModule = {
  id: string;
  title: string;
  order_index: number;
  lessonsCount: number;
  lessonsDone: number;
};

type Props = {
  module: CapacitacionModule;
  isSelected: boolean;
  onClick?: () => void;
};

export function ModuleCard({ module, isSelected, onClick }: Props) {
  const pct =
    module.lessonsCount > 0
      ? Math.round((module.lessonsDone / module.lessonsCount) * 100)
      : 0;
  const isComplete = module.lessonsCount > 0 && module.lessonsDone === module.lessonsCount;
  const numberLabel = String(module.order_index + 1).padStart(2, "0");

  return (
    <button
      onClick={onClick}
      className="app-card group relative flex w-full flex-col p-5 text-left transition-all"
      style={
        isSelected
          ? {
              borderColor: "var(--violet-border-hover)",
              boxShadow: "0 0 0 1px var(--violet-border-hover), inset 4px 0 0 0 var(--violet-text)",
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="font-mono text-[40px] font-bold leading-none tabular-nums"
          style={{
            color: isSelected ? "var(--violet-text)" : "var(--muted-foreground)",
            opacity: isSelected ? 1 : 0.7,
          }}
        >
          {numberLabel}
        </span>
        {isComplete && (
          <span className="app-pill-violet inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
            <Check className="h-3 w-3" strokeWidth={3} />
            Completo
          </span>
        )}
      </div>

      <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
        {module.title}
      </h3>

      <div className="mt-4 flex items-center gap-2 text-[12px] text-muted-foreground tabular-nums">
        <BookOpen className="h-3.5 w-3.5" />
        {module.lessonsCount > 0
          ? `${module.lessonsDone}/${module.lessonsCount} lecciones`
          : "0 lecciones"}
      </div>
      <div className="app-progress-track mt-2">
        <div className="app-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </button>
  );
}
