import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Trash2, Pencil, GraduationCap, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminPanel,
});

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  assigned: { label: "Asignado", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "En curso", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  completed: { label: "Completado", cls: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "Cancelado", cls: "bg-gray-50 text-gray-500 border-gray-200" },
  generating: { label: "Generando", cls: "bg-gray-50 text-gray-500 border-gray-200" },
  ready: { label: "Listo", cls: "bg-green-50 text-green-700 border-green-200" },
  error: { label: "Error", cls: "bg-red-50 text-red-700 border-red-200" },
};

const ROLE_BADGE: Record<string, string> = {
  user: "bg-gray-100 text-gray-600",
  implementador: "bg-blue-50 text-blue-700",
  admin: "bg-black text-white",
};
const ROLE_LABEL: Record<string, string> = {
  user: "Usuario",
  implementador: "Implementador",
  admin: "Admin",
};

function AdminPanel() {
  const { role, loading: roleLoading, isAdmin } = useRole();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"users" | "projects" | "solutions" | "access">("users");
  const [filterUserId, setFilterUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && role && !isAdmin) navigate({ to: "/dashboard" });
  }, [roleLoading, role, isAdmin, navigate]);

  if (roleLoading || !isAdmin) {
    return <div className="p-10 text-sm text-gray-400">Cargando…</div>;
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight">Panel de Administración</h1>
      <p className="mt-1 text-sm text-gray-500">Gestión de usuarios y proyectos de Implementa AI.</p>

      {/* Atajos a secciones aparte (rutas dedicadas, no inline) */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/admin/cursos"
          className="app-card group flex items-center gap-4 p-4 text-left"
        >
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: "var(--violet-pill-bg)", color: "var(--violet-text)" }}
          >
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-foreground">
              Cursos
            </span>
            <span className="block text-[12px] text-muted-foreground">
              Crear, editar y cargar contenido de Capacitación
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="mt-8 flex gap-1 rounded-lg border border-gray-200 bg-white p-1 text-xs w-fit">
        {([
          ["users", "Usuarios"],
          ["projects", "Proyectos"],
          ["solutions", "Soluciones"],
          ["access", "Acceso"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => {
              setTab(k);
              if (k === "users") setFilterUserId(null);
            }}
            className={`rounded-md px-3 py-1.5 transition ${
              tab === k ? "bg-foreground text-background" : "text-muted-foreground hover:bg-white/[0.08]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "users" ? (
        <UsersTab onViewProjects={(uid) => { setFilterUserId(uid); setTab("projects"); }} />
      ) : tab === "projects" ? (
        <ProjectsTab filterUserId={filterUserId} onClearFilter={() => setFilterUserId(null)} />
      ) : tab === "solutions" ? (
        <SolutionsTab />
      ) : (
        <AccessTab />
      )}
    </div>
  );
}

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  role: string;
  created_at: string;
  tickets: number;
};

// ── TicketCell — edición inline de tickets por usuario ─────────
function TicketCell({ userId, initialTickets, onSaved }: {
  userId: string;
  initialTickets: number;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialTickets);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (value < 0 || !Number.isFinite(value)) {
      toast.error("Los tickets deben ser un número ≥ 0", { duration: 3000 });
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("admin_set_user_tickets" as never, {
      p_user_id: userId,
      p_tickets: value,
    });
    setSaving(false);
    if (error) {
      toast.error("Error: " + error.message, { duration: 4000 });
      return;
    }
    toast.success(`✓ Tickets actualizados → ${value}`, { duration: 3000 });
    setEditing(false);
    onSaved();
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${
          initialTickets > 0
            ? "border-violet-200 bg-violet-50 text-violet-700"
            : "border-gray-200 bg-gray-50 text-gray-500"
        }`}>
          🎟 {initialTickets}
        </span>
        <button
          onClick={() => { setEditing(true); setValue(initialTickets); }}
          className="text-gray-300 hover:text-gray-600 transition"
          title="Editar tickets"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => setValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-7 w-14 rounded border border-gray-300 bg-white px-2 text-xs text-gray-900 focus:border-violet-400 focus:outline-none"
        autoFocus
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-50"
        title="Guardar"
      >
        {saving ? "…" : "✓"}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="text-xs text-gray-400 hover:text-gray-600"
        title="Cancelar"
      >
        ✕
      </button>
    </div>
  );
}

function UsersTab({ onViewProjects }: { onViewProjects: (uid: string) => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users" as never);
      if (error) throw error;
      return (data ?? []) as unknown as UserRow[];
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let rows = data ?? [];
    if (s) {
      rows = rows.filter((r) =>
        (r.full_name ?? "").toLowerCase().includes(s) ||
        (r.email ?? "").toLowerCase().includes(s) ||
        (r.company_name ?? "").toLowerCase().includes(s),
      );
    }
    return rows;
  }, [data, search]);

  const updateRole = async (id: string, newRole: string) => {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", id);
    if (error) {
      toast.error("Error: " + error.message, { duration: 4000 });
      return;
    }
    toast.success("✓ Guardado", { duration: 4000 });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-500">{(data ?? []).length} usuarios registrados</div>
        <Input
          placeholder="Buscar por nombre, email o empresa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full sm:max-w-xs text-sm"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Tickets</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-gray-400">Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-gray-400">Sin resultados.</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {u.full_name ? (
                      <span className="text-gray-900">{u.full_name}</span>
                    ) : (
                      <span className="italic text-gray-400">Sin nombre</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{u.email}</td>
                  <td className="px-4 py-3 text-gray-700">{u.company_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Select value={u.role} onValueChange={(v) => updateRole(u.id, v)}>
                      <SelectTrigger className={`h-7 w-fit gap-1 border-0 px-2 text-xs ${ROLE_BADGE[u.role] ?? ROLE_BADGE.user}`}>
                        <SelectValue>{ROLE_LABEL[u.role] ?? "Usuario"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="implementador">Implementador</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <TicketCell
                      userId={u.id}
                      initialTickets={u.tickets ?? 0}
                      onSaved={() => qc.invalidateQueries({ queryKey: ["admin-users"] })}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {new Date(u.created_at).toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onViewProjects(u.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver proyectos →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type ProjectRow = {
  id: string;
  user_id: string;
  status: string;
  type: string | null;
  contact_name: string | null;
  company_name: string | null;
  source_solution_id: string | null;
  implementador_id: string | null;
  created_at: string;
  solutions: { title: string } | null;
};

function ProjectsTab({ filterUserId, onClearFilter }: { filterUserId: string | null; onClearFilter: () => void }) {
  const qc = useQueryClient();
  const [statusTab, setStatusTab] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [search, setSearch] = useState("");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("builder_projects")
        .select("id, user_id, status, type, contact_name, company_name, source_solution_id, implementador_id, created_at, solutions:source_solution_id(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectRow[];
    },
  });

  const { data: implementers } = useQuery({
    queryKey: ["admin-implementers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["implementador", "admin"]);
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string | null }[];
    },
  });

  const implMap = useMemo(() => {
    const m = new Map<string, string>();
    (implementers ?? []).forEach((i) => m.set(i.id, i.full_name ?? "Sin nombre"));
    return m;
  }, [implementers]);

  const filtered = useMemo(() => {
    let rows = projects ?? [];
    if (filterUserId) rows = rows.filter((r) => r.user_id === filterUserId);
    if (statusTab === "pending") rows = rows.filter((r) => r.status === "pending" || r.status === "assigned");
    else if (statusTab === "in_progress") rows = rows.filter((r) => r.status === "in_progress");
    else if (statusTab === "completed") rows = rows.filter((r) => r.status === "completed");
    const s = search.trim().toLowerCase();
    if (s) {
      rows = rows.filter((r) =>
        (r.contact_name ?? "").toLowerCase().includes(s) ||
        (r.company_name ?? "").toLowerCase().includes(s),
      );
    }
    return rows;
  }, [projects, statusTab, search, filterUserId]);

  const assign = async (projectId: string, implId: string) => {
    const { error } = await supabase
      .from("builder_projects")
      .update({ implementador_id: implId, status: "assigned" as never })
      .eq("id", projectId);
    if (error) {
      toast.error("Error: " + error.message, { duration: 4000 });
      return;
    }
    toast.success("✓ Asignado", { duration: 4000 });
    qc.invalidateQueries({ queryKey: ["admin-projects"] });
  };

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-500">
          {(projects ?? []).length} proyectos en total
          {filterUserId && (
            <button onClick={onClearFilter} className="ml-3 text-xs text-blue-600 hover:underline">
              Quitar filtro de usuario
            </button>
          )}
        </div>
        <Input
          placeholder="Buscar por cliente o empresa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full sm:max-w-xs text-sm"
        />
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 text-xs w-fit">
        {([
          ["all", "Todos"],
          ["pending", "Pendientes"],
          ["in_progress", "En curso"],
          ["completed", "Completados"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setStatusTab(k)}
            className={`rounded-md px-3 py-1.5 transition whitespace-nowrap ${
              statusTab === k ? "bg-foreground text-background" : "text-muted-foreground hover:bg-white/[0.08]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Solución</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Implementador</th>
              <th className="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-gray-400">Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-gray-400">Sin proyectos.</td></tr>
            ) : (
              filtered.map((p) => {
                const meta = STATUS_META[p.status] ?? STATUS_META.pending;
                const isImpl = p.type === "implementador";
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.contact_name ?? "—"}</div>
                      <div className="text-xs text-gray-500">{p.company_name ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.solutions?.title ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                        isImpl ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}>
                        {isImpl ? "Con implementador" : "DIY"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.implementador_id ? (
                        <span className="text-sm text-gray-700">{implMap.get(p.implementador_id) ?? "—"}</span>
                      ) : (
                        <Select value="" onValueChange={(v) => assign(p.id, v)}>
                          <SelectTrigger className="h-7 w-40 text-xs">
                            <SelectValue placeholder="Asignar…" />
                          </SelectTrigger>
                          <SelectContent>
                            {(implementers ?? []).map((i) => (
                              <SelectItem key={i.id} value={i.id}>{i.full_name ?? "Sin nombre"}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {new Date(p.created_at).toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


type ResourceLink = {
  type?: string;
  title: string;
  description?: string;
  url: string;
  domain?: string;
};

type ResourceFormItem = ResourceLink & { client_id: string };

type ToolRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
};

type SolutionToolInlineRow = {
  tool_id: string;
  is_essential: boolean;
  display_order: number | null;
  tool?: ToolRow | null;
};

type SolutionRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  difficulty: string;
  short_description: string;
  long_description: string;
  estimated_time: string;
  roi_estimate: string;
  platform_investment: string | null;
  development_time_minutes: number | null;
  tokens_per_execution: number | null;
  cover_image_url: string | null;
  icon_name: string;
  tools_required: string[] | null;
  integrations: string[] | null;
  features: string[] | null;
  video_url: string | null;
  lovable_remix_url: string | null;
  prompt_template: string | null;
  n8n_template: string | null;
  checklist_items: string[] | null;
  builder_questions: unknown | null;
  resources: ResourceLink[] | null;
  is_featured: boolean;
  solution_tools?: SolutionToolInlineRow[] | null;
};

type SolutionForm = {
  title: string;
  slug: string;
  category: string;
  difficulty: string;
  short_description: string;
  long_description: string;
  estimated_time: string;
  roi_estimate: string;
  platform_investment: string;
  development_time_minutes: number;
  tokens_per_execution: number;
  cover_image_url: string;
  icon_name: string;
  tools_required_text: string;
  integrations_text: string;
  features_text: string;
  video_url: string;
  lovable_remix_url: string;
  prompt_template: string;
  n8n_template: string;
  checklist_items_text: string;
  builder_questions_text: string;
  resources: ResourceFormItem[];
  is_featured: boolean;
};

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

function makeClientId(prefix: string) {
  try {
    return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.random()}`;
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toUpperCase();
  } catch {
    return "";
  }
}

function linesToArray(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function initialFormFromSolution(solution: SolutionRow): SolutionForm {
  return {
    title: solution.title ?? "",
    slug: solution.slug ?? "",
    category: solution.category ?? "ventas",
    difficulty: solution.difficulty ?? "principiante",
    short_description: solution.short_description ?? "",
    long_description: solution.long_description ?? "",
    estimated_time: solution.estimated_time ?? "",
    roi_estimate: solution.roi_estimate ?? "",
    platform_investment: solution.platform_investment ?? "",
    development_time_minutes: solution.development_time_minutes ?? 0,
    tokens_per_execution: solution.tokens_per_execution ?? 0,
    cover_image_url: solution.cover_image_url ?? "",
    icon_name: solution.icon_name ?? "Sparkles",
    tools_required_text: (solution.tools_required ?? []).join("\n"),
    integrations_text: (solution.integrations ?? []).join("\n"),
    features_text: (solution.features ?? []).join("\n"),
    video_url: solution.video_url ?? "",
    lovable_remix_url: solution.lovable_remix_url ?? "",
    prompt_template: solution.prompt_template ?? "",
    n8n_template: solution.n8n_template ?? "",
    checklist_items_text: (solution.checklist_items ?? []).join("\n"),
    builder_questions_text: solution.builder_questions ? JSON.stringify(solution.builder_questions, null, 2) : "",
    resources: (solution.resources ?? []).map((resource) => ({
      client_id: makeClientId("resource"),
      type: resource.type ?? "link",
      title: resource.title ?? "",
      description: resource.description ?? "",
      url: resource.url ?? "",
      domain: resource.domain ?? extractDomain(resource.url ?? ""),
    })),
    is_featured: Boolean(solution.is_featured),
  };
}

function initialToolsFromSolution(solution: SolutionRow): SolutionToolInlineRow[] {
  return (solution.solution_tools ?? []).map((row, position) => ({
    tool_id: row.tool_id,
    is_essential: row.is_essential ?? true,
    display_order: row.display_order ?? position,
    tool: row.tool ?? null,
  }));
}

function SolutionsTab() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-solutions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solutions")
        .select(
          "id, title, slug, category, difficulty, short_description, long_description, estimated_time, roi_estimate, platform_investment, development_time_minutes, tokens_per_execution, cover_image_url, icon_name, tools_required, integrations, features, video_url, lovable_remix_url, prompt_template, n8n_template, checklist_items, builder_questions, resources, is_featured, solution_tools(tool_id, is_essential, display_order, tool:tools(id, name, slug, logo_url, website, description))",
        )
        .order("title");
      if (error) throw error;
      return (data ?? []) as unknown as SolutionRow[];
    },
  });

  const solutionSearch = search.trim().toLowerCase();
  const filtered = solutionSearch
    ? (data ?? []).filter(
        (r) =>
          r.title.toLowerCase().includes(solutionSearch) ||
          (r.category ?? "").toLowerCase().includes(solutionSearch),
      )
    : (data ?? []);

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-500">
          {(data ?? []).length} soluciones · editá título, descripción, cover, herramientas y links
        </div>
        <Input
          placeholder="Buscar solución…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full sm:max-w-xs text-sm"
        />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-xs text-gray-400">
            Cargando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-xs text-gray-400">
            Sin resultados.
          </div>
        ) : (
          filtered.map((sol) => {
            const expanded = expandedId === sol.id;
            return (
              <div key={sol.id} className="rounded-xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-10 w-16 shrink-0 overflow-hidden rounded bg-zinc-100">
                      {sol.cover_image_url ? (
                        <img src={sol.cover_image_url} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">{sol.title}</div>
                      <div className="text-xs text-gray-500">
                        {sol.category} · {(sol.resources ?? []).length} recursos
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedId((prev) => (prev === sol.id ? null : sol.id))}
                    className="shrink-0 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
                  >
                    {expanded ? "Cerrar" : "Editar"}
                  </button>
                </div>

                {expanded && (
                  <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-4 transition-all duration-200">
                    <SolutionInlineEditor key={sol.id} solution={sol} onCancel={() => setExpandedId(null)} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SolutionInlineEditor({ solution, onCancel }: { solution: SolutionRow; onCancel: () => void }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"general" | "cover" | "tools" | "resources">("general");
  const [form, setForm] = useState<SolutionForm>(() => initialFormFromSolution(solution));
  const [assignedTools, setAssignedTools] = useState<SolutionToolInlineRow[]>(() => initialToolsFromSolution(solution));
  const [toolSearch, setToolSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: allTools = [] } = useQuery({
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

  const assignedToolIds = new Set(assignedTools.map((tool) => tool.tool_id));
  const toolSearchValue = toolSearch.trim().toLowerCase();
  const availableTools = allTools.filter((tool) => {
    if (assignedToolIds.has(tool.id)) return false;
    if (!toolSearchValue) return true;
    return tool.name.toLowerCase().includes(toolSearchValue);
  });

  const updateField = <K extends keyof SolutionForm>(key: K, value: SolutionForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    let builderQuestions: unknown = null;
    if (form.builder_questions_text.trim()) {
      try {
        builderQuestions = JSON.parse(form.builder_questions_text);
      } catch {
        toast.error("Builder questions debe ser JSON válido", { duration: 4000 });
        return;
      }
    }

    setSaving(true);
    const solutionPayload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      category: form.category as never,
      difficulty: form.difficulty as never,
      short_description: form.short_description,
      long_description: form.long_description,
      estimated_time: form.estimated_time,
      roi_estimate: form.roi_estimate,
      platform_investment: form.platform_investment || null,
      development_time_minutes: form.development_time_minutes || 0,
      tokens_per_execution: form.tokens_per_execution || 0,
      cover_image_url: form.cover_image_url.trim() || null,
      icon_name: form.icon_name.trim() || "Sparkles",
      tools_required: linesToArray(form.tools_required_text),
      integrations: linesToArray(form.integrations_text),
      features: linesToArray(form.features_text),
      video_url: form.video_url.trim() || null,
      lovable_remix_url: form.lovable_remix_url.trim() || null,
      prompt_template: form.prompt_template.trim() || null,
      n8n_template: form.n8n_template.trim() || null,
      checklist_items: linesToArray(form.checklist_items_text),
      builder_questions: builderQuestions as never,
      resources: form.resources.map((resource) => ({
        type: resource.type ?? "link",
        title: resource.title.trim(),
        url: resource.url.trim(),
        description: resource.description?.trim() || undefined,
        domain: extractDomain(resource.url.trim()),
      })) as never,
      is_featured: form.is_featured,
    };

    const { error } = await supabase
      .from("solutions")
      .update(solutionPayload as never)
      .eq("id", solution.id);

    if (error) {
      setSaving(false);
      toast.error("Error al guardar: " + error.message, { duration: 4000 });
      return;
    }

    const { error: deleteError } = await supabase
      .from("solution_tools")
      .delete()
      .eq("solution_id", solution.id);

    if (deleteError) {
      setSaving(false);
      toast.error("Error al guardar herramientas: " + deleteError.message, { duration: 4000 });
      return;
    }

    if (assignedTools.length > 0) {
      const { error: insertError } = await supabase.from("solution_tools").insert(
        assignedTools.map((tool) => ({
          solution_id: solution.id,
          tool_id: tool.tool_id,
          is_essential: tool.is_essential,
          display_order: tool.display_order ?? 0,
        })),
      );

      if (insertError) {
        setSaving(false);
        toast.error("Error al guardar herramientas: " + insertError.message, { duration: 4000 });
        return;
      }
    }

    setSaving(false);
    toast.success("Solución actualizada", { duration: 4000 });
    qc.invalidateQueries({ queryKey: ["admin-solutions"] });
    qc.invalidateQueries({ queryKey: ["solutions"] });
    qc.invalidateQueries({ queryKey: ["solution-by-id", solution.id] });
    onCancel();
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `covers/${solution.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("solution-covers")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setUploading(false);
      toast.error("Error subiendo imagen: " + uploadError.message, { duration: 4000 });
      return;
    }

    const { data } = supabase.storage.from("solution-covers").getPublicUrl(path);
    updateField("cover_image_url", `${data.publicUrl}?v=${Date.now()}`);
    setUploading(false);
  };

  const updateResource = (clientId: string, patch: Partial<ResourceFormItem>) =>
    setForm((prev) => ({
      ...prev,
      resources: prev.resources.map((resource) =>
        resource.client_id === clientId ? { ...resource, ...patch } : resource,
      ),
    }));

  const moveResource = (clientId: string, direction: -1 | 1) =>
    setForm((prev) => {
      const resources = [...prev.resources];
      const index = resources.findIndex((resource) => resource.client_id === clientId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= resources.length) return prev;
      [resources[index], resources[nextIndex]] = [resources[nextIndex], resources[index]];
      return { ...prev, resources };
    });

  const addAssignedTool = (tool: ToolRow) =>
    setAssignedTools((prev) => [
      ...prev,
      { tool_id: tool.id, is_essential: true, display_order: prev.length, tool },
    ]);

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 text-gray-900 [&_input]:text-gray-900 [&_textarea]:text-gray-900 [&_select]:text-gray-900 [&_input::placeholder]:text-gray-400 [&_textarea::placeholder]:text-gray-400">
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs w-fit">
        {([
          ["general", "General"],
          ["cover", "Cover"],
          ["tools", "Herramientas"],
          ["resources", "Recursos"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`rounded-md px-3 py-1.5 transition ${
              activeTab === key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-white/[0.08]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <AdminField label="Título">
              <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
            </AdminField>
            <AdminField label="Slug">
              <Input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} />
            </AdminField>
            <AdminField label="Categoría">
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Dificultad">
              <select
                value={form.difficulty}
                onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {DIFFICULTY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Tiempo estimado">
              <Input value={form.estimated_time} onChange={(e) => setForm((prev) => ({ ...prev, estimated_time: e.target.value }))} />
            </AdminField>
            <AdminField label="ROI estimado">
              <Input value={form.roi_estimate} onChange={(e) => setForm((prev) => ({ ...prev, roi_estimate: e.target.value }))} />
            </AdminField>
            <AdminField label="Inversión plataforma">
              <Input value={form.platform_investment} onChange={(e) => setForm((prev) => ({ ...prev, platform_investment: e.target.value }))} />
            </AdminField>
            <AdminField label="Icon name">
              <Input value={form.icon_name} onChange={(e) => setForm((prev) => ({ ...prev, icon_name: e.target.value }))} />
            </AdminField>
            <AdminField label="Minutos desarrollo">
              <Input type="number" value={form.development_time_minutes} onChange={(e) => setForm((prev) => ({ ...prev, development_time_minutes: Number(e.target.value) }))} />
            </AdminField>
            <AdminField label="Tokens por ejecución">
              <Input type="number" value={form.tokens_per_execution} onChange={(e) => setForm((prev) => ({ ...prev, tokens_per_execution: Number(e.target.value) }))} />
            </AdminField>
          </div>

          <AdminField label="Descripción corta">
            <textarea value={form.short_description} onChange={(e) => setForm((prev) => ({ ...prev, short_description: e.target.value }))} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </AdminField>
          <AdminField label="Descripción larga">
            <textarea value={form.long_description} onChange={(e) => setForm((prev) => ({ ...prev, long_description: e.target.value }))} rows={5} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </AdminField>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <AdminField label="Herramientas requeridas (una por línea)">
              <textarea value={form.tools_required_text} onChange={(e) => setForm((prev) => ({ ...prev, tools_required_text: e.target.value }))} rows={5} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </AdminField>
            <AdminField label="Integraciones (una por línea)">
              <textarea value={form.integrations_text} onChange={(e) => setForm((prev) => ({ ...prev, integrations_text: e.target.value }))} rows={5} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </AdminField>
            <AdminField label="Features (una por línea)">
              <textarea value={form.features_text} onChange={(e) => setForm((prev) => ({ ...prev, features_text: e.target.value }))} rows={5} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </AdminField>
          </div>

          <AdminField label="Checklist items (uno por línea)">
            <textarea value={form.checklist_items_text} onChange={(e) => setForm((prev) => ({ ...prev, checklist_items_text: e.target.value }))} rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </AdminField>
          <AdminField label="Builder questions JSON">
            <textarea value={form.builder_questions_text} onChange={(e) => setForm((prev) => ({ ...prev, builder_questions_text: e.target.value }))} rows={5} className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs" />
          </AdminField>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm((prev) => ({ ...prev, is_featured: e.target.checked }))} />
            Destacada
          </label>
        </div>
      )}

      {activeTab === "cover" && (
        <div className="space-y-3">
          <div className="aspect-video max-w-2xl overflow-hidden rounded-lg border bg-zinc-100">
            {form.cover_image_url ? <img src={form.cover_image_url} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <AdminField label="Cover image URL">
            <Input value={form.cover_image_url} onChange={(e) => setForm((prev) => ({ ...prev, cover_image_url: e.target.value }))} />
          </AdminField>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background hover:opacity-90">
              {uploading ? "Subiendo…" : "Subir imagen"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadCover(file);
                  e.target.value = "";
                }}
              />
            </label>
            <button onClick={() => setForm((prev) => ({ ...prev, cover_image_url: "" }))} className="rounded-md border px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
              Quitar imagen
            </button>
          </div>
        </div>
      )}

      {activeTab === "tools" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Asignadas ({assignedTools.length})</div>
            <div className="space-y-2">
              {assignedTools.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-gray-400">Sin herramientas</div>
              ) : (
                assignedTools
                  .slice()
                  .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                  .map((assigned) => {
                    const tool = assigned.tool ?? allTools.find((item) => item.id === assigned.tool_id);
                    return (
                      <div key={assigned.tool_id} className="flex items-center gap-2 rounded-lg border bg-white p-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">{tool?.name ?? assigned.tool_id}</div>
                          <label className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                            <input
                              type="checkbox"
                              checked={assigned.is_essential}
                              onChange={(e) =>
                                setAssignedTools((prev) =>
                                  prev.map((item) => item.tool_id === assigned.tool_id ? { ...item, is_essential: e.target.checked } : item),
                                )
                              }
                            />
                            Esencial
                          </label>
                        </div>
                        <Input
                          type="number"
                          value={assigned.display_order ?? 0}
                          onChange={(e) =>
                            setAssignedTools((prev) =>
                              prev.map((item) => item.tool_id === assigned.tool_id ? { ...item, display_order: Number(e.target.value) } : item),
                            )
                          }
                          className="h-8 w-16 text-xs"
                        />
                        <button
                          onClick={() => setAssignedTools((prev) => prev.filter((item) => item.tool_id !== assigned.tool_id))}
                          className="rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Quitar
                        </button>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Catálogo</div>
            <Input value={toolSearch} onChange={(e) => setToolSearch(e.target.value)} placeholder="Buscar herramienta…" className="mb-2 h-8 text-xs" />
            <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {availableTools.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-gray-400">Sin resultados</div>
              ) : (
                availableTools.map((tool) => (
                  <div key={tool.id} className="flex items-center gap-2 rounded-lg border bg-white p-2">
                    <div className="min-w-0 flex-1 truncate text-sm text-gray-900">{tool.name}</div>
                    <button onClick={() => addAssignedTool(tool)} className="rounded-md border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
                      Agregar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "resources" && (
        <div className="space-y-3">
          {form.resources.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-gray-400">Sin recursos</div>
          ) : (
            form.resources.map((resource) => (
              <div key={resource.client_id} className="rounded-lg border bg-white p-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_1.4fr_auto]">
                  <Input value={resource.title} onChange={(e) => updateResource(resource.client_id, { title: e.target.value })} placeholder="Título" className="h-8 text-sm" />
                  <Input value={resource.description ?? ""} onChange={(e) => updateResource(resource.client_id, { description: e.target.value })} placeholder="Descripción" className="h-8 text-sm" />
                  <Input value={resource.url} onChange={(e) => updateResource(resource.client_id, { url: e.target.value, domain: extractDomain(e.target.value) })} placeholder="https://…" className="h-8 text-sm" />
                  <div className="flex gap-1">
                    <button onClick={() => moveResource(resource.client_id, -1)} className="rounded border px-2 text-xs text-gray-600 hover:bg-gray-50">↑</button>
                    <button onClick={() => moveResource(resource.client_id, 1)} className="rounded border px-2 text-xs text-gray-600 hover:bg-gray-50">↓</button>
                    <button onClick={() => setForm((prev) => ({ ...prev, resources: prev.resources.filter((item) => item.client_id !== resource.client_id) }))} className="rounded border px-2 text-xs text-red-600 hover:bg-red-50">Quitar</button>
                  </div>
                </div>
              </div>
            ))
          )}
          <button
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                resources: [...prev.resources, { client_id: makeClientId("resource"), type: "link", title: "", description: "", url: "", domain: "" }],
              }))
            }
            className="w-full rounded-md border border-dashed px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
          >
            + Agregar recurso
          </button>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <button onClick={onCancel} className="rounded-md border px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
          Cancelar
        </button>
        <button onClick={save} disabled={saving || uploading} className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50">
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

function AdminField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function AccessTab() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const allowedQ = useQuery({
    queryKey: ["allowed-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allowed_emails")
        .select("email, created_at, invited_by")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const usersQ = useQuery({
    queryKey: ["admin-users-emails"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return (data ?? []) as Array<{ email: string }>;
    },
  });

  const registered = useMemo(() => {
    const s = new Set<string>();
    (usersQ.data ?? []).forEach((u) => s.add(u.email.toLowerCase()));
    return s;
  }, [usersQ.data]);

  const handleAdd = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast.error("Email inválido");
      return;
    }
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("allowed_emails")
      .insert({ email: e, invited_by: user?.email ?? null });
    setAdding(false);
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        toast.error("Este email ya está autorizado");
      } else {
        toast.error("No se pudo autorizar el email");
      }
      return;
    }
    toast.success("Email autorizado. La persona ya puede registrarse.");
    setEmail("");
    setOpenAdd(false);
    qc.invalidateQueries({ queryKey: ["allowed-emails"] });
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("allowed_emails").delete().eq("email", toDelete);
    setDeleting(false);
    if (error) {
      toast.error("No se pudo quitar el acceso");
      return;
    }
    toast.success("Acceso eliminado");
    setToDelete(null);
    qc.invalidateQueries({ queryKey: ["allowed-emails"] });
  };

  const formatRelative = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "hace instantes";
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;
    const days = Math.floor(h / 24);
    if (days < 30) return `hace ${days} día${days === 1 ? "" : "s"}`;
    const months = Math.floor(days / 30);
    if (months < 12) return `hace ${months} mes${months === 1 ? "" : "es"}`;
    return new Date(d).toLocaleDateString("es-AR");
  };

  const rows = allowedQ.data ?? [];

  return (
    <div className="mt-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Acceso a la Plataforma</h2>
          <p className="mt-1 text-sm text-gray-500">
            Gestioná qué emails pueden registrarse en Implementa AI.
          </p>
        </div>
        <button
          onClick={() => setOpenAdd(true)}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          + Autorizar email
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {allowedQ.isLoading ? (
          <div className="px-4 py-12 text-center text-sm text-gray-400">Cargando…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl">
              ✉️
            </div>
            <p className="text-sm font-medium text-gray-900">No hay emails autorizados aún</p>
            <p className="mt-1 text-sm text-gray-500">
              Autorizá un email para que esa persona pueda crear su cuenta.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Autorizado</th>
                <th className="px-4 py-3 font-medium">Invitado por</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const isReg = registered.has(row.email.toLowerCase());
                return (
                  <tr key={row.email} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.email}</td>
                    <td className="px-4 py-3 text-gray-600">{formatRelative(row.created_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{row.invited_by ?? "—"}</td>
                    <td className="px-4 py-3">
                      {isReg ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          ✓ Registrado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          ○ Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setToDelete(row.email)}
                        className="rounded p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Quitar acceso"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={openAdd} onOpenChange={(o) => { setOpenAdd(o); if (!o) setEmail(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autorizar email</DialogTitle>
            <DialogDescription>
              La persona con este email va a poder crear su cuenta en Implementa AI.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="email"
            placeholder="email@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            autoFocus
          />
          <DialogFooter>
            <button
              onClick={() => setOpenAdd(false)}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={adding}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {adding ? "Autorizando…" : "Autorizar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar acceso?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a quitar el acceso de <span className="font-medium text-foreground">{toDelete}</span>.
              Si esa persona ya tiene cuenta creada, su cuenta seguirá funcionando, pero no podrá
              registrarse de nuevo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? "Quitando…" : "Quitar acceso"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
