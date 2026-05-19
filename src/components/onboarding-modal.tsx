import "./onboarding-modal.css";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/categories";

// ============================================================
// Implementa AI · Onboarding Premium
// 4 pasos con orb planetario animado · theme-aware · Supabase.
// El render solo se monta si profiles.onboarding_completed = false.
// Animaciones declarativas en onboarding-modal.css, lógica acá.
// ============================================================

type StepIndex = 1 | 2 | 3 | 4;
type Status = "loading" | "active" | "closing" | "done";

interface Stats {
  available: number;
  total: number;
  categories: number;
}

interface Counters {
  available: number;
  categories: number;
}

const FALLBACK_STATS: Stats = { available: 10, total: 93, categories: 8 };

export function OnboardingModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [step, setStep] = useState<StepIndex>(1);
  const [prevStep, setPrevStep] = useState<StepIndex | null>(null);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Stats>(FALLBACK_STATS);
  const [counters, setCounters] = useState<Counters>({ available: 0, categories: 0 });

  const visualPaneRef = useRef<HTMLDivElement>(null);
  const orbWrapperRef = useRef<HTMLDivElement>(null);
  const sparklesRef = useRef<HTMLDivElement>(null);

  // Chequea si el user necesita onboarding + carga stats reales del catálogo
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [profileRes, totalRes, availRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("onboarding_completed, full_name, company_name")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("solutions").select("id", { count: "exact", head: true }),
        supabase
          .from("solutions")
          .select("id", { count: "exact", head: true })
          .neq("status", "en_desarrollo"),
      ]);
      if (cancelled) return;
      setStats({
        total: totalRes.count ?? FALLBACK_STATS.total,
        available: availRes.count ?? FALLBACK_STATS.available,
        categories: CATEGORIES.length,
      });
      const profile = profileRes.data;
      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.company_name) setCompanyName(profile.company_name);
      if (!profile || profile.onboarding_completed) {
        setStatus("done");
      } else {
        setStatus("active");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Counter animation cuando entra al paso 2
  useEffect(() => {
    if (status !== "active" || step !== 2) return;
    const startTime = performance.now();
    const duration = 1400;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setCounters({
        available: Math.round(eased * stats.available),
        categories: Math.round(eased * stats.categories),
      });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setCounters({ available: 0, categories: 0 });
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, step, stats]);

  // Mouse parallax sobre el orb (max 10px de drift en x/y)
  useEffect(() => {
    if (status !== "active") return;
    const pane = visualPaneRef.current;
    const wrapper = orbWrapperRef.current;
    if (!pane || !wrapper) return;
    const onMove = (e: MouseEvent) => {
      const rect = pane.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      wrapper.style.transform = `translate(${x * 10}px, ${y * 10}px)`;
    };
    const onLeave = () => {
      wrapper.style.transform = "";
    };
    pane.addEventListener("mousemove", onMove);
    pane.addEventListener("mouseleave", onLeave);
    return () => {
      pane.removeEventListener("mousemove", onMove);
      pane.removeEventListener("mouseleave", onLeave);
    };
  }, [status]);

  // Spawneador de sparkles random alrededor del orb
  useEffect(() => {
    if (status !== "active") return;
    const container = sparklesRef.current;
    if (!container) return;
    let alive = true;
    const spawn = () => {
      if (!alive || !container) return;
      const sparkle = document.createElement("div");
      sparkle.className = "iai-onb-sparkle";
      const angle = Math.random() * Math.PI * 2;
      const radius = 110 + Math.random() * 90;
      const x = 50 + (Math.cos(angle) * radius) / 4;
      const y = 50 + (Math.sin(angle) * radius) / 4;
      sparkle.style.left = `${x}%`;
      sparkle.style.top = `${y}%`;
      const size = 2 + Math.random() * 4;
      sparkle.style.width = `${size}px`;
      sparkle.style.height = `${size}px`;
      sparkle.style.animationDuration = `${1.4 + Math.random() * 1.6}s`;
      container.appendChild(sparkle);
      window.setTimeout(() => sparkle.remove(), 2200);
    };
    const interval = window.setInterval(() => {
      const burst = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < burst; i++) window.setTimeout(spawn, i * 80);
    }, 700);
    for (let i = 0; i < 5; i++) window.setTimeout(spawn, i * 200);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [status]);

  // ESC para skip rápido
  useEffect(() => {
    if (status !== "active") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status === "loading" || status === "done" || !user) return null;

  const goNext = async () => {
    if (step === 1) {
      if (!fullName.trim() || !companyName.trim()) return;
      setSaving(true);
      await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), company_name: companyName.trim() })
        .eq("id", user.id);
      setSaving(false);
      transitionTo(2);
    } else if (step < 4) {
      transitionTo((step + 1) as StepIndex);
    } else {
      finish("/solutions");
    }
  };

  const goBack = () => {
    if (step > 1) transitionTo((step - 1) as StepIndex);
  };

  const transitionTo = (next: StepIndex) => {
    setPrevStep(step);
    setStep(next);
    window.setTimeout(() => setPrevStep(null), 500);
  };

  const finish = async (path?: "/solutions" | "/cursos" | "/projects") => {
    setStatus("closing");
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
    window.setTimeout(() => {
      setStatus("done");
      if (path) navigate({ to: path });
    }, 400);
  };

  const skip = () => {
    if (!window.confirm("¿Querés saltar el tour? Podés volver a verlo desde Configuración.")) return;
    finish();
  };

  const stepClass = (n: StepIndex): string => {
    if (n === step) return "iai-onb-step iai-onb-step--active";
    if (prevStep === n) {
      return n < step ? "iai-onb-step iai-onb-step--exit-left" : "iai-onb-step";
    }
    return "iai-onb-step";
  };

  const isLast = step === 4;
  const canAdvanceStep1 = fullName.trim().length > 0 && companyName.trim().length > 0;

  return (
    <>
      <div className="iai-onb-backdrop" aria-hidden="true" />
      <div className="iai-onb-container" role="dialog" aria-modal="true" aria-labelledby="iai-onb-title">
        <div className={`iai-onb-modal ${status === "closing" ? "iai-onb-modal--exit" : ""}`}>
          <div className="iai-onb-grid">
            {/* === VISUAL PANE === */}
            <div className="iai-onb-visual" ref={visualPaneRef}>
              <OrbVisual orbWrapperRef={orbWrapperRef} sparklesRef={sparklesRef} />
            </div>

            {/* === CONTENT PANE === */}
            <div className="iai-onb-content">
              <div className="iai-onb-steps">
                <div className={stepClass(1)}>
                  <StepWelcome
                    fullName={fullName}
                    setFullName={setFullName}
                    companyName={companyName}
                    setCompanyName={setCompanyName}
                  />
                </div>
                <div className={stepClass(2)}>
                  <StepCatalog stats={stats} counters={counters} />
                </div>
                <div className={stepClass(3)}>
                  <StepJourney />
                </div>
                <div className={stepClass(4)}>
                  <StepPaths
                    onPath={(p) => finish(p)}
                    availableCount={stats.available}
                    totalCount={stats.total}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* === FOOTER === */}
          <div className="iai-onb-footer">
            <ProgressDots step={step} />
            <div className="iai-onb-actions">
              {!isLast && (
                <button onClick={skip} className="iai-onb-btn iai-onb-btn--ghost" type="button">
                  Saltar tour
                </button>
              )}
              {step > 1 && (
                <button onClick={goBack} className="iai-onb-btn iai-onb-btn--secondary" type="button">
                  ← Atrás
                </button>
              )}
              <button
                onClick={goNext}
                disabled={(step === 1 && !canAdvanceStep1) || saving}
                className="iai-onb-btn iai-onb-btn--primary"
                type="button"
              >
                {saving ? "Guardando…" : isLast ? "Comenzar mi journey →" : "Continuar →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function OrbVisual({
  orbWrapperRef,
  sparklesRef,
}: {
  orbWrapperRef: RefObject<HTMLDivElement | null>;
  sparklesRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="iai-onb-orb-wrap" ref={orbWrapperRef}>
      {/* Sonar pulse waves */}
      <div className="iai-onb-pulse" />
      <div className="iai-onb-pulse" />
      <div className="iai-onb-pulse" />

      {/* Orbits with orbiting lights */}
      <div className="iai-onb-orbit iai-onb-orbit-3">
        <div className="iai-onb-light iai-onb-light--small" />
        <div className="iai-onb-light iai-onb-light--small iai-onb-light--br" />
      </div>
      <div className="iai-onb-orbit iai-onb-orbit-2">
        <div className="iai-onb-light" />
        <div className="iai-onb-light iai-onb-light--bottom" />
      </div>
      <div className="iai-onb-orbit iai-onb-orbit-1">
        <div className="iai-onb-light" />
        <div className="iai-onb-light iai-onb-light--right" />
        <div className="iai-onb-light iai-onb-light--tl" />
      </div>

      {/* Orb with internal layers */}
      <div className="iai-onb-orb">
        <div className="iai-onb-aurora" />
        <div className="iai-onb-surface" />
        <div className="iai-onb-clouds" />
        <div className="iai-onb-mesh" />
        <div className="iai-onb-shine" />
        <div className="iai-onb-flare" />
      </div>

      {/* Sparkles container — JS inyecta sparkles efímeros acá */}
      <div className="iai-onb-sparkles" ref={sparklesRef} />
    </div>
  );
}

