// Lovable Edge Function: generate-builder-output
// Genera plan, system prompt, integraciones y assets usando Lovable AI Gateway.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Sos un consultor experto en implementar IA en empresas hispanohablantes de LatAm.
Recibís el contexto de una empresa y producís un plan ACCIONABLE de implementación.
Respondé SIEMPRE en español neutro. Sé concreto, sin relleno.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { builder_project_id, inputs } = await req.json();
    if (!builder_project_id) throw new Error("Missing builder_project_id");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("Missing LOVABLE_API_KEY");

    // Verify ownership using user-scoped client
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: project, error: pErr } = await userClient
      .from("builder_projects")
      .select("id, user_id")
      .eq("id", builder_project_id)
      .single();
    if (pErr || !project) throw new Error("Project not found or unauthorized");

    const admin = createClient(supabaseUrl, supabaseService);

    const userPrompt = `Contexto del usuario:
${JSON.stringify(inputs, null, 2)}

Generá una implementación detallada usando la herramienta proveída.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "deliver_implementation",
            description: "Entrega el plan completo de implementación",
            parameters: {
              type: "object",
              properties: {
                plan_md: { type: "string", description: "Plan paso a paso en markdown, mínimo 6 pasos numerados." },
                system_prompt: { type: "string", description: "System prompt sugerido para el agente IA, con variables tipo {{nombre}}." },
                integrations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tool_name: { type: "string" },
                      purpose: { type: "string" },
                      docs_url: { type: "string" },
                      setup_steps: { type: "array", items: { type: "string" } },
                    },
                    required: ["tool_name", "purpose"],
                  },
                },
                assets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["onboarding_doc", "checklist", "message_template"] },
                      title: { type: "string" },
                      content: { type: "string" },
                    },
                    required: ["type", "title", "content"],
                  },
                },
              },
              required: ["plan_md", "system_prompt", "integrations", "assets"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "deliver_implementation" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) throw new Error("Demasiadas solicitudes, intentá en unos minutos.");
      if (aiResp.status === 402) throw new Error("Sin créditos de IA. Agregá créditos en Cloud → Settings.");
      throw new Error(`AI gateway error: ${aiResp.status}`);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Respuesta de IA sin tool_call");
    const output = JSON.parse(toolCall.function.arguments);

    await admin.from("builder_projects").update({ output, status: "ready" }).eq("id", builder_project_id);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("generate-builder-output error:", msg);
    try {
      const authHeader = req.headers.get("Authorization");
      const { builder_project_id } = await req.clone().json();
      if (builder_project_id && authHeader) {
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } },
        );
        // Ownership re-check via RLS before privileged write
        const { data: owned } = await userClient
          .from("builder_projects")
          .select("id")
          .eq("id", builder_project_id)
          .maybeSingle();
        if (owned) {
          const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
          await admin.from("builder_projects").update({ status: "error", error_message: "Generation failed" }).eq("id", builder_project_id);
        }
      }
    } catch { /* noop */ }
    return new Response(JSON.stringify({ error: "Generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
