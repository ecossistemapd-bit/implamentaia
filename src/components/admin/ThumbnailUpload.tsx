import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCourseCover } from "@/hooks/use-course-cover";

const BUCKET = "course-covers";

type Props = {
  /** Path actual del bucket (ej. "Lovable.png" o "lessons/Lovable/01.png"). */
  value: string | null;
  /** Path donde se guarda al subir. Ej. "lessons/Lovable/01.png" — sin slash inicial. */
  uploadPath: string;
  /** Se llama cuando se sube o se borra. null = se borró. */
  onChange: (newPath: string | null) => void;
  className?: string;
};

export function ThumbnailUpload({ value, uploadPath, onChange, className = "" }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const previewUrl = useCourseCover(value).url;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Solo imágenes (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen pesa más de 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const { error } = await supabase.storage.from(BUCKET).upload(uploadPath, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      onChange(uploadPath);
      toast.success("Imagen subida");
    } catch (e) {
      console.error(e);
      toast.error("Error al subir la imagen");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleClear = () => {
    onChange(null);
  };

  return (
    <div className={`relative overflow-hidden rounded-lg border ${className}`} style={{ borderColor: "var(--violet-pill-border)" }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <div className="relative aspect-[3/4] w-full bg-card">
        {previewUrl ? (
          <img src={previewUrl} alt="Portada" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-muted-foreground">
            Sin imagen
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--violet-text)" }} />
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t bg-card p-2" style={{ borderColor: "var(--violet-pill-border)" }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="app-cta-ghost flex-1 justify-center !py-1.5 !text-[12px]"
        >
          <Upload className="h-3.5 w-3.5" /> {value ? "Reemplazar" : "Subir"}
        </button>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            disabled={uploading}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:text-foreground"
            style={{ borderColor: "var(--violet-pill-border)" }}
            title="Quitar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
