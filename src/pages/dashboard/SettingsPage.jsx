import { LockKeyhole, UserCog, Mail, ShieldX, Loader2, UserPlus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ContentCard } from '../../components/dashboard/DashboardPrimitives'
import { useAppContext } from '../../context/AppContext'
import PinLock from '../../components/common/PinLock'
import { supabase } from '../../lib/supabase'

function SettingsPage() {
  const { currentUser, cabinetId, notificationPrefs, setNotificationPrefs, notify, profile: userProfile } = useAppContext()
  const [profile, setProfile] = useState(currentUser)
  const [loading, setLoading] = useState(false)
  const [pinEnabled, setPinEnabled] = useState(
    localStorage.getItem(`pin_enabled_${currentUser?.id}`) === 'true'
  )
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinSaved, setPinSaved] = useState(false)
  const [pinError, setPinError] = useState('')

  // Secretary invitation state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [revokeLoading, setRevokeLoading] = useState(false)
  const [secretary, setSecretary] = useState(null)
  const [secLoading, setSecLoading] = useState(true)

  // Load current secretary info
  useEffect(() => {
    const loadSecretary = async () => {
      if (!cabinetId) { setSecLoading(false); return }
      try {
        const { data: clinic } = await supabase
          .from('clinics')
          .select('secretary_id')
          .eq('id', cabinetId)
          .single()

        if (clinic?.secretary_id) {
          const { data: secProfile } = await supabase
            .from('profiles')
            .select('id, nom_complet, role')
            .eq('id', clinic.secretary_id)
            .single()

          setSecretary(secProfile || null)
        } else {
          setSecretary(null)
        }
      } catch { setSecretary(null) }
      setSecLoading(false)
    }
    loadSecretary()
  }, [cabinetId])

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 300))
      notify({ title: 'Profil sauvegardé', description: 'Les modifications ont été enregistrées.' })
    } catch (err) {
      notify({ title: 'Erreur', description: err.message || "Échec de la sauvegarde", tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const togglePin = (enabled) => {
    if (!enabled) {
      localStorage.removeItem(`pin_enabled_${currentUser?.id}`)
      localStorage.removeItem(`pin_hash_${currentUser?.id}`)
      setPinEnabled(false)
      setNewPin('')
      setConfirmPin('')
      notify({ title: 'Succès', description: 'PIN désactivé' })
    } else {
      setPinEnabled(true)
    }
  }

  const savePin = () => {
    setPinError('')
    
    if (newPin.length !== 4) {
      setPinError('Le PIN doit contenir 4 chiffres')
      return
    }
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('Le PIN doit contenir uniquement des chiffres')
      return
    }
    if (newPin !== confirmPin) {
      setPinError('Les PIN ne correspondent pas')
      return
    }

    const pinHash = btoa(`${currentUser?.id}:${newPin}:macromedica`)
    
    localStorage.setItem(`pin_enabled_${currentUser?.id}`, 'true')
    localStorage.setItem(`pin_hash_${currentUser?.id}`, pinHash)
    
    setPinSaved(true)
    setNewPin('')
    setConfirmPin('')
    notify({ title: 'Succès', description: 'PIN enregistré avec succès 🔐' })
    
    setTimeout(() => setPinSaved(false), 3000)
  }

  // Invite secretary
  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      notify({ title: 'Erreur', description: 'Veuillez saisir un email valide.', tone: 'error' })
      return
    }
    setInviteLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Session invalide")

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-secretary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email: inviteEmail.trim(), clinic_id: cabinetId })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Échec de l'invitation")

      notify({ title: 'Invitation envoyée', description: `Un email a été envoyé à ${inviteEmail}.` })
      setInviteEmail('')
      // Refresh secretary info
      if (result.secretary_id) {
        const { data: secProfile } = await supabase
          .from('profiles')
          .select('id, nom_complet, role')
          .eq('id', result.secretary_id)
          .single()
        setSecretary(secProfile || null)
      }
    } catch (err) {
      notify({ title: 'Erreur', description: err.message, tone: 'error' })
    } finally {
      setInviteLoading(false)
    }
  }

  // Revoke secretary access
  const handleRevoke = async () => {
    if (!secretary) return
    if (!window.confirm(`Êtes-vous sûr de vouloir révoquer l'accès de ${secretary.nom_complet || 'cette secrétaire'} ?`)) return

    setRevokeLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Session invalide")

      // 1. Nullify secretary_id in clinics
      const { error: clinicErr } = await supabase
        .from('clinics')
        .update({ secretary_id: null })
        .eq('id', cabinetId)

      if (clinicErr) throw clinicErr

      // 2. Delete the auth user via Edge Function (admin API)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-secretary`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ secretary_id: secretary.id, clinic_id: cabinetId })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Échec de la révocation")
      }

      notify({ title: 'Accès révoqué', description: 'La secrétaire a été retirée.' })
      setSecretary(null)
    } catch (err) {
      notify({ title: 'Erreur', description: err.message, tone: 'error' })
    } finally {
      setRevokeLoading(false)
    }
  }

  return (
    <PinLock>
      <div className="space-y-8">

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ContentCard title="Profil du cabinet" subtitle="Met à jour le praticien affiché partout dans l'application">
          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            {[
              ['name', 'Nom'],
              ['specialty', 'Spécialité'],
              ['phone', 'Téléphone'],
              ['email', 'Email'],
              ['address', 'Adresse cabinet'],
              ['cabinetName', 'Nom du cabinet'],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-2 block text-base font-medium text-slate-700">{label}</span>
                <input value={profile[key] || ''} onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-300" />
              </label>
            ))}
            <button type="submit" disabled={loading} className="interactive rounded-2xl bg-teal-600 px-5 py-3 text-base font-medium text-white disabled:opacity-70">
              {loading ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </form>
        </ContentCard>

        <div className="space-y-6">
          {/* ─── Gestion Secrétaire ─── */}
          <ContentCard title="Gestion Secrétaire" subtitle="Inviter ou révoquer l'accès de votre secrétaire">
            {secLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              </div>
            ) : secretary ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-teal-50 rounded-2xl border border-teal-100">
                  <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center text-lg font-bold">
                    {(secretary.nom_complet || 'S')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">{secretary.nom_complet || 'Secrétaire'}</div>
                    <div className="text-xs text-teal-700 font-medium">Secrétaire active</div>
                  </div>
                </div>
                <button
                  onClick={handleRevoke}
                  disabled={revokeLoading}
                  className="interactive w-full rounded-2xl bg-rose-600 px-5 py-3 text-base font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {revokeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
                  Révoquer l'accès
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <UserPlus className="mx-auto mb-2 text-slate-400" size={28} />
                  <p className="text-sm text-slate-500">Aucune secrétaire associée</p>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Email de la secrétaire</span>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="secretaire@example.com"
                      className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-300 text-sm"
                    />
                    <button
                      onClick={handleInvite}
                      disabled={inviteLoading}
                      className="interactive shrink-0 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-medium text-white disabled:opacity-50 flex items-center gap-2"
                    >
                      {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      Inviter
                    </button>
                  </div>
                </label>
              </div>
            )}
          </ContentCard>

          {/* ─── Sécurité & Accès (PIN) ─── */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                  🔐 Code PIN de sécurité
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0, paddingRight: '12px' }}>
                  Protégez les actions sensibles avec un code à 4 chiffres. Optionnel.
                </p>
              </div>
              
              <button
                type="button"
                onClick={() => togglePin(!pinEnabled)}
                style={{
                  width: '48px', height: '26px', borderRadius: '999px',
                  background: pinEnabled ? '#0d9488' : '#e2e8f0',
                  border: 'none', cursor: 'pointer', position: 'relative',
                  transition: 'background 0.2s', flexShrink: 0
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                  position: 'absolute', top: '3px',
                  left: pinEnabled ? '25px' : '3px',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }} />
              </button>
            </div>

            {pinEnabled && (
              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 mb-2">
                  <p className="text-xs font-semibold text-teal-800 mb-2">Actions protégées par le PIN :</p>
                  <ul className="text-xs text-teal-700 space-y-1">
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500"/> Supprimer un patient / RDV</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500"/> Modifier un montant</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500"/> Statistiques financières</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500"/> Paramètres cabinet</li>
                  </ul>
                </div>
                
                {pinError && (
                  <div className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">
                    {pinError}
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Nouveau PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center tracking-[1em] font-mono text-xl outline-none focus:border-teal-400"
                    placeholder="••••"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Confirmer PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center tracking-[1em] font-mono text-xl outline-none focus:border-teal-400"
                    placeholder="••••"
                  />
                </div>
                
                <button
                  onClick={savePin}
                  className="interactive mt-2 w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition-all shadow-md shadow-teal-500/20 active:scale-[0.98]"
                >
                  {pinSaved ? 'Enregistré ✓' : 'Enregistrer le PIN'}
                </button>
              </div>
            )}
          </div>

          {/* ─── Notifications ─── */}
          <ContentCard title="Notifications" subtitle="Préférences sauvegardées dans localStorage">
            <div className="space-y-3">
              {[
                ['email', 'Notifications email'],
                ['browser', 'Notifications navigateur'],
                ['reminders', 'Rappels de rendez-vous'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 ring-1 ring-slate-100">
                  <span className="text-base font-medium text-slate-700">{label}</span>
                  <input type="checkbox" checked={Boolean(notificationPrefs[key])} onChange={(event) => setNotificationPrefs((current) => ({ ...current, [key]: event.target.checked }))} className="h-5 w-5 rounded border-slate-300 text-teal-600" />
                </label>
              ))}
            </div>
          </ContentCard>
        </div>
        </div>
      </div>
    </PinLock>
  )
}

export default SettingsPage
