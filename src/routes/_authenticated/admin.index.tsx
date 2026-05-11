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
  const [tab, setTab] = useState<"users" | "projects">("users");
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
      ) : (
        <ProjectsTab filterUserId={filterUserId} onClearFilter={() => setFilterUserId(null)} />
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
