import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";

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
  pending: { label: "Pendiente", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  assigned: { label: "Asignado", cls: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  in_progress: { label: "En curso", cls: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  completed: { label: "Completado", cls: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  cancelled: { label: "Cancelado", cls: "bg-zinc-600/20 text-zinc-400 border-zinc-600/30" },
  generating: { label: "Generando", cls: "bg-zinc-600/20 text-zinc-400 border-zinc-600/30" },
  ready: { label: "Listo", cls: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  error: { label: "Error", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
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
    return <div className="p-10 text-sm text-zinc-400">Cargando…</div>;
  }

  const stats = [
    { n: counts.total, l: "Total", icon: ClipboardList },
    { n: counts.pending, l: "Pendientes", icon: Clock },
    { n: counts.in_progress, l: "En curso", icon: Loader2 },
    { n: counts.completed, l: "Completados", icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-white">
        Panel del <span className="text-violet-400">Implementador</span>
      </h1>
      <p className="mt-1 text-sm text-zinc-400">Proyectos asignados a tu cuenta.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.l}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition hover:scale-[1.02] hover:border-violet-500/50"
          >
            <s.icon className="h-4 w-4 text-violet-400" strokeWidth={1.75} />
            <div className="mt-3 text-3xl font-bold text-violet-400">{s.n}</div>
            <div className="mt-1 text-sm text-zinc-400">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl bg-zinc-900/50 p-1 text-xs">
          {([
            ["all", "Todos"],
            ["pending", "Pendientes"],
            ["in_progress", "En curso"],
            ["completed", "Completados"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-lg border px-3 py-1.5 transition ${
                tab === k
                  ? "border-violet-500/50 bg-violet-500/20 text-violet-400"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          placeholder="Buscar por cliente o empresa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none sm:max-w-xs"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Solución</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-zinc-600">Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-zinc-600">Sin proyectos.</td></tr>
            ) : (
              filtered.map((r) => {
                const meta = STATUS_META[r.status] ?? STATUS_META.pending;
                const hasName = !!r.contact_name;
                return (
                  <tr key={r.id} className="border-b border-zinc-800/50 bg-zinc-900 transition hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      {hasName ? (
                        <>
                          <div className="font-medium text-zinc-200">{r.contact_name}</div>
                          <div className="text-xs text-zinc-600">{r.company_name ?? ""}</div>
                        </>
                      ) : (
                        <span className="italic text-zinc-600">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{r.solutions?.title ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {new Date(r.created_at).toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate({ to: "/implementador/proyecto/$projectId", params: { projectId: r.id } })}
                        className="rounded-lg border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 transition hover:border-violet-500 hover:text-violet-400"
                      >
                        Ver detalle →
                      </button>
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
