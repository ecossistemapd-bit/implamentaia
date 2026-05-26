import { Link } from "@tanstack/react-router";

// Logo Implementa IA — lockup horizontal: pictograma (PNG vía CSS mask) + wordmark.
// El PNG es el archivo oficial blanco-sobre-transparente que provee el branding.
// Se renderiza vía `mask-image` para que tome el color de currentColor automático:
// blanco en fondos oscuros, grafito en fondos claros. Nunca se modifica la forma.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Implementa IA"
      className={`group inline-flex items-center gap-2.5 text-foreground transition-transform duration-300 ease-out hover:scale-[1.06] ${className}`}
      style={{ transformOrigin: "left center" }}
    >
      <span
        aria-hidden="true"
        className="block h-[26px] w-[26px] shrink-0 bg-current"
        style={{
          WebkitMaskImage: 'url("/logo-implementa.png")',
          maskImage: 'url("/logo-implementa.png")',
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />
      <span className="text-[13px] font-medium uppercase tracking-[0.2em] leading-none">
        Implementa&nbsp;IA
      </span>
    </Link>
  );
}
