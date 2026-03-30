import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, prenom, nom, nomCabinet, specialite, ville, telephone } = await req.json()

    // 1. Create User in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { prenom, nom, specialite, nom_cabinet: nomCabinet }
    })

    if (authError) throw authError

    const userId = authData.user.id

    // 2. Create Cabinet (using service_role to bypass RLS)
    const { data: cabinet, error: cabError } = await supabase
      .from('cabinets')
      .insert({
        tenant_id: userId,
        nom: nomCabinet,
        ville,
        telephone
      })
      .select()
      .single()

    if (cabError) throw cabError

    // 3. Create Profile linked to Cabinet
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        cabinet_id: cabinet.id,
        role: 'medecin',
        nom_complet: `Dr. ${prenom} ${nom}`
      })

    if (profileError) throw profileError

    return new Response(
      JSON.stringify({ user: authData.user, cabinet }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
