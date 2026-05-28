import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ModuleCard, type CapacitacionModule } from "./ModuleCard";

type Props = {
  modules: CapacitacionModule[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function ModuleCarousel({ modules, selectedId, onSelect }: Props) {
  if (modules.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-[26px] font-semibold tracking-[-0.01em] text-foreground">
          Módulos
        </h2>
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {modules.length} {modules.length === 1 ? "módulo" : "módulos"}
        </span>
      </div>

      <Carousel
        opts={{ align: "start", slidesToScroll: "auto", containScroll: "trimSnaps" }}
        className="relative"
      >
        <CarouselContent className="-ml-4">
          {modules.map((m) => (
            <CarouselItem
              key={m.id}
              className="basis-2/3 pl-4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
            >
              <ModuleCard
                module={m}
                isSelected={m.id === selectedId}
                onClick={() => onSelect(m.id)}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          className="left-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 border bg-card text-foreground shadow-lg backdrop-blur-sm hover:bg-card disabled:opacity-0"
          style={{ borderColor: "var(--violet-border-hover)" }}
        />
        <CarouselNext
          className="right-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 border bg-card text-foreground shadow-lg backdrop-blur-sm hover:bg-card disabled:opacity-0"
          style={{ borderColor: "var(--violet-border-hover)" }}
        />
      </Carousel>
    </section>
  );
}
