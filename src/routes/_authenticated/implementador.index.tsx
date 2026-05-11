import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/implementador/")({
  component: ImplementerPanel,
});

type Row = {
  id: string;
  status: string;
  contact_name: string | null;
  company_name: string | null;
  contact_email: string | null;
  source_solution_id: string | null;
  implementador_id: string | null;
  created_at: string;
  solutions: { title: string } | null;
};

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

function ImplementerPanel() {
  const { user } = useAuth();
  const { role, loading: roleLoading, isImplementer, isAdmin } = useRole();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!roleLoading && role && !isImplementer) {
      navigate({ to: "/dashboard" });
    }
  }, [roleLoading, role, isImplementer, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["impl-projects", user?.id, isAdmin],
    enabled: !!user && isImplementer,
    queryFn: async () => {
      let q = supabase
        .from("builder_projects")
        .select(
          "id, status, contact_name, company_name, contact_email, source_solution_id, implementador_id, created_at, solutions:source_solution_id(title)",
        )
        .order("created_at", { ascending: false });
      if (!isAdmin) q = q.eq("implementador_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const counts = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === "pending" || r.status === "assigned").length,
      in_progress: rows.filter((r) => r.status === "in_progress").length,
      completed: rows.filter((r) => r.status === "completed").length,
    };
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (tab === "pending") rows = rows.filter((r) => r.status === "pending" || r.status === "assigned");
    else if (tab === "in_progress") rows = rows.filter((r) => r.status === "in_progress");
    else if (tab === "completed") rows = rows.filter((r) => r.status === "completed");
    const s = search.trim().toLowerCase();
    if (s) {
      rows = rows.filter(
        (r) =>
          (r.contact_name ?? "").toLowerCase().includes(s) ||
          (r.company_name ?? "").toLowerCase().includes(s),
      );
    }
    return rows;
  }, [data, tab, search]);

  if (roleLoading || !isImplementer) {
    return <div className="p-10 text-sm text-gray-400">Cargando…</div>;
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Panel del Implementador</h1>
      <p className="mt-1 text-sm text-gray-500">Proyectos asignados a tu cuenta.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { n: counts.total, l: "Total" },
          { n: counts.pending, l: "Pendientes" },
          { n: counts.in_progress, l: "En curso" },
          { n: counts.completed, l: "Completados" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-2xl font-bold">{s.n}</div>
            <div className="text-xs text-gray-500">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1 text-xs">
          {([
            ["all", "Todos"],
            ["pending", "Pendientes"],
            ["in_progress", "En curso"],
            ["completed", "Completados"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 transition ${
                tab === k ? "bg-foreground text-background" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Buscar por cliente o empresa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full sm:max-w-xs text-sm"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Solución</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-gray-400">Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-gray-400">Sin proyectos.</td></tr>
            ) : (
              filtered.map((r) => {
                const meta = STATUS_META[r.status] ?? STATUS_META.pending;
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.contact_name ?? "—"}</div>
                      <div className="text-xs text-gray-500">{r.company_name ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.solutions?.title ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {new Date(r.created_at).toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => navigate({ to: "/implementador/proyecto/$projectId", params: { projectId: r.id } })}
                      >
                        Ver detalle →
                      </Button>
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
