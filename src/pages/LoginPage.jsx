import { Lock, Mail, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isInitializing, profile } = useAppContext()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.email || !form.password) {
      setError('Veuillez remplir tous les champs')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await login(form.email, form.password)
      // Wait a tick for profile to be set in context, then redirect by role
      // We read from the returned profile via the context update
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  // Show nothing while checking session
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
      </div>
    )
  }

  // Already logged in? Redirect to role-based dashboard
  if (isAuthenticated && profile) {
    return <Navigate to={profile.role === 'secretaire' ? '/salle-attente' : '/dashboard'} replace />
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-12">
      <div className="surface-card w-full max-w-md p-8">

        {/* 🧪 DEBUG BANNER */}
        <div className="text-red-500 font-bold text-center mb-4 py-2 bg-red-50 rounded-lg">
          AUTH SYSTEM V1
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Connexion</h1>
          <p className="mt-3 text-base text-slate-500">Saisissez vos identifiants pour accéder à votre espace sécurisé.</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-base font-medium text-slate-700">Email</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Mail className="h-4 w-4 text-slate-400" />
              <input
                value={form.email}
                onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                type="email"
                required
                className="w-full border-0 bg-transparent outline-none"
                placeholder="docteur@cabinet.ma"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-base font-medium text-slate-700">Mot de passe</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Lock className="h-4 w-4 text-slate-400" />
              <input
                value={form.password}
                onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
                type="password"
                required
                className="w-full border-0 bg-transparent outline-none"
                placeholder="••••••••"
              />
            </div>
          </label>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="interactive inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-70">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Connexion...</> : 'Se connecter'}
          </button>
        </form>

        {/* Mot de passe oublié */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => alert('Fonctionnalité à venir : réinitialisation par email')}
            className="text-sm font-medium text-teal-700 transition hover:text-teal-800 hover:underline"
          >
            Mot de passe oublié ?
          </button>
        </div>

        <div className="mt-6 text-center text-base text-slate-500">
          <Link to="/" className="font-medium text-teal-700 transition hover:text-teal-800">
            Retour à l'accueil
          </Link>
        </div>
        
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: '14px', color: '#64748b' }}>Pas encore de compte ?{' '}</span>
          <button
            onClick={() => navigate('/signup')}
            style={{
              background: 'none',
              border: 'none',
              color: '#0d9488',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Créer un compte gratuitement
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