function StepWelcome({
  fullName,
  setFullName,
  companyName,
  setCompanyName,
}: {
  fullName: string;
  setFullName: Dispatch<SetStateAction<string>>;
  companyName: string;
  setCompanyName: Dispatch<SetStateAction<string>>;
}) {
  return (
    <>
      <div className="iai-onb-label">Bienvenida · Paso 1 de 4</div>
      <h1 id="iai-onb-title" className="iai-onb-title">
        Bienvenido a Implementa AI
      </h1>
      <p className="iai-onb-sub">
        El marketplace de soluciones de IA reales para tu empresa. Te ayudamos a implementar, no solo a probar.
      </p>
      <div className="iai-onb-field">
        <label htmlFor="iai-onb-name">Tu nombre completo</label>
        <input
          id="iai-onb-name"
          type="text"
          placeholder="María González"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="iai-onb-field">
        <label htmlFor="iai-onb-company">Nombre de tu empresa</label>
        <input
          id="iai-onb-company"
          type="text"
          placeholder="Mi Empresa S.A."
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          autoComplete="organization"
        />
      </div>
    </>
  );
}

function StepCatalog({ stats, counters }: { stats: Stats; counters: Counters }) {
  return (
    <>
      <div className="iai-onb-label">Catálogo · Paso 2 de 4</div>
      <h1 className="iai-onb-title">+{stats.total - 3} soluciones reales, no demos</h1>
      <p className="iai-onb-sub">
        Construidas y probadas en empresas reales. Disponibles ahora, el resto van llegando.
      </p>
      <div className="iai-onb-stats">
        <div className="iai-onb-stat">
          <div className="iai-onb-stat-num">
            {counters.available}
            <span className="iai-onb-stat-total">/{stats.total}</span>
          </div>
          <div className="iai-onb-stat-label">Disponibles ahora</div>
        </div>
        <div className="iai-onb-stat">
          <div className="iai-onb-stat-num">{counters.categories}</div>
          <div className="iai-onb-stat-label">Categorías</div>
        </div>
      </div>
      <div className="iai-onb-mini-cards">
        <div className="iai-onb-mini">
          <div className="iai-onb-mini-orb" />
          <div className="iai-onb-mini-cat">Ventas</div>
          <div className="iai-onb-mini-title">SDR con IA</div>
        </div>
        <div className="iai-onb-mini">
          <div className="iai-onb-mini-orb" />
          <div className="iai-onb-mini-cat">Marketing</div>
          <div className="iai-onb-mini-title">Clip.AI</div>
        </div>
        <div className="iai-onb-mini">
          <div className="iai-onb-mini-orb" />
          <div className="iai-onb-mini-cat">Operaciones</div>
          <div className="iai-onb-mini-title">Backlog AI</div>
        </div>
      </div>
    </>
  );
}

