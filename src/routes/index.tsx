import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Check,
  LayoutGrid,
  Wand2,
  Compass,
  Rocket,
} from "lucide-react";
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

const ACCESO_MAIL =
  "mailto:hola@implementa.ai?subject=Solicitar%20acceso%20a%20Implementa%20AI";

const FEATURES = [
  {
    eyebrow: "Catálogo de soluciones",
    title: "Soluciones listas, no teoría.",
    body: "Cada solución viene con guía paso a paso, prompts probados, integraciones recomendadas y assets para arrancar el mismo día.",
    points: [
      "Guía paso a paso por solución",
      "Prompts probados en producción",
      "Integraciones y assets incluidos",
    ],
    icon: LayoutGrid,
  },
  {
    eyebrow: "Builder con IA",
    title: "Adaptado a tu empresa, no genérico.",
    body: "Un asistente con IA personaliza cada solución a tu stack, tu industria y tu contexto. De plantilla a algo tuyo en minutos.",
    points: ["Onboarding guiado", "Salida lista para implementar"],
    icon: Wand2,
  },
  {
    eyebrow: "Ruta IA personalizada",
    title: "Sabé exactamente por dónde empezar.",
    body: "Respondé un onboarding corto y recibí una ruta priorizada de soluciones según tu negocio y tus objetivos.",
    points: ["Recomendación priorizada", "Según tu industria y objetivos"],
    icon: Compass,
  },
  {
    eyebrow: "Implementación guiada",
    title: "De idea a producción, sin perderte.",
    body: "Plan paso a paso, recursos y el respaldo de implementadores partner para llevar la solución a producción.",
    points: ["Plan accionable", "Soporte de implementadores"],
    icon: Rocket,
  },
];

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo className="text-white" />
          <nav className="hidden items-center gap-7 text-sm text-gray-400 md:flex">
            <a href="#soluciones" className="transition hover:text-white">
              Soluciones
            </a>
            <a href="#como-funciona" className="transition hover:text-white">
              Cómo funciona
            </a>
            <a href="#acceso" className="transition hover:text-white">
              Acceso
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-gray-300 transition hover:text-white"
            >
              Ingresar
            </Link>
            <a
              href={ACCESO_MAIL}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-100"
            >
              Solicitar acceso
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-800">
        <div
          className="pointer-events-none absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full bg-violet-500/20 blur-[120px]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs font-medium text-gray-300">
              <Sparkles className="h-3 w-3 text-violet-400" /> Plataforma por
              invitación
            </div>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              La plataforma de las empresas que crecen con IA.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-gray-300">
              Más de 60 soluciones de Inteligencia Artificial listas para
              implementar en ventas, marketing, atención, finanzas, operaciones
              y recursos humanos. Sin programar desde cero.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href={ACCESO_MAIL}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-gray-100"
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
            <p className="mt-5 text-xs text-gray-500">
              Sin tarjeta de crédito · Acceso en 24 hs · Plataforma por
              invitación
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
            className="relative hidden h-[360px] lg:block"
          >
            <div className="absolute left-2 top-4 w-56 rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-2xl">
              <div className="h-2 w-16 rounded-full bg-violet-500" />
              <div className="mt-3 h-2 w-full rounded-full bg-gray-700" />
              <div className="mt-2 h-2 w-3/4 rounded-full bg-gray-700" />
              <div className="mt-4 inline-block rounded-md bg-violet-500/15 px-2 py-1 text-[10px] text-violet-300">
                Disponible
              </div>
            </div>
            <div className="absolute right-0 top-24 w-60 rounded-xl border border-gray-700 bg-gray-950 p-4 shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-violet-500" />
                <div className="h-2 w-24 rounded-full bg-gray-700" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="h-10 rounded-md bg-gray-800" />
                <div className="h-10 rounded-md bg-gray-800" />
                <div className="h-10 rounded-md bg-gray-800" />
              </div>
            </div>
            <div className="absolute bottom-2 left-10 w-52 rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-2xl">
              <div className="h-2 w-12 rounded-full bg-violet-500" />
              <div className="mt-3 space-y-2">
                <div className="h-2 w-full rounded-full bg-gray-700" />
                <div className="h-2 w-2/3 rounded-full bg-gray-700" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Franja institucional (sin logos inventados) */}
      <section className="border-b border-gray-800 bg-gray-950">
        <div className="mx-auto max-w-6xl px-6 py-10 text-center">
          <p className="text-xs uppercase tracking-widest text-gray-500">
            Soluciones aplicadas en ventas, marketing, atención, finanzas,
            operaciones y recursos humanos
          </p>
        </div>
      </section>

      {/* Soluciones por área */}
      <section id="soluciones" className="border-b border-gray-800">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-14 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
              Catálogo
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight">
              Un catálogo que cubre toda tu operación.
            </h2>
            <p className="mt-4 text-gray-400">
              Cada solución incluye guía paso a paso, prompts probados,
              integraciones recomendadas y assets para arrancar hoy mismo.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <motion.div
                  key={cat.key}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.35,
                    delay: i * 0.04,
                    ease: "easeOut",
                  }}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-violet-500/50"
                >
                  <Icon
                    className="h-6 w-6 text-violet-400"
                    strokeWidth={1.5}
                  />
                  <h3 className="mt-5 text-base font-semibold text-white">
                    {cat.label}
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    {cat.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-10">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-violet-400 transition hover:text-violet-300"
            >
              Explorá el catálogo completo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features alternadas */}
      <section className="border-b border-gray-800 bg-gray-950">
        <div className="mx-auto max-w-6xl space-y-24 px-6 py-24">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const reversed = i % 2 === 1;
            return (
              <motion.div
                key={f.eyebrow}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="grid items-center gap-12 lg:grid-cols-2"
              >
                <div className={reversed ? "lg:order-2" : ""}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                    {f.eyebrow}
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-4 text-gray-400">{f.body}</p>
                  <ul className="mt-5 space-y-2 text-sm text-gray-400">
                    {f.points.map((p) => (
                      <li key={p} className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-violet-400" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className={`rounded-2xl border border-gray-800 bg-gray-900 p-6 ${
                    reversed ? "lg:order-1" : ""
                  }`}
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15">
                    <Icon className="h-5 w-5 text-violet-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                      <div className="h-2 w-12 rounded-full bg-violet-500" />
                      <div className="mt-3 h-2 w-full rounded-full bg-gray-700" />
                      <div className="mt-2 h-2 w-2/3 rounded-full bg-gray-700" />
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                      <div className="h-2 w-12 rounded-full bg-violet-500" />
                      <div className="mt-3 h-2 w-full rounded-full bg-gray-700" />
                      <div className="mt-2 h-2 w-1/2 rounded-full bg-gray-700" />
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                      <div className="h-2 w-10 rounded-full bg-gray-700" />
                      <div className="mt-3 h-2 w-3/4 rounded-full bg-gray-700" />
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                      <div className="h-2 w-14 rounded-full bg-violet-500" />
                      <div className="mt-3 h-2 w-full rounded-full bg-gray-700" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Impacto (cifras honestas, sin inventar ROI) */}
      <section className="border-b border-gray-800">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-20 text-center md:grid-cols-4">
          {[
            { v: "60+", l: "soluciones" },
            { v: "8", l: "áreas de negocio" },
            { v: "24 hs", l: "para el acceso" },
            { v: "100%", l: "en español" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-4xl font-semibold text-violet-400">
                {s.v}
              </div>
              <div className="mt-2 text-sm text-gray-400">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="border-b border-gray-800 bg-gray-950">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-14 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
              Cómo funciona
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight">
              De idea a implementación, en tres pasos.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Explorá",
                d: "Recorré el catálogo de soluciones por área y dificultad.",
              },
              {
                n: "02",
                t: "Configurá con el Builder",
                d: "Un asistente con IA adapta cada solución a tu empresa y stack.",
              },
              {
                n: "03",
                t: "Implementá",
                d: "Plan paso a paso, prompts, integraciones y assets listos para usar.",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-xl border border-gray-800 bg-gray-900 p-7"
              >
                <div className="text-3xl font-semibold text-violet-400">
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {s.t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Acceso */}
      <section id="acceso" className="border-b border-gray-800">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
            Acceso
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight">
            Acceso por invitación.
          </h2>
          <p className="mt-4 text-gray-400">
            Plataforma para empresas. Solicitá tu acceso y coordinamos el
            onboarding esta semana.
          </p>
          <a
            href={ACCESO_MAIL}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-gray-100"
          >
            Solicitar acceso <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute bottom-[-180px] left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-violet-500/15 blur-[120px]"
          aria-hidden
        />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-4xl font-semibold tracking-tight">
            ¿Listo para implementar IA en tu empresa?
          </h2>
          <p className="mt-4 text-gray-400">
            Plataforma por invitación. Solicitá tu acceso y empezamos esta
            semana.
          </p>
          <a
            href={ACCESO_MAIL}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-gray-100"
          >
            Solicitar acceso <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-4 text-xs text-gray-500">
            Sin tarjeta de crédito · Acceso en 24 hs · Cancelá cuando quieras
          </p>
        </div>
      </section>

      <footer className="border-t border-gray-800">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-4">
          <div>
            <Logo className="text-white" />
            <p className="mt-3 text-sm text-gray-500">
              Hecho para empresas que crecen.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Plataforma</div>
            <div className="mt-3 space-y-2 text-sm text-gray-500">
              <a href="#soluciones" className="block transition hover:text-gray-300">
                Soluciones
              </a>
              <a
                href="#como-funciona"
                className="block transition hover:text-gray-300"
              >
                Cómo funciona
              </a>
              <a href="#acceso" className="block transition hover:text-gray-300">
                Acceso
              </a>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Cuenta</div>
            <div className="mt-3 space-y-2 text-sm text-gray-500">
              <Link to="/login" className="block transition hover:text-gray-300">
                Ingresar
              </Link>
              <a
                href={ACCESO_MAIL}
                className="block transition hover:text-gray-300"
              >
                Solicitar acceso
              </a>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Contacto</div>
            <div className="mt-3 space-y-2 text-sm text-gray-500">
              <a
                href="mailto:hola@implementa.ai"
                className="block transition hover:text-gray-300"
              >
                hola@implementa.ai
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-10 text-xs text-gray-600">
          © {new Date().getFullYear()} Implementa AI · Hecho para empresas que
          crecen.
        </div>
      </footer>
    </div>
  );
}
