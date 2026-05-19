import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { FEATURES } from "@/lib/features";

export const Route = createFileRoute("/_authenticated/implementador/")({
  beforeLoad: () => {
    if (!FEATURES.MARKETPLACE) throw redirect({ to: "/dashboard" });
  },
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
  pending: { label: "Pendiente", cls: "bg-muted text-muted-foreground border-border" },
  assigned: { label: "Asignado", cls: "bg-primary/20 text-primary border-primary" },
  in_progress: { label: "En curso", cls: "bg-primary/20 text-primary border-primary" },
  completed: { label: "Completado", cls: "bg-primary/20 text-primary border-primary" },
  cancelled: { label: "Cancelado", cls: "bg-muted text-muted-foreground border-border" },
  generating: { label: "Generando", cls: "bg-muted text-muted-foreground border-border" },
  ready: { label: "Listo", cls: "bg-primary/20 text-primary border-primary" },
  error: { label: "Error", cls: "bg-muted text-muted-foreground border-border" },
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
    return <div className="p-10 text-sm text-muted-foreground">Cargando…</div>;
  }

  const stats = [
    { n: counts.total, l: "Total", icon: ClipboardList },
    { n: counts.pending, l: "Pendientes", icon: Clock },
    { n: counts.in_progress, l: "En curso", icon: Loader2 },
    { n: counts.completed, l: "Completados", icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Panel del <span className="text-primary">Implementador</span>
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Proyectos asignados a tu cuenta.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.l}
            className="rounded-xl border border-border bg-card p-5 transition hover:scale-[1.02] hover:border-primary"
          >
            <s.icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
            <div className="mt-3 text-3xl font-bold text-primary">{s.n}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl bg-card p-1 text-xs">
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
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
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
          className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:max-w-xs"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
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
              <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-muted-foreground">Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-muted-foreground">Sin proyectos.</td></tr>
            ) : (
              filtered.map((r) => {
                const meta = STATUS_META[r.status] ?? STATUS_META.pending;
                const hasName = !!r.contact_name;
                return (
                  <tr key={r.id} className="border-b border-border bg-card transition hover:bg-muted">
                    <td className="px-4 py-3">
                      {hasName ? (
                        <>
                          <div className="font-medium text-foreground">{r.contact_name}</div>
                          <div className="text-xs text-muted-foreground">{r.company_name ?? ""}</div>
                        </>
                      ) : (
                        <span className="italic text-muted-foreground">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.solutions?.title ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate({ to: "/implementador/proyecto/$projectId", params: { projectId: r.id } })}
                        className="rounded-lg border border-border px-4 py-1.5 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
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
