import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Clock,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
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
import { ThumbnailUpload } from "@/components/admin/ThumbnailUpload";

export const Route = createFileRoute("/_authenticated/admin/cursos/$courseId")({
  component: AdminCourseDetailPage,
});

type Course = { id: string; title: string; thumbnail_url: string | null };
type Module = { id: string; title: string; order_index: number };
type Lesson = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  order_index: number;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50);
}

function formatTime(seconds: number | null): string {
  if (!seconds || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseTime(str: string): number | null {
  const m = str.match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  const min = parseInt(m[1], 10);
  const sec = parseInt(m[2], 10);
  if (isNaN(min) || isNaN(sec) || sec > 59) return null;
  return min * 60 + sec;
}

function AdminCourseDetailPage() {
  const { courseId } = Route.useParams();
  const { isAdmin, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate({ to: "/dashboard" });
  }, [roleLoading, isAdmin, navigate]);

  const { data: course } = useQuery({
    queryKey: ["admin-course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses" as never)
        .select("id, title, thumbnail_url")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data as Course | null;
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["admin-course-modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules" as never)
        .select("id, title, order_index")
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as Module[];
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ["admin-course-lessons", courseId, modules?.length ?? 0],
    enabled: !!modules,
    queryFn: async () => {
      const ids = (modules ?? []).map((m) => m.id);
      if (ids.length === 0) return [] as Lesson[];
      const { data, error } = await supabase
        .from("lessons" as never)
        .select("id, module_id, title, description, video_url, thumbnail_url, duration_seconds, order_index")
        .in("module_id", ids)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as Lesson[];
    },
  });

  const lessonsByModule = useMemo(() => {
    const map: Record<string, Lesson[]> = {};
    (lessons ?? []).forEach((l) => {
      if (!map[l.module_id]) map[l.module_id] = [];
      map[l.module_id].push(l);
    });
    return map;
  }, [lessons]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [creatingModule, setCreatingModule] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [creatingLessonModuleId, setCreatingLessonModuleId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "module"; id: string } | { kind: "lesson"; id: string } | null
  >(null);

  const courseSlug = slugify(course?.title ?? "");

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const table = deleteTarget.kind === "module" ? "modules" : "lessons";
    const { error } = await supabase
      .from(table as never)
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast.error("Error al borrar: " + error.message);
    } else {
      toast.success(deleteTarget.kind === "module" ? "Módulo eliminado" : "Lección eliminada");
      qc.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
      qc.invalidateQueries({ queryKey: ["admin-course-lessons", courseId] });
    }
    setDeleteTarget(null);
  };

  if (roleLoading || !isAdmin) {
    return <div className="p-10 text-sm text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="relative z-[1] mx-auto max-w-[1340px] px-8 py-8">
      <Link
        to="/admin/cursos"
        className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Cursos
      </Link>
      <h1 className="mt-4 text-[36px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
        {course?.title ?? "Curso"}
      </h1>
      <p className="page-subtitle mt-1">
        Gestionar módulos y lecciones de este curso.
      </p>

      <div className="my-8 h-px w-full" style={{ background: "linear-gradient(90deg, transparent, var(--border) 20%, var(--border) 80%, transparent)" }} />

      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-semibold text-foreground">
          Módulos <span className="text-muted-foreground">({modules?.length ?? 0})</span>
        </h2>
        <button onClick={() => setCreatingModule(true)} className="app-cta-primary">
          <Plus className="h-4 w-4" /> Nuevo módulo
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {(modules ?? []).length === 0 ? (
          <div className="app-card p-10 text-center text-muted-foreground">
            Aún no hay módulos. Creá el primero arriba.
          </div>
        ) : (
          (modules ?? []).map((m) => {
            const isOpen = expanded.has(m.id);
            const ls = lessonsByModule[m.id] ?? [];
            return (
              <div key={m.id} className="app-mini-step p-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleExpanded(m.id)}
                    className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <span className="font-mono text-[18px] font-bold tabular-nums text-muted-foreground">
                    {String(m.order_index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => toggleExpanded(m.id)}
                      className="text-left text-[15px] font-semibold text-foreground hover:underline"
                    >
                      {m.title}
                    </button>
                    <div className="text-[12px] text-muted-foreground tabular-nums">
                      {ls.length} {ls.length === 1 ? "lección" : "lecciones"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCreatingLessonModuleId(m.id)}
                      className="app-cta-ghost !py-1.5 !text-[12px]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Lección
                    </button>
                    <button
                      onClick={() => setEditingModule(m)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:text-foreground"
                      style={{ borderColor: "var(--violet-pill-border)" }}
                      title="Editar módulo"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ kind: "module", id: m.id })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-rose-500/50 hover:text-rose-400"
                      style={{ borderColor: "var(--violet-pill-border)" }}
                      title="Borrar módulo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-3 space-y-1 pl-10">
                    {ls.length === 0 ? (
                      <p className="py-4 text-[12px] text-muted-foreground">
                        Aún no hay lecciones en este módulo.
                      </p>
                    ) : (
                      ls.map((l, idx) => (
                        <div
                          key={l.id}
                          className="flex items-center gap-3 rounded-md border px-3 py-2 text-[13px] transition-colors hover:bg-muted/30"
                          style={{ borderColor: "var(--violet-pill-border)" }}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                          <span className="w-8 font-mono text-[11px] tabular-nums text-muted-foreground">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-foreground">
                            {l.title}
                          </span>
                          {l.video_url && (
                            <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--violet-text)" }}>
                              <Play className="h-3 w-3 fill-current" /> video
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                            <Clock className="h-3 w-3" /> {formatTime(l.duration_seconds)}
                          </span>
                          <button
                            onClick={() => setEditingLesson(l)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:text-foreground"
                            style={{ borderColor: "var(--violet-pill-border)" }}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ kind: "lesson", id: l.id })}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-rose-500/50 hover:text-rose-400"
                            style={{ borderColor: "var(--violet-pill-border)" }}
                            title="Borrar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal módulo */}
      {(creatingModule || editingModule) && (
        <ModuleFormDialog
          module={editingModule}
          courseId={courseId}
          defaultOrder={modules?.length ?? 0}
          onClose={() => {
            setCreatingModule(false);
            setEditingModule(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-course-modules", courseId] });
            setCreatingModule(false);
            setEditingModule(null);
          }}
        />
      )}

      {/* Modal lección */}
      {(creatingLessonModuleId || editingLesson) && (
        <LessonFormDialog
          lesson={editingLesson}
          moduleId={creatingLessonModuleId ?? editingLesson?.module_id ?? null}
          courseSlug={courseSlug}
          defaultOrder={
            editingLesson
              ? editingLesson.order_index
              : (lessonsByModule[creatingLessonModuleId ?? ""] ?? []).length
          }
          onClose={() => {
            setCreatingLessonModuleId(null);
            setEditingLesson(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-course-lessons", courseId] });
            setCreatingLessonModuleId(null);
            setEditingLesson(null);
          }}
        />
      )}

      {/* Confirmación de borrado */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.kind === "module" ? "¿Borrar este módulo?" : "¿Borrar esta lección?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "module"
                ? "Se eliminan también las lecciones que contiene. No se puede deshacer."
                : "Esta acción no se puede deshacer."}
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

function ModuleFormDialog({
  module,
  courseId,
  defaultOrder,
  onClose,
  onSaved,
}: {
  module: Module | null;
  courseId: string;
  defaultOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!module;
  const [title, setTitle] = useState(module?.title ?? "");
  const [orderIndex, setOrderIndex] = useState(module?.order_index ?? defaultOrder);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return toast.error("El título es obligatorio");
    setSaving(true);
    const payload = { title: title.trim(), order_index: orderIndex, course_id: courseId };
    try {
      if (isEdit) {
        const { error } = await supabase.from("modules" as never).update(payload).eq("id", module!.id);
        if (error) throw error;
        toast.success("Módulo actualizado");
      } else {
        const { error } = await supabase.from("modules" as never).insert(payload);
        if (error) throw error;
        toast.success("Módulo creado");
      }
      onSaved();
    } catch (e) {
      toast.error("Error al guardar: " + (e instanceof Error ? e.message : "desconocido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar módulo" : "Nuevo módulo"}</DialogTitle>
          <DialogDescription>Un módulo agrupa lecciones relacionadas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Orden</label>
            <Input
              type="number"
              value={orderIndex}
              onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
              className="mt-1"
            />
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

function LessonFormDialog({
  lesson,
  moduleId,
  courseSlug,
  defaultOrder,
  onClose,
  onSaved,
}: {
  lesson: Lesson | null;
  moduleId: string | null;
  courseSlug: string;
  defaultOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!lesson;
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [description, setDescription] = useState(lesson?.description ?? "");
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url ?? "");
  const [thumbnail, setThumbnail] = useState<string | null>(lesson?.thumbnail_url ?? null);
  const [durationText, setDurationText] = useState(
    lesson?.duration_seconds != null ? formatTime(lesson.duration_seconds) : "",
  );
  const [orderIndex, setOrderIndex] = useState(lesson?.order_index ?? defaultOrder);
  const [saving, setSaving] = useState(false);

  const lessonSlug = slugify(title);
  const uploadPath = `lessons/${courseSlug}/${lessonSlug || `leccion-${orderIndex + 1}`}.png`;

  const handleSave = async () => {
    if (!moduleId) return toast.error("Falta el módulo");
    if (!title.trim()) return toast.error("El título es obligatorio");
    const duration_seconds = durationText.trim() === "" ? null : parseTime(durationText.trim());
    if (durationText.trim() !== "" && duration_seconds === null) {
      return toast.error("Duración debe tener formato mm:ss (ej. 6:33)");
    }
    setSaving(true);
    const payload = {
      module_id: moduleId,
      title: title.trim(),
      description: description.trim() || null,
      video_url: videoUrl.trim() || null,
      thumbnail_url: thumbnail,
      duration_seconds,
      order_index: orderIndex,
    };
    try {
      if (isEdit) {
        const { error } = await supabase.from("lessons" as never).update(payload).eq("id", lesson!.id);
        if (error) throw error;
        toast.success("Lección actualizada");
      } else {
        const { error } = await supabase.from("lessons" as never).insert(payload);
        if (error) throw error;
        toast.success("Lección creada");
      }
      onSaved();
    } catch (e) {
      toast.error("Error al guardar: " + (e instanceof Error ? e.message : "desconocido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar lección" : "Nueva lección"}</DialogTitle>
          <DialogDescription>
            Si dejás la portada vacía, se usa la del curso como fallback.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[180px_1fr] gap-6 py-2">
          <ThumbnailUpload value={thumbnail} uploadPath={uploadPath} onChange={setThumbnail} />

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Título</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Descripción</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Video URL</label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://vimeo.com/... o https://www.youtube.com/embed/..."
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Duración (mm:ss)</label>
                <Input
                  value={durationText}
                  onChange={(e) => setDurationText(e.target.value)}
                  placeholder="6:33"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Orden</label>
                <Input
                  type="number"
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
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
