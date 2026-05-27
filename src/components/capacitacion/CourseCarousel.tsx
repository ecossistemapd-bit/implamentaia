import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { CourseCard, type CapacitacionCourse, type CourseProgress } from "./CourseCard";

type Props = {
  title: string;
  courses: CapacitacionCourse[];
  progressMap: Record<string, CourseProgress>;
  onCourseClick?: (id: string) => void;
};

export function CourseCarousel({ title, courses, progressMap, onCourseClick }: Props) {
  if (courses.length === 0) return null;

  return (
    <section className="mt-10 first:mt-8">
      <h2 className="mb-5 text-[26px] font-semibold tracking-tight text-foreground">
        {title}
      </h2>

      <Carousel
        opts={{ align: "start", slidesToScroll: "auto", containScroll: "trimSnaps" }}
        className="relative"
      >
        <CarouselContent className="-ml-4">
          {courses.map((course) => (
            <CarouselItem
              key={course.id}
              className="basis-2/3 pl-4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
            >
              <CourseCard
                course={course}
                progress={progressMap[course.id] ?? { total: 0, done: 0 }}
                onClick={() => onCourseClick?.(course.id)}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          className="left-2 top-[35%] z-10 h-10 w-10 -translate-y-1/2 border bg-card text-foreground shadow-lg backdrop-blur-sm hover:bg-card disabled:opacity-0"
          style={{ borderColor: "var(--violet-border-hover)" }}
        />
        <CarouselNext
          className="right-2 top-[35%] z-10 h-10 w-10 -translate-y-1/2 border bg-card text-foreground shadow-lg backdrop-blur-sm hover:bg-card disabled:opacity-0"
          style={{ borderColor: "var(--violet-border-hover)" }}
        />
      </Carousel>
    </section>
  );
}
