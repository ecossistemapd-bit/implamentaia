import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Target,
  Building2,
  Sparkles,
  Send,
  Loader2,
  Upload,
  FileText,
  X,
  AlertTriangle,
  Stethoscope,
  Lightbulb,
  MessageSquareQuote,
  Compass,
  Inbox,
  Download,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/asistente-ventas/")({
  component: AsistenteVentasPage,
});

// ============================================================
// Tipos del análisis devuelto por la edge function
// ============================================================
interface Pain {
  dolor: string;
  impacto: string;
}
interface Recommendation {
  titulo: string;
  slug: string | null;
  dolor_que_resuelve: string;
  beneficio: string;
}
interface Analysis {
  resumen_ejecutivo?: string;
  posicionamiento?: string;
  analisis_empresa?: string;
  dolores?: Pain[];
  soluciones_recomendadas?: Recommendation[];
  mensaje_sugerido?: string;
}
interface DocMeta {
  name: string;
  path: string;
  size: number;
  type: string;
}
interface CompanyForm {
  name: string;
  website: string;
  industry: string;
  contact_name: string;
  contact_email: string;
  what_sells: string;
  notes: string;
}

const EMPTY_COMPANY: CompanyForm = {
  name: "",
  website: "",
  industry: "",
  contact_name: "",
  contact_email: "",
  what_sells: "",
  notes: "",
};

const STATUS_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  en_proceso: "En proceso",
  cerrado: "Cerrado",
  descartado: "Descartado",
};

