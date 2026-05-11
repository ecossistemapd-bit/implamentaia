import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
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
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-black/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Logo className="text-white" />
          <nav className="flex items-center gap-5">
            <Link
              to="/login"
              className="text-sm text-gray-300 transition hover:text-white"
            >
              Ingresar
            </Link>
            <a
              href="mailto:hola@implementa.ai?subject=Solicitar%20acceso%20a%20Implementa%20AI"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-100"
            >
              Solicitar acceso
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-gray-800">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs font-medium text-gray-300">
              <Sparkles className="h-3 w-3" /> Plataforma por invitación
            </div>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
              La plataforma de las empresas que crecen con IA.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
              Más de 60 soluciones de Inteligencia Artificial listas para implementar
              en ventas, marketing, atención, finanzas, operaciones y recursos humanos.
              Sin programar desde cero.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href="mailto:hola@implementa.ai?subject=Solicitar%20acceso%20a%20Implementa%20AI"
                className="inline-flex items-center gap-1 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-gray-100"
              >
                Solicitar acceso <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/login"
                className="text-sm text-gray-300 underline-offset-4 transition hover:text-white hover:underline"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categorías */}
      <section className="border-b border-gray-800">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
              Catálogo
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              36+ soluciones listas para implementar
            </h2>
            <p className="mt-4 text-gray-400">
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
                  className="rounded-xl border border-gray-700 bg-gray-900 p-6 transition hover:border-gray-600"
                >
                  <Icon className="h-6 w-6 text-gray-300" strokeWidth={1.5} />
                  <h3 className="mt-5 text-base font-semibold text-white">{cat.label}</h3>
                  <p className="mt-1 text-sm text-gray-400">{cat.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="border-b border-gray-800">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
              Cómo funciona
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              De idea a implementación, en tres pasos.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Explora", d: "Recorre el catálogo de soluciones organizadas por área y dificultad." },
              { n: "02", t: "Configura con Builder", d: "Un asistente con IA adapta cada solución a tu empresa y stack." },
              { n: "03", t: "Implementa", d: "Plan paso a paso, prompts, integraciones y assets listos para usar." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-gray-700 bg-gray-900 p-6">
                <div className="text-sm font-mono text-gray-600">{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold text-white">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            ¿Listo para implementar IA en tu empresa?
          </h2>
          <p className="mt-4 text-gray-400">
            Plataforma por invitación. Solicitá tu acceso y empezamos esta semana.
          </p>
          <div className="mt-8">
            <a
              href="mailto:hola@implementa.ai?subject=Solicitar%20acceso%20a%20Implementa%20AI"
              className="inline-flex items-center gap-1 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-gray-100"
            >
              Solicitar acceso <ArrowRight className="h-4 w-4" />
            </a>
            <p className="mt-3 text-center text-xs text-gray-500">
              Sin tarjeta de crédito · Acceso en 24hs · Cancelá cuando quieras
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-gray-500 sm:flex-row">
          <Logo className="text-white" />
          <p>© {new Date().getFullYear()} Implementa AI · Hecho para empresas que crecen.</p>
        </div>
      </footer>
    </div>
  );
}
