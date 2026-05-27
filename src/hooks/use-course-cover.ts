import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const COVER_BUCKET = "course-covers";
const SIGNED_URL_TTL_SECONDS = 3600;
const STALE_TIME_MS = 50 * 60 * 1000;

/**
 * Genera un signed URL para una portada de curso del bucket privado.
 * Path admite el filename pelado (ej. "Lovable.png") o un path completo.
 * Si el thumbnail viene null/vacío o ya es una URL absoluta, devuelve eso tal cual.
 */
export function useCourseCover(thumbnail: string | null | undefined) {
  const isAbsolute = !!thumbnail && /^https?:\/\//i.test(thumbnail);
  const path = thumbnail && !isAbsolute ? thumbnail : null;

  const { data } = useQuery({
    queryKey: ["course-cover", path],
    enabled: !!path,
    staleTime: STALE_TIME_MS,
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from(COVER_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });

  if (isAbsolute) return thumbnail;
  return data ?? null;
}
