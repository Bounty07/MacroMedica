import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Auth: verify caller
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify caller is docteur
    const { data: profile } = await supabaseAdmin.from('profiles').select('id, role, cabinet_id').eq('id', user.id).single()
    if (!profile || profile.role !== 'docteur') {
      return new Response(JSON.stringify({ error: 'Seul le docteur peut gérer les secrétaires' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ═══════════════════════════════════════
    // POST — Invite a new secretary
    // ═══════════════════════════════════════
    if (req.method === 'POST') {
      const { email, clinic_id } = await req.json()
      if (!email) {
        return new Response(JSON.stringify({ error: "L'email est requis" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const targetClinicId = clinic_id || profile.cabinet_id
      
      // Verify caller owns this clinic
      const { data: clinic } = await supabaseAdmin.from('clinics').select('id, owner_id, secretary_id').eq('id', targetClinicId).single()
      if (!clinic || clinic.owner_id !== user.id) {
        return new Response(JSON.stringify({ error: "Vous n'êtes pas propriétaire de cette clinique" }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (clinic.secretary_id) {
        return new Response(JSON.stringify({ error: 'Une secrétaire est déjà associée. Révoquez-la d\'abord.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Invite via Admin API
      const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          role: 'secretaire',
          clinic_id: targetClinicId,
          cabinet_id: targetClinicId,
          nom_complet: email.split('@')[0]
        }
      })

      if (inviteErr) throw inviteErr

      // Update clinics.secretary_id with the new user id
      if (inviteData?.user?.id) {
        await supabaseAdmin.from('clinics').update({ secretary_id: inviteData.user.id }).eq('id', targetClinicId)
      }

      return new Response(JSON.stringify({
        message: 'Invitation envoyée avec succès',
        secretary_id: inviteData?.user?.id || null
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // ═══════════════════════════════════════
    // DELETE — Revoke secretary access
    // ═══════════════════════════════════════
    if (req.method === 'DELETE') {
      const { secretary_id, clinic_id } = await req.json()
      if (!secretary_id || !clinic_id) {
        return new Response(JSON.stringify({ error: 'secretary_id et clinic_id sont requis' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Verify caller owns this clinic
      const { data: clinic } = await supabaseAdmin.from('clinics').select('id, owner_id').eq('id', clinic_id).single()
      if (!clinic || clinic.owner_id !== user.id) {
        return new Response(JSON.stringify({ error: "Vous n'êtes pas propriétaire de cette clinique" }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Nullify secretary_id
      await supabaseAdmin.from('clinics').update({ secretary_id: null }).eq('id', clinic_id)

      // Delete the auth user
      const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(secretary_id)
      if (deleteErr) {
        console.error('Delete user error:', deleteErr)
        // Still return success — the secretary_id was already nullified
      }

      return new Response(JSON.stringify({ message: 'Accès secrétaire révoqué' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    return new Response(JSON.stringify({ error: 'Méthode non supportée' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
