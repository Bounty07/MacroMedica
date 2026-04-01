import AiScribeCard from '../components/ui/AiScribeCard'
import AiConsultantCard from '../components/ui/AiConsultantCard'
import AiLabReaderCard from '../components/ui/AiLabReaderCard'
import AiDiagnosisCard from '../components/ui/AiDiagnosisCard'
import AiSmartScheduleCard from '../components/ui/AiSmartScheduleCard'

export default function AiScribePage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Centre de Commandement IA</h1>
          <p className="text-gray-500 mt-1">L'écosystème complet pour automatiser votre cabinet médical.</p>
        </div>
        <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Système Actif
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Colonne Gauche : Interaction Patient & Agenda */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-1">1. Scribe Médical (Voix)</h2>
            <AiScribeCard />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-1">2. Aide au Diagnostic</h2>
            <AiDiagnosisCard />
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-1">5. Optimisation Agenda</h2>
            <AiSmartScheduleCard />
          </div>
        </div>
        
        {/* Colonne Droite : Données & Stratégie */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-1">3. Extraction Labo (OCR)</h2>
            <AiLabReaderCard />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-1">4. Consultant Cabinet</h2>
            <AiConsultantCard />
          </div>
        </div>

      </div>
      
    </div>
  )
}