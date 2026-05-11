import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Resolve a lucide icon name (string) to a component, with a sensible fallback.
export function getLucideIcon(name: string | null | undefined): LucideIcon {
  if (!name) return LucideIcons.Sparkles;
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
  return Icon ?? LucideIcons.Sparkles;
}
