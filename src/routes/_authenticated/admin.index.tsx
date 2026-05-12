import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
  const [tab, setTab] = useState<"users" | "projects" | "solutions">("users");
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

      <div className="mt-6 flex gap-1 rounded-lg border border-gray-200 bg-white p-1 text-xs w-fit">
        {([
          ["users", "Usuarios"],
          ["projects", "Proyectos"],
          ["solutions", "Soluciones"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => {
              setTab(k);
              if (k === "users") setFilterUserId(null);
            }}
            className={`rounded-md px-3 py-1.5 transition ${
              tab === k ? "bg-foreground text-background" : "text-gray-600 hover:bg-gray-50"
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
      ) : (
        <SolutionsTab />
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
};

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
      toast.error("Error: " + error.message);
      return;
    }
    toast.success("✓ Guardado");
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
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-gray-400">Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-gray-400">Sin resultados.</td></tr>
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
      toast.error("Error: " + error.message);
      return;
    }
    toast.success("✓ Asignado");
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
              statusTab === k ? "bg-foreground text-background" : "text-gray-600 hover:bg-gray-50"
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

// ===================== SolutionsTab =====================

type ResourceLink = {
  type?: string;
  title: string;
  description?: string;
  url: string;
  domain?: string;
};

type SolutionRow = {
  id: string;
  title: string;
  category: string;
  resources: ResourceLink[] | null;
};

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toUpperCase();
  } catch {
    return "";
  }
}

function SolutionsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-solutions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solutions")
        .select("id, title, category, resources")
        .order("title");
      if (error) throw error;
      return (data ?? []) as unknown as SolutionRow[];
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const rows = data ?? [];
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(s) ||
        (r.category ?? "").toLowerCase().includes(s),
    );
  }, [data, search]);

  const saveResources = async (id: string, resources: ResourceLink[]) => {
    const { error } = await supabase
      .from("solutions")
      .update({ resources: resources as never })
      .eq("id", id);
    if (error) {
      toast.error("Error: " + error.message);
      return false;
    }
    toast.success("✓ Links actualizados");
    qc.invalidateQueries({ queryKey: ["admin-solutions"] });
    return true;
  };

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-500">
          {(data ?? []).length} soluciones · gestioná los links útiles de cada una
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
          filtered.map((sol) => (
            <div
              key={sol.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            >
              <button
                onClick={() => setOpenId((cur) => (cur === sol.id ? null : sol.id))}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900">{sol.title}</div>
                  <div className="text-xs text-gray-500">
                    {sol.category} · {sol.resources?.length ?? 0} links
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {openId === sol.id ? "Cerrar" : "Editar links"}
                </span>
              </button>

              {openId === sol.id && (
                <ResourcesEditor
                  initial={sol.resources ?? []}
                  onSave={(next) => saveResources(sol.id, next)}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ResourcesEditor({
  initial,
  onSave,
}: {
  initial: ResourceLink[];
  onSave: (next: ResourceLink[]) => Promise<boolean>;
}) {
  const [items, setItems] = useState<ResourceLink[]>(initial);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ResourceLink>({
    type: "link",
    title: "",
    description: "",
    url: "",
  });
  const [saving, setSaving] = useState(false);

  const removeAt = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addDraft = () => {
    if (!draft.title.trim() || !draft.url.trim()) {
      toast.error("Título y URL son obligatorios");
      return;
    }
    const next: ResourceLink = {
      type: "link",
      title: draft.title.trim(),
      description: draft.description?.trim() || undefined,
      url: draft.url.trim(),
      domain: extractDomain(draft.url.trim()),
    };
    setItems((prev) => [...prev, next]);
    setDraft({ type: "link", title: "", description: "", url: "" });
    setAdding(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(items);
    setSaving(false);
    if (!ok) return;
  };

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-4">
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-xs text-gray-400">
            No hay links todavía.
          </div>
        ) : (
          items.map((it, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-900">
                  {it.title}
                </div>
                <div className="truncate text-xs text-gray-500">{it.url}</div>
              </div>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium tracking-wider text-gray-600">
                {it.domain || extractDomain(it.url)}
              </span>
              <button
                onClick={() => removeAt(i)}
                className="text-xs text-red-600 hover:underline"
              >
                Eliminar
              </button>
            </div>
          ))
        )}
      </div>

      {adding ? (
        <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          <Input
            placeholder="Título"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="h-9 text-sm"
          />
          <Input
            placeholder="Descripción (opcional)"
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="h-9 text-sm"
          />
          <Input
            placeholder="https://…"
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            className="h-9 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={addDraft}
              className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background"
            >
              Agregar
            </button>
            <button
              onClick={() => setAdding(false)}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 rounded-md border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-100"
        >
          + Agregar Link
        </button>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
