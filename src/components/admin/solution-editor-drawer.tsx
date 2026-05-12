import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Upload, Trash2, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CATEGORY_OPTIONS = [
  { value: "ventas", label: "Ventas" },
  { value: "marketing", label: "Marketing" },
  { value: "atencion", label: "Servicio al Cliente" },
  { value: "finanzas", label: "Finanzas" },
  { value: "rrhh", label: "Recursos Humanos" },
  { value: "operaciones", label: "Operaciones" },
];

const DIFFICULTY_OPTIONS = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
];

export type ResourceLink = {
  type?: string;
  title: string;
  description?: string;
  url: string;
  domain?: string;
};

type SolutionFull = {
  id: string;
  title: string;
  short_description: string;
  long_description: string;
  category: string;
  difficulty: string;
  estimated_time: string;
  platform_investment: string | null;
  development_time_minutes: number | null;
  tokens_per_execution: number | null;
  video_url: string | null;
  lovable_remix_url: string | null;
  cover_image_url: string | null;
  resources: ResourceLink[] | null;
};

type ToolRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
};

type SolutionToolRow = {
  tool_id: string;
  is_essential: boolean;
  display_order: number | null;
};

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toUpperCase();
  } catch {
    return "";
  }
}

export function SolutionEditorDrawer({
  solutionId,
  open,
  onOpenChange,
}: {
  solutionId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [tab, setTab] = useState("general");
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [confirmClose, setConfirmClose] = useState(false);

  const anyDirty = Object.values(dirty).some(Boolean);

  const tryClose = () => {
    if (anyDirty) setConfirmClose(true);
    else onOpenChange(false);
  };

  const setTabDirty = (key: string, v: boolean) =>
    setDirty((prev) => ({ ...prev, [key]: v }));

  useEffect(() => {
    if (!open) {
      setDirty({});
      setTab("general");
    }
  }, [open]);

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(true) : tryClose())}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-0 sm:max-w-none sm:w-[50vw] sm:min-w-[640px]"
        >
          <SheetHeader className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base">
                {solutionId ? "Editar solución" : "Solución"}
              </SheetTitle>
              <button
                onClick={tryClose}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </SheetHeader>

          {solutionId && (
            <Tabs value={tab} onValueChange={setTab} className="px-6 py-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">
                  General {dirty.general && <span className="ml-1 text-orange-500">*</span>}
                </TabsTrigger>
                <TabsTrigger value="cover">
                  Cover {dirty.cover && <span className="ml-1 text-orange-500">*</span>}
                </TabsTrigger>
                <TabsTrigger value="tools">
                  Herramientas {dirty.tools && <span className="ml-1 text-orange-500">*</span>}
                </TabsTrigger>
                <TabsTrigger value="resources">
                  Recursos {dirty.resources && <span className="ml-1 text-orange-500">*</span>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-4">
                <GeneralTab
                  solutionId={solutionId}
                  onDirtyChange={(v) => setTabDirty("general", v)}
                />
              </TabsContent>
              <TabsContent value="cover" className="mt-4">
                <CoverTab solutionId={solutionId} />
              </TabsContent>
              <TabsContent value="tools" className="mt-4">
                <ToolsTab
                  solutionId={solutionId}
                  onDirtyChange={(v) => setTabDirty("tools", v)}
                />
              </TabsContent>
              <TabsContent value="resources" className="mt-4">
                <ResourcesTab
                  solutionId={solutionId}
                  onDirtyChange={(v) => setTabDirty("resources", v)}
                />
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tenés cambios sin guardar. Si cerrás ahora se van a perder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmClose(false);
                onOpenChange(false);
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function useSolution(id: string) {
  return useQuery({
    queryKey: ["admin-solution-full", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solutions")
        .select(
          "id, title, short_description, long_description, category, difficulty, estimated_time, platform_investment, development_time_minutes, tokens_per_execution, video_url, lovable_remix_url, cover_image_url, resources",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as SolutionFull;
    },
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: ["admin-solutions"] });
  qc.invalidateQueries({ queryKey: ["admin-solution-full", id] });
  qc.invalidateQueries({ queryKey: ["solution-by-id", id] });
  qc.invalidateQueries({ queryKey: ["solutions"] });
}

// --- General tab -------------------------------------------------------

function GeneralTab({
  solutionId,
  onDirtyChange,
}: {
  solutionId: string;
  onDirtyChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useSolution(solutionId);
  const [form, setForm] = useState<SolutionFull | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const isDirty = useMemo(() => {
    if (!data || !form) return false;
    return JSON.stringify(data) !== JSON.stringify(form);
  }, [data, form]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  if (isLoading || !form) return <div className="text-sm text-zinc-500">Cargando…</div>;

  const update = <K extends keyof SolutionFull>(key: K, value: SolutionFull[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("solutions")
      .update({
        title: form.title,
        short_description: form.short_description,
        long_description: form.long_description,
        category: form.category as never,
        difficulty: form.difficulty as never,
        estimated_time: form.estimated_time,
        platform_investment: form.platform_investment,
        development_time_minutes: form.development_time_minutes ?? 0,
        tokens_per_execution: form.tokens_per_execution ?? 0,
        video_url: form.video_url,
        lovable_remix_url: form.lovable_remix_url,
      })
      .eq("id", solutionId);
    setSaving(false);
    if (error) {
      toast.error("Error al guardar: " + error.message, { duration: 4000 });
      return;
    }
    toast.success("Solución actualizada", { duration: 4000 });
    invalidateAll(qc, solutionId);
  };

  return (
    <div className="space-y-4">
      <Field label="Título">
        <Input value={form.title} onChange={(e) => update("title", e.target.value)} />
      </Field>
      <Field label="Descripción corta">
        <Textarea
          rows={2}
          value={form.short_description}
          onChange={(e) => update("short_description", e.target.value)}
        />
      </Field>
      <Field label="Descripción larga">
        <Textarea
          rows={6}
          value={form.long_description}
          onChange={(e) => update("long_description", e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría">
          <Select value={form.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Dificultad">
          <Select value={form.difficulty} onValueChange={(v) => update("difficulty", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tiempo estimado">
          <Input
            value={form.estimated_time}
            onChange={(e) => update("estimated_time", e.target.value)}
            placeholder="12-16 horas"
          />
        </Field>
        <Field label="Inversión en plataforma">
          <Input
            value={form.platform_investment ?? ""}
            onChange={(e) => update("platform_investment", e.target.value)}
            placeholder="$4.500 USD"
          />
        </Field>
        <Field label="Minutos de desarrollo">
          <Input
            type="number"
            value={form.development_time_minutes ?? 0}
            onChange={(e) => update("development_time_minutes", Number(e.target.value))}
          />
        </Field>
        <Field label="Tokens por ejecución">
          <Input
            type="number"
            value={form.tokens_per_execution ?? 0}
            onChange={(e) => update("tokens_per_execution", Number(e.target.value))}
          />
        </Field>
      </div>
      <Field label="Video URL">
        <Input
          value={form.video_url ?? ""}
          onChange={(e) => update("video_url", e.target.value)}
          placeholder="https://…"
        />
      </Field>
      <Field label="Lovable remix URL">
        <Input
          value={form.lovable_remix_url ?? ""}
          onChange={(e) => update("lovable_remix_url", e.target.value)}
          placeholder="https://lovable.dev/…"
        />
      </Field>

      <div className="sticky bottom-0 -mx-6 mt-6 flex justify-end gap-2 border-t bg-background px-6 py-3">
        <Button onClick={save} disabled={!isDirty || saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  );
}

// --- Cover tab ---------------------------------------------------------

function CoverTab({ solutionId }: { solutionId: string }) {
  const qc = useQueryClient();
  const { data } = useSolution(solutionId);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `covers/${solutionId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("solution-covers")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast.error("Error subiendo: " + upErr.message, { duration: 4000 });
      return;
    }
    const { data: pub } = supabase.storage.from("solution-covers").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;
    const { error } = await supabase
      .from("solutions")
      .update({ cover_image_url: url })
      .eq("id", solutionId);
    setUploading(false);
    if (error) {
      toast.error("Error al guardar URL: " + error.message, { duration: 4000 });
      return;
    }
    toast.success("Imagen actualizada", { duration: 4000 });
    invalidateAll(qc, solutionId);
  };

  const handleRemove = async () => {
    const { error } = await supabase
      .from("solutions")
      .update({ cover_image_url: null })
      .eq("id", solutionId);
    if (error) {
      toast.error("Error: " + error.message, { duration: 4000 });
      return;
    }
    // Try to remove common extensions
    await supabase.storage
      .from("solution-covers")
      .remove([`covers/${solutionId}.jpg`, `covers/${solutionId}.png`, `covers/${solutionId}.webp`]);
    toast.success("Imagen eliminada", { duration: 4000 });
    invalidateAll(qc, solutionId);
  };

  return (
    <div className="space-y-4">
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-zinc-100">
        {data?.cover_image_url ? (
          <img src={data.cover_image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
            Sin imagen
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background hover:opacity-90">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Subiendo…" : "Subir nueva imagen"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
        </label>
        {data?.cover_image_url && (
          <Button variant="outline" size="sm" onClick={handleRemove}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar
          </Button>
        )}
      </div>
    </div>
  );
}

// --- Tools tab ---------------------------------------------------------

function ToolsTab({
  solutionId,
  onDirtyChange,
}: {
  solutionId: string;
  onDirtyChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: allTools } = useQuery({
    queryKey: ["admin-tools-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("id, name, slug, logo_url, website, description")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ToolRow[];
    },
  });

  const { data: assignedRemote } = useQuery({
    queryKey: ["admin-solution-tools", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solution_tools")
        .select("tool_id, is_essential, display_order")
        .eq("solution_id", solutionId);
      if (error) throw error;
      return (data ?? []) as SolutionToolRow[];
    },
  });

  const [assigned, setAssigned] = useState<SolutionToolRow[] | null>(null);
  useEffect(() => {
    if (assignedRemote) setAssigned(assignedRemote);
  }, [assignedRemote]);

  const isDirty = useMemo(() => {
    if (!assignedRemote || !assigned) return false;
    return JSON.stringify(assignedRemote) !== JSON.stringify(assigned);
  }, [assignedRemote, assigned]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const toolMap = useMemo(() => {
    const m = new Map<string, ToolRow>();
    (allTools ?? []).forEach((t) => m.set(t.id, t));
    return m;
  }, [allTools]);

  const assignedSet = useMemo(
    () => new Set((assigned ?? []).map((a) => a.tool_id)),
    [assigned],
  );

  const available = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (allTools ?? []).filter((t) => {
      if (assignedSet.has(t.id)) return false;
      if (!s) return true;
      return t.name.toLowerCase().includes(s);
    });
  }, [allTools, assignedSet, search]);

  const addTool = (toolId: string) => {
    setAssigned((prev) => [
      ...(prev ?? []),
      { tool_id: toolId, is_essential: true, display_order: 0 },
    ]);
  };

  const removeTool = (toolId: string) => {
    setAssigned((prev) => (prev ?? []).filter((a) => a.tool_id !== toolId));
  };

  const updateTool = (toolId: string, patch: Partial<SolutionToolRow>) => {
    setAssigned((prev) =>
      (prev ?? []).map((a) => (a.tool_id === toolId ? { ...a, ...patch } : a)),
    );
  };

  const save = async () => {
    if (!assigned) return;
    setSaving(true);
    // Delete all and re-insert (simpler & atomic-enough for small lists)
    const { error: delErr } = await supabase
      .from("solution_tools")
      .delete()
      .eq("solution_id", solutionId);
    if (delErr) {
      setSaving(false);
      toast.error("Error: " + delErr.message, { duration: 4000 });
      return;
    }
    if (assigned.length > 0) {
      const { error: insErr } = await supabase.from("solution_tools").insert(
        assigned.map((a) => ({
          solution_id: solutionId,
          tool_id: a.tool_id,
          is_essential: a.is_essential,
          display_order: a.display_order ?? 0,
        })),
      );
      if (insErr) {
        setSaving(false);
        toast.error("Error: " + insErr.message, { duration: 4000 });
        return;
      }
    }
    setSaving(false);
    toast.success("Herramientas actualizadas", { duration: 4000 });
    qc.invalidateQueries({ queryKey: ["admin-solution-tools", solutionId] });
    invalidateAll(qc, solutionId);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Assigned */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Asignadas ({assigned?.length ?? 0})
          </h3>
          <div className="space-y-2">
            {(assigned ?? []).length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-xs text-zinc-400">
                Sin herramientas
              </div>
            ) : (
              (assigned ?? [])
                .slice()
                .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                .map((a) => {
                  const t = toolMap.get(a.tool_id);
                  if (!t) return null;
                  return (
                    <div
                      key={a.tool_id}
                      className="flex items-center gap-2 rounded-lg border bg-white p-2"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-100">
                        {t.logo_url ? (
                          <img src={t.logo_url} alt="" className="h-6 w-6 object-contain" />
                        ) : (
                          <span className="text-[10px] text-zinc-400">{t.name[0]}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{t.name}</div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                          <Switch
                            checked={a.is_essential}
                            onCheckedChange={(v) => updateTool(a.tool_id, { is_essential: v })}
                          />
                          <span>{a.is_essential ? "Esencial" : "Opcional"}</span>
                        </div>
                      </div>
                      <Input
                        type="number"
                        value={a.display_order ?? 0}
                        onChange={(e) =>
                          updateTool(a.tool_id, { display_order: Number(e.target.value) })
                        }
                        className="h-8 w-14 text-xs"
                      />
                      <button
                        onClick={() => removeTool(a.tool_id)}
                        className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Quitar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Available */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Catálogo
          </h3>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar herramienta…"
              className="h-8 pl-7 text-xs"
            />
          </div>
          <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
            {available.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-xs text-zinc-400">
                Sin resultados
              </div>
            ) : (
              available.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg border bg-white p-2"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-zinc-100">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt="" className="h-5 w-5 object-contain" />
                    ) : (
                      <span className="text-[10px] text-zinc-400">{t.name[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-sm">{t.name}</div>
                  <Button size="sm" variant="outline" onClick={() => addTool(t.id)}>
                    <Plus className="mr-1 h-3 w-3" /> Agregar
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-6 flex justify-end border-t bg-background px-6 py-3">
        <Button onClick={save} disabled={!isDirty || saving}>
          {saving ? "Guardando…" : "Guardar orden y cambios"}
        </Button>
      </div>
    </div>
  );
}

// --- Resources tab -----------------------------------------------------

function ResourcesTab({
  solutionId,
  onDirtyChange,
}: {
  solutionId: string;
  onDirtyChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data } = useSolution(solutionId);
  const [items, setItems] = useState<ResourceLink[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ResourceLink>({
    type: "link",
    title: "",
    description: "",
    url: "",
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (data) setItems(data.resources ?? []);
  }, [data]);

  const isDirty = useMemo(() => {
    if (!data || !items) return false;
    return JSON.stringify(data.resources ?? []) !== JSON.stringify(items);
  }, [data, items]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const updateItem = (i: number, patch: Partial<ResourceLink>) =>
    setItems((prev) => (prev ?? []).map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const removeAt = (i: number) =>
    setItems((prev) => (prev ?? []).filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    setItems((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return next;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const addDraft = () => {
    if (!draft.title.trim() || !draft.url.trim()) {
      toast.error("Título y URL son obligatorios", { duration: 4000 });
      return;
    }
    setItems((prev) => [
      ...(prev ?? []),
      {
        type: "link",
        title: draft.title.trim(),
        description: draft.description?.trim() || undefined,
        url: draft.url.trim(),
        domain: extractDomain(draft.url.trim()),
      },
    ]);
    setDraft({ type: "link", title: "", description: "", url: "" });
    setAdding(false);
  };

  const save = async () => {
    if (!items) return;
    setSaving(true);
    const { error } = await supabase
      .from("solutions")
      .update({ resources: items as never })
      .eq("id", solutionId);
    setSaving(false);
    if (error) {
      toast.error("Error: " + error.message, { duration: 4000 });
      return;
    }
    toast.success("Recursos actualizados", { duration: 4000 });
    invalidateAll(qc, solutionId);
  };

  return (
    <div className="space-y-3">
      {(items ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-xs text-zinc-400">
          Sin recursos
        </div>
      ) : (
        (items ?? []).map((it, i) => (
          <div key={i} className="space-y-2 rounded-lg border bg-white p-3">
            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Input
                  value={it.title}
                  onChange={(e) => updateItem(i, { title: e.target.value })}
                  placeholder="Título"
                  className="h-8 text-sm"
                />
                <Input
                  value={it.description ?? ""}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  placeholder="Descripción"
                  className="h-8 text-sm"
                />
                <Input
                  value={it.url}
                  onChange={(e) =>
                    updateItem(i, { url: e.target.value, domain: extractDomain(e.target.value) })
                  }
                  placeholder="https://…"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => move(i, -1)}
                  className="rounded border px-1.5 text-xs text-zinc-500 hover:bg-zinc-50"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  className="rounded border px-1.5 text-xs text-zinc-500 hover:bg-zinc-50"
                >
                  ↓
                </button>
                <button
                  onClick={() => removeAt(i)}
                  className="rounded border px-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {adding ? (
        <div className="space-y-2 rounded-lg border bg-zinc-50 p-3">
          <Input
            placeholder="Título"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Descripción (opcional)"
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="h-8 text-sm"
          />
          <Input
            placeholder="https://…"
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            className="h-8 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={addDraft}>
              Agregar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-md border border-dashed px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
        >
          + Agregar recurso
        </button>
      )}

      <div className="sticky bottom-0 -mx-6 flex justify-end border-t bg-background px-6 py-3">
        <Button onClick={save} disabled={!isDirty || saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
