import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { RDV_STATUSES, isValidTransition } from '../../lib/workflow'
import { supabase } from '../../lib/supabase'
import PinLock from '../../components/common/PinLock'
import {
  Users, CalendarDays, Receipt, Plus, Clock, MoreHorizontal,
  ChevronRight, XCircle, ArrowRightToLine
} from 'lucide-react'

/* ─── Helpers ─── */
const TZ = 'Africa/Casablanca'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function formatDateFr() {
  const now = new Date()
  const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  const day = days[now.getDay()]
  const d = now.getDate()
  const month = months[now.getMonth()]
  const year = now.getFullYear()
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return `${day} ${d} ${month} ${year} · ${time}`
}

function formatTime(iso) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

function formatTimeAmPm(iso) {
  if (!iso) return '--:-- --'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '--:-- --'
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

const getInitials = (prenom, nom) =>
  `${(prenom?.[0] || '').toUpperCase()}${(nom?.[0] || '').toUpperCase()}`

const AVATAR_COLORS = [
  { bg: '#EEF2FF', text: '#4F46E5' },
  { bg: '#FEF3C7', text: '#D97706' },
  { bg: '#DCFCE7', text: '#16A34A' },
  { bg: '#FEE2E2', text: '#DC2626' },
  { bg: '#E0E7FF', text: '#4338CA' },
  { bg: '#FCE7F3', text: '#DB2777' },
  { bg: '#CFFAFE', text: '#0891B2' },
]
function getAvatarColor(id) {
  const idx = id ? String(id).charCodeAt(0) % AVATAR_COLORS.length : 0
  return AVATAR_COLORS[idx]
}

/* ─── Live Wait Time Hook ─── */
function useLiveWaitMinutes(since) {
  const [mins, setMins] = useState(0)
  useEffect(() => {
    if (!since) return
    const update = () => {
      const diff = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 60000))
      setMins(diff)
    }
    update()
    const iv = setInterval(update, 30000)
    return () => clearInterval(iv)
  }, [since])
  return mins
}

/* ─── Live Clock ─── */
function useLiveClock() {
  const [dateStr, setDateStr] = useState(formatDateFr)
  useEffect(() => {
    const iv = setInterval(() => setDateStr(formatDateFr()), 30000)
    return () => clearInterval(iv)
  }, [])
  return dateStr
}

/* ─── Wait Time Cell (individual re-render) ─── */
function WaitTimeCell({ since }) {
  const mins = useLiveWaitMinutes(since)
  if (mins === 0) return <span className="ds-wait-label">IMMÉDIAT</span>
  return <span className="ds-wait-label">{mins} min</span>
}

/* ═══════════════════════════════════════════════════════════
   STATUS BADGE
   ═══════════════════════════════════════════════════════════ */
const STATUS_CONFIG = {
  [RDV_STATUSES.IN_CONSULTATION]: { label: 'EN COURS', bg: '#DBEAFE', text: '#2563EB' },
  [RDV_STATUSES.ARRIVED]:        { label: 'ARRIVÉ',   bg: '#D1FAE5', text: '#059669' },
  [RDV_STATUSES.SCHEDULED]:      { label: 'ATTENTE',  bg: '#FEF3C7', text: '#D97706' },
  [RDV_STATUSES.COMPLETED]:      { label: 'TERMINÉ',  bg: '#E0E7FF', text: '#4F46E5' },
  [RDV_STATUSES.ABSENT]:         { label: 'ABSENT',   bg: '#FEE2E2', text: '#DC2626' },
}

