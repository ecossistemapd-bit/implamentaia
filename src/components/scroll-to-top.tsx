import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export function ScrollToTop() {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY >= 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!mounted) return null;

  const handleClick = () => {
    if (scrolled) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  };

  const Icon = scrolled ? ArrowUp : ArrowDown;
  const label = scrolled ? "Volver arriba" : "Ver más";

  return (
    <button
      onClick={handleClick}
      title={label}
      aria-label={label}
      className="group fixed right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 animate-in fade-in"
      style={{
        // Posición: arriba del FAB de Luna (que está en right-6 bottom-6 y mide ~64px alto).
        // Alineado al mismo right edge que Luna (right-6 = 24px).
        // 24 + 64 + 8 (gap) = 96 → bottom 96px.
        bottom: "96px",
        background: "var(--card)",
        border: "1px solid var(--violet-border)",
        color: "var(--foreground)",
        boxShadow: "0 4px 12px -4px rgba(0,0,0,0.4)",
      }}
    >
      <Icon className="h-4 w-4" strokeWidth={2.25} />
    </button>
  );
}
