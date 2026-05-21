// Implementa AI · Edge Function: builder-generate
// ----------------------------------------------------------------------------
// Fase 2a del Builder: recibe { idea, answers } del wizard y genera el
// "blueprint" de la solución (título dinámico, descripción, tags y un resumen
// de las 8 secciones) usando la API de Anthropic con structured output
// (forced tool_choice).
//
// Seguridad: la API key vive como secret ANTHROPIC_API_KEY (Lovable Cloud /
// Supabase secrets). Nunca toca el frontend ni el repo.
// ----------------------------------------------------------------------------
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
// Modelo por defecto: Opus 4.7 (best). Overridable a Sonnet por costo vía secret.
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-7";

const SYSTEM_PROMPT = `Sos un consultor senior en implementación de IA para empresas de LatAm, parte de la plataforma Implementa AI.

Recibís la idea de automatización de un usuario y sus respuestas a un diagnóstico. Tu tarea es diseñar el BLUEPRINT de la solución: un plan de implementación con IA estructurado en 8 secciones.

REGLAS DE ESTILO:
- Respondé SIEMPRE en español latinoamericano con voseo argentino (vos, tenés, podés, usá, hacé).
- Sé concreto y accionable. Cero relleno, cero marketing vacío.
- Usá nombres REALES de herramientas: Lovable, Supabase, n8n, Make, Zapier, Claude (Anthropic), OpenAI, Gemini, WhatsApp Business API, HubSpot, Vercel, etc. NUNCA inventes ni ofusques nombres de marcas.

REGLAS DE CONTENIDO:
- El título tiene que ser corto, claro y ESPECÍFICO a la idea (no genérico). Máx ~60 caracteres.
- Los tags son 4-6 categorías reales y útiles.
- Cada resumen de sección tiene que ser específico a ESTA idea concreta, no una descripción genérica de la sección.

Las 8 secciones del blueprint son:
1. Base de conocimientos — diagnóstico del problema, usuarios y contexto.
2. Estructura — los pilares técnicos de la implementación (datos, prompts, modelos, automatización, interfaz).
3. Arquitectura y flujos — el mapa/flujo del MVP de punta a punta.
4. Herramientas — el stack recomendado (esenciales + alternativas), con nombres reales.
5. Plan de acción — cómo se organiza el trabajo en sprints y tareas priorizadas.
6. Rápido y adorable — las indicaciones (prompts) listas para pegar en Lovable y armar el MVP.
7. Contenido — qué lecciones/temas conviene aprender para esta solución.
8. Economía — el ahorro/ROI estimado vs contratar profesionales.

Respondé SIEMPRE usando la herramienta generar_blueprint.`;

const BLUEPRINT_TOOL = {
  name: "generar_blueprint",
  description:
    "Genera el blueprint de implementación de IA para la idea del usuario.",
  input_schema: {
    type: "object",
    properties: {
      titulo: {
        type: "string",
        description:
          "Título corto, claro y específico a la idea (máx ~60 caracteres).",
      },
      descripcion: {
        type: "string",
        description:
          "Descripción de 2-3 frases de la solución completa, en español voseo.",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "4-6 tags cortos que categorizan la solución.",
      },
      secciones: {
        type: "object",
        properties: {
          base_conocimientos: {
            type: "string",
            description:
              "Resumen 1-2 frases: qué diagnóstico y contexto se cubre para esta idea.",
          },
          estructura: {
            type: "string",
            description:
              "Resumen 1-2 frases: los pilares técnicos de la implementación.",
          },
          arquitectura: {
            type: "string",
            description: "Resumen 1-2 frases: el flujo/arquitectura del MVP.",
          },
          herramientas: {
            type: "string",
            description:
              "Resumen 1-2 frases: el stack recomendado (nombres reales: Lovable, Supabase, n8n, Claude, etc.).",
          },
          plan_accion: {
            type: "string",
            description:
              "Resumen 1-2 frases: cómo se organiza el plan de acción en sprints.",
          },
          rapido_adorable: {
            type: "string",
            description:
              "Resumen 1-2 frases: los prompts listos para pegar en Lovable.",
          },
          contenido: {
            type: "string",
            description:
              "Resumen 1-2 frases: qué lecciones/temas conviene aprender.",
          },
          economia: {
            type: "string",
            description:
              "Resumen 1-2 frases: el ahorro/ROI estimado vs contratar profesionales.",
          },
        },
        required: [
          "base_conocimientos",
          "estructura",
          "arquitectura",
          "herramientas",
          "plan_accion",
          "rapido_adorable",
          "contenido",
          "economia",
        ],
        additionalProperties: false,
      },
    },
    required: ["titulo", "descripcion", "tags", "secciones"],
    additionalProperties: false,
  },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth: requiere sesión válida ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Sesión inválida" }, 401);

    // --- Input ---
    const { idea, answers } = await req.json();
    if (!idea || typeof idea !== "string" || idea.trim().length < 10) {
      return json({ error: "La idea es demasiado corta." }, 400);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json(
        {
          error:
            "Falta configurar ANTHROPIC_API_KEY en los secrets del proyecto.",
        },
        500,
      );
    }

    // --- Construir el mensaje del usuario ---
    const answersText =
      answers && typeof answers === "object"
        ? Object.entries(answers)
            .filter(([, v]) => v)
            .map(([k, v]) => `- ${k}: ${v}`)
            .join("\n")
        : "(sin respuestas adicionales)";

    const userPrompt = `IDEA DEL USUARIO:
${idea.trim()}

RESPUESTAS DEL DIAGNÓSTICO:
${answersText}

Generá el blueprint completo usando la herramienta generar_blueprint.`;

    // --- Llamada a Anthropic (structured output vía forced tool_choice) ---
    // No usamos thinking: es incompatible con forced tool_choice.
    const aiResp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        // El system + tool son estables entre requests → cacheables.
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: [BLUEPRINT_TOOL],
        tool_choice: { type: "tool", name: "generar_blueprint" },
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error(`Anthropic error ${aiResp.status}:`, errText);
      if (aiResp.status === 401) {
        return json(
          { error: "API key de Anthropic inválida. Revisá el secret." },
          502,
        );
      }
      if (aiResp.status === 429) {
        return json(
          {
            error:
              "Límite de uso de Anthropic alcanzado. Probá de nuevo en unos minutos.",
          },
          429,
        );
      }
      return json(
        { error: `Error del proveedor de IA (${aiResp.status}).` },
        502,
      );
    }

    const data = await aiResp.json();
    // El bloque tool_use tiene el blueprint en .input
    const toolBlock = (data.content ?? []).find(
      (b: { type: string; name?: string }) =>
        b.type === "tool_use" && b.name === "generar_blueprint",
    );
    if (!toolBlock?.input) {
      console.error("Respuesta sin tool_use:", JSON.stringify(data).slice(0, 500));
      return json({ error: "La IA no devolvió un blueprint válido." }, 502);
    }

    const blueprint = toolBlock.input;

    // --- Persistir (best-effort; no bloquea la respuesta) ---
    try {
      await userClient.from("builder_blueprints").insert({
        user_id: user.id,
        idea: idea.trim(),
        answers: answers ?? {},
        blueprint,
      });
    } catch (persistErr) {
      console.error("No se pudo persistir el blueprint:", persistErr);
    }

    return json({ blueprint });
  } catch (err) {
    console.error("builder-generate error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Error interno" },
      500,
    );
  }
});
