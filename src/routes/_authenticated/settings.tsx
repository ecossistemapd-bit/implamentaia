import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Camera,
  Sparkles,
  Check,
  LogOut,
  Upload,
  Loader2,
  Globe,
  Mail,
  Lock,
  Sun,
  Moon,
  Bell,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePlan } from "@/hooks/use-plan";
import { useAvatarUrl } from "@/hooks/use-avatar-url";
import { PLANS, PLAN_LABEL, type PlanKey } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type ProfileRow = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  industry: string | null;
  team_size: string | null;
  bio: string | null;
  role_title: string | null;
  website: string | null;
  avatar_url: string | null;
  created_at: string;
};

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { plan, mentorshipTicketsRemaining } = usePlan();

  // ── Profile load ─────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile-full", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, industry, team_size, bio, role_title, website, avatar_url, created_at")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProfileRow | null;
    },
  });

  // ── Stats (cursos + lecciones) ───────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ["profile-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Lecciones completadas
      const { data: progress } = await supabase
        .from("user_progress" as never)
        .select("lesson_id, module_id, completed")
        .eq("user_id", user!.id);
      const rows = (progress ?? []) as Array<{
        lesson_id: string | null;
        module_id: string | null;
        completed: boolean;
      }>;
      const completedLessons = rows.filter((r) => r.completed).length;

      // Cursos completados (todos los modules de un course con todas sus lessons done)
      // Simplificación: traer modules + lessons y calcular en cliente.
      const { data: modules } = await supabase
        .from("modules" as never)
        .select("id, course_id");
      const { data: lessons } = await supabase
        .from("lessons" as never)
        .select("id, module_id");
      const mods = (modules ?? []) as Array<{ id: string; course_id: string }>;
      const lsns = (lessons ?? []) as Array<{ id: string; module_id: string }>;
      const completedSet = new Set(
        rows.filter((r) => r.completed && r.lesson_id).map((r) => r.lesson_id!),
      );
      const lessonsByCourse = new Map<string, string[]>();
      lsns.forEach((l) => {
        const mod = mods.find((m) => m.id === l.module_id);
        if (!mod) return;
        const arr = lessonsByCourse.get(mod.course_id) ?? [];
        arr.push(l.id);
        lessonsByCourse.set(mod.course_id, arr);
      });
      let completedCourses = 0;
      lessonsByCourse.forEach((lessonIds) => {
        if (lessonIds.length > 0 && lessonIds.every((id) => completedSet.has(id))) {
          completedCourses += 1;
        }
      });

      const { count: totalCoursesCount } = await supabase
        .from("courses" as never)
        .select("id", { count: "exact", head: true })
        .eq("is_published", true);

      return {
        completedLessons,
        completedCourses,
        totalCourses: totalCoursesCount ?? 0,
      };
    },
  });

  // ── Form state ───────────────────────────────────────────────
  const [form, setForm] = useState({
    full_name: "",
    role_title: "",
    bio: "",
    company_name: "",
    industry: "",
    team_size: "",
    website: "",
  });
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        role_title: profile.role_title ?? "",
        bio: profile.bio ?? "",
        company_name: profile.company_name ?? "",
        industry: profile.industry ?? "",
        team_size: profile.team_size ?? "",
        website: profile.website ?? "",
      });
      setAvatarPath(profile.avatar_url ?? null);
      setDirty(false);
    }
  }, [profile]);

  const updateField = (key: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [key]: v }));
    setDirty(true);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ ...form, avatar_url: avatarPath })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Error: " + error.message);
      return;
    }
    toast.success("✓ Cambios guardados");
    qc.invalidateQueries({ queryKey: ["profile-full"] });
    setDirty(false);
  };

  const reset = () => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        role_title: profile.role_title ?? "",
        bio: profile.bio ?? "",
        company_name: profile.company_name ?? "",
        industry: profile.industry ?? "",
        team_size: profile.team_size ?? "",
        website: profile.website ?? "",
      });
      setAvatarPath(profile.avatar_url ?? null);
      setDirty(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const initials = useMemo(() => {
    const name = (form.full_name || user?.email || "").trim();
    if (!name) return "·";
    const parts = name.split(/\s+/);
    return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  }, [form.full_name, user?.email]);

  const memberSince = useMemo(() => {
    if (!profile?.created_at) return "—";
    const d = new Date(profile.created_at);
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
  }, [profile?.created_at]);

  if (profileLoading) {
    return (
      <div className="mx-auto max-w-[1340px] px-8 py-8">
        <div className="app-card h-40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1340px] px-8 py-8">
      {/* Header */}
      <div>
        <span className="app-pill-violet inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em]">
          Mi cuenta
        </span>
        <h1 className="mt-4 text-[44px] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground">
          Tu perfil
        </h1>
        <p className="page-subtitle mt-2">
          Gestioná tus datos, tu plan y tu progreso en Implementa AI.
        </p>
      </div>

      {/* Grid 2 columnas */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        {/* ── COLUMNA IZQUIERDA ────────────────────────────────── */}
        <aside className="flex flex-col gap-4">
          <AvatarHero
            initials={initials}
            name={form.full_name || "Sin nombre"}
            email={user?.email ?? ""}
            avatarPath={avatarPath}
            onAvatarChange={(p) => {
              setAvatarPath(p);
              setDirty(true);
            }}
            userId={user?.id ?? ""}
            planKey={plan.key}
          />

          <StatsCard
            completedCourses={stats?.completedCourses ?? 0}
            totalCourses={stats?.totalCourses ?? 0}
            completedLessons={stats?.completedLessons ?? 0}
            mentorshipTickets={mentorshipTicketsRemaining}
            mentorshipQuota={plan.quotas.mentorshipTicketsPerMonth}
            memberSince={memberSince}
          />

          <PlanCard planKey={plan.key} />
        </aside>

        {/* ── COLUMNA DERECHA ──────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <Section
            title="Información personal"
            subtitle="Tus datos básicos como aparecen en la plataforma."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre completo">
                <Input value={form.full_name} onChange={(v) => updateField("full_name", v)} placeholder="Tu nombre" />
              </Field>
              <Field label="Rol">
                <Input value={form.role_title} onChange={(v) => updateField("role_title", v)} placeholder="Ej. Fundador / CEO" />
              </Field>
              <Field label="Bio" colSpan>
                <Textarea
                  value={form.bio}
                  onChange={(v) => updateField("bio", v)}
                  placeholder="Contanos en una o dos líneas qué hacés."
                  rows={3}
                />
              </Field>
            </div>
          </Section>

          <Section title="Empresa" subtitle="Para personalizarte recomendaciones de soluciones.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre de la empresa">
                <Input value={form.company_name} onChange={(v) => updateField("company_name", v)} placeholder="Ej. Implementa AI" />
              </Field>
              <Field label="Industria">
                <Input value={form.industry} onChange={(v) => updateField("industry", v)} placeholder="Ej. Tecnología" />
              </Field>
              <Field label="Tamaño del equipo">
                <Input value={form.team_size} onChange={(v) => updateField("team_size", v)} placeholder="Ej. 10–50" />
              </Field>
              <Field label="Sitio web">
                <InputWithIcon
                  icon={<Globe className="h-4 w-4" />}
                  value={form.website}
                  onChange={(v) => updateField("website", v)}
                  placeholder="implementaia.com"
                />
              </Field>
            </div>
          </Section>

          <PreferencesSection />

          <AccountSection email={user?.email ?? ""} onLogout={logout} />

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2.5 px-1 py-2">
            {dirty && (
              <button onClick={reset} disabled={saving} className="app-cta-ghost">
                Cancelar
              </button>
            )}
            <button onClick={save} disabled={saving || !dirty} className="app-cta-primary disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AVATAR HERO
// ─────────────────────────────────────────────────────────────
function AvatarHero({
  initials,
  name,
  email,
  avatarPath,
  onAvatarChange,
  userId,
  planKey,
}: {
  initials: string;
  name: string;
  email: string;
  avatarPath: string | null;
  onAvatarChange: (path: string | null) => void;
  userId: string;
  planKey: PlanKey;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const previewUrl = useAvatarUrl(avatarPath);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Solo imágenes.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Máximo 5 MB.");
    if (!userId) return toast.error("Usuario no autenticado.");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${userId}/avatar.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      onAvatarChange(path);
      toast.success("Foto actualizada");
    } catch (e) {
      toast.error("Error al subir: " + (e instanceof Error ? e.message : "desconocido"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="app-card relative overflow-hidden p-7 text-center">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {/* Glow violeta detrás del avatar */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-7 h-36 w-36 -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.30) 0%, transparent 60%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative mx-auto inline-block">
        <div
          className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full text-[34px] font-semibold uppercase text-white"
          style={{
            background: previewUrl
              ? "transparent"
              : "linear-gradient(135deg, #6D28D9, #A78BFA)",
            border: "3px solid var(--card)",
            boxShadow: "0 0 0 1px var(--violet-border-hover), 0 0 28px -4px rgba(139,92,246,0.45)",
            letterSpacing: "-0.02em",
          }}
        >
          {previewUrl ? (
            <img src={previewUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:scale-105"
          style={{
            background: "var(--card)",
            borderColor: "var(--violet-border-hover)",
            color: "var(--violet-text)",
          }}
          title="Cambiar foto"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </button>
      </div>

      <h2 className="mt-4 text-[20px] font-semibold tracking-tight text-foreground">{name}</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{email}</p>

      <div className="mt-4">
        <span className="app-pill-violet inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
          <Sparkles className="h-3 w-3" /> Plan {PLAN_LABEL[planKey]}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STATS CARD
// ─────────────────────────────────────────────────────────────
function StatsCard({
  completedCourses,
  totalCourses,
  completedLessons,
  mentorshipTickets,
  mentorshipQuota,
  memberSince,
}: {
  completedCourses: number;
  totalCourses: number;
  completedLessons: number;
  mentorshipTickets: number;
  mentorshipQuota: number;
  memberSince: string;
}) {
  const pct = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
  return (
    <div className="app-card p-6">
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Mi progreso
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[13px] text-muted-foreground">Cursos completados</span>
        <span className="text-[14px] font-semibold tabular-nums text-foreground">
          <span style={{ color: "var(--violet-text)" }}>{completedCourses}</span>
          <span className="text-muted-foreground"> / {totalCourses}</span>
        </span>
      </div>
      <div className="app-progress-track mt-2.5">
        <div className="app-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <Hairline className="my-4" />
      <StatRow label="Lecciones vistas" value={String(completedLessons)} />
      <Hairline className="my-3" />
      <StatRow
        label="Mentorías"
        value={
          mentorshipQuota > 0
            ? `${mentorshipTickets} / ${mentorshipQuota} este mes`
            : "— (no incluido)"
        }
        muted={mentorshipQuota === 0}
      />
      <Hairline className="my-3" />
      <StatRow label="Miembro desde" value={memberSince} />
    </div>
  );
}

function StatRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span
        className={`text-[14px] font-semibold tabular-nums ${muted ? "text-muted-foreground" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PLAN CARD
// ─────────────────────────────────────────────────────────────
function PlanCard({ planKey }: { planKey: PlanKey }) {
  const planDef = PLANS[planKey];
  const isEnterprise = planKey === "enterprise";

  const visibleFeatures = [
    { ok: planDef.features.academia, label: "Acceso completo a la Academia" },
    { ok: planDef.features.builder, label: "Builder de soluciones IA" },
    { ok: planDef.features.catalogo, label: "Catálogo de 100+ soluciones" },
    { ok: planDef.features.mentorias, label: "Mentorías diarias en vivo" },
  ];

  return (
    <div className="app-card relative overflow-hidden p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.20) 0%, transparent 60%)",
          filter: "blur(20px)",
        }}
      />
      <div className="relative">
        <div className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--violet-text-strong)" }}>
          Tu plan actual
        </div>
        <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-foreground">
          {planDef.name}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{planDef.tagline}</p>

        <ul className="mt-5 space-y-2.5">
          {visibleFeatures.filter((f) => f.ok).map((f) => (
            <li key={f.label} className="flex items-start gap-2.5 text-[13px] text-foreground/90">
              <span
                className="mt-[3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--violet-pill-bg)", border: "1px solid var(--violet-border-hover)" }}
              >
                <Check className="h-2.5 w-2.5" style={{ color: "var(--violet-text)" }} strokeWidth={3} />
              </span>
              {f.label}
            </li>
          ))}
        </ul>

        {!isEnterprise && (
          <a
            href="https://implementaia.com/#planes"
            target="_blank"
            rel="noopener noreferrer"
            className="app-cta-primary mt-6 w-full justify-center"
          >
            <Sparkles className="h-4 w-4" />
            {planKey === "starter" ? "Mejorá a Pro" : "Mejorá a Enterprise"}
          </a>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECCIONES de la columna derecha
// ─────────────────────────────────────────────────────────────
function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="app-card p-7">
      <div>
        <h2 className="text-[18px] font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({ label, colSpan, children }: { label: string; colSpan?: boolean; children: ReactNode }) {
  return (
    <div className={colSpan ? "sm:col-span-2" : ""}>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-lg border bg-muted px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-[var(--violet-border-hover)]"
      style={{ borderColor: "var(--border)" }}
    />
  );
}

function InputWithIcon({
  icon,
  value,
  onChange,
  placeholder,
}: {
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border bg-muted pl-10 pr-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-[var(--violet-border-hover)]"
        style={{ borderColor: "var(--border)" }}
      />
    </div>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border bg-muted p-3 text-[14px] text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-[var(--violet-border-hover)]"
      style={{ borderColor: "var(--border)" }}
    />
  );
}

function Hairline({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-px w-full ${className}`}
      style={{
        background: "linear-gradient(90deg, transparent, var(--border) 20%, var(--border) 80%, transparent)",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// PREFERENCIAS
// ─────────────────────────────────────────────────────────────
function PreferencesSection() {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return document.documentElement.classList.contains("dark");
  });
  const [emailNotif, setEmailNotif] = useState(true);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <Section title="Preferencias" subtitle="Personalizá cómo querés ver la plataforma.">
      <RowToggle
        icon={dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        title="Tema"
        description="Claro u oscuro"
        action={
          <button onClick={toggleTheme} className="app-cta-ghost !py-2 !px-3.5 !text-[12px]">
            {dark ? "Oscuro" : "Claro"}
          </button>
        }
      />
      <Hairline className="my-3" />
      <RowToggle
        icon={<Bell className="h-4 w-4" />}
        title="Notificaciones por email"
        description="Avisos de cursos nuevos y mentorías"
        action={<Toggle checked={emailNotif} onChange={setEmailNotif} />}
      />
    </Section>
  );
}

function RowToggle({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: "var(--violet-pill-bg)",
            border: "1px solid var(--violet-pill-border)",
            color: "var(--violet-text)",
          }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-foreground">{title}</div>
          <div className="text-[12px] text-muted-foreground">{description}</div>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative h-6 w-10 rounded-full transition-colors"
      style={{
        background: checked ? "var(--violet-text)" : "rgba(255,255,255,0.10)",
      }}
      title="Toggle"
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
        style={{ left: checked ? "calc(100% - 22px)" : "2px" }}
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// CUENTA
// ─────────────────────────────────────────────────────────────
function AccountSection({ email, onLogout }: { email: string; onLogout: () => void }) {
  const handlePasswordReset = async () => {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) toast.error("Error: " + error.message);
    else toast.success("Te enviamos un email para cambiar tu contraseña");
  };

  return (
    <Section title="Cuenta" subtitle="Email y seguridad de tu cuenta.">
      <RowToggle
        icon={<Mail className="h-4 w-4" />}
        title="Email"
        description={email}
        action={null}
      />
      <Hairline className="my-3" />
      <RowToggle
        icon={<Lock className="h-4 w-4" />}
        title="Contraseña"
        description="Te enviamos un link a tu email para cambiarla"
        action={
          <button onClick={handlePasswordReset} className="app-cta-ghost !py-2 !px-3.5 !text-[12px]">
            Cambiar
          </button>
        }
      />
      <Hairline className="my-3" />
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.25)", color: "#F87171" }}
          >
            <LogOut className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[14px] font-medium text-foreground">Cerrar sesión</div>
            <div className="text-[12px] text-muted-foreground">Desconectarte de Implementa AI</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[12px] font-semibold transition-colors hover:bg-red-500/[0.05]"
          style={{ borderColor: "rgba(248,113,113,0.30)", color: "#F87171" }}
        >
          Cerrar sesión
        </button>
      </div>
    </Section>
  );
}