const STATUS_STYLES: Record<string, string> = {
  nuevo: "border-blue-500/40 bg-blue-500/10 text-blue-500",
  en_proceso: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  cerrado: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  descartado: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

function isTextLike(file: File): boolean {
  return file.type.startsWith("text/") || /\.(txt|md|markdown|csv|json|html?)$/i.test(file.name);
}

function sanitizeName(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").slice(0, 80);
}

// ============================================================
// Página principal
// ============================================================
function AsistenteVentasPage() {
  const [tab, setTab] = useState("nuevo");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-card/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-4 py-4 sm:px-6">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Asistente de Ventas</h1>
            <p className="text-xs text-muted-foreground">
              Pre-venta: analizá al prospecto, detectá sus dolores y enviáselo al closer.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="nuevo" className="gap-1.5">
              <Sparkles className="h-4 w-4" /> Nuevo análisis
            </TabsTrigger>
            <TabsTrigger value="prospectos" className="gap-1.5">
              <Inbox className="h-4 w-4" /> Prospectos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nuevo">
            <NuevoAnalisis onSent={() => setTab("prospectos")} />
          </TabsContent>
          <TabsContent value="prospectos">
            <ProspectosList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============================================================
// Vista: Nuevo análisis
// ============================================================
function NuevoAnalisis({ onSent }: { onSent: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [company, setCompany] = useState<CompanyForm>(EMPTY_COMPANY);
  const [contextText, setContextText] = useState("");
  const [files, setFiles] = useState<{ file: File; text: string | null }[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const setField = (k: keyof CompanyForm, v: string) => setCompany((prev) => ({ ...prev, [k]: v }));

  const canAnalyze = company.name.trim().length >= 2 && !analyzing;

  const onPickFiles = async (selected: FileList | null) => {
    if (!selected) return;
    const incoming = Array.from(selected);
    const read = await Promise.all(
      incoming.map(async (file) => ({
        file,
        text: isTextLike(file) ? (await file.text()).slice(0, 20000) : null,
      })),
    );
    setFiles((prev) => [...prev, ...read]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const analyze = async () => {
    if (!canAnalyze) return;
    setAnalyzing(true);
    setError(null);
    setAnalysis(null);

    const combinedContext = [
      contextText.trim(),
      ...files.filter((f) => f.text).map((f) => `--- ${f.file.name} ---\n${f.text}`),
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("sales-assistant-analyze", {
        body: { company, context_text: combinedContext },
      });
      if (fnError) {
        let msg = "No pudimos generar el análisis. Probá de nuevo.";
        try {
          const ctx = (fnError as { context?: Response }).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch {
          /* noop */
        }
        throw new Error(msg);
      }
      const result = (data as { analysis?: Analysis })?.analysis;
      if (!result) throw new Error("La IA no devolvió un análisis válido.");
      setAnalysis(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generando el análisis.");
    } finally {
      setAnalyzing(false);
    }
  };

  const sendToCloser = async () => {
    if (!analysis || !user) return;
    setSending(true);
    try {
      const docs: DocMeta[] = [];
      for (const { file } of files) {
        const path = `${user.id}/${Date.now()}-${sanitizeName(file.name)}`;
        const { error: upErr } = await supabase.storage
          .from("sales-docs")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (!upErr) {
          docs.push({ name: file.name, path, size: file.size, type: file.type });
        }
      }

      const { error: insErr } = await supabase.from("sales_prospects").insert({
        user_id: user.id,
        company_name: company.name.trim(),
        website: company.website.trim() || null,
        industry: company.industry.trim() || null,
        contact_name: company.contact_name.trim() || null,
        contact_email: company.contact_email.trim() || null,
        what_sells: company.what_sells.trim() || null,
        notes: company.notes.trim() || null,
        analysis: analysis as unknown as Json,
        documents: docs as unknown as Json,
      });
      if (insErr) throw insErr;

      toast.success("Prospecto enviado al closer", { duration: 4000 });
      qc.invalidateQueries({ queryKey: ["sales-prospects"] });
      setCompany(EMPTY_COMPANY);
      setContextText("");
      setFiles([]);
      setAnalysis(null);
      onSent();
    } catch (e) {
      toast.error("No se pudo enviar: " + (e instanceof Error ? e.message : "error desconocido"), {
        duration: 5000,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ---- Columna izquierda: formulario ---- */}
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Building2 className="h-4 w-4 text-primary" /> Datos de la empresa
          </div>
          <div className="space-y-3">
            <Field label="Nombre de la empresa *">
              <Input
                value={company.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Ej: Inmobiliaria Sur"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Rubro / sector">
                <Input
                  value={company.industry}
                  onChange={(e) => setField("industry", e.target.value)}
                  placeholder="Ej: Inmobiliaria"
                />
              </Field>
              <Field label="Sitio web">
                <Input
                  value={company.website}
                  onChange={(e) => setField("website", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
            </div>
            <Field label="¿Qué vende / a qué se dedica?">
              <Textarea
                value={company.what_sells}
                onChange={(e) => setField("what_sells", e.target.value)}
                placeholder="Ej: Venta y alquiler de propiedades, capta leads por Instagram..."
                className="min-h-[70px] resize-none"
              />
            </Field>
            <Field label="Observaciones del SDR">
              <Textarea
                value={company.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Lo que viste: demoran en responder, sin CRM, mucho volumen de WhatsApp..."
                className="min-h-[70px] resize-none"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contacto (nombre)">
                <Input
                  value={company.contact_name}
                  onChange={(e) => setField("contact_name", e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </Field>
              <Field label="Contacto (email)">
                <Input
                  type="email"
                  value={company.contact_email}
                  onChange={(e) => setField("contact_email", e.target.value)}
                  placeholder="juan@empresa.com"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ---- Documentos / contexto ---- */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-primary" /> Contexto y documentos
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Pegá info o subí archivos (casos previos, material de la empresa) para que el asistente
            genere mejores respuestas.
          </p>
          <Textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            placeholder="Pegá acá notas, propuestas anteriores, info del sector..."
            className="mb-3 min-h-[90px] resize-none"
          />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <Upload className="h-4 w-4" /> Subir archivos
          </button>

          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{f.file.name}</span>
                  {!f.text && (
                    <span
                      className="shrink-0 text-[10px] text-muted-foreground"
                      title="Se guarda y queda disponible para el closer, pero su texto no se extrae para la IA"
                    >
                      sin lectura de texto
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Quitar archivo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button onClick={analyze} disabled={!canAnalyze} className="w-full gap-2">
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analizando…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Analizar empresa
            </>
          )}
        </Button>
      </div>

      {/* ---- Columna derecha: resultado ---- */}
      <div className="space-y-4">
        {!analysis && !analyzing && !error && (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Compass className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">El análisis aparece acá</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Completá los datos de la empresa y presioná «Analizar empresa».
            </p>
          </div>
        )}

        {analyzing && (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-border bg-card/40 p-8 text-center">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Analizando el posicionamiento y los dolores…</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cruzando con el catálogo de soluciones.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" /> No se pudo analizar
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={analyze} className="mt-3 gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Reintentar
            </Button>
          </div>
        )}

        {analysis && (
          <>
            <AnalysisView analysis={analysis} />
            <Button onClick={sendToCloser} disabled={sending} className="w-full gap-2">
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Enviar al closer
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ============================================================
// Render del análisis (reutilizado en lista de prospectos)
// ============================================================
function AnalysisView({ analysis }: { analysis: Analysis }) {
  return (
    <div className="space-y-4">
      {analysis.resumen_ejecutivo && (
        <Section icon={Sparkles} title="Resumen ejecutivo">
          <p className="text-sm text-muted-foreground">{analysis.resumen_ejecutivo}</p>
        </Section>
      )}

      {analysis.posicionamiento && (
        <Section icon={Target} title="Posicionamiento">
          <p className="text-sm text-muted-foreground">{analysis.posicionamiento}</p>
        </Section>
      )}

      {analysis.analisis_empresa && (
        <Section icon={Building2} title="Análisis de la empresa">
          <p className="text-sm text-muted-foreground">{analysis.analisis_empresa}</p>
        </Section>
      )}

      {analysis.dolores && analysis.dolores.length > 0 && (
        <Section icon={Stethoscope} title="Dolores detectados">
          <ul className="space-y-2">
            {analysis.dolores.map((d, i) => (
              <li key={i} className="rounded-lg border border-border bg-background p-3">
                <p className="text-sm font-medium">{d.dolor}</p>
                {d.impacto && <p className="mt-0.5 text-xs text-muted-foreground">{d.impacto}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.soluciones_recomendadas && analysis.soluciones_recomendadas.length > 0 && (
        <Section icon={Lightbulb} title="Soluciones recomendadas">
          <ul className="space-y-2">
            {analysis.soluciones_recomendadas.map((r, i) => (
              <li key={i} className="rounded-lg border border-primary/30 bg-primary/[0.04] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{r.titulo}</p>
                  {r.slug && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {r.slug}
                    </Badge>
                  )}
                </div>
                {r.dolor_que_resuelve && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Resuelve:</span>{" "}
                    {r.dolor_que_resuelve}
                  </p>
                )}
                {r.beneficio && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Beneficio:</span> {r.beneficio}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.mensaje_sugerido && (
        <Section icon={MessageSquareQuote} title="Mensaje sugerido para el closer">
          <p className="whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
            {analysis.mensaje_sugerido}
          </p>
        </Section>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Sparkles;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-2.5 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      {children}
    </div>
  );
}

// ============================================================
// Vista: lista de prospectos enviados
// ============================================================
interface ProspectRow {
  id: string;
  user_id: string;
  company_name: string;
  website: string | null;
  industry: string | null;
  contact_name: string | null;
  contact_email: string | null;
  what_sells: string | null;
  notes: string | null;
  analysis: Analysis;
  documents: DocMeta[];
  status: string;
  created_at: string;
}

function ProspectosList() {
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sales-prospects"],
    queryFn: async () => {
      // RLS limita el alcance: el SDR ve los suyos, el admin/closer ve todos.
      const { data, error } = await supabase
        .from("sales_prospects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProspectRow[];
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("sales_prospects").update({ status }).eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar el estado", { duration: 4000 });
      return;
    }
    toast.success("Estado actualizado", { duration: 2500 });
    qc.invalidateQueries({ queryKey: ["sales-prospects"] });
  };

  const downloadDoc = async (path: string) => {
    const { data, error } = await supabase.storage.from("sales-docs").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error("No se pudo abrir el documento", { duration: 4000 });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-16 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Inbox className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium">Todavía no hay prospectos</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Los análisis que envíes al closer van a aparecer acá.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isAdmin && (
        <p className="text-xs text-muted-foreground">
          Estás viendo todos los prospectos enviados al equipo (modo closer/admin).
        </p>
      )}
      {data.map((p) => {
        const isOpen = expanded === p.id;
        return (
          <div key={p.id} className="rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{p.company_name}</span>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] ${STATUS_STYLES[p.status] ?? ""}`}
                  >
                    {STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {[p.industry, p.contact_name, p.contact_email].filter(Boolean).join(" · ") ||
                    "Sin datos de contacto"}
                </p>
              </div>

              <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={() => setExpanded(isOpen ? null : p.id)}>
                {isOpen ? "Ocultar" : "Ver análisis"}
              </Button>
            </div>

            {isOpen && (
              <div className="space-y-4 border-t border-border p-4">
                {p.documents && p.documents.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {p.documents.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => downloadDoc(d.path)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                      >
                        <Download className="h-3.5 w-3.5" /> {d.name}
                      </button>
                    ))}
                  </div>
                )}
                <AnalysisView analysis={p.analysis ?? {}} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
