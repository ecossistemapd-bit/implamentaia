// Implementa AI · Edge Function: luna-chat
// ----------------------------------------------------------------------------
// Asistente conversacional "Luna" — proxy con streaming SSE a OpenAI GPT-4o
// y function calling (navigate / search_solutions / get_user_progress).
//
// Flujo:
//   Cliente envía POST { messages: [...], userId } → este endpoint forwardea
//   a OpenAI con stream:true, recibe chunks, los reenvía al cliente como SSE.
//   Cuando OpenAI emite tool_calls, ejecuta el tool acá (search en Supabase /
//   query de progreso) y devuelve el resultado en el siguiente turn.
//
// Seguridad: la API key OPENAI_API_KEY vive como secret en Supabase.
// Nunca toca el frontend ni el repo.
// ----------------------------------------------------------------------------
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";

const SYSTEM_PROMPT = `Sos Luna, la asistente de IA de Implementa AI — la plataforma B2B SaaS de LatAm donde empresas implementan soluciones de IA reales (no demos).

CONTEXTO DE LA PLATAFORMA:
- Catálogo de 90+ soluciones de IA listas (Ventas, Marketing, Operaciones, RRHH, Finanzas, Servicio al Cliente, Modelos IA, Jurídico). Cada solución tiene 5 pasos guiados.
- Builder: cuando ninguna solución encaja, el usuario describe su problema y vos generás un blueprint custom asistido por IA.
- Cursos: capacitación práctica para que el equipo no dependa de externos (Lovable, Claude, n8n, etc.).
- Mentorías: 4 Q&A grupales por día (09:00, 10:30, 14:00, 15:30 ART) — accesibles desde /mentoria.

TU ROL:
- Asistir al usuario navegando la plataforma, recomendando soluciones, resolviendo dudas sobre implementación.
- Sos su consultora personal de IA, no un FAQ bot.

REGLAS DE ESTILO:
- Hablás en español con voseo argentino (vos, tenés, podés, mirá, dale).
- Concreta, no marketing vacío. Cero "estoy aquí para ayudarte" — vas al grano.
- Mensajes cortos (2-4 líneas). Si la pregunta es compleja, dividilo en varios.
- Cuando recomendás una acción, usá las funciones disponibles (navigate, search_solutions, get_user_progress) en vez de sólo describir qué hacer.

CAPACIDADES (function calling):
- navigate(path) — llevás al usuario a una ruta. Usalo cuando dice "mostrame X" o "llevame a X".
- search_solutions(query) — buscás en el catálogo. Usalo cuando pregunta "qué solución hay para X" o "ayudame con Y".
- get_user_progress() — ves su progreso real. Usalo cuando pregunta "cómo voy" o "qué me falta".

LÍMITES:
- No inventes soluciones que no existan en el catálogo (usá search_solutions).
- Si te preguntan algo fuera del ámbito de Implementa AI o de IA empresarial, decí: "Eso queda fuera de lo que puedo ayudarte. ¿Volvemos a tus implementaciones?"
- Nunca des consejos legales/médicos/financieros específicos.`;

// ── Tool definitions (OpenAI function calling) ────────────────────────
const TOOLS = [
  {
    type: "function",
    function: {
      name: "navigate",
      description:
        "Navega al usuario a una ruta de la plataforma Implementa AI.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            enum: [
              "/dashboard",
              "/solutions",
              "/cursos",
              "/mi-progreso",
              "/projects",
              "/builder",
              "/mentoria",
              "/settings",
            ],
            description: "Ruta destino.",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_solutions",
      description:
        "Busca soluciones en el catálogo que matcheen una consulta. Devuelve top 5.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Términos de búsqueda. Ej: 'automatizar leads de WhatsApp'.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_progress",
      description:
        "Devuelve el progreso real del usuario: soluciones activas, completadas, próximo paso.",
      parameters: { type: "object", properties: {} },
    },
  },
];

// ── Tool implementations ──────────────────────────────────────────────
type SupaClient = ReturnType<typeof createClient>;

