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

Recibís la idea de automatización de un usuario y sus respuestas a un diagnóstico. Tu tarea es diseñar el BLUEPRINT COMPLETO de la solución: un plan de implementación con IA estructurado en 8 secciones con contenido DETALLADO y ACCIONABLE.

REGLAS DE ESTILO:
- Respondé SIEMPRE en español latinoamericano con voseo argentino (vos, tenés, podés, usá, hacé).
- Sé concreto y accionable. Cero relleno, cero marketing vacío.
- Usá nombres REALES de herramientas: Lovable, Supabase, n8n, Make, Zapier, Claude (Anthropic), OpenAI, Gemini, WhatsApp Business API, HubSpot, Vercel, etc. NUNCA inventes ni ofusques nombres de marcas.
- Cada sección es markdown con headers (##, ###), listas (- item) y bloques de código (\`\`\`) donde aplique.

REGLAS DE CONTENIDO:
- El título tiene que ser corto, claro y ESPECÍFICO a la idea (no genérico). Máx ~60 caracteres.
- Los tags son 4-6 categorías reales y útiles.
- Cada sección DEBE tener mínimo 150 palabras con contenido específico a ESTA idea, no genérico.

Las 8 secciones del blueprint son:
1. base_conocimientos — Diagnóstico completo: problema raíz, quiénes son los usuarios, qué datos existen hoy, qué supuestos hay que validar y qué KPIs definen el éxito.
2. estructura — Los 5 pilares técnicos de ESTA implementación: qué datos necesita, cómo se diseñan los prompts, qué modelos usar, cómo se conectan las automatizaciones y cuál es la interfaz.
3. arquitectura — El flujo completo del MVP paso a paso: actores, eventos, decisiones, APIs y datos que se mueven entre cada componente.
4. herramientas — Stack completo con justificación: herramienta esencial → para qué → alternativa gratuita. Incluir precios estimados.
5. plan_accion — Kanban con 3 sprints: Sprint 1 (fundación), Sprint 2 (MVP funcional), Sprint 3 (lanzamiento). Cada sprint con 4-6 tareas concretas.
6. rapido_adorable — 3 prompts listos para pegar en Lovable o en el LLM, específicos a esta solución. Incluir el system prompt del agente con variables tipo {{variable}}.
7. contenido — 5-7 temas/recursos específicos que el usuario necesita aprender para implementar esta solución, con descripción de por qué cada uno importa.
8. economia — ROI calculado: horas ahorradas/mes × valor hora, costo mensual del stack vs costo de contratar. Número concreto de ROI en meses de payback.

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
              "Markdown completo (mín 150 palabras): diagnóstico del problema, perfil de usuarios, datos disponibles, supuestos a validar y KPIs de éxito para ESTA idea específica.",
          },
          estructura: {
            type: "string",
            description:
              "Markdown completo (mín 150 palabras): los 5 pilares técnicos de ESTA implementación — datos, prompts, modelos IA, automatización e interfaz — con detalle concreto.",
          },
          arquitectura: {
            type: "string",
            description:
              "Markdown completo (mín 150 palabras): flujo del MVP paso a paso con actores, eventos, APIs y datos que se mueven entre componentes. Usar listas numeradas.",
          },
          herramientas: {
            type: "string",
            description:
              "Markdown completo (mín 150 palabras): tabla o lista de herramientas esenciales + alternativas con justificación y precios estimados. Solo nombres reales.",
          },
          plan_accion: {
            type: "string",
            description:
              "Markdown completo (mín 200 palabras): Kanban con Sprint 1 (fundación), Sprint 2 (MVP), Sprint 3 (lanzamiento). Cada sprint con 4-6 tareas concretas como checklist.",
          },
          rapido_adorable: {
            type: "string",
            description:
              "Markdown completo (mín 200 palabras): 3 prompts listos para pegar — el system prompt del agente con variables {{variable}}, un prompt de onboarding y uno de manejo de errores. En bloques de código.",
          },
          contenido: {
            type: "string",
            description:
              "Markdown completo (mín 150 palabras): 5-7 temas/recursos específicos a aprender para implementar esta solución, con descripción de por qué cada uno importa.",
          },
          economia: {
            type: "string",
            description:
              "Markdown completo (mín 150 palabras): ROI calculado con números — horas ahorradas/mes, valor hora, costo mensual del stack, costo de contratar profesionales y meses de payback.",
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
        max_tokens: 16000,
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
