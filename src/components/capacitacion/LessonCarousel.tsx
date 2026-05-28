import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { LessonCard, type CapacitacionLesson } from "./LessonCard";

type Props = {
  moduleTitle: string;
  lessons: CapacitacionLesson[];
  /** Offset global de la lección (cuántas lecciones hay antes de este módulo) para numerar */
  numberingOffset: number;
  /** Portada del curso, fallback si la lección no tiene la suya */
  courseFallbackThumbnail: string | null;
  onLessonClick: (lessonId: string) => void;
};

export function LessonCarousel({
  moduleTitle,
  lessons,
  numberingOffset,
  courseFallbackThumbnail,
  onLessonClick,
}: Props) {
  return (
    <section className="mt-10">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-[26px] font-semibold tracking-[-0.01em] text-foreground">
          Lecciones de{" "}
          <span style={{ color: "var(--violet-text)" }}>{moduleTitle}</span>
        </h2>
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {lessons.length} {lessons.length === 1 ? "lección" : "lecciones"}
        </span>
      </div>

      {lessons.length === 0 ? (
        <div className="app-card p-10 text-center text-muted-foreground">
          Estamos preparando las lecciones de este módulo. Volvé pronto.
        </div>
      ) : (
        <Carousel
          opts={{ align: "start", slidesToScroll: "auto", containScroll: "trimSnaps" }}
          className="relative"
        >
          <CarouselContent className="-ml-4">
            {lessons.map((lesson, idx) => (
              <CarouselItem
                key={lesson.id}
                className="basis-2/3 pl-4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
              >
                <LessonCard
                  lesson={lesson}
                  displayNumber={numberingOffset + idx + 1}
                  courseFallbackThumbnail={courseFallbackThumbnail}
                  onClick={() => onLessonClick(lesson.id)}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious
            className="left-2 top-[40%] z-10 h-10 w-10 -translate-y-1/2 border bg-card text-foreground shadow-lg backdrop-blur-sm hover:bg-card disabled:opacity-0"
            style={{ borderColor: "var(--violet-border-hover)" }}
          />
          <CarouselNext
            className="right-2 top-[40%] z-10 h-10 w-10 -translate-y-1/2 border bg-card text-foreground shadow-lg backdrop-blur-sm hover:bg-card disabled:opacity-0"
            style={{ borderColor: "var(--violet-border-hover)" }}
          />
        </Carousel>
      )}
    </section>
  );
}
