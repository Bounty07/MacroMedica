import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pin, clinic_id } = await req.json()
    if (!pin || !clinic_id) throw new Error("Le PIN et clinic_id sont requis.")

    // Initialiser Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Validate client authorization token
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Récupérer le hash du clinic
    const { data: clinic } = await supabaseAdmin
      .from('clinics')
      .select('pin_hash')
      .eq('id', clinic_id)
      .single()

    if (!clinic?.pin_hash) {
      return new Response(JSON.stringify({ error: "Aucun PIN n'a été défini pour cette clinique." }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Comparer le PIN avec le hash
    const isValid = await bcrypt.compare(String(pin), clinic.pin_hash)

    if (isValid) {
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } else {
      return new Response(JSON.stringify({ error: "Code PIN incorrect." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
