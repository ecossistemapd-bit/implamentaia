import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/logo";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Ingresar · Implementa AI" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword(values);
        if (error) throw error;
        toast.success("Bienvenido", { duration: 4000 });
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) {
          const msg = error.message?.includes("invitación")
            ? "Esta plataforma es por invitación. Contáctanos para acceso."
            : error.message;
          throw new Error(msg);
        }
        toast.success("Cuenta creada. Revisá tu correo para confirmar.", { duration: 4000 });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Algo salió mal";
      toast.error(msg, { duration: 4000 });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <div className="flex justify-center">
            <Logo />
          </div>

          <div className="mt-10 text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              {mode === "signin" ? "Ingresar" : "Crear cuenta"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Bienvenido de vuelta a Implementa AI"
                : "Plataforma por invitación. Tu email debe estar autorizado."}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-3">
            <div>
              <input
                id="email"
                type="email"
                placeholder="Email"
                autoComplete="email"
                className="h-12 w-full rounded-xl border border-border bg-card px-4 text-foreground placeholder-zinc-600 focus:border-border focus:outline-none focus:ring-0"
                {...register("email")}
              />
              {errors.email && <p className="mt-1.5 text-xs text-muted-foreground">{errors.email.message}</p>}
            </div>
            <div>
              <input
                id="password"
                type="password"
                placeholder="Contraseña"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="h-12 w-full rounded-xl border border-border bg-card px-4 text-foreground placeholder-zinc-600 focus:border-border focus:outline-none focus:ring-0"
                {...register("password")}
              />
              {errors.password && <p className="mt-1.5 text-xs text-muted-foreground">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Procesando..." : mode === "signin" ? "Ingresar" : "Crear cuenta"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-muted-foreground hover:text-muted-foreground"
            >
              {mode === "signin" ? "Crear cuenta" : "Ya tengo cuenta"}
            </button>
            <Link to="/" className="text-muted-foreground hover:text-muted-foreground">
              Volver al inicio
            </Link>
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            ¿No tenés invitación?{" "}
            <a className="text-muted-foreground underline-offset-4 hover:underline" href="mailto:hola@implementa.ai?subject=Solicitar%20acceso">
              Solicitar acceso
            </a>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
