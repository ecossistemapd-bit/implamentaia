import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "loading" | "step1" | "step2" | "done";

export function OnboardingModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data || data.onboarding_completed) {
        setStatus("done");
      } else {
        setStatus("step1");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (status === "done" || status === "loading" || !user) return null;

  const saveStep1 = async () => {
    if (!fullName.trim() || !companyName.trim()) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), company_name: companyName.trim() })
      .eq("id", user.id);
    setSaving(false);
    setStatus("step2");
  };

  const finish = async (path?: "/solutions" | "/cursos" | "/projects") => {
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
    setStatus("done");
    if (path) navigate({ to: path });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        {status === "step1" ? (
          <div className="flex flex-col items-center text-center">
            <div className="text-4xl">👋</div>
            <h2 className="mt-3 text-xl font-bold text-gray-900">Bienvenido a Implementa AI</h2>
            <p className="mt-2 text-sm text-gray-500">
              La plataforma que te guía paso a paso para implementar soluciones de IA en tu empresa.
            </p>
            <div className="mt-6 w-full space-y-3 text-left">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Tu nombre completo</label>
                <Input className="text-gray-900" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan García" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Nombre de tu empresa</label>
                <Input className="text-gray-900" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Mi Empresa S.A." />
              </div>
            </div>
            <Button
              onClick={saveStep1}
              disabled={saving || !fullName.trim() || !companyName.trim()}
              className="mt-6 w-full bg-foreground text-background hover:bg-foreground/90"
            >
              {saving ? "Guardando…" : "Continuar →"}
            </Button>
            <div className="mt-4 text-[11px] text-gray-400">Paso 1 de 2</div>
          </div>
        ) : (
          <div className="flex flex-col text-center">
            <div className="text-4xl">🚀</div>
            <h2 className="mt-3 text-xl font-bold text-gray-900">¿Por dónde empezar?</h2>
            <p className="mt-2 text-sm text-gray-500">Elegí cómo querés arrancar.</p>
            <div className="mt-4 space-y-2 text-left">
              <Option
                emoji="🔧"
                title="Implementar una solución"
                subtitle="Usá el Builder para configurar tu primera solución de IA"
                onClick={() => finish("/solutions")}
              />
              <Option
                emoji="📚"
                title="Aprender primero"
                subtitle="Empezá por los cursos de Lovable, Claude y n8n"
                onClick={() => finish("/cursos")}
              />
              <Option
                emoji="📋"
                title="Ver mis proyectos"
                subtitle="Retomá donde lo dejaste la última vez"
                onClick={() => finish("/projects")}
              />
            </div>
            <button
              onClick={() => finish()}
              className="mt-4 block cursor-pointer text-center text-xs text-gray-400 hover:text-gray-600"
            >
              Saltar por ahora
            </button>
            <div className="mt-3 text-[11px] text-gray-400">Paso 2 de 2</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Option({ emoji, title, subtitle, onClick }: { emoji: string; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-black"
    >
      <div className="text-2xl">{emoji}</div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div>
      </div>
    </button>
  );
}
