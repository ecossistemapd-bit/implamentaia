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
      className="group fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-110 hover:opacity-90 animate-in fade-in"
    >
      <Icon className="h-5 w-5" strokeWidth={2.25} />
    </button>
  );
}
