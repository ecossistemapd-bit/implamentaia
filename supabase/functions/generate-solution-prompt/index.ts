// Generates a personalized Lovable prompt from a solution's prompt_template + user context.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { solution_id, user_context } = await req.json();
    if (!solution_id || !user_context) {
      return new Response(JSON.stringify({ error: "Faltan parámetros" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sol, error } = await supabase
      .from("solutions")
      .select("title, prompt_template, tools_required, category")
      .eq("id", solution_id)
      .maybeSingle();

    if (error || !sol?.prompt_template) {
      return new Response(JSON.stringify({ error: "Solución no encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const basePrompt = sol.prompt_template.replaceAll("[CONTEXTO]", user_context);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "Sos un experto en implementación de soluciones de IA con Lovable y n8n. Tomá este prompt base y personalizalo específicamente para el contexto dado por el usuario. Mantené la estructura técnica pero adaptá los detalles, ejemplos y configuraciones al caso particular. El resultado debe ser un prompt listo para pegar en Lovable, claro y accionable. Respondé SOLO con el prompt final, sin preámbulos.",
          },
          { role: "user", content: basePrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI error:", aiRes.status, text);
      return new Response(JSON.stringify({ error: "Error de IA", detail: text }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiRes.json();
    const prompt = json.choices?.[0]?.message?.content ?? basePrompt;

    return new Response(JSON.stringify({ prompt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
