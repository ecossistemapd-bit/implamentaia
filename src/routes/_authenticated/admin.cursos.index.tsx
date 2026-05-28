import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, BookOpen, Layers, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { useCourseCover } from "@/hooks/use-course-cover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ThumbnailUpload } from "@/components/admin/ThumbnailUpload";

export const Route = createFileRoute("/_authenticated/admin/cursos/")({
  component: AdminCursosPage,
});

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  section_key: string | null;
  format: string | null;
  level: string | null;
  is_published: boolean;
  coming_soon: boolean;
  order_index: number;
  modulesCount?: number;
  lessonsCount?: number;
};

const SECTIONS = [
  { key: "herramientas", label: "Herramientas" },
  { key: "consejos", label: "Consejos y tutoriales" },
  { key: "detras_escena", label: "Detrás de escena" },
  { key: "dentro_de_poco", label: "Dentro de poco" },
];
const FORMATS = ["Formación", "Tutorial"];
const LEVELS = ["Principiante", "Intermedio", "Avanzado"];

function AdminCursosPage() {
  const { isAdmin, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate({ to: "/dashboard" });
  }, [roleLoading, isAdmin, navigate]);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data: cs, error } = await supabase
        .from("courses" as never)
        .select(
          "id, title, description, thumbnail_url, section_key, format, level, is_published, coming_soon, order_index",
        )
        .order("order_index");
      if (error) throw error;
      const list = (cs ?? []) as CourseRow[];
      // Counts de módulos y lecciones por curso
      const { data: mods } = await supabase
        .from("modules" as never)
        .select("id, course_id");
      const { data: lessons } = await supabase
        .from("lessons" as never)
        .select("id, module_id");
      const modList = (mods ?? []) as Array<{ id: string; course_id: string }>;
      const lessonList = (lessons ?? []) as Array<{ id: string; module_id: string }>;
      const modByCourse = new Map<string, number>();
      const lessonByCourse = new Map<string, number>();
      modList.forEach((m) => modByCourse.set(m.course_id, (modByCourse.get(m.course_id) ?? 0) + 1));
      const modToCourse = new Map(modList.map((m) => [m.id, m.course_id]));
      lessonList.forEach((l) => {
        const cid = modToCourse.get(l.module_id);
        if (cid) lessonByCourse.set(cid, (lessonByCourse.get(cid) ?? 0) + 1);
      });
      return list.map((c) => ({
        ...c,
        modulesCount: modByCourse.get(c.id) ?? 0,
        lessonsCount: lessonByCourse.get(c.id) ?? 0,
      }));
    },
  });

  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("courses" as never).delete().eq("id", deleteId);
    if (error) {
      toast.error("Error al borrar: " + error.message);
    } else {
      toast.success("Curso eliminado");
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
    }
    setDeleteId(null);
  };

  if (roleLoading || !isAdmin) {
    return <div className="p-10 text-sm text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="relative z-[1] mx-auto max-w-[1340px] px-8 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Panel de Administración
          </Link>
          <h1 className="mt-4 text-[36px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
            Cursos
          </h1>
          <p className="page-subtitle mt-1">
            Crear, editar y gestionar los cursos de Capacitación.
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="app-cta-primary">
          <Plus className="h-4 w-4" /> Nuevo curso
        </button>
      </div>

      <div className="my-8 h-px w-full" style={{ background: "linear-gradient(90deg, transparent, var(--border) 20%, var(--border) 80%, transparent)" }} />

      <div className="app-card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground" style={{ borderColor: "var(--violet-pill-border)" }}>
              <th className="px-4 py-3 w-16">Portada</th>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Sección</th>
              <th className="px-4 py-3">Formato</th>
              <th className="px-4 py-3 text-center">Módulos</th>
              <th className="px-4 py-3 text-center">Lecciones</th>
              <th className="px-4 py-3 text-center">Publicado</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Cargando cursos…
                </td>
              </tr>
            )}
            {!isLoading && (courses?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No hay cursos todavía. Creá el primero arriba.
                </td>
              </tr>
            )}
            {(courses ?? []).map((c) => (
              <CourseRowItem
                key={c.id}
                course={c}
                onEdit={() => setEditing(c)}
                onDelete={() => setDeleteId(c.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal crear / editar */}
      {(creating || editing) && (
        <CourseFormDialog
          course={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-courses"] });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {/* Confirmación de borrado */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar este curso?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminan también sus módulos y lecciones. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Borrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CourseRowItem({
  course,
  onEdit,
  onDelete,
}: {
  course: CourseRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const coverUrl = useCourseCover(course.thumbnail_url);
  const sectionLabel = SECTIONS.find((s) => s.key === course.section_key)?.label ?? "—";

  return (
    <tr className="border-b text-[13px] transition-colors hover:bg-muted/30" style={{ borderColor: "var(--violet-pill-border)" }}>
      <td className="px-4 py-3">
        <div className="relative aspect-[3/4] w-12 overflow-hidden rounded-md bg-card">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => navigate({ to: "/admin/cursos/$courseId", params: { courseId: course.id } })}
          className="text-left font-medium text-foreground hover:underline"
        >
          {course.title}
        </button>
        {course.coming_soon && (
          <span className="ml-2 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
            Próximamente
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{sectionLabel}</td>
      <td className="px-4 py-3 text-muted-foreground">{course.format ?? "—"}</td>
      <td className="px-4 py-3 text-center tabular-nums">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Layers className="h-3.5 w-3.5" /> {course.modulesCount ?? 0}
        </span>
      </td>
      <td className="px-4 py-3 text-center tabular-nums">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" /> {course.lessonsCount ?? 0}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        {course.is_published ? (
          <span className="app-pill-violet rounded-full px-2 py-0.5 text-[11px] font-semibold">Sí</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">No</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => navigate({ to: "/admin/cursos/$courseId", params: { courseId: course.id } })}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:text-foreground"
            style={{ borderColor: "var(--violet-pill-border)" }}
            title="Gestionar módulos y lecciones"
          >
            <BookOpen className="h-4 w-4" />
          </button>
          <button
            onClick={onEdit}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:text-foreground"
            style={{ borderColor: "var(--violet-pill-border)" }}
            title="Editar curso"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-rose-500/50 hover:text-rose-400"
            style={{ borderColor: "var(--violet-pill-border)" }}
            title="Borrar curso"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function CourseFormDialog({
  course,
  onClose,
  onSaved,
}: {
  course: CourseRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!course;
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [thumbnail, setThumbnail] = useState<string | null>(course?.thumbnail_url ?? null);
  const [sectionKey, setSectionKey] = useState(course?.section_key ?? "herramientas");
  const [format, setFormat] = useState(course?.format ?? "Formación");
  const [level, setLevel] = useState(course?.level ?? "Principiante");
  const [isPublished, setIsPublished] = useState(course?.is_published ?? true);
  const [comingSoon, setComingSoon] = useState(course?.coming_soon ?? false);
  const [orderIndex, setOrderIndex] = useState(course?.order_index ?? 0);
  const [saving, setSaving] = useState(false);

  // Slug del título para el path de la imagen
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50);
  const uploadPath = `courses/${slug || "sin-titulo"}.png`;

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      thumbnail_url: thumbnail,
      section_key: sectionKey,
      format,
      level,
      is_published: isPublished,
      coming_soon: comingSoon,
      order_index: orderIndex,
    };
    try {
      if (isEdit) {
        const { error } = await supabase
          .from("courses" as never)
          .update(payload)
          .eq("id", course!.id);
        if (error) throw error;
        toast.success("Curso actualizado");
      } else {
        const { error } = await supabase.from("courses" as never).insert(payload);
        if (error) throw error;
        toast.success("Curso creado");
      }
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error("Error al guardar: " + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar curso" : "Nuevo curso"}</DialogTitle>
          <DialogDescription>
            Los cambios se guardan al hacer clic en Guardar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[200px_1fr] gap-6 py-2">
          <ThumbnailUpload value={thumbnail} uploadPath={uploadPath} onChange={setThumbnail} />

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Título
              </label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Descripción
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Sección
                </label>
                <Select value={sectionKey} onValueChange={setSectionKey}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Formato
                </label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Nivel
                </label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Orden
                </label>
                <Input
                  type="number"
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-6 pt-2">
              <label className="flex items-center gap-2 text-[13px] text-foreground">
                <Checkbox checked={isPublished} onCheckedChange={(v) => setIsPublished(v === true)} />
                Publicado
              </label>
              <label className="flex items-center gap-2 text-[13px] text-foreground">
                <Checkbox checked={comingSoon} onCheckedChange={(v) => setComingSoon(v === true)} />
                Dentro de poco
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <button onClick={onClose} className="app-cta-ghost">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="app-cta-primary">
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
