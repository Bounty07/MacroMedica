import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = 'You are a medical AI assistant. The attached audio contains voice commands spoken in a mix of Moroccan Darija, French, and English. Listen to the audio and determine the user\'s intent. You must return your response EXCLUSIVELY as a JSON object with two keys: "action" and "payload". If the user wants to change tabs, use action "navigate". The ONLY valid payloads for navigation are: "/dashboard", "/patients", "/agenda", and "/parametres". If the user asks to open a specific patient\'s file, return {"action": "search_patient", "payload": "Patient Name"}. If the user wants to add text into the current note, use action "add_note". If the user wants to save the current dossier, use action "save_record". Never return explanatory text outside the JSON object.';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { audioBase64, audioMimeType } = await req.json();

    if (!audioBase64 || String(audioBase64).trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun audio recu." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("Cle Gemini manquante.");
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [{
            role: "user",
            parts: [{
              inlineData: {
                mimeType: audioMimeType || "audio/webm",
                data: String(audioBase64).trim(),
              },
            }],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 200,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      throw new Error(errorData.error?.message ?? "Erreur Gemini");
    }

    const data = await geminiResponse.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return new Response(
      JSON.stringify({ responseText }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
