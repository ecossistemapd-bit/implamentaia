import { Link } from "@tanstack/react-router";

// Logo Implementa IA — lockup horizontal: pictograma "A doble + rombo" + wordmark.
// Pictograma geométrico: dos bandas exteriores forman la A grande, dos bandas interiores
// (más cortas, paralelas) anidadas dentro, y un rombo/cristal en el vértice.
// Monocromo vía currentColor → blanco en fondos oscuros, grafito en fondos claros.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Implementa IA"
      className={`inline-flex items-center gap-2.5 text-foreground ${className}`}
    >
      <svg
        viewBox="0 0 64 64"
        className="h-[26px] w-auto shrink-0"
        fill="currentColor"
        aria-hidden="true"
      >
        {/* Banda exterior izquierda — trapezoide grueso, base ancha, vértice angosto */}
        <path d="M3 60 L15 60 L29 10 L23 6 Z" />
        {/* Banda exterior derecha — espejo */}
        <path d="M61 60 L49 60 L35 10 L41 6 Z" />
        {/* Banda interior izquierda — más corta, sólo en el tercio superior */}
        <path d="M22 60 L29 60 L33 28 L29 24 Z" />
        {/* Banda interior derecha — espejo */}
        <path d="M42 60 L35 60 L31 28 L35 24 Z" />
        {/* Rombo/cristal en el vértice — eje central, simétrico */}
        <path d="M32 0 L39 14 L32 28 L25 14 Z" />
      </svg>
      <span className="text-[13px] font-medium uppercase tracking-[0.2em] leading-none">
        Implementa&nbsp;IA
      </span>
    </Link>
  );
}
