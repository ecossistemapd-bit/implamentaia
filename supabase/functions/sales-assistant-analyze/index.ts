// Asistente de Ventas (pre-venta) de ImplamentaIA.
// Analiza una empresa prospecto, detecta sus dolores y los cruza con el
// catálogo de soluciones para recomendar cuáles encajan y con qué pitch.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompanyInput {
  name?: string;
  website?: string;
  industry?: string;
  what_sells?: string;
  notes?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Extrae el primer objeto JSON de un texto, tolerando ```json ... ``` o prosa.
function parseJsonLoose(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Respuesta de IA no es JSON válido");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Sesión inválida" }, 401);

    const body = await req.json().catch(() => ({}));
    const company: CompanyInput = body?.company ?? {};
    const contextText: string = (body?.context_text ?? "").toString().slice(0, 30000);

    if (!company.name?.trim()) {
      return json({ error: "Falta el nombre de la empresa" }, 400);
    }

    // Catálogo de soluciones que ofrecemos (la "caja de herramientas" del vendedor).
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: solutions } = await admin
      .from("solutions")
      .select("slug, title, short_description, category, features, roi_estimate")
      .order("category");

    const catalog = (solutions ?? [])
      .map(
        (s) =>
          `- [${s.category}] ${s.title} (slug: ${s.slug}): ${s.short_description}. ` +
          `Beneficios: ${(s.features ?? []).slice(0, 4).join("; ")}. ROI: ${s.roi_estimate ?? "n/d"}`,
      )
      .join("\n");

    const companyBlock = [
      `Empresa: ${company.name}`,
      company.industry ? `Rubro/sector: ${company.industry}` : "",
      company.website ? `Sitio web: ${company.website}` : "",
      company.what_sells ? `Qué vende / a qué se dedica: ${company.what_sells}` : "",
      company.notes ? `Observaciones del SDR: ${company.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt =
      "Sos un SDR experto en pre-venta consultiva de ImplamentaIA, una empresa que vende " +
      "soluciones de automatización e inteligencia artificial para negocios. Tu trabajo es " +
      "analizar una empresa prospecto ANTES de la venta: entender su posicionamiento y cómo " +
      "funciona, detectar sus dolores reales, y cruzar esos dolores con NUESTRO catálogo de " +
      "soluciones para recomendar las que mejor encajan, explicando el beneficio concreto. " +
      "Por ejemplo, si la empresa tiene dificultad para atender clientes de forma rápida, " +
      "recomendá un SDR/agente de IA que trabaja 24 horas para que la atención sea más rápida " +
      "y efectiva. Recomendá SOLO soluciones del catálogo provisto (usá su slug exacto). " +
      "Si ninguna encaja para un dolor, dejá slug en null. Respondé SIEMPRE en español neutro " +
      "y SOLO con un objeto JSON válido, sin texto adicional ni markdown, con esta forma exacta:\n" +
      "{\n" +
      '  "resumen_ejecutivo": string,\n' +
      '  "posicionamiento": string,\n' +
      '  "analisis_empresa": string,\n' +
      '  "dolores": [{ "dolor": string, "impacto": string }],\n' +
      '  "soluciones_recomendadas": [{ "titulo": string, "slug": string|null, "dolor_que_resuelve": string, "beneficio": string }],\n' +
      '  "mensaje_sugerido": string\n' +
      "}\n" +
      "mensaje_sugerido es un mensaje de contacto breve y persuasivo listo para que el closer " +
      "le escriba al prospecto.";

    const userPrompt =
      `Datos del prospecto:\n${companyBlock}\n\n` +
      (contextText
        ? `Contexto adicional aportado por el equipo (documentos/casos previos):\n${contextText}\n\n`
        : "") +
      `Catálogo de soluciones disponibles de ImplamentaIA:\n${catalog || "(catálogo vacío)"}\n\n` +
      "Generá el análisis de pre-venta en el formato JSON indicado.";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "Falta configurar LOVABLE_API_KEY" }, 500);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI error:", aiRes.status, text);
      if (aiRes.status === 429) return json({ error: "Límite de uso de IA alcanzado. Probá en unos minutos." }, 429);
      return json({ error: "Error de IA" }, 502);
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson.choices?.[0]?.message?.content ?? "";
    let analysis: Record<string, unknown>;
    try {
      analysis = parseJsonLoose(content) as Record<string, unknown>;
    } catch (e) {
      console.error("Parse error:", e, content.slice(0, 500));
      return json({ error: "La IA no devolvió un análisis válido. Probá de nuevo." }, 502);
    }

    return json({ analysis });
  } catch (e) {
    console.error(e);
    return json({ error: "Error interno del servidor" }, 500);
  }
});
