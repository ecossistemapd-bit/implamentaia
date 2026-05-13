import {
  Briefcase,
  Megaphone,
  Headphones,
  Wallet,
  Settings as SettingsIcon,
  Users,
  Brain,
  Scale,
} from "lucide-react";

export type CategoryKey =
  | "ventas"
  | "marketing"
  | "atencion"
  | "finanzas"
  | "operaciones"
  | "rrhh"
  | "modelos_ia"
  | "juridico";

export const CATEGORIES: { key: CategoryKey; label: string; icon: typeof Briefcase; description: string }[] = [
  { key: "ventas", label: "Ventas", icon: Briefcase, description: "Califica leads, agenda y cierra más rápido." },
  { key: "marketing", label: "Marketing", icon: Megaphone, description: "Contenido, anuncios y SEO con IA." },
  { key: "atencion", label: "Servicio al Cliente", icon: Headphones, description: "Soporte 24/7 que retiene clientes." },
  { key: "finanzas", label: "Finanzas", icon: Wallet, description: "Conciliación, reportes y cash flow." },
  { key: "operaciones", label: "Operaciones", icon: SettingsIcon, description: "Procesos, onboarding y logística." },
  { key: "rrhh", label: "Recursos Humanos", icon: Users, description: "Screening, onboarding y clima." },
  { key: "modelos_ia", label: "Modelos IA", icon: Brain, description: "Modelos y agentes de IA listos para usar." },
  { key: "juridico", label: "Jurídico", icon: Scale, description: "Contratos, compliance y análisis legal." },
];

export const CATEGORY_LABEL: Record<CategoryKey, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label]),
) as Record<CategoryKey, string>;

export type Difficulty = "principiante" | "intermedio" | "avanzado";
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};