function StepJourney() {
  return (
    <>
      <div className="iai-onb-label">Implementación · Paso 3 de 4</div>
      <h1 className="iai-onb-title">Tu camino paso a paso</h1>
      <p className="iai-onb-sub">
        Cada solución te guía desde las herramientas hasta tener algo funcionando, sin perderte en la teoría.
      </p>
      <div className="iai-onb-journey">
        <div className="iai-onb-jstep iai-onb-jstep--done">
          <div className="iai-onb-jicon">🔧</div>
          <div className="iai-onb-jlabel">Herramientas</div>
        </div>
        <div className="iai-onb-jstep iai-onb-jstep--active">
          <div className="iai-onb-jicon">📁</div>
          <div className="iai-onb-jlabel">Archivos</div>
        </div>
        <div className="iai-onb-jstep">
          <div className="iai-onb-jicon">▶</div>
          <div className="iai-onb-jlabel">Video</div>
        </div>
        <div className="iai-onb-jstep">
          <div className="iai-onb-jicon">💬</div>
          <div className="iai-onb-jlabel">Comentarios</div>
        </div>
        <div className="iai-onb-jstep">
          <div className="iai-onb-jicon">🏆</div>
          <div className="iai-onb-jlabel">Conclusión</div>
        </div>
      </div>
      <p className="iai-onb-sub" style={{ fontSize: "13px" }}>
        La plataforma guarda tu progreso y te lleva donde lo dejaste, hasta en otro dispositivo.
      </p>
    </>
  );
}

