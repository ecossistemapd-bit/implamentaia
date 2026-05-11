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
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword(values);
        if (error) throw error;
        toast.success("Bienvenido");
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
        toast.success("Cuenta creada. Revisá tu correo para confirmar.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Algo salió mal";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <h1 className="text-3xl font-semibold tracking-tight">
            {mode === "signin" ? "Ingresar" : "Crear cuenta"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Bienvenido de vuelta a Implementa AI."
              : "Plataforma por invitación. Tu email debe estar autorizado."}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" disabled={submitting} className="w-full rounded-full">
              {submitting ? "Procesando..." : mode === "signin" ? "Ingresar" : "Crear cuenta"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {mode === "signin" ? "Crear cuenta" : "Ya tengo cuenta"}
            </button>
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              Volver al inicio
            </Link>
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            ¿No tenés invitación? <a className="underline underline-offset-4" href="mailto:hola@implementa.ai?subject=Solicitar%20acceso">Solicitar acceso</a>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
