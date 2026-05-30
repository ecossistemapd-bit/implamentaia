import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "avatars";
const TTL = 3600;
const STALE = 50 * 60 * 1000;

/**
 * Genera signed URL de un avatar del bucket privado `avatars`.
 * `path` admite el filename ("{user_id}/avatar.png") o una URL absoluta
 * (en cuyo caso la devuelve tal cual, para futura compat).
 */
export function useAvatarUrl(path: string | null | undefined) {
  const isAbsolute = !!path && /^https?:\/\//i.test(path);
  const usePath = path && !isAbsolute ? path : null;

  const { data } = useQuery({
    queryKey: ["avatar-url", usePath],
    enabled: !!usePath,
    staleTime: STALE,
    queryFn: async () => {
      if (!usePath) return null;
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(usePath, TTL);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });

  if (isAbsolute) return path;
  return data ?? null;
}
