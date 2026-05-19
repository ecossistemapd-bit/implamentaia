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

// Paleta institucional (alineada a styles.css) — negro obsidiana + dorado.
const GOLD = "#C9A84C";
const GOLD_HOVER = "#B8972E";
const INK = "#0B0F1A";
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

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

/* ---- Primitivos premium reutilizables ---- */

function PrimaryCTA({
  children,
  size = "md",
}: {
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  const pad = size === "lg" ? "px-8 py-4 text-[15px]" : "px-6 py-3 text-sm";
  return (
    <a
      href={ACCESO_MAIL}
      className={`group inline-flex items-center gap-2 rounded-full font-semibold transition-all duration-300 ${pad}`}
      style={{ backgroundColor: GOLD, color: INK }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = GOLD_HOVER;
        e.currentTarget.style.boxShadow = "0 12px 36px rgba(201,168,76,0.30)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = GOLD;
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
    </a>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase"
      style={{ letterSpacing: "0.22em", color: GOLD }}
    >
      {children}
    </p>
  );
}

function Hairline() {
  return (
    <div
      className="mx-auto h-px max-w-6xl"
      style={{
        background:
          "linear-gradient(90deg, transparent, rgba(201,168,76,0.16), transparent)",
      }}
    />
  );
}

/* ---- Página ---- */

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: INK, color: "#E8EDF5" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(11,15,26,0.72)",
          borderBottom: "1px solid rgba(201,168,76,0.10)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo className="text-white" />
          <nav
            className="hidden items-center gap-8 text-sm md:flex"
            style={{ color: "#A0AABF" }}
          >
            <a href="#soluciones" className="transition-colors hover:text-white">
              Soluciones
            </a>
            <a href="#como-funciona" className="transition-colors hover:text-white">
              Cómo funciona
            </a>
            <a href="#acceso" className="transition-colors hover:text-white">
              Acceso
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm transition-colors hover:text-white"
              style={{ color: "#A0AABF" }}
            >
              Ingresar
            </Link>
            <a
              href={ACCESO_MAIL}
              className="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300"
              style={{ backgroundColor: GOLD, color: INK }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = GOLD_HOVER;
                e.currentTarget.style.boxShadow =
                  "0 8px 24px rgba(201,168,76,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = GOLD;
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Solicitar acceso
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-40 -top-48 h-[560px] w-[560px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(201,168,76,0.16), transparent 70%)",
            filter: "blur(40px)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-40 bottom-0 h-[420px] w-[420px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(201,168,76,0.07), transparent 70%)",
            filter: "blur(60px)",
          }}
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-28 lg:grid-cols-2 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div
              className="mb-7 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium"
              style={{
                border: "1px solid rgba(201,168,76,0.22)",
                backgroundColor: "rgba(201,168,76,0.06)",
                color: "#DDC066",
              }}
            >
              <Sparkles className="h-3 w-3" style={{ color: GOLD }} />
              Plataforma por invitación
            </div>
            <h1 className="text-5xl leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
              La plataforma de las empresas que crecen con IA.
            </h1>
            <p
              className="mt-7 max-w-xl text-lg leading-relaxed"
              style={{ color: "#A0AABF" }}
            >
              Más de 60 soluciones de Inteligencia Artificial listas para
              implementar en ventas, marketing, atención, finanzas, operaciones
              y recursos humanos. Sin programar desde cero.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <PrimaryCTA size="lg">Solicitar acceso</PrimaryCTA>
              <Link
                to="/login"
                className="text-sm transition-colors"
                style={{ color: "#A0AABF" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#A0AABF")}
              >
                Ya tengo cuenta
              </Link>
            </div>
            <p className="mt-6 text-xs" style={{ color: "#6B7A99" }}>
              Sin tarjeta de crédito · Acceso en 24 hs · Plataforma por
              invitación
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
            className="relative hidden h-[400px] lg:block"
          >
            {/* Panel principal */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-0 top-6 w-64 rounded-2xl p-5"
              style={{
                backgroundColor: "#111827",
                border: "1px solid rgba(201,168,76,0.18)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: "rgba(201,168,76,0.14)",
                  border: "1px solid rgba(201,168,76,0.30)",
                }}
              >
                <Sparkles className="h-4 w-4" style={{ color: GOLD }} />
              </div>
              <div
                className="mt-4 h-2.5 w-20 rounded-full"
                style={{ backgroundColor: GOLD }}
              />
              <div className="mt-3 space-y-2">
                <div className="h-2 w-full rounded-full bg-[#1C2333]" />
                <div className="h-2 w-3/4 rounded-full bg-[#1C2333]" />
              </div>
              <div
                className="mt-4 inline-block rounded-md px-2.5 py-1 text-[10px] font-medium"
                style={{
                  backgroundColor: "rgba(201,168,76,0.12)",
                  color: "#DDC066",
                }}
              >
                Disponible
              </div>
            </motion.div>

            {/* Panel secundario */}
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.4,
              }}
              className="absolute right-0 top-28 w-60 rounded-2xl p-5"
              style={{
                backgroundColor: "#0F1624",
                border: "1px solid rgba(201,168,76,0.14)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded-md"
                  style={{ backgroundColor: GOLD }}
                />
                <div className="h-2 w-24 rounded-full bg-[#1C2333]" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[0, 1, 2, 3, 4, 5].map((k) => (
                  <div
                    key={k}
                    className="h-9 rounded-lg"
                    style={{
                      backgroundColor: "#1C2333",
                      border: "1px solid rgba(201,168,76,0.08)",
                    }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Panel inferior */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 9,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.8,
              }}
              className="absolute bottom-2 left-12 w-56 rounded-2xl p-5"
              style={{
                backgroundColor: "#111827",
                border: "1px solid rgba(201,168,76,0.14)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div
                className="h-2.5 w-14 rounded-full"
                style={{ backgroundColor: GOLD }}
              />
              <div className="mt-4 space-y-2">
                <div className="h-2 w-full rounded-full bg-[#1C2333]" />
                <div className="h-2 w-2/3 rounded-full bg-[#1C2333]" />
              </div>
              <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[#1C2333]">
                <div
                  className="h-full w-2/3 rounded-full"
                  style={{ backgroundColor: GOLD }}
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Hairline />

      {/* Franja institucional (sin logos inventados) */}
      <section style={{ backgroundColor: "#0D111C" }}>
        <div className="mx-auto max-w-6xl px-6 py-12 text-center">
          <p
            className="text-xs uppercase"
            style={{ letterSpacing: "0.22em", color: "#6B7A99" }}
          >
            Soluciones aplicadas en ventas, marketing, atención, finanzas,
            operaciones y recursos humanos
          </p>
        </div>
      </section>

      <Hairline />

      {/* Soluciones por área */}
      <section id="soluciones" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-6 py-28">
          <div className="mb-16 max-w-2xl">
            <Eyebrow>Catálogo</Eyebrow>
            <h2 className="mt-4 text-4xl tracking-tight sm:text-5xl">
              Un catálogo que cubre toda tu operación.
            </h2>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: "#A0AABF" }}>
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
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: EASE }}
                  className="group rounded-2xl p-6 transition-all duration-300"
                  style={{
                    backgroundColor: "#111827",
                    border: "1px solid rgba(201,168,76,0.12)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 30px rgba(201,168,76,0.07)";
                    e.currentTarget.style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(201,168,76,0.12)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
                    style={{
                      backgroundColor: "rgba(201,168,76,0.10)",
                      border: "1px solid rgba(201,168,76,0.22)",
                    }}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: GOLD }}
                      strokeWidth={1.5}
                    />
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-white">
                    {cat.label}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#A0AABF" }}>
                    {cat.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-12">
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 text-sm font-semibold transition-colors"
              style={{ color: GOLD }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#DDC066")}
              onMouseLeave={(e) => (e.currentTarget.style.color = GOLD)}
            >
              Explorá el catálogo completo
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      <Hairline />

      {/* Features alternadas */}
      <section style={{ backgroundColor: "#0D111C" }}>
        <div className="mx-auto max-w-6xl space-y-28 px-6 py-28">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const reversed = i % 2 === 1;
            return (
              <motion.div
                key={f.eyebrow}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: EASE }}
                className="grid items-center gap-14 lg:grid-cols-2"
              >
                <div className={reversed ? "lg:order-2" : ""}>
                  <Eyebrow>{f.eyebrow}</Eyebrow>
                  <h3
                    className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {f.title}
                  </h3>
                  <p
                    className="mt-5 text-lg leading-relaxed"
                    style={{ color: "#A0AABF" }}
                  >
                    {f.body}
                  </p>
                  <ul className="mt-7 space-y-3 text-sm" style={{ color: "#A0AABF" }}>
                    {f.points.map((p) => (
                      <li key={p} className="flex items-center gap-3">
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: "rgba(201,168,76,0.12)",
                            border: "1px solid rgba(201,168,76,0.28)",
                          }}
                        >
                          <Check className="h-3 w-3" style={{ color: GOLD }} />
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className={`rounded-3xl p-7 ${reversed ? "lg:order-1" : ""}`}
                  style={{
                    backgroundColor: "#111827",
                    border: "1px solid rgba(201,168,76,0.14)",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
                  }}
                >
                  <div
                    className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: "rgba(201,168,76,0.12)",
                      border: "1px solid rgba(201,168,76,0.26)",
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: GOLD }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { w: "w-full", w2: "w-2/3", accent: true },
                      { w: "w-full", w2: "w-1/2", accent: true },
                      { w: "w-3/4", w2: "", accent: false },
                      { w: "w-full", w2: "", accent: true },
                    ].map((tile, k) => (
                      <div
                        key={k}
                        className="rounded-xl p-4"
                        style={{
                          backgroundColor: "#0F1624",
                          border: "1px solid rgba(201,168,76,0.08)",
                        }}
                      >
                        <div
                          className="h-2 w-12 rounded-full"
                          style={{
                            backgroundColor: tile.accent ? GOLD : "#1C2333",
                          }}
                        />
                        <div className={`mt-3 h-2 rounded-full bg-[#1C2333] ${tile.w}`} />
                        {tile.w2 && (
                          <div
                            className={`mt-2 h-2 rounded-full bg-[#1C2333] ${tile.w2}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <Hairline />

      {/* Impacto (cifras honestas, sin inventar ROI) */}
      <section>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-12 px-6 py-24 text-center md:grid-cols-4">
          {[
            { v: "60+", l: "soluciones" },
            { v: "8", l: "áreas de negocio" },
            { v: "24 hs", l: "para el acceso" },
            { v: "100%", l: "en español" },
          ].map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
              className={
                i > 0 ? "md:border-l md:border-[rgba(201,168,76,0.10)]" : ""
              }
            >
              <div
                className="text-5xl font-semibold sm:text-6xl"
                style={{
                  fontFamily: '"Playfair Display", serif',
                  color: GOLD,
                  letterSpacing: "-0.02em",
                }}
              >
                {s.v}
              </div>
              <div className="mt-3 text-sm" style={{ color: "#A0AABF" }}>
                {s.l}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <Hairline />

      {/* Cómo funciona */}
      <section id="como-funciona" className="scroll-mt-24" style={{ backgroundColor: "#0D111C" }}>
        <div className="mx-auto max-w-6xl px-6 py-28">
          <div className="mb-16 max-w-2xl">
            <Eyebrow>Cómo funciona</Eyebrow>
            <h2 className="mt-4 text-4xl tracking-tight sm:text-5xl">
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
            ].map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
                className="group rounded-2xl p-8 transition-all duration-300"
                style={{
                  backgroundColor: "#111827",
                  border: "1px solid rgba(201,168,76,0.12)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(201,168,76,0.32)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 30px rgba(201,168,76,0.06)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(201,168,76,0.12)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  className="text-4xl font-semibold"
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    color: GOLD,
                  }}
                >
                  {s.n}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">
                  {s.t}
                </h3>
                <p
                  className="mt-2.5 text-sm leading-relaxed"
                  style={{ color: "#A0AABF" }}
                >
                  {s.d}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Hairline />

      {/* Acceso */}
      <section id="acceso" className="scroll-mt-24">
        <div className="mx-auto max-w-3xl px-6 py-28 text-center">
          <Eyebrow>Acceso</Eyebrow>
          <h2 className="mt-4 text-4xl tracking-tight sm:text-5xl">
            Acceso por invitación.
          </h2>
          <p
            className="mx-auto mt-5 max-w-xl text-lg leading-relaxed"
            style={{ color: "#A0AABF" }}
          >
            Plataforma para empresas. Solicitá tu acceso y coordinamos el
            onboarding esta semana.
          </p>
          <div className="mt-9 flex justify-center">
            <PrimaryCTA size="lg">Solicitar acceso</PrimaryCTA>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute bottom-[-220px] left-1/2 h-[360px] w-[680px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(201,168,76,0.14), transparent 70%)",
            filter: "blur(50px)",
          }}
          aria-hidden
        />
        <div className="mx-auto max-w-3xl px-6 py-28 text-center">
          <h2 className="text-4xl tracking-tight sm:text-5xl">
            ¿Listo para implementar IA en tu empresa?
          </h2>
          <p
            className="mx-auto mt-5 max-w-xl text-lg leading-relaxed"
            style={{ color: "#A0AABF" }}
          >
            Plataforma por invitación. Solicitá tu acceso y empezamos esta
            semana.
          </p>
          <div className="mt-9 flex justify-center">
            <PrimaryCTA size="lg">Solicitar acceso</PrimaryCTA>
          </div>
          <p className="mt-6 text-xs" style={{ color: "#6B7A99" }}>
            Sin tarjeta de crédito · Acceso en 24 hs · Cancelá cuando quieras
          </p>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid rgba(201,168,76,0.10)" }}>
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-4">
          <div>
            <Logo className="text-white" />
            <p className="mt-4 text-sm" style={{ color: "#6B7A99" }}>
              Hecho para empresas que crecen.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Plataforma</div>
            <div className="mt-4 space-y-2.5 text-sm" style={{ color: "#6B7A99" }}>
              <a href="#soluciones" className="block transition-colors hover:text-white">
                Soluciones
              </a>
              <a
                href="#como-funciona"
                className="block transition-colors hover:text-white"
              >
                Cómo funciona
              </a>
              <a href="#acceso" className="block transition-colors hover:text-white">
                Acceso
              </a>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Cuenta</div>
            <div className="mt-4 space-y-2.5 text-sm" style={{ color: "#6B7A99" }}>
              <Link to="/login" className="block transition-colors hover:text-white">
                Ingresar
              </Link>
              <a
                href={ACCESO_MAIL}
                className="block transition-colors hover:text-white"
              >
                Solicitar acceso
              </a>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Contacto</div>
            <div className="mt-4 space-y-2.5 text-sm" style={{ color: "#6B7A99" }}>
              <a
                href="mailto:hola@implementa.ai"
                className="block transition-colors hover:text-white"
              >
                hola@implementa.ai
              </a>
            </div>
          </div>
        </div>
        <div
          className="mx-auto max-w-6xl px-6 pb-10 text-xs"
          style={{ color: "#5A6478" }}
        >
          © {new Date().getFullYear()} Implementa AI · Hecho para empresas que
          crecen.
        </div>
      </footer>
    </div>
  );
}