function StepPaths({
  onPath,
  availableCount,
  totalCount,
}: {
  onPath: (p: "/solutions" | "/cursos" | "/projects") => void;
  availableCount: number;
  totalCount: number;
}) {
  return (
    <>
      <div className="iai-onb-label">Empezá ahora · Paso 4 de 4</div>
      <h1 className="iai-onb-title">¿Por dónde arrancás?</h1>
      <p className="iai-onb-sub">
        Elegí cómo querés explorar la plataforma. Podés cambiar de camino cuando quieras.
      </p>
      <div className="iai-onb-paths">
        <button type="button" className="iai-onb-path" onClick={() => onPath("/solutions")}>
          <div className="iai-onb-pico">⭐</div>
          <div className="iai-onb-pt">
            <div className="iai-onb-pt-title">Ver las Más Implementadas</div>
            <div className="iai-onb-pt-sub">
              {availableCount} soluciones ya disponibles que más empresas pusieron en producción
            </div>
          </div>
          <div className="iai-onb-parrow">→</div>
        </button>
        <button type="button" className="iai-onb-path" onClick={() => onPath("/solutions")}>
          <div className="iai-onb-pico">📂</div>
          <div className="iai-onb-pt">
            <div className="iai-onb-pt-title">Explorar las {totalCount} por categoría</div>
            <div className="iai-onb-pt-sub">Ventas, Marketing, RRHH, Finanzas, Operaciones, Atención…</div>
          </div>
          <div className="iai-onb-parrow">→</div>
        </button>
        <button type="button" className="iai-onb-path" onClick={() => onPath("/cursos")}>
          <div className="iai-onb-pico">🎓</div>
          <div className="iai-onb-pt">
            <div className="iai-onb-pt-title">Aprender primero con cursos</div>
            <div className="iai-onb-pt-sub">Lovable, Claude, n8n — bases antes de implementar</div>
          </div>
          <div className="iai-onb-parrow">→</div>
        </button>
      </div>
      <p className="iai-onb-disclaimer">
        {availableCount} disponibles ahora · {totalCount - availableCount} llegando · cero downtime al activarse.
      </p>
    </>
  );
}

function ProgressDots({ step }: { step: StepIndex }) {
  return (
    <div className="iai-onb-dots">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`iai-onb-dot ${n === step ? "iai-onb-dot--active" : ""}`}
          aria-current={n === step ? "step" : undefined}
        />
      ))}
    </div>
  );
}
