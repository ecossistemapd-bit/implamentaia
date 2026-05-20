import "./onboarding-modal.css";
import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/categories";

// ============================================================
// Implementa AI · Onboarding v6 LUNA
//
// 5 pasos · voz B2B (audiencia: dueño/decisor de empresa)
//   1. Bienvenida + perfil (nombre, empresa, rol)
//   2. Catálogo de soluciones (counter real X/93)
//   3. Herramientas para tu equipo (cursos)
//   4. Builder (placeholder Próximamente)
//   5. ¿Por dónde arrancás? (4 paths)
//
// Visual: orb estático "Luna" plateado sobre velvet negro.
// Branded como Luna (la IA de la plataforma) con caption visible.
// ============================================================

type StepIndex = 1 | 2 | 3 | 4 | 5;
type Status = "loading" | "active" | "closing" | "done";

interface Stats {
  solutionsAvailable: number;
  solutionsTotal: number;
  categories: number;
  cursos: number;
  modules: number;
}

interface Counters {
  solutionsAvailable: number;
  categories: number;
  cursos: number;
  modules: number;
}

const FALLBACK_STATS: Stats = {
  solutionsAvailable: 10,
  solutionsTotal: 93,
  categories: 8,
  cursos: 12,
  modules: 47,
};

const ROLE_OPTIONS = [
  "CEO / Founder",
  "CTO / Tech Lead",
  "COO / Operaciones",
  "CMO / Marketing",
  "CFO / Finanzas",
  "Director / Gerente",
  "Product Manager",
  "Desarrollador / Ingeniero",
  "Marketing / Growth",
  "Sales / Comercial",
  "RRHH / People",
  "Otro",
];

