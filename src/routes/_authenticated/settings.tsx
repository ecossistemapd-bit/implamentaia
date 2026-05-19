import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ full_name: "", company_name: "", role: "", industry: "", team_size: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setProfile({
        full_name: data.full_name ?? "",
        company_name: data.company_name ?? "",
        role: data.role ?? "",
        industry: data.industry ?? "",
        team_size: data.team_size ?? "",
      });
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...profile });
    setSaving(false);
    if (error) toast.error(error.message, { duration: 4000 });
    else toast.success("Guardado", { duration: 4000 });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 lg:py-16">
      <h1 className="border-l-4 border-primary pl-4 text-2xl font-bold text-foreground">Configuración</h1>

      <div className="mt-10 space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-medium text-foreground">Perfil</h2>
        <Field label="Nombre completo" value={profile.full_name} onChange={(v) => setProfile({ ...profile, full_name: v })} />
        <Field label="Rol" value={profile.role} onChange={(v) => setProfile({ ...profile, role: v })} />
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-medium text-foreground">Empresa</h2>
        <Field label="Nombre de la empresa" value={profile.company_name} onChange={(v) => setProfile({ ...profile, company_name: v })} />
        <Field label="Industria" value={profile.industry} onChange={(v) => setProfile({ ...profile, industry: v })} />
        <Field label="Tamaño del equipo" value={profile.team_size} onChange={(v) => setProfile({ ...profile, team_size: v })} />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-medium text-foreground">Cuenta</h2>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-4 rounded-xl border border-border px-5 py-2 text-sm text-muted-foreground transition hover:border-border hover:text-muted-foreground"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-muted px-4 text-foreground focus:border-border focus:outline-none focus:ring-0"
      />
    </div>
  );
}