function StatusBadge({ status }) {
  // Check for urgent flag
  const isUrgent = status === 'urgent'
  if (isUrgent) {
    return (
      <span
        className="ds-status-badge"
        style={{ background: '#DC2626', color: '#FFFFFF' }}
      >
        URGENT
      </span>
    )
  }
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#F1F5F9', text: '#64748B' }
  return (
    <span
      className="ds-status-badge"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════════════ */
export default function StatisticsPage() {
  const navigate = useNavigate()
  const {
    profile, rdvList, consultations, patients,
    openGlobalModal, notify, refreshRdv
  } = useAppContext()

  const dateStr = useLiveClock()
  const doctorName = profile?.nom_complet || 'Docteur'

  /* ── Derived data ── */
  const enAttente = useMemo(() =>
    rdvList.filter(r => r.status === RDV_STATUSES.ARRIVED)
      .sort((a, b) => new Date(a.updated_at || a.date_rdv) - new Date(b.updated_at || b.date_rdv)),
    [rdvList]
  )

  const enConsultation = useMemo(() =>
    rdvList.filter(r => r.status === RDV_STATUSES.IN_CONSULTATION),
    [rdvList]
  )

  const confirmes = useMemo(() =>
    rdvList.filter(r => r.status === RDV_STATUSES.SCHEDULED)
      .sort((a, b) => new Date(a.date_rdv) - new Date(b.date_rdv)),
    [rdvList]
  )

  // Next scheduled patient (first confirmed RDV)
  const prochainRdv = confirmes[0] || null
  const prochainPatient = prochainRdv?.patients || null

  // Stats
  const salleCount = enAttente.length + enConsultation.length
  const confirmedCount = rdvList.filter(r => r.status === RDV_STATUSES.SCHEDULED || r.status === RDV_STATUSES.ARRIVED || r.status === RDV_STATUSES.IN_CONSULTATION).length
  const totalRdv = rdvList.length

  const revenuJour = useMemo(() => {
    const today = new Date().toLocaleDateString('fr-CA', { timeZone: TZ })
    return consultations
      .filter(c => c.statut === 'paye' && c.date_consult?.startsWith(today))
      .reduce((sum, c) => sum + (c.montant || 0), 0)
  }, [consultations])

  // Waiting room list: arrived + in consultation
  const salleList = useMemo(() => {
    const combined = [
      ...enConsultation.map(r => ({ ...r, _order: 0 })),
      ...enAttente.map(r => ({ ...r, _order: 1 })),
    ]
    return combined
  }, [enAttente, enConsultation])

  /* ── Status transition ── */
  const transitionStatus = async (rdvId, targetStatus) => {
    const { data: current, error: fetchErr } = await supabase
      .from('rdv').select('status').eq('id', rdvId).single()
    if (fetchErr || !current) {
      notify({ title: 'Erreur', description: 'Impossible de lire le RDV', tone: 'error' })
      return false
    }
    try { isValidTransition(current.status, targetStatus) }
    catch (err) {
      notify({ title: 'Transition invalide', description: err.message, tone: 'error' })
      return false
    }
    const { error } = await supabase.from('rdv').update({ status: targetStatus }).eq('id', rdvId)
    if (error) {
      notify({ title: 'Erreur DB', description: error.message, tone: 'error' })
      return false
    }
    return true
  }

  const ajouterSalle = async () => {
    if (!prochainRdv) return
    const ok = await transitionStatus(prochainRdv.id, RDV_STATUSES.ARRIVED)
    if (ok) {
      notify({ title: 'Patient ajouté', description: `${prochainPatient?.prenom} ${prochainPatient?.nom} est en salle d'attente.` })
    }
  }

  const annulerRdv = async () => {
    if (!prochainRdv) return
    const { error } = await supabase.from('rdv').update({ status: 'absent' }).eq('id', prochainRdv.id)
    if (error) {
      notify({ title: 'Erreur', description: error.message, tone: 'error' })
    } else {
      notify({ title: 'RDV annulé', description: `Le rendez-vous a été marqué comme absent.` })
    }
  }

  return (
    <PinLock>
      <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar font-['Inter']">
        {/* Greeting and Quick Actions */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-clinical-on-surface">Bonjour, Dr. {doctorName.split(' ').pop()}</h2>
            <p className="text-clinical-on-secondary-container mt-1">Voici le point sur votre activité aujourd'hui, {dateStr.split('·')[0].trim()}.</p>
          </div>
          <button 
            onClick={() => openGlobalModal('appointment')}
            className="bg-clinical-primary hover:bg-clinical-primary-container text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-clinical-primary/10 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>calendar_add_on</span>
            Nouveau RDV
          </button>
        </div>

        {/* Bento Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* KPI: Salle d'attente */}
          <div className="bg-clinical-surface-container-low p-6 rounded-xl border-l-4 border-clinical-primary relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-clinical-on-secondary-container tracking-wide">Salle d'attente</p>
                <h3 className="text-4xl font-bold mt-2 text-clinical-primary">{salleCount}</h3>
                <p className="text-xs text-clinical-on-surface-variant mt-2">patients actuellement en attente</p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <span className="material-symbols-outlined text-clinical-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>chair</span>
              </div>
            </div>
          </div>
          {/* KPI: RDV Du Jour */}
          <div className="bg-clinical-surface-container-low p-6 rounded-xl border-l-4 border-clinical-secondary relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-clinical-on-secondary-container tracking-wide">RDV Du Jour</p>
                <h3 className="text-4xl font-bold mt-2 text-clinical-secondary">{confirmedCount} <span className="text-lg text-clinical-secondary/70">/ {totalRdv}</span></h3>
                <p className="text-xs text-clinical-on-surface-variant mt-2 font-medium">{totalRdv > 0 ? Math.round((confirmedCount/totalRdv)*100) : 0}% de confirmations reçues</p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <span className="material-symbols-outlined text-clinical-secondary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>event_available</span>
              </div>
            </div>
          </div>
          {/* KPI: Revenu Du Jour */}
          <div className="bg-clinical-surface-container-low p-6 rounded-xl border-l-4 border-clinical-tertiary relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-clinical-on-secondary-container tracking-wide">Revenu Du Jour</p>
                <h3 className="text-4xl font-bold mt-2 text-clinical-on-surface">{revenuJour.toLocaleString('fr-FR')} <span className="text-xl">MAD</span></h3>
                <p className="text-xs text-clinical-on-surface-variant mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-clinical-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>trending_up</span>
                  À jour pour aujourd'hui
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <span className="material-symbols-outlined text-clinical-tertiary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>payments</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Next Patient / Focus Card */}
          <div className="lg:col-span-4 space-y-6">
            <h4 className="text-lg font-semibold text-clinical-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-clinical-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>medical_information</span>
              Prochain Patient
            </h4>
            
            {prochainRdv ? (
              <div className="bg-clinical-surface-container-lowest border border-slate-100 rounded-xl p-6 flex flex-col shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <span className="px-2 py-1 bg-clinical-primary/10 text-clinical-primary text-[10px] font-bold rounded uppercase">Confirmé</span>
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-clinical-surface-container-low rounded-full flex items-center justify-center border-2 border-clinical-primary/20">
                    <span className="material-symbols-outlined text-3xl text-clinical-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>person</span>
                  </div>
                  <div>
                    <h5 className="text-clinical-on-surface font-bold text-lg leading-tight">{prochainPatient?.prenom} {prochainPatient?.nom}</h5>
                    <p className="text-xs font-semibold text-slate-500">{prochainPatient?.telephone || 'Dossier complet'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-400 text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>schedule</span>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Heure du RDV</p>
                      <p className="text-sm font-semibold text-clinical-on-surface">{formatTime(prochainRdv.date_rdv)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-400 text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>medical_services</span>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Type d'acte</p>
                      <p className="text-sm font-semibold text-clinical-on-surface">{prochainRdv.notes || prochainRdv.motif || 'Consultation de suivi'}</p>
                    </div>
                  </div>
                </div>
                <button onClick={ajouterSalle} className="mt-8 w-full py-3 bg-clinical-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>play_arrow</span>
                  Marquer comme arrivé
                </button>
                <button onClick={() => navigate(`/patients/${prochainPatient?.id}`)} className="mt-3 text-slate-400 font-medium text-xs hover:text-clinical-primary transition-colors">Voir l'historique médical</button>
              </div>
            ) : (
              <div className="bg-clinical-surface-container-lowest border border-slate-100 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl text-slate-300" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>free_cancellation</span>
                </div>
                <h5 className="text-clinical-on-surface font-bold text-lg mb-1">Aucun patient prévu</h5>
                <p className="text-sm text-slate-500 mb-6">Votre planning de consultations est vide pour le moment.</p>
                <button onClick={() => openGlobalModal('appointment')} className="py-2.5 px-6 bg-clinical-primary/10 text-clinical-primary rounded-lg font-bold text-sm hover:bg-clinical-primary/20 transition-all">
                  Planifier un RDV
                </button>
              </div>
            )}
          </div>

          {/* Salle d'Attente Detailed List */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold text-clinical-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-clinical-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>group</span>
                Détails Salle d'attente
              </h4>
              <div className="flex gap-2">
                <button className="text-xs font-bold px-4 py-1.5 bg-clinical-primary text-white rounded-full">Actifs ({salleCount})</button>
                <button onClick={() => navigate('/salle-attente')} className="text-xs font-medium px-4 py-1.5 text-clinical-on-surface-variant hover:bg-clinical-surface-container transition-colors rounded-full">Gérer</button>
              </div>
            </div>
            
            <div className="bg-clinical-surface-container-lowest border border-slate-100 rounded-xl shadow-sm overflow-hidden">
              {salleList.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Patient</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Heure Prévue</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Statut</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {salleList.map(rdv => (
                      <tr key={rdv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-clinical-on-surface">{rdv.patients?.prenom} {rdv.patients?.nom}</p>
                          <p className="text-[10px] text-slate-500 font-medium tracking-tight">Motif: {rdv.notes || rdv.motif || 'Consultation générale'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-clinical-on-surface-variant">
                          {formatTime(rdv.date_rdv)}
                        </td>
                        <td className="px-6 py-4">
                          {rdv.status === RDV_STATUSES.IN_CONSULTATION ? (
                             <span className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold rounded uppercase">En Cours</span>
                          ) : (
                             <span className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded uppercase">En Attente</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => navigate(rdv.status === RDV_STATUSES.IN_CONSULTATION ? `/consultation/${rdv.id}` : `/salle-attente`)} className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-clinical-primary rounded-lg text-xs font-bold transition-colors">
                            {rdv.status === RDV_STATUSES.IN_CONSULTATION ? "Ouvrir" : "Prendre"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-slate-300" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>chair</span>
                  </div>
                  <p className="text-sm font-medium text-slate-500">La salle d'attente est vide.</p>
                </div>
              )}
              <div className="p-4 bg-slate-50/50 text-center border-t border-slate-100">
                <button onClick={() => navigate('/salle-attente')} className="text-xs font-bold text-clinical-primary hover:underline">Gérer la salle d'attente complète</button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Latest Activity or Recent Data */}
        <div className="bg-clinical-surface-container-low rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-bold uppercase tracking-widest text-clinical-on-secondary-container">Performance du Cabinet</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border-b-2 border-clinical-primary-container">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-clinical-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>monitoring</span>
                <span className="text-xs font-medium text-slate-500">Taux de Remplissage</span>
              </div>
              <div className="text-2xl font-bold text-clinical-on-surface">{totalRdv > 0 ? '92%' : '0%'}</div>
              <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full bg-clinical-primary`} style={{ width: totalRdv > 0 ? '92%' : '0%' }}></div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border-b-2 border-clinical-secondary">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-clinical-secondary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>timer</span>
                <span className="text-xs font-medium text-slate-500">Délai Moyen</span>
              </div>
              <div className="text-2xl font-bold text-clinical-on-surface">18 min</div>
              <div className="mt-2 text-[10px] font-medium text-clinical-error flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>arrow_upward</span>
                +4 min (est.)
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border-b-2 border-clinical-tertiary">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-clinical-tertiary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>verified</span>
                <span className="text-xs font-medium text-slate-500">Confirmations</span>
              </div>
              <div className="text-2xl font-bold text-clinical-on-surface">{totalRdv > 0 ? Math.round((confirmedCount/totalRdv)*100) : 0}%</div>
              <div className="mt-2 text-[10px] font-medium text-clinical-primary">Haute fiabilité</div>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border-b-2 border-slate-300">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-slate-400" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>outpatient</span>
                <span className="text-xs font-medium text-slate-500">Nouveaux Patients</span>
              </div>
              <div className="text-2xl font-bold text-clinical-on-surface">+5</div>
              <div className="mt-2 text-[10px] font-medium text-slate-400">Aujourd'hui</div>
            </div>
          </div>
        </div>
      </div>
    </PinLock>
  )
}
