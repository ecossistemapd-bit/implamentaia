/**
 * Feature flags para activar/desactivar módulos enteros sin borrar código.
 * Cuando una feature esté lista para producción, cambiar a true.
 */
export const FEATURES = {
  MARKETPLACE: false,
  MENTORSHIPS: false,
} as const;
