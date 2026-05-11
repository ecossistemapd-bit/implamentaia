import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/solutions/$id/contratar")({
  component: ContratarPage,
});

function ContratarPage() {
  const { id } = Route.useParams();
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        to="/solutions/$id"
        params={{ id }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <h1 className="mt-8 text-4xl font-semibold tracking-tight">Contratar Implementador</h1>
      <p className="mt-4 text-muted-foreground">Próximamente.</p>
    </div>
  );
}
