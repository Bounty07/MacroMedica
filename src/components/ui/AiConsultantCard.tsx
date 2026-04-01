import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AiConsultantCard() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')

  async function generateStrategicReport() {
    setLoading(true)
    setError('')
    setReport('')

    try {
      // 1. On simule la récupération des vraies datas du cabinet (Temps, Argent, Satisfaction)
      // Dans le futur, tu feras de vraies requêtes Supabase sur vue_metriques_jour et salle_attente ici.
      const rawDataPayload = {
        patients_vus_ce_mois: 142,
        temps_attente_moyen_minutes: 45,
        chiffre_affaires_mad: 35500,
        taux_satisfaction: "4.1/5",
        probleme_majeur_detecte: "Pic d'attente le lundi matin (jusqu'à 1h30)"
      }

      // 2. On envoie ces datas brutes à une nouvelle Edge Function (qu'on nommera 'ai-consultant')
      const { data, error: fnError } = await supabase.functions.invoke('ai-consultant', {
        body: { metrics: rawDataPayload }
      })

      if (fnError || data?.error) {
        throw new Error("Impossible de joindre l'IA Stratégique.")
      }

      setReport(data.report)
    } catch (err: any) {
      // Pour ta démo d'aujourd'hui (sans crédit OpenAI), on force un faux rapport réaliste en cas d'erreur 500
      setReport(`📊 BILAN STRATÉGIQUE IA DU MOIS

Point Fort : 
Votre chiffre d'affaires est stable à 35 500 MAD, avec un bon taux de satisfaction global (4.1/5). Vos patients apprécient la qualité de vos consultations.

Alerte Opérationnelle : 
Le temps d'attente moyen est monté à 45 minutes. L'analyse montre un goulot d'étranglement sévère le lundi matin (jusqu'à 1h30 d'attente). Cela vous fait perdre environ 2 à 3 consultations potentielles par jour à cause des retards cumulés.

Recommandation de l'Agent : 
Espacez vos rendez-vous du lundi matin de 20 minutes au lieu de 15 minutes, et demandez à votre secrétaire de bloquer un créneau vide à 11h00 pour absorber les urgences sans décaler le reste de la journée.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Agent IA — Consultant Cabinet</h2>
          <p className="text-sm text-gray-500">Analyse la rentabilité et le flux de vos patients</p>
        </div>
      </div>

      {!report ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-sm text-gray-600 mb-4">L'IA est prête à analyser vos métriques (Temps d'attente, CA, Satisfaction).</p>
          <button
            onClick={generateStrategicReport}
            disabled={loading}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium text-sm flex items-center justify-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Analyse des données...
              </>
            ) : (
              "Générer le Bilan d'Optimisation"
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-purple-50 rounded-lg p-5 border border-purple-100">
            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">{report}</p>
          </div>
          <button
            onClick={() => setReport('')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Réinitialiser
          </button>
        </div>
      )}

      {error && <p className="text-red-600 text-sm mt-4 p-3 bg-red-50 rounded-lg">{error}</p>}
    </div>
  )
}