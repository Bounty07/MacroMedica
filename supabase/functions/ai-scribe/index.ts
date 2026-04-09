import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Tu es un assistant medical expert travaillant au Maroc. The following transcription is a mix of Moroccan Arabic (Darija) and French. Understand the context, translate the Darija accurately, and generate a perfectly structured professional medical note entirely in formal French. Ton role strict est de transformer des notes brouillonnes de medecins en une note medicale professionnelle, claire et structuree. N'invente JAMAIS de symptomes, de constantes ou de donnees medicales qui ne sont pas dans la transcription. Ne mets pas d'objet ni d'en-tete de date, genere uniquement le corps du texte.`;

function buildUserParts({
  patientContext,
  notes,
  languageHint,
  audioBase64,
  audioMimeType,
}: {
  patientContext?: string;
  notes?: string;
  languageHint?: string;
  audioBase64?: string;
  audioMimeType?: string;
}) {
  const textBlocks = [
    patientContext?.trim() ? `Contexte patient:\n${patientContext.trim()}` : "",
    languageHint?.trim() ? `Consigne de langue:\n${languageHint.trim()}` : "",
    notes?.trim() ? `Transcription clinique brute:\n${notes.trim()}` : "",
  ].filter(Boolean);

  const parts: Array<Record<string, unknown>> = [];

  if (textBlocks.length > 0) {
    parts.push({ text: textBlocks.join("\n\n") });
  }

  if (audioBase64?.trim()) {
    parts.push({
      inlineData: {
        mimeType: audioMimeType || "audio/webm",
        data: audioBase64.trim(),
      },
    });
  }

  return parts;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      notes,
      patientContext,
      languageHint,
      audioBase64,
      audioMimeType,
    } = await req.json();

    if ((!notes || notes.trim().length === 0) && (!audioBase64 || audioBase64.trim().length === 0)) {
      return new Response(
        JSON.stringify({ error: "Les notes et l'audio sont vides." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("Cle Gemini manquante.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [{
          role: "user",
          parts: buildUserParts({
            patientContext,
            notes,
            languageHint,
            audioBase64,
            audioMimeType,
          }),
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      throw new Error(errorData.error?.message ?? "Erreur Gemini");
    }

    const data = await geminiResponse.json();
    const letter = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return new Response(
      JSON.stringify({ letter }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
