import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are a highly tactful clinic management consultant. Analyze the following clinic metrics. Identify the single biggest bottleneck or issue. Provide 2-3 highly constructive, positive suggestions to improve workflow. You MUST phrase the advice gently and encouragingly so the doctor does not feel criticized. If the metrics are excellent and no major issues exist, return a null/empty response.

Return only valid JSON with this exact shape:
{"headline":string|null,"issue":string|null,"suggestions":string[]}

Rules:
- Keep "headline" short and positive when advice exists.
- Keep "issue" to one gentle sentence focused on the main bottleneck.
- Keep "suggestions" to 2 or 3 concise, constructive actions.
- If the data is excellent, balanced, or insufficient for confident advice, return:
{"headline":null,"issue":null,"suggestions":[]}
- Never use markdown, code fences, or extra keys.`;

function buildFallbackResponse() {
  return {
    headline: null,
    issue: null,
    suggestions: [],
    report: "",
  };
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function sanitizeInsight(payload: any) {
  const headline = typeof payload?.headline === "string" && payload.headline.trim()
    ? payload.headline.trim()
    : null;
  const issue = typeof payload?.issue === "string" && payload.issue.trim()
    ? payload.issue.trim()
    : null;
  const suggestions = Array.isArray(payload?.suggestions)
    ? payload.suggestions
        .filter((value: unknown) => typeof value === "string")
        .map((value: string) => value.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const report = headline || issue || suggestions.length
    ? [headline, issue, ...suggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`)]
        .filter(Boolean)
        .join("\n\n")
    : "";

  return {
    headline,
    issue,
    suggestions,
    report,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { metrics } = await req.json();

    if (!metrics || typeof metrics !== "object") {
      return new Response(
        JSON.stringify(buildFallbackResponse()),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("Cle Gemini manquante.");
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [{
                text: `Clinic metrics to analyze:\n${JSON.stringify(metrics, null, 2)}`,
              }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 700,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      throw new Error(errorData?.error?.message ?? "Erreur Gemini");
    }

    const geminiPayload = await geminiResponse.json();
    const content = geminiPayload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = safeJsonParse(content);

    const responsePayload = parsed
      ? sanitizeInsight(parsed)
      : buildFallbackResponse();

    return new Response(
      JSON.stringify(responsePayload),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
