import { useState } from 'react'

export default function AiSmartScheduleCard() {
  const [isScanning, setIsScanning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [showDemo, setShowDemo] = useState(false)

  async function triggerGapFillSimulation() {
    setShowDemo(true)
    setIsScanning(true)
    setLog(["🔴 14h05 : Annulation de dernière minute détectée (Patient: K. Alaoui - 15h30)."])
    
    await new Promise(r => setTimeout(r, 1500))
    setLog(prev => [...prev, "🔍 Agent IA : Scan de la liste d'attente en cours..."])
    
    await new Promise(r => setTimeout(r, 1500))
    setLog(prev => [...prev, "✅ 3 patients trouvés avec des critères d'urgence similaires."])
    
    await new Promise(r => setTimeout(r, 1500))
    setLog(prev => [...prev, "📱 Envoi de 3 SMS automatiques avec lien de confirmation..."])
    
    await new Promise(r => setTimeout(r, 2000))
    setLog(prev => [...prev, "🎉 14h06 : Créneau de 15h30 récupéré par M. Bennani !"])
    setIsScanning(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Agent IA — Remplissage Autonome</h2>
          <p className="text-sm text-gray-500">Comble les annulations pour 100% de rentabilité</p>
        </div>
      </div>

      {!showDemo ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <button
            onClick={triggerGapFillSimulation}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center gap-2 mx-auto"
          >
            Simuler une Annulation (Démo)
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg p-5 font-mono text-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-700 pb-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-gray-400 ml-2">Terminal IA - Protection du Chiffre d'Affaires</span>
          </div>
          <div className="space-y-3">
            {log.map((message, index) => (
              <p key={index} className="text-green-400 animate-pulse-once">
                {message}
              </p>
            ))}
            {isScanning && (
              <p className="text-gray-500 animate-pulse">_</p>
            )}
          </div>
          {!isScanning && log.length > 0 && (
            <button 
              onClick={() => { setShowDemo(false); setLog([]); }}
              className="mt-6 text-gray-400 hover:text-white text-xs underline"
            >
              Réinitialiser le système
            </button>
          )}
        </div>
      )}
    </div>
  )
}