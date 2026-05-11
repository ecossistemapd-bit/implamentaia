import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Implementa AI — La plataforma de las empresas que crecen con IA" },
      {
        name: "description",
        content:
          "Más de 60 soluciones de IA listas para implementar en tu empresa. Builder asistido, prompts probados y guías paso a paso en español.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" className="rounded-full">Ingresar</Button>
            </Link>
            <a href="mailto:hola@implementa.ai?subject=Solicitar%20acceso%20a%20Implementa%20AI">
              <Button className="rounded-full">Solicitar acceso</Button>
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32 lg:py-40">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Plataforma por invitación
            </div>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              La plataforma de las empresas que crecen con IA.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Más de 60 soluciones de Inteligencia Artificial listas para implementar
              en ventas, marketing, atención, finanzas, operaciones y recursos humanos.
              Sin programar desde cero.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <a href="mailto:hola@implementa.ai?subject=Solicitar%20acceso%20a%20Implementa%20AI">
                <Button size="lg" className="rounded-full px-6">
                  Solicitar acceso <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </a>
              <Link to="/login">
                <Button size="lg" variant="ghost" className="rounded-full">
                  Ya tengo cuenta
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categorías */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Catálogo
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              36+ soluciones listas para implementar
            </h2>
            <p className="mt-4 text-muted-foreground">
              Cada solución incluye guía paso a paso, prompts probados, integraciones recomendadas
              y assets para arrancar hoy mismo.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <motion.div
                  key={cat.key}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.04, ease: "easeOut" }}
                  className="group rounded-2xl border border-border bg-card p-6 transition hover:shadow-sm"
                >
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                  <h3 className="mt-5 text-lg font-medium">{cat.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Cómo funciona
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              De idea a implementación, en tres pasos.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { n: "01", t: "Explora", d: "Recorre el catálogo de soluciones organizadas por área y dificultad." },
              { n: "02", t: "Configura con Builder", d: "Un asistente con IA adapta cada solución a tu empresa y stack." },
              { n: "03", t: "Implementa", d: "Plan paso a paso, prompts, integraciones y assets listos para usar." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card p-8">
                <div className="text-sm font-mono text-muted-foreground">{s.n}</div>
                <h3 className="mt-3 text-xl font-medium">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            ¿Listo para implementar IA en tu empresa?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Plataforma por invitación. Solicitá tu acceso y empezamos esta semana.
          </p>
          <div className="mt-8">
            <a href="mailto:hola@implementa.ai?subject=Solicitar%20acceso%20a%20Implementa%20AI">
              <Button size="lg" className="rounded-full px-6">
                Solicitar acceso
              </Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <Logo className="text-foreground" />
          <p>© {new Date().getFullYear()} Implementa AI · Hecho para empresas que crecen.</p>
        </div>
      </footer>
    </div>
  );
}
