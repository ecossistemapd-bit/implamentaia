import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Copy, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/builder/$id")({
  component: BuilderResult,
});

type Output = {
  plan_md?: string;
  system_prompt?: string;
  integrations?: { tool_name: string; purpose: string; docs_url?: string; setup_steps?: string[] }[];
  assets?: { type: string; title: string; content: string }[];
};

function BuilderResult() {
  const { id } = Route.useParams();
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("builder_projects").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    refetchInterval: (q) => (q.state.data?.status === "generating" ? 2000 : false),
  });

  if (isLoading || !project) {
    return <div className="mx-auto max-w-4xl px-6 py-16"><div className="h-8 w-48 animate-pulse rounded bg-muted" /></div>;
  }

  const output = (project.output ?? {}) as Output;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 lg:py-16">
      <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Mis proyectos
      </Link>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{project.title}</h1>
        <Badge variant={project.status === "ready" ? "default" : project.status === "error" ? "destructive" : "secondary"}>
          {project.status}
        </Badge>
      </div>

      {project.status === "generating" && (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          Generando tu plan... esto puede tardar unos segundos.
        </div>
      )}

      {project.status === "error" && (
        <div className="mt-10 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
          Hubo un problema generando el plan. {project.error_message}
        </div>
      )}

      {project.status === "ready" && (
        <Tabs defaultValue="plan" className="mt-10">
          <TabsList>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="integrations">Integraciones</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
          </TabsList>
          <TabsContent value="plan" className="mt-6">
            <div className="prose-mono">
              <ReactMarkdown>{output.plan_md ?? ""}</ReactMarkdown>
            </div>
          </TabsContent>
          <TabsContent value="prompt" className="mt-6">
            <div className="rounded-2xl border border-border bg-muted p-6">
              <div className="mb-3 flex justify-end">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => { navigator.clipboard.writeText(output.system_prompt ?? ""); toast.success("Copiado"); }}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
                </Button>
              </div>
              <pre className="whitespace-pre-wrap text-sm">{output.system_prompt}</pre>
            </div>
          </TabsContent>
          <TabsContent value="integrations" className="mt-6 space-y-3">
            {(output.integrations ?? []).map((it, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{it.tool_name}</div>
                  {it.docs_url && <a href={it.docs_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline">Docs</a>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{it.purpose}</p>
                {it.setup_steps && (
                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                    {it.setup_steps.map((s, j) => <li key={j}>{s}</li>)}
                  </ol>
                )}
              </div>
            ))}
          </TabsContent>
          <TabsContent value="assets" className="mt-6 space-y-3">
            {(output.assets ?? []).map((a, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{a.type}</div>
                <div className="mt-1 font-medium">{a.title}</div>
                <pre className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{a.content}</pre>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
