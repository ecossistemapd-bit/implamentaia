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
        {/* Banda exterior izquierda — desde base hasta vértice */}
        <path d="M4 58 L13 58 L33 8 L29 4 Z" />
        {/* Banda exterior derecha — espejo */}
        <path d="M60 58 L51 58 L35 8 L31 4 Z" />
        {/* Banda interior izquierda — más corta, paralela */}
        <path d="M22 58 L30 58 L40 30 L36 26 Z" />
        {/* Banda interior derecha — espejo, más corta */}
        <path d="M50 58 L42 58 L40 30 L44 26 Z" />
        {/* Rombo/cristal en el vértice */}
        <path d="M32 0 L37 11 L32 22 L27 11 Z" />
      </svg>
      <span className="text-[13px] font-medium uppercase tracking-[0.2em] leading-none">
        Implementa&nbsp;IA
      </span>
    </Link>
  );
}
