import { Link } from "@tanstack/react-router";

// Logo Implementa IA — lockup horizontal: marca "ΛI" + wordmark.
// Monocromo vía currentColor → blanco en oscuro, grafito en claro
// (hereda el color de texto del contenedor). Sin dorado.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Implementa IA"
      className={`inline-flex items-center gap-2.5 text-foreground ${className}`}
    >
      <svg
        viewBox="0 0 26 22"
        className="h-[22px] w-auto shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* "A" como pico (sin travesaño) */}
        <path d="M1.8 20.5 L10 2 L18.2 20.5" />
        {/* "I" como barra */}
        <path d="M23.2 2 L23.2 20.5" />
      </svg>
      <span className="text-[13px] font-medium uppercase tracking-[0.2em] leading-none">
        Implementa&nbsp;IA
      </span>
    </Link>
  );
}
