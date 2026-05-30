import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const COVER_BUCKET = "course-covers";
const SIGNED_URL_TTL_SECONDS = 3600;
const STALE_TIME_MS = 50 * 60 * 1000;

type CoverResult = {
  /** URL firmada (o absoluta si vino así). null si aún cargando o falló. */
  url: string | null;
  /** True mientras se está pidiendo el signed URL al backend. */
  isLoading: boolean;
};

/**
 * Genera un signed URL para una portada de curso del bucket privado.
 * Path admite el filename pelado (ej. "Lovable.png") o un path completo.
 * Si el thumbnail viene null/vacío o ya es una URL absoluta, no hace fetch.
 */
export function useCourseCover(thumbnail: string | null | undefined): CoverResult {
  const isAbsolute = !!thumbnail && /^https?:\/\//i.test(thumbnail);
  const path = thumbnail && !isAbsolute ? thumbnail : null;

  const { data, isLoading: queryLoading, isFetched } = useQuery({
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

  // URL absoluta: pasthrough, sin loading
  if (isAbsolute) return { url: thumbnail!, isLoading: false };

  // Sin path: no hay nada que cargar
  if (!path) return { url: null, isLoading: false };

  // Path: depende del estado de la query
  return {
    url: data ?? null,
    // isLoading sólo mientras la query está pending y aún no se obtuvo nada
    isLoading: queryLoading && !isFetched,
  };
}
