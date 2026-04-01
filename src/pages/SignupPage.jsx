import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SPECIALITES } from '../data/specialites'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    password: '',
    confirmPassword: '',
    specialite: '',
    nomCabinet: '',
    ville: '',
    acceptTerms: false
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    
    // Validate
    if (!form.prenom || !form.nom || !form.email || !form.telephone || !form.password || !form.specialite || !form.nomCabinet) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (!form.acceptTerms) {
      setError("Veuillez accepter les conditions d'utilisation")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Create auth user in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            nom_complet: `${form.prenom} ${form.nom}`,
            telephone: form.telephone,
            specialite: form.specialite,
            nom_cabinet: form.nomCabinet,
            prenom: form.prenom,
            nom: form.nom,
            ville: form.ville
          }
        }
      })

      if (authError) {
        if (authError.message?.includes('Database error saving new user')) {
          throw new Error(
            'Erreur de configuration Supabase : un trigger cassé empêche la création du compte. ' +
            'Vérifiez les triggers sur auth.users dans votre dashboard Supabase.'
          )
        }
        if (authError.message?.includes('already registered') || authError.message?.includes('already been registered')) {
          throw new Error('Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.')
        }
        throw authError
      }

      if (!authData.user) throw new Error('Erreur lors de la création du compte')

      // 2. Use the session from signUp if available (auto-confirm enabled),
      //    otherwise sign in with password to get a working JWT
      let activeUserId = authData.user.id
      let activeSession = authData.session

      if (!activeSession) {
        // Email confirmation is required — sign in to get a JWT
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        })
        if (signInError) {
          // Likely needs email confirmation first — save data locally and redirect
          localStorage.setItem('pending_setup', JSON.stringify({
            userId: activeUserId,
            email: form.email,
            password: form.password,
            nomComplet: `Dr. ${form.prenom.trim()} ${form.nom.trim()}`,
            nomCabinet: form.nomCabinet.trim(),
            ville: form.ville?.trim() || null,
            telephone: form.telephone?.trim() || null,
          }))
          toast.success('Vérifiez vos emails et confirmez votre compte pour continuer.')
          navigate('/verification')
          return
        }
        activeUserId = signInData.user.id
        activeSession = signInData.session
      }

      // 3. Create cabinet with authenticated user
      const { data: cabinet, error: cabError } = await supabase
        .from('cabinets')
        .insert([{
          tenant_id: activeUserId,
          nom: form.nomCabinet.trim(),
          ville: form.ville?.trim() || null,
          telephone: form.telephone?.trim() || null
        }])
        .select()
        .single()

      if (cabError) {
        console.error('Cabinet insertion failed:', cabError)
        throw new Error(`Erreur création cabinet: ${cabError.message}`)
      }

      if (!cabinet?.id) throw new Error('Identifiant cabinet non généré par la base de données')

      // 4. Create/update profile linked to the cabinet
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: activeUserId,
          cabinet_id: cabinet.id,
          role: 'docteur',
          nom_complet: `Dr. ${form.prenom.trim()} ${form.nom.trim()}`
        }], { onConflict: 'id' })

      if (profileError) {
        console.error('Profile creation failed:', profileError)
        throw new Error(`Erreur création profil: ${profileError.message}`)
      }

      // 5. Success — store context and redirect
      localStorage.setItem('pending_verification', JSON.stringify({
        userId: activeUserId,
        nomComplet: `Dr. ${form.prenom} ${form.nom}`,
        email: form.email,
        telephone: form.telephone,
        nomCabinet: form.nomCabinet,
        specialite: form.specialite,
        cabinetId: cabinet.id
      }))

      toast.success('Compte créé avec succès !')
      navigate('/verification')

    } catch (err) {
      console.error('Signup error:', err)
      setError(err.message || 'Erreur inconnue lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-12">
      <div className="surface-card w-full max-w-2xl p-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl"></div>
        
        <div className="text-center relative z-10 mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-950 mb-2">Créez votre compte MacroMedica</h1>
          <p className="text-base text-teal-700 font-medium">14 jours gratuits · Sans carte bancaire</p>
        </div>

        <form className="space-y-5 relative z-10" onSubmit={handleSignup}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Prénom <span className="text-red-500">*</span></span>
              <input type="text" name="prenom" value={form.prenom} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" placeholder="Prénom" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Nom <span className="text-red-500">*</span></span>
              <input type="text" name="nom" value={form.nom} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" placeholder="Nom" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></span>
              <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" placeholder="docteur@exemple.com" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Téléphone <span className="text-red-500">*</span></span>
              <input type="tel" name="telephone" value={form.telephone} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" placeholder="06 XX XX XX XX" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block relative">
              <span className="mb-2 block text-sm font-medium text-slate-700">Mot de passe <span className="text-red-500">*</span></span>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required minLength={8} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Confirmer mot de passe <span className="text-red-500">*</span></span>
              <input type={showPassword ? "text" : "password"} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required minLength={8} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" placeholder="••••••••" />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Spécialité <span className="text-red-500">*</span></span>
            <select name="specialite" value={form.specialite} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all appearance-none cursor-pointer">
              <option value="" disabled>Sélectionnez votre spécialité</option>
              {SPECIALITES.filter(s => s !== 'Autre').map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
              <option value="Autre">Autre spécialité</option>
            </select>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Nom du cabinet <span className="text-red-500">*</span></span>
              <input type="text" name="nomCabinet" value={form.nomCabinet} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" placeholder="Cabinet Dr. Bennani" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Ville</span>
              <input type="text" name="ville" value={form.ville} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all" placeholder="Casablanca" />
            </label>
          </div>

          <label className="flex items-start gap-3 mt-6 cursor-pointer group w-fit">
            <div className="relative flex items-center mt-1">
              <input type="checkbox" name="acceptTerms" checked={form.acceptTerms} onChange={handleChange} className="peer sr-only" />
              <div className="h-5 w-5 rounded border-2 border-slate-300 bg-white transition peer-checked:border-teal-600 peer-checked:bg-teal-600 group-hover:border-teal-400"></div>
              <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-slate-600 select-none">
              J'accepte les conditions d'utilisation et la politique de confidentialité.
            </span>
          </label>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '20px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <span style={{ 
                color: '#ef4444', 
                fontSize: '20px',
                flexShrink: 0
              }}>⚠️</span>
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#dc2626',
                  marginBottom: '2px'
                }}>
                  Échec de la transaction
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#991b1b',
                  lineHeight: '1.5'
                }}>
                  {error}
                </div>
              </div>
            </div>
          )}

          <div className="pt-4">
            <button type="submit" disabled={loading} className="interactive inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-70 shadow-lg shadow-teal-600/20">
              {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Création en cours...</> : <>Créer mon compte <span className="material-symbols-outlined text-lg">arrow_forward</span></>}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500 relative z-10">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-bold text-teal-700 transition hover:text-teal-800 underline underline-offset-2">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SignupPage
