import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { symptoms, patientContext, mode = 'diagnosis' } = await req.json()
    const openAiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openAiKey) {
      throw new Error('OPENAI_API_KEY manquante')
    }

    if (mode === 'supervision') {
      const prompt = [
        'Tu es un superviseur clinique prudent pour un dossier patient.',
        'Retourne uniquement un JSON valide avec la forme:',
        '{"alerts":[{"level":"critical|warning|info","message":"..."}],"summary":"..."}',
        'Aucune phrase hors JSON.',
        '',
        'Contexte patient:',
        patientContext || '',
      ].join('\n')

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Tu es un superviseur clinique strict. Tu reponds uniquement en JSON valide.' },
            { role: 'user', content: prompt },
          ],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Erreur OpenAI')
      }

      const payload = await response.json()
      const content = payload?.choices?.[0]?.message?.content || '{}'
      const parsed = JSON.parse(content)

      return new Response(
        JSON.stringify({
          alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
          summary: parsed.summary || '',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const fallbackResponse = {
      result: patientContext || symptoms || 'Aucun contenu analyse.',
    }

    return new Response(
      JSON.stringify(fallbackResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