async function execTool(
  name: string,
  args: Record<string, unknown>,
  supa: SupaClient,
  userId: string,
): Promise<unknown> {
  if (name === "navigate") {
    // Navegación es solo señal al cliente — el cliente decide cómo manejarla.
    return { ok: true, path: args.path };
  }

  if (name === "search_solutions") {
    const query = String(args.query ?? "").toLowerCase();
    const { data } = await supa
      .from("solutions")
      .select("id, title, slug, short_description, status")
      .eq("status", "disponible")
      .limit(50);
    const sols = (data ?? []) as Array<{
      id: string;
      title: string;
      slug: string;
      short_description: string;
      status: string;
    }>;
    const tokens = query.split(/\s+/).filter(Boolean);
    const ranked = sols
      .map((s) => {
        const hay = `${s.title} ${s.short_description}`.toLowerCase();
        const score = tokens.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
        return { ...s, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ id, title, short_description }) => ({
        id,
        title,
        description: short_description,
      }));
    return { results: ranked, count: ranked.length };
  }

  if (name === "get_user_progress") {
    const [steps, projects] = await Promise.all([
      supa
        .from("solution_steps_progress" as never)
        .select("solution_id, step, completed")
        .eq("user_id", userId),
      supa.from("builder_projects").select("id, status").eq("user_id", userId),
    ]);
    type Step = { solution_id: string; step: string; completed: boolean };
    const rows = ((steps as { data: Step[] | null }).data) ?? [];
    const bySol: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.completed) bySol[r.solution_id] = (bySol[r.solution_id] ?? 0) + 1;
    });
    const completed = Object.values(bySol).filter((n) => n >= 5).length;
    const active = Object.entries(bySol)
      .filter(([, n]) => n > 0 && n < 5)
      .map(([id, n]) => ({ id, completedSteps: n, totalSteps: 5 }));
    const activeProjects = (projects.data ?? []).filter(
      (p) => p.status !== "completed",
    ).length;
    return {
      completed_solutions: completed,
      active_solutions: active,
      active_builder_projects: activeProjects,
    };
  }

  return { error: `Tool desconocido: ${name}` };
}

// ── Main handler ──────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY no configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const userMessages: Array<{ role: string; content: string }> =
      body.messages ?? [];
    const userId: string = body.userId ?? "anonymous";

    // Supabase admin client (service role) — para que las queries de tools
    // ignoren RLS y siempre puedan leer el catálogo y el progreso del user.
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const supaServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supaUrl, supaServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Mensajes iniciales (system + history)
    const messages: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...userMessages,
    ];

    // Stream SSE al cliente
    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (event: Record<string, unknown>) =>
          controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));

        try {
          // Loop hasta que OpenAI deje de emitir tool calls
          let safety = 0;
          while (safety < 5) {
            safety++;
            const openaiRes = await fetch(OPENAI_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: MODEL,
                messages,
                tools: TOOLS,
                stream: true,
                temperature: 0.7,
              }),
            });

            if (!openaiRes.ok) {
              const errText = await openaiRes.text();
              send({ type: "error", message: `OpenAI ${openaiRes.status}: ${errText.slice(0, 200)}` });
              controller.close();
              return;
            }

            const reader = openaiRes.body!.getReader();
            const dec = new TextDecoder();
            let buffer = "";
            let assistantText = "";
            const toolCalls: Array<{
              id: string;
              name: string;
              args: string;
            }> = [];

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += dec.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;
                if (!data) continue;

                try {
                  const chunk = JSON.parse(data);
                  const delta = chunk.choices?.[0]?.delta;
                  if (!delta) continue;

                  // Texto incremental
                  if (delta.content) {
                    assistantText += delta.content;
                    send({ type: "text", delta: delta.content });
                  }

                  // Tool calls incremental
                  if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      const idx = tc.index ?? 0;
                      if (!toolCalls[idx]) {
                        toolCalls[idx] = {
                          id: tc.id ?? "",
                          name: tc.function?.name ?? "",
                          args: "",
                        };
                      }
                      if (tc.id) toolCalls[idx].id = tc.id;
                      if (tc.function?.name) toolCalls[idx].name = tc.function.name;
                      if (tc.function?.arguments)
                        toolCalls[idx].args += tc.function.arguments;
                    }
                  }
                } catch {
                  // chunk parsing fail — siguiente
                }
              }
            }

            // Si no hubo tool calls → terminamos
            if (toolCalls.length === 0) {
              send({ type: "done" });
              controller.close();
              return;
            }

            // Ejecutar tools + agregar resultado al historial para next iteration
            messages.push({
              role: "assistant",
              content: assistantText || null,
              tool_calls: toolCalls.map((tc) => ({
                id: tc.id,
                type: "function",
                function: { name: tc.name, arguments: tc.args },
              })),
            });

            for (const tc of toolCalls) {
              let parsedArgs: Record<string, unknown> = {};
              try {
                parsedArgs = JSON.parse(tc.args || "{}");
              } catch {
                /* ignore */
              }
              // Notificar al cliente que se invocó un tool (para navigate sobre todo)
              send({
                type: "tool_call",
                name: tc.name,
                args: parsedArgs,
              });
              const result = await execTool(tc.name, parsedArgs, supa, userId);
              messages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              });
            }
            // Loop: pedir a OpenAI que continúe con los tool results
          }

          send({ type: "error", message: "Demasiados turnos de tool calls" });
          controller.close();
        } catch (err) {
          send({
            type: "error",
            message: err instanceof Error ? err.message : "Error desconocido",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Error desconocido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
