import { useQuery } from '@tanstack/react-query'
import { 
  ArrowLeft, Bell, Settings, Search, Stethoscope, Calendar, FileText, Plus, 
  Printer, Share, CreditCard, Droplets, Target, Activity, Zap 
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { AppButton } from '../../components/dashboard/DashboardPrimitives'
import { getPatientById, getConsultationsByPatient, getRdv } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useAppContext } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { isValidTransition, RDV_STATUSES } from '../../lib/workflow'

// ── Helpers ──
function calcAge(dateStr) {
  if (!dateStr) return null
  const birth = new Date(dateStr)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function formatDateFull(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Casablanca'
  }).toUpperCase()
}

export default function PatientProfileView({ patientId, onBack }) {
  const { profile } = useAppContext()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Historique')

  // ── Queries ──
  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatientById(patientId),
    enabled: !!patientId
  })

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations', 'patient', patientId],
    queryFn: () => getConsultationsByPatient(patientId),
    enabled: !!patientId
  })

  // We reuse getRdv but filter it client-side since API doesn't have getRdvByPatient
  const { data: allRdvs = [] } = useQuery({
    queryKey: ['rdv', profile?.cabinet_id],
    queryFn: getRdv,
    enabled: !!profile?.cabinet_id
  })

  // Basic mock documents for timeline (can be wired to real API later)
  const documents = []

  // ── Computed Data ──
  const patientRdvs = useMemo(() => allRdvs.filter(r => r.patient_id === patientId), [allRdvs, patientId])

  const activeTodayRdv = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayRdvs = patientRdvs.filter(r => r.date_rdv?.startsWith(today))
    const overflow = todayRdvs.find(r => r.status && r.status !== RDV_STATUSES.ABSENT && r.status !== RDV_STATUSES.PAID)
    return overflow || null
  }, [patientRdvs])
  const finances = useMemo(() => {
    let paye = 0, du = 0
    consultations.forEach(c => {
      const montant = parseFloat(c.montant) || 0
      if (c.statut === 'paye') paye += montant
      if (c.statut === 'credit') du += montant
    })
    return { paye, du, total: paye + du }
  }, [consultations])

  const nextRdv = useMemo(() => {
    const now = new Date()
    const upcoming = patientRdvs.filter(r => new Date(r.date_rdv) > now && (r.status || r.statut) !== 'annule')
    upcoming.sort((a, b) => new Date(a.date_rdv) - new Date(b.date_rdv))
    return upcoming[0] || null
  }, [patientRdvs])

  const timelineEvents = useMemo(() => {
    const events = []
    consultations.forEach(c => {
      events.push({
        id: c.id,
        type: 'consultation',
        date: new Date(c.date_consult),
        title: 'Consultation',
        notes: c.motif || c.notes || 'Consultation générale',
        status: c.statut,
        color: 'teal', // Maps to green dot
        badge: c.motif ? c.motif.substring(0, 15).toUpperCase() : 'CONSULTATION'
      })
    })
    // Add logic later if we fetch Ordonnances or Documents directly
    events.sort((a, b) => b.date - a.date)
    return events
  }, [consultations])

  // ── Render Helpers ──
  if (loadingPatient || !patient) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  const age = calcAge(patient.date_naissance)
  const sexDisplay = patient.sexe === 'homme' ? 'Homme' : patient.sexe === 'femme' ? 'Femme' : 'Non précisé'
  const initials = `${patient.prenom?.[0] || ''}${patient.nom?.[0] || ''}`.toUpperCase()

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] -mt-4 -mx-4 overflow-hidden bg-slate-50/50">
      
      {/* ── 1. Top Navigation Bar ── */}
      <header className="h-[76px] flex items-center justify-between px-8 bg-white border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition-colors group">
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
          </button>
          <div className="h-8 w-px bg-slate-200" />
          <h1 className="text-[20px] font-black tracking-tight text-slate-800">MacroMedica<span className="text-teal-600">.</span></h1>
        </div>
        
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Rechercher un patient..."
              className="w-full h-11 bg-slate-50 border-transparent rounded-[16px] pl-11 pr-4 text-[14px] text-slate-700 focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-50 transition-all outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 mr-4">
            <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-50 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-50 rounded-full transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[9px] font-extrabold tracking-wider">DOSSIER PATIENT V2</span>
              </div>
              <p className="text-[13px] font-bold text-slate-900">Dr. {profile?.nom || 'Docteur'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-600 to-teal-400 shadow-sm border-2 border-white flex items-center justify-center text-white font-bold text-sm">
              DR
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        
        {/* ── 2. Left Sidebar (Identity Card) ── */}
        <aside className="w-full lg:w-[320px] bg-white border-r border-slate-100 flex flex-col p-6 overflow-y-auto custom-scrollbar">
          
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-[32px] bg-teal-50 flex items-center justify-center text-[32px] font-bold text-teal-700 shadow-inner">
                {initials || 'P'}
              </div>
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-teal-500 text-white text-[10px] font-extrabold tracking-wider rounded-full shadow-[0_4px_12px_rgba(20,184,166,0.3)] border-2 border-white">
                ACTIF
              </div>
            </div>
            <h2 className="text-[22px] font-black text-slate-900 leading-tight">{patient.prenom} {patient.nom}</h2>
            <p className="text-[14px] text-slate-500 font-medium mt-1">
              {age ? `${age} ans` : '-'} • {sexDisplay} • ID: {patient.id?.split('-')[0]}
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {patient.group_sanguin && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100">
                  <Droplets className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[11px] font-bold text-rose-700 flex-1">{patient.group_sanguin}</span>
                </div>
              )}
            </div>
          </div>

          {/* Computed Dynamic Workflow CTA */}
          {(() => {
            if (!activeTodayRdv) {
              return (
                <button disabled className="w-full h-[48px] bg-slate-100 text-slate-400 rounded-[16px] font-bold text-[14px] flex items-center justify-center gap-2 mb-8 cursor-not-allowed">
                  Aucun RDV actif aujourd'hui
                </button>
              )
            }
            const { status, id } = activeTodayRdv

            if (profile?.role === 'docteur') {
              if (status === RDV_STATUSES.ARRIVED) {
                return (
                  <button onClick={async () => { await supabase.from('rdv').update({ status: RDV_STATUSES.IN_CONSULTATION }).eq('id', id); navigate(`/consultation/${id}`) }} className="w-full h-[48px] bg-teal-600 hover:bg-teal-700 text-white rounded-[16px] font-bold text-[14px] shadow-[0_4px_20px_rgba(13,148,136,0.25)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-8">
                    <Stethoscope className="w-4 h-4" /> Démarrer consultation
                  </button>
                )
              }
              if (status === RDV_STATUSES.IN_CONSULTATION) {
                return (
                  <button onClick={() => navigate(`/consultation/${id}`)} className="w-full h-[48px] bg-orange-500 hover:bg-orange-600 text-white rounded-[16px] font-bold text-[14px] shadow-[0_4px_20px_rgba(249,115,22,0.25)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-8">
                    <Stethoscope className="w-4 h-4" /> Reprendre consultation
                  </button>
                )
              }
              return (
                 <button disabled className="w-full h-[48px] bg-slate-100 text-slate-400 rounded-[16px] font-bold text-[14px] flex items-center justify-center gap-2 mb-8 cursor-not-allowed uppercase text-[11px] tracking-wider">
                   Patient: {status}
                 </button>
              )
            }

            if (profile?.role === 'secretaire') {
              if (!status || status === RDV_STATUSES.SCHEDULED) {
                return (
                  <button onClick={async () => { await supabase.from('rdv').update({ status: RDV_STATUSES.ARRIVED }).eq('id', id) }} className="w-full h-[48px] bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] font-bold text-[14px] shadow-[0_4px_20px_rgba(37,99,235,0.25)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-8">
                    Marquer comme arrivé
                  </button>
                )
              }
              if (status === RDV_STATUSES.COMPLETED) {
                return (
                  <button onClick={() => navigate(`/facturation`)} className="w-full h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-[16px] font-bold text-[14px] shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-8">
                    Encaisser la consultation
                  </button>
                )
              }
              return (
                 <button disabled className="w-full h-[48px] bg-blue-50 text-blue-500 border border-blue-200 rounded-[16px] font-bold text-[12px] flex items-center justify-center gap-2 mb-8 cursor-not-allowed uppercase tracking-wider">
                   En cours ({status})
                 </button>
              )
            }

            return null
          })()}

          {/* Medical Alerts (Mocked based on notes if no native support) */}
          <div className="mb-8">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Alertes Médicales</h3>
            <div className="space-y-2">
              {patient.mutuelle === 'CNOPS' && (
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-[1px]" />
                  <p className="text-[13px] font-semibold text-amber-800 leading-snug">Patient affilié CNOPS - Vérifier prise en charge spéciale.</p>
                </div>
              )}
              {patient.notes?.toLowerCase().includes('allergie') && (
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-[1px]" />
                  <p className="text-[13px] font-semibold text-rose-800 leading-snug">Allergie signalée dans les notes du dossier.</p>
                </div>
              )}
              {!patient.mutuelle && !patient.notes?.toLowerCase().includes('allergie') && (
                <p className="text-[13px] text-slate-400 italic">Aucune alerte médicale majeure enregistrée.</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Actions rapides</h3>
            <div className="grid grid-cols-2 gap-2">
              <button className="flex flex-col items-center justify-center p-3 rounded-[16px] bg-slate-50 hover:bg-teal-50 text-slate-500 hover:text-teal-700 transition-colors border border-transparent hover:border-teal-100 group">
                <Calendar className="w-5 h-5 mb-1.5 opacity-70 group-hover:opacity-100" />
                <span className="text-[11px] font-bold">Planifier</span>
              </button>
              <button className="flex flex-col items-center justify-center p-3 rounded-[16px] bg-slate-50 hover:bg-teal-50 text-slate-500 hover:text-teal-700 transition-colors border border-transparent hover:border-teal-100 group">
                <FileText className="w-5 h-5 mb-1.5 opacity-70 group-hover:opacity-100" />
                <span className="text-[11px] font-bold">Ordonnance</span>
              </button>
            </div>
            <button className="w-full mt-2 flex items-center justify-center gap-2 p-3 rounded-[16px] bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors border border-slate-100">
              <Plus className="w-4 h-4" />
              <span className="text-[12px] font-bold">Ajouter un document</span>
            </button>
          </div>

          {/* Financial Status */}
          <div className="mt-auto">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Statut Financier</h3>
            <div className="p-4 rounded-[20px] border border-slate-100 bg-white shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-medium text-slate-500">Total payé</span>
                <span className="text-[14px] font-bold text-slate-800">{finances.paye.toLocaleString()} MAD</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                <span className="text-[13px] font-medium text-slate-500">En attente</span>
                {finances.du > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold uppercase">Impayé</span>
                    <span className="text-[14px] font-bold text-rose-600">{finances.du.toLocaleString()} MAD</span>
                  </div>
                ) : (
                  <span className="text-[14px] font-bold text-teal-600">0 MAD</span>
                )}
              </div>
            </div>
          </div>

        </aside>

        {/* ── 3. Main Content Area (Tabs) ── */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          
          {/* Header & Tabs */}
          <div className="px-8 pt-8 pb-4 bg-white border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="text-[28px] font-black tracking-tight text-slate-900">
                  Dossier <span className="text-teal-600">Patient</span>
                </h2>
                <p className="text-[14px] text-slate-500 mt-1">Suivi médical complet et historique clinique</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 flex items-center justify-center rounded-[14px] border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                  <Printer className="w-4 h-4" />
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-[14px] border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                  <Share className="w-4 h-4" />
                </button>
                <button className="h-10 px-5 flex items-center justify-center gap-2 rounded-[14px] bg-teal-600 hover:bg-teal-700 text-white font-bold text-[13px] shadow-[0_4px_12px_rgba(13,148,136,0.2)] ml-2 transition-all">
                  <Plus className="w-4 h-4" />
                  Nouvel acte
                </button>
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-2">
              {['Historique', 'Consultations', 'Ordonnances', 'Facturation'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-[12px] text-[13px] font-bold transition-all whitespace-nowrap ${
                    activeTab === tab 
                      ? 'bg-slate-900 text-white shadow-md' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {tab === 'Historique' && <Activity className="w-4 h-4 inline-block mr-2 opacity-70" />}
                  {tab === 'Consultations' && <Stethoscope className="w-4 h-4 inline-block mr-2 opacity-70" />}
                  {tab === 'Ordonnances' && <FileText className="w-4 h-4 inline-block mr-2 opacity-70" />}
                  {tab === 'Facturation' && <CreditCard className="w-4 h-4 inline-block mr-2 opacity-70" />}
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            {activeTab === 'Historique' && (
              <div className="max-w-4xl">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[18px] font-bold text-slate-900">Parcours de soins</h3>
                  <button className="text-[13px] font-bold text-teal-600 hover:text-teal-700">Voir tout l'historique →</button>
                </div>

                <div className="relative pl-6">
                  {/* Vertical Timeline Line */}
                  <div className="absolute top-4 bottom-8 left-2.5 w-0.5 bg-slate-200" />

                  <div className="space-y-8">
                    {timelineEvents.map((evt, idx) => {
                      const isLast = idx === timelineEvents.length - 1
                      const isCredit = evt.status === 'credit'
                      return (
                        <div key={evt.id} className="relative">
                          {/* Dot */}
                          <div className={`absolute -left-[27px] top-4 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 ${
                            isCredit ? 'bg-rose-500' : 'bg-teal-500'
                          }`} />
                          
                          <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-[12px] font-bold text-slate-400 w-24">{formatDateFull(evt.date)}</span>
                                <h4 className="text-[15px] font-bold text-slate-900">{evt.title}</h4>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                                  isCredit ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-700'
                                }`}>
                                  {!isCredit && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                                  {isCredit ? 'IMPAYÉ' : evt.badge}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-[14px] text-slate-500 leading-relaxed mb-4 ml-0 sm:ml-28">
                              {evt.notes}
                            </p>
                            
                            <div className="flex items-center gap-3 ml-0 sm:ml-28">
                              <button className="text-[12px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 px-4 py-1.5 rounded-[10px] transition-colors">
                                Détails de visite
                              </button>
                              <button className="text-[12px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 px-4 py-1.5 rounded-[10px] transition-colors">
                                Facture
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {timelineEvents.length === 0 && (
                      <div className="p-8 text-center bg-white rounded-[24px] border border-dashed border-slate-200">
                        <p className="text-[14px] text-slate-500">Aucun événement enregistré pour ce patient.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab !== 'Historique' && (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <FileText className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-medium text-[15px]">Module {activeTab} en cours de développement</p>
              </div>
            )}
          </div>
        </main>

        {/* ── 4. Right Sidebar (Metrics & Financials) ── */}
        <aside className="w-full lg:w-[320px] p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-slate-50/50 lg:border-l border-slate-100">
          
          {/* Indicateurs Clés */}
          <div className="bg-slate-900 text-white rounded-[24px] p-6 mb-6 shadow-xl shadow-slate-900/10">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-teal-400" />
              <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-200">Indicateurs clés</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[12px] font-semibold text-slate-400">IMC (BMI)</span>
                  <span className="text-[20px] font-bold text-white">24.2</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-1">
                  <div className="h-full w-[60%] bg-teal-400 rounded-full" />
                </div>
                <p className="text-[10px] text-teal-400 font-medium tracking-wide">Poids idéal pour sa taille</p>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1 bg-slate-800/50 rounded-[16px] p-3 border border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tension</p>
                  <p className="text-[18px] font-bold">13/8</p>
                </div>
                <div className="flex-1 bg-slate-800/50 rounded-[16px] p-3 border border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Glycémie</p>
                  <p className="text-[18px] font-bold">1.02 <span className="text-[12px] font-normal text-slate-400">g/l</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Finances du Patient */}
          <div className="bg-white rounded-[24px] p-6 mb-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100">
            <h3 className="text-[15px] font-bold text-slate-900 mb-6 flex items-center gap-2">
              Finances du Patient
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Versé</p>
                <p className="text-[28px] font-black text-teal-600 tracking-tight leading-none">{finances.paye.toLocaleString()} <span className="text-[14px]">MAD</span></p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Solde Dû</p>
                <p className="text-[28px] font-black text-rose-500 tracking-tight leading-none">{finances.du.toLocaleString()} <span className="text-[14px]">MAD</span></p>
              </div>
            </div>
            
            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[13px] transition-colors">
              <Zap className="w-4 h-4" />
              Effectuer un versement
            </button>
          </div>

          {/* Prochains RDV */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100">
            <h3 className="text-[15px] font-bold text-slate-900 mb-4">Prochains Rendez-vous</h3>
            
            {nextRdv ? (
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center justify-center min-w-[56px] h-[64px] bg-teal-50 rounded-[14px] border border-teal-100">
                  <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">{new Date(nextRdv.date_rdv).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                  <span className="text-[20px] font-black text-teal-700 leading-none">{new Date(nextRdv.date_rdv).getDate()}</span>
                </div>
                <div className="py-1">
                  <h4 className="text-[14px] font-bold text-slate-900 mb-1">{nextRdv.notes || 'Consultation'}</h4>
                  <p className="text-[12px] font-medium text-slate-500">{new Date(nextRdv.date_rdv).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • Cabinet</p>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-[13px] text-slate-400 font-medium">Aucun rendez-vous à venir</p>
                <button className="mt-3 text-[12px] font-bold text-teal-600">Planifier maintenant</button>
              </div>
            )}
          </div>

        </aside>

      </div>
    </div>
  )
}