export function OnboardingModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [step, setStep] = useState<StepIndex>(1);
  const [prevStep, setPrevStep] = useState<StepIndex | null>(null);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Stats>(FALLBACK_STATS);
  const [counters, setCounters] = useState<Counters>({
    solutionsAvailable: 0,
    categories: 0,
    cursos: 0,
    modules: 0,
  });

  // Carga profile + stats (solutions, cursos)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [profileRes, totalRes, availRes, coursesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("onboarding_completed, full_name, company_name, role")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("solutions").select("id", { count: "exact", head: true }),
        supabase
          .from("solutions")
          .select("id", { count: "exact", head: true })
          .neq("status", "en_desarrollo"),
        (supabase as never as typeof supabase)
          .from("courses" as never)
          .select("id", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      setStats({
        solutionsTotal: totalRes.count ?? FALLBACK_STATS.solutionsTotal,
        solutionsAvailable: availRes.count ?? FALLBACK_STATS.solutionsAvailable,
        categories: CATEGORIES.length,
        cursos:
          (coursesRes as { count?: number | null }).count ??
          FALLBACK_STATS.cursos,
        modules: FALLBACK_STATS.modules,
      });
      const profile = profileRes.data as
        | {
            onboarding_completed: boolean | null;
            full_name: string | null;
            company_name: string | null;
            role: string | null;
          }
        | null;
      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.company_name) setCompanyName(profile.company_name);
      if (profile?.role) setRole(profile.role);
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

  // Counters: cuando entrás al paso 2 o 3, los números cuentan desde 0
  useEffect(() => {
    if (status !== "active") return;
    if (step !== 2 && step !== 3) return;

    const startTime = performance.now();
    const duration = 1400;
    let raf = 0;

    // Reset al entrar
    setCounters((c) => ({
      ...c,
      ...(step === 2
        ? { solutionsAvailable: 0, categories: 0 }
        : { cursos: 0, modules: 0 }),
    }));

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setCounters((c) => ({
        ...c,
        ...(step === 2
          ? {
              solutionsAvailable: Math.round(eased * stats.solutionsAvailable),
              categories: Math.round(eased * stats.categories),
            }
          : {
              cursos: Math.round(eased * stats.cursos),
              modules: Math.round(eased * stats.modules),
            }),
      }));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, step, stats]);

  // ESC para skip
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
        .update({
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          role: role || null,
        })
        .eq("id", user.id);
      setSaving(false);
      transitionTo(2);
    } else if (step < 5) {
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
    if (
      !window.confirm(
        "¿Querés saltar el tour? Podés volver a verlo desde Configuración.",
      )
    )
      return;
    finish();
  };

  const stepClass = (n: StepIndex): string => {
    if (n === step) return "iai-onb-step iai-onb-step--active";
    if (prevStep === n) {
      return n < step ? "iai-onb-step iai-onb-step--exit-left" : "iai-onb-step";
    }
    return "iai-onb-step";
  };

  const isLast = step === 5;
  const canAdvanceStep1 =
    fullName.trim().length > 0 && companyName.trim().length > 0;

  return (
    <>
      <div className="iai-onb-backdrop" aria-hidden="true" />
      <div
        className="iai-onb-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="iai-onb-title"
      >
        <div
          className={`iai-onb-modal ${status === "closing" ? "iai-onb-modal--exit" : ""}`}
        >
          <div className="iai-onb-grid">
            {/* === VISUAL PANE: Luna === */}
            <div className="iai-onb-visual">
              <LunaOrb />
              <LunaCaption />
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
                    role={role}
                    setRole={setRole}
                  />
                </div>
                <div className={stepClass(2)}>
                  <StepSoluciones stats={stats} counters={counters} />
                </div>
                <div className={stepClass(3)}>
                  <StepCursos stats={stats} counters={counters} />
                </div>
                <div className={stepClass(4)}>
                  <StepBuilder />
                </div>
                <div className={stepClass(5)}>
                  <StepPaths
                    onPath={(p) => finish(p)}
                    availableCount={stats.solutionsAvailable}
                    totalCount={stats.solutionsTotal}
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
                <button
                  onClick={skip}
                  className="iai-onb-btn iai-onb-btn--ghost"
                  type="button"
                >
                  Saltar tour
                </button>
              )}
              {step > 1 && (
                <button
                  onClick={goBack}
                  className="iai-onb-btn iai-onb-btn--secondary"
                  type="button"
                >
                  ← Atrás
                </button>
              )}
              <button
                onClick={goNext}
                disabled={(step === 1 && !canAdvanceStep1) || saving}
                className="iai-onb-btn iai-onb-btn--primary"
                type="button"
              >
                {saving ? "Guardando…" : isLast ? "Comenzar →" : "Continuar →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// LUNA · orb estático plateado premium
// ============================================================
function LunaOrb() {
  return (
    <div className="iai-onb-orb-static">
      <div className="iai-onb-orb">
        <div className="iai-onb-orb-craters" />
        <div className="iai-onb-orb-shine-1" />
        <div className="iai-onb-orb-shine-2" />
      </div>
    </div>
  );
}

function LunaCaption() {
  return (
    <div className="iai-onb-caption">
      <div className="iai-onb-caption-label">Tu IA</div>
      <div className="iai-onb-caption-name">LUNA</div>
      <div className="iai-onb-caption-tag">Implementa AI</div>
    </div>
  );
}

// ============================================================
// STEP COMPONENTS
// ============================================================

function StepWelcome({
  fullName,
  setFullName,
  companyName,
  setCompanyName,
  role,
  setRole,
}: {
  fullName: string;
  setFullName: Dispatch<SetStateAction<string>>;
  companyName: string;
  setCompanyName: Dispatch<SetStateAction<string>>;
  role: string;
  setRole: Dispatch<SetStateAction<string>>;
}) {
  return (
    <>
      <div className="iai-onb-label">Bienvenida · Paso 1 de 5</div>
      <h1 id="iai-onb-title" className="iai-onb-title">
        Bienvenido a Implementa AI
      </h1>
      <p className="iai-onb-sub">
        La plataforma de IA para empresas que quieren resultados, no demos.
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
      <div className="iai-onb-field">
        <label htmlFor="iai-onb-role">Tu rol en la empresa</label>
        <select
          id="iai-onb-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Seleccioná…</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function StepSoluciones({
  stats,
  counters,
}: {
  stats: Stats;
  counters: Counters;
}) {
  return (
    <>
      <div className="iai-onb-label">Catálogo · Paso 2 de 5</div>
      <h1 className="iai-onb-title">
        +{stats.solutionsTotal - 3} soluciones de IA listas para activar en tu empresa
      </h1>
      <p className="iai-onb-sub">
        Cada una probada en empresas reales. Activación en minutos, no meses.
      </p>
      <div className="iai-onb-stats">
        <div className="iai-onb-stat">
          <div className="iai-onb-stat-num">
            {counters.solutionsAvailable}
            <span className="iai-onb-stat-total">/{stats.solutionsTotal}</span>
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

function StepCursos({
  stats,
  counters,
}: {
  stats: Stats;
  counters: Counters;
}) {
  return (
    <>
      <div className="iai-onb-label">Herramientas para tu equipo · Paso 3 de 5</div>
      <h1 className="iai-onb-title">Que tu equipo no dependa de externos</h1>
      <p className="iai-onb-sub">
        Cursos prácticos sobre las herramientas que tu equipo va a usar para
        implementar y mantener las soluciones.
      </p>
      <div className="iai-onb-stats">
        <div className="iai-onb-stat">
          <div className="iai-onb-stat-num">{counters.cursos}</div>
          <div className="iai-onb-stat-label">Cursos</div>
        </div>
        <div className="iai-onb-stat">
          <div className="iai-onb-stat-num">{counters.modules}</div>
          <div className="iai-onb-stat-label">Módulos</div>
        </div>
      </div>
      <div className="iai-onb-mini-cards">
        <div className="iai-onb-mini">
          <div className="iai-onb-mini-orb iai-onb-mini-orb--lovable" />
          <div className="iai-onb-mini-cat">Formación</div>
          <div className="iai-onb-mini-title">Lovable</div>
        </div>
        <div className="iai-onb-mini">
          <div className="iai-onb-mini-orb iai-onb-mini-orb--claude" />
          <div className="iai-onb-mini-cat">Formación</div>
          <div className="iai-onb-mini-title">Claude</div>
        </div>
        <div className="iai-onb-mini">
          <div className="iai-onb-mini-orb iai-onb-mini-orb--n8n" />
          <div className="iai-onb-mini-cat">Formación</div>
          <div className="iai-onb-mini-title">n8n</div>
        </div>
      </div>
      <p className="iai-onb-sub-sm">Acceso compartido para todo tu equipo.</p>
    </>
  );
}

function StepBuilder() {
  return (
    <>
      <div className="iai-onb-label">Construcción a medida · Paso 4 de 5</div>
      <h1 className="iai-onb-title">
        Cuando ninguna solución encaja, tu equipo la construye
      </h1>
      <p className="iai-onb-sub">
        El Builder reemplaza la necesidad de contratar agencias externas. Tu
        equipo arma soluciones a medida sin código.
      </p>
      <div className="iai-onb-builder-mock">
        <div className="iai-onb-bline iai-onb-bline-1" />
        <div className="iai-onb-bline iai-onb-bline-2" />
        <div className="iai-onb-bline iai-onb-bline-3" />
        <div className="iai-onb-bnode iai-onb-bnode-1">Input</div>
        <div className="iai-onb-bnode iai-onb-bnode-2">IA</div>
        <div className="iai-onb-bnode iai-onb-bnode-3">Output</div>
        <div className="iai-onb-bnode iai-onb-bnode-4">CRM</div>
        <div className="iai-onb-bnode iai-onb-bnode-5">WhatsApp</div>
        <div className="iai-onb-bdot" />
        <div className="iai-onb-bdot iai-onb-bdot--2" />
      </div>
      <div className="iai-onb-brow">
        <span className="iai-onb-bbadge">Próximamente</span>
        <div className="iai-onb-bfeatures">
          <span>Sin código</span>
          <span>Visual</span>
          <span>Reemplaza agencias</span>
        </div>
      </div>
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
      <div className="iai-onb-label">Empezá ahora · Paso 5 de 5</div>
      <h1 className="iai-onb-title">¿Por dónde arrancás?</h1>
      <p className="iai-onb-sub">
        Elegí tu primera acción. Podés cambiar el camino cuando quieras.
      </p>
      <div className="iai-onb-paths">
        <button
          type="button"
          className="iai-onb-path"
          onClick={() => onPath("/solutions")}
        >
          <div className="iai-onb-pico">⭐</div>
          <div className="iai-onb-pt">
            <div className="iai-onb-pt-title">Activar mi primera solución</div>
            <div className="iai-onb-pt-sub">
              Las {availableCount} más implementadas, ROI rápido
            </div>
          </div>
          <div className="iai-onb-parrow">→</div>
        </button>
        <button
          type="button"
          className="iai-onb-path"
          onClick={() => onPath("/solutions")}
        >
          <div className="iai-onb-pico">📂</div>
          <div className="iai-onb-pt">
            <div className="iai-onb-pt-title">
              Explorar las {totalCount} por categoría
            </div>
            <div className="iai-onb-pt-sub">
              Ventas, Marketing, RRHH, Finanzas, Operaciones, Atención…
            </div>
          </div>
          <div className="iai-onb-parrow">→</div>
        </button>
        <button
          type="button"
          className="iai-onb-path"
          onClick={() => onPath("/cursos")}
        >
          <div className="iai-onb-pico">🎓</div>
          <div className="iai-onb-pt">
            <div className="iai-onb-pt-title">Ver los cursos para mi equipo</div>
            <div className="iai-onb-pt-sub">
              Lovable, Claude, n8n y más — acceso compartido
            </div>
          </div>
          <div className="iai-onb-parrow">→</div>
        </button>
        <button
          type="button"
          className="iai-onb-path"
          onClick={() => onPath("/solutions")}
          aria-disabled="true"
        >
          <div className="iai-onb-pico">🛠️</div>
          <div className="iai-onb-pt">
            <div className="iai-onb-pt-title">
              Abrir el Builder
              <span className="iai-onb-pt-badge">Próximamente</span>
            </div>
            <div className="iai-onb-pt-sub">
              Para soluciones a medida sin código
            </div>
          </div>
          <div className="iai-onb-parrow">→</div>
        </button>
      </div>
    </>
  );
}

function ProgressDots({ step }: { step: StepIndex }) {
  return (
    <div className="iai-onb-dots">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={`iai-onb-dot ${n === step ? "iai-onb-dot--active" : ""}`}
          aria-current={n === step ? "step" : undefined}
        />
      ))}
    </div>
  );
}
