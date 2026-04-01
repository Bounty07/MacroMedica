import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-sky-600">MacroMedica</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Déconnexion
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-green-600 font-semibold text-lg">Connexion réussie !</p>
          <p className="text-gray-500 mt-2">Bienvenue sur MacroMedica</p>
        </div>
      </div>
    </div>
  )
}