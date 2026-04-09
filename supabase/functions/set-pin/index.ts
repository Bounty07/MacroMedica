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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Auth validation
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify caller is owner_id of the clinic
    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('owner_id')
      .eq('id', clinic_id)
      .single()

    if (clinicError || !clinic) {
       return new Response(JSON.stringify({ error: "Clinique introuvable" }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (clinic.owner_id !== user.id) {
       return new Response(JSON.stringify({ error: "Accès refusé. Vous n'êtes pas le propriétaire de cette clinique." }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Hash & store in clinics.pin_hash
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(pin, salt)

    const { error: updateError } = await supabaseAdmin
      .from('clinics')
      .update({ pin_hash: hash })
      .eq('id', clinic_id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
