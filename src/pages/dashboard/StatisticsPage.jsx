import { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { RDV_STATUSES, isValidTransition } from '../../lib/workflow'
import { supabase } from '../../lib/supabase'
import PinLock from '../../components/common/PinLock'
import PracticeInsightsCard from '../../components/dashboard/PracticeInsightsCard'
import { usePracticeInsights } from '../../hooks/usePracticeInsights'
import {
  CalendarPlus, Bell, Trash2, Phone, MoreHorizontal,
  PlayCircle, FileText, StickyNote, ChevronRight, Clock,
  Stethoscope, User, Activity, Calendar
} from 'lucide-react'

/* ─── Constants ─── */
const TZ = 'Africa/Casablanca'
const ACCENT = '#004F45'
const ACCENT_LIGHT = '#E6F4F1'

/* ─── Date helpers ─── */
function formatDateLong() {
  const now = new Date()
  const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  return `le ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`
}

function formatTime(iso) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

function formatDateShort(iso) {
  if (!iso) return '--'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '--'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ })
}

/* ─── Avatar helpers ─── */
const AVATAR_PALETTES = [
  { bg: '#D1FAE5', text: '#065F46' },
  { bg: '#DBEAFE', text: '#1E40AF' },
  { bg: '#FEE2E2', text: '#991B1B' },
  { bg: '#FEF3C7', text: '#92400E' },
  { bg: '#EDE9FE', text: '#4C1D95' },
  { bg: '#FCE7F3', text: '#831843' },
  { bg: '#CFFAFE', text: '#164E63' },
]
function getAvatarColor(id) {
  const idx = id ? String(id).charCodeAt(0) % AVATAR_PALETTES.length : 0
  return AVATAR_PALETTES[idx]
}
const getInitials = (prenom, nom) =>
  `${(prenom?.[0] || '').toUpperCase()}${(nom?.[0] || '').toUpperCase()}`

/* ─── Live wait time ─── */
function useLiveWait(since) {
  const [mins, setMins] = useState(0)
  useEffect(() => {
    if (!since) return
    const update = () => setMins(Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 60000)))
    update()
    const iv = setInterval(update, 30000)
    return () => clearInterval(iv)
  }, [since])
  return mins
}

/* ─── Live clock ─── */
function useLiveClock() {
  const [d, setD] = useState(formatDateLong)
  useEffect(() => {
    const iv = setInterval(() => setD(formatDateLong()), 60000)
    return () => clearInterval(iv)
  }, [])
  return d
}

/* ───────────────────────────────────────────────
   WAIT TIME CELL
─────────────────────────────────────────────── */
function WaitCell({ rdv }) {
  const mins = useLiveWait(rdv.updated_at || rdv.date_rdv)
  const isLate = rdv.status === RDV_STATUSES.SCHEDULED && mins > 15
  if (isLate) {
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>Retard</div>
        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Prévu {formatTime(rdv.date_rdv)}</div>
      </div>
    )
  }
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
        {String(Math.floor(mins / 60)).padStart(2, '0')}:{String(mins % 60).padStart(2, '0')} min
      </div>
      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
        Arrivé à {formatTime(rdv.updated_at || rdv.date_rdv)}
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────────
   STATUS BADGE
─────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    [RDV_STATUSES.IN_CONSULTATION]: { label: 'EN COURS',   bg: '#DBEAFE', text: '#1D4ED8' },
    [RDV_STATUSES.ARRIVED]:         { label: 'EN ATTENTE', bg: '#D1FAE5', text: '#047857' },
    [RDV_STATUSES.SCHEDULED]:       { label: 'EN RETARD',  bg: '#FEE2E2', text: '#B91C1C' },
    [RDV_STATUSES.COMPLETED]:       { label: 'TERMINÉ',    bg: '#E0E7FF', text: '#4338CA' },
    [RDV_STATUSES.ABSENT]:          { label: 'ABSENT',     bg: '#FEE2E2', text: '#B91C1C' },
  }
  const cfg = map[status] || { label: status?.toUpperCase() || '—', bg: '#F1F5F9', text: '#64748B' }
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.6px',
      padding: '4px 10px', borderRadius: 6,
      background: cfg.bg, color: cfg.text,
      textTransform: 'uppercase', whiteSpace: 'nowrap'
    }}>
      {cfg.label}
    </span>
  )
}

/* ═══════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════ */
export default function StatisticsPage() {
  const navigate = useNavigate()
  const { profile, rdvList, consultations, openGlobalModal, notify } = useAppContext()

  const dateStr = useLiveClock()
  const doctorName = profile?.nom_complet || 'Docteur'
  const [salleTab, setSalleTab] = useState('actifs') // 'actifs' | 'tous'
  const practiceInsightsRefreshToken = useMemo(() => (
    [
      rdvList.length,
      consultations.length,
      rdvList[0]?.updated_at || rdvList[0]?.created_at || rdvList[0]?.id || 'rdv-none',
      consultations[0]?.created_at || consultations[0]?.id || 'consult-none',
    ].join(':')
  ), [consultations, rdvList])
  const { metrics: practiceMetrics, insight: practiceInsight } = usePracticeInsights({
    cabinetId: profile?.cabinet_id,
    refreshToken: practiceInsightsRefreshToken,
  })

  /* ────────────────────────────────────────────────
     MOCK DATA — shown when real data is empty
  ────────────────────────────────────────────────── */
  const NOW = new Date()
  const t = (offsetMin) => new Date(NOW.getTime() - offsetMin * 60000).toISOString()

  const MOCK_SALLE = [
    {
      id: 'mock-1', status: RDV_STATUSES.ARRIVED,
      date_rdv: t(40), updated_at: t(22),
      notes: 'Post-Op · Dr. Aris',
      motif: 'Post-Op · Dr. Aris',
      patients: { id: 'mp1', prenom: 'Thomas', nom: 'Durand', sexe: 'M' },
    },
    {
      id: 'mock-2', status: RDV_STATUSES.ARRIVED,
      date_rdv: t(25), updated_at: t(7),
      notes: '1ère Consultation',
      motif: '1ère Consultation',
      patients: { id: 'mp2', prenom: 'Alice', nom: 'Mercier', sexe: 'F' },
    },
    {
      id: 'mock-3', status: RDV_STATUSES.SCHEDULED,
      date_rdv: t(50), updated_at: t(50),
      notes: 'Renouvellement Ordonnance',
      motif: 'Renouvellement Ordonnance',
      patients: { id: 'mp3', prenom: 'Lucas', nom: 'Petit', sexe: 'M' },
    },
  ]

  const MOCK_PROCHAIN = {
    id: 'mock-rdv-0', status: RDV_STATUSES.SCHEDULED,
    date_rdv: new Date(NOW.getTime() + 25 * 60000).toISOString(),
    notes: 'Gastrite chronique',
    motif: 'Gastrite chronique',
    patients: {
      id: 'mock-p0', prenom: 'Sophie', nom: 'Laurent', sexe: 'F',
      date_naissance: '1982-03-14',
      telephone: 'Dossier #SL-8842',
      groupe_sanguin: 'A+',
      antecedents: 'Allergie Pénicilline',
      tension: 'Tension: 12/8',
      poids: 64,
    },
  }

  /* ── Derived slices ── */
  const enAttente = useMemo(() =>
    rdvList.filter(r => r.status === RDV_STATUSES.ARRIVED)
      .sort((a, b) => new Date(a.updated_at || a.date_rdv) - new Date(b.updated_at || b.date_rdv)),
    [rdvList])

  const enConsultation = useMemo(() =>
    rdvList.filter(r => r.status === RDV_STATUSES.IN_CONSULTATION),
    [rdvList])

  const confirmes = useMemo(() =>
    rdvList.filter(r => r.status === RDV_STATUSES.SCHEDULED)
      .sort((a, b) => new Date(a.date_rdv) - new Date(b.date_rdv)),
    [rdvList])

  const useMock = rdvList.length === 0

  const prochainRdv     = confirmes[0]               || (useMock ? MOCK_PROCHAIN      : null)
  const prochainPatient = prochainRdv?.patients       || null

  /* ── Stats ── */
  const salleCount     = useMock ? 4 : enAttente.length + enConsultation.length
  const confirmedCount = useMock ? 12 : rdvList.filter(r =>
    [RDV_STATUSES.SCHEDULED, RDV_STATUSES.ARRIVED, RDV_STATUSES.IN_CONSULTATION].includes(r.status)
  ).length
  const totalRdv = useMock ? 15 : rdvList.length

  const revenuJour = useMemo(() => {
    if (useMock) return 1240
    const today = new Date().toLocaleDateString('fr-CA', { timeZone: TZ })
    return consultations
      .filter(c => c.statut === 'paye' && c.date_consult?.startsWith(today))
      .reduce((s, c) => s + (c.montant || 0), 0)
  }, [consultations, useMock])

  /* ── Salle d'attente Table List ── */
  const activeList = useMemo(() => [
    ...enConsultation.map(r => ({ ...r, _order: 0 })),
    ...enAttente.map(r => ({ ...r, _order: 1 })),
  ], [enAttente, enConsultation])

  const salleList = useMock
    ? MOCK_SALLE
    : salleTab === 'actifs'
      ? activeList
      : rdvList.filter(r =>
          [RDV_STATUSES.ARRIVED, RDV_STATUSES.IN_CONSULTATION, RDV_STATUSES.COMPLETED, RDV_STATUSES.ABSENT].includes(r.status)
        )

  /* ── Actions ── */
  const transitionStatus = useCallback(async (rdvId, target) => {
    const { data: cur, error: e } = await supabase.from('rdv').select('status').eq('id', rdvId).single()
    if (e || !cur) { notify({ title: 'Erreur', description: 'RDV introuvable', tone: 'error' }); return false }
    try { isValidTransition(cur.status, target) } catch (err) {
      notify({ title: 'Transition invalide', description: err.message, tone: 'error' }); return false
    }
    const { error } = await supabase.from('rdv').update({ status: target }).eq('id', rdvId)
    if (error) { notify({ title: 'Erreur DB', description: error.message, tone: 'error' }); return false }
    return true
  }, [notify])

  const demarrerConsultation = async () => {
    if (!prochainRdv) return
    const ok = await transitionStatus(prochainRdv.id, RDV_STATUSES.IN_CONSULTATION)
    if (ok) notify({ title: 'Consultation démarrée', description: `${prochainPatient?.prenom} ${prochainPatient?.nom} est maintenant en consultation.` })
  }

  const ajouterSalle = async () => {
    if (!prochainRdv) return
    const ok = await transitionStatus(prochainRdv.id, RDV_STATUSES.ARRIVED)
    if (ok) notify({ title: 'Patient ajouté', description: `${prochainPatient?.prenom} ${prochainPatient?.nom} est en salle d'attente.` })
  }

  /* ── Patient gender prefix ── */
  const civility = (sexe) => sexe === 'F' ? 'Mme.' : 'M.'
  const age = (dob) => {
    if (!dob) return null
    const diff = new Date().getFullYear() - new Date(dob).getFullYear()
    return diff > 0 && diff < 130 ? diff : null
  }

  /* =========================================================
     RENDER
  ========================================================= */
  return (
    <PinLock>
      <style>{`
        .db-root {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          padding: 32px 36px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-height: 100%;
          background: #F8FAFB;
        }

        /* ─ HEADER ─ */
        .db-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .db-greeting { font-size: 28px; font-weight: 800; color: #0F172A; line-height: 1.2; letter-spacing: -0.5px; }
        .db-subline  { font-size: 13px; color: #94A3B8; margin-top: 4px; font-weight: 400; }
        .db-btn-rdv  {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${ACCENT}; color: #fff;
          font-weight: 700; font-size: 13px;
          padding: 11px 22px; border-radius: 10px; border: none; cursor: pointer;
          transition: opacity .15s; box-shadow: 0 4px 14px rgba(0,79,69,0.25);
          white-space: nowrap;
        }
        .db-btn-rdv:hover { opacity: 0.88; }

        /* ─ KPI ROW ─ */
        .db-kpi-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media(max-width:900px) { .db-kpi-row { grid-template-columns: 1fr; } }
        .db-kpi-card {
          background: #fff;
          border: 1px solid #E9EFF5;
          border-radius: 14px;
          padding: 22px 24px;
          display: flex; align-items: center; justify-content: space-between;
          transition: box-shadow .2s;
        }
        .db-kpi-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .db-kpi-label { font-size: 12px; font-weight: 600; color: #6B7B8D; margin-bottom: 8px; text-transform: capitalize; letter-spacing: .1px; }
        .db-kpi-value { font-size: 36px; font-weight: 800; color: #0F172A; line-height: 1; letter-spacing: -1px; }
        .db-kpi-value span { font-size: 18px; font-weight: 500; color: #94A3B8; }
        .db-kpi-sub   { font-size: 11px; color: #94A3B8; margin-top: 5px; font-weight: 500; }
        .db-kpi-sub.green { color: ${ACCENT}; }
        .db-kpi-icon  {
          width: 42px; height: 42px; border-radius: 10px;
          background: ${ACCENT_LIGHT}; color: ${ACCENT};
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        /* ─ MAIN GRID ─ */
        .db-main-grid {
          display: grid;
          grid-template-columns: 390px 1fr;
          gap: 20px;
          align-items: start;
        }
        @media(max-width:1100px) { .db-main-grid { grid-template-columns: 1fr; } }

        /* ─ PROCHAIN PATIENT ─ */
        .db-section-title {
          font-size: 13px; font-weight: 700; color: #0F172A;
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 12px;
        }
        .db-section-title svg { color: ${ACCENT}; }

        .db-patient-card {
          background: #fff;
          border: 1px solid #E9EFF5;
          border-radius: 16px;
          padding: 24px;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .db-approche-badge {
          position: absolute;
          top: 20px; right: 20px;
          background: #D1FAE5; color: #047857;
          font-size: 9px; font-weight: 800; letter-spacing: .8px;
          padding: 4px 10px; border-radius: 5px; text-transform: uppercase;
        }

        /* Patient identity row */
        .db-patient-identity { display: flex; align-items: center; gap: 16px; }
        .db-patient-avatar {
          width: 56px; height: 56px; border-radius: 50%;
          background: ${ACCENT_LIGHT};
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; position: relative;
        }
        .db-patient-avatar-check {
          position: absolute; bottom: 0; right: -2px;
          width: 18px; height: 18px; border-radius: 50%;
          background: #10B981; border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center;
        }
        .db-patient-name { font-size: 20px; font-weight: 800; color: #0F172A; line-height: 1.15; }
        .db-patient-meta { font-size: 12px; color: #94A3B8; margin-top: 3px; font-weight: 500; }
        .db-patient-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .db-tag { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 5px; text-transform: uppercase; letter-spacing: .3px; }
        .db-tag-gray { background: #F1F5F9; color: #64748B; }
        .db-tag-red  { background: #FEE2E2; color: '#B91C1C'; color: #B91C1C; }

        /* Info boxes */
        .db-info-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .db-info-box {
          background: #F8FAFB; border-radius: 10px; padding: 12px;
          border: 1px solid #EEF2F7;
        }
        .db-info-box-label {
          font-size: 9px; font-weight: 800; color: #94A3B8;
          text-transform: uppercase; letter-spacing: 1px;
          margin-bottom: 6px; display: flex; align-items: center; gap: 5px;
        }
        .db-info-box-value { font-size: 12px; font-weight: 600; color: #334155; }
        .db-info-box-sub   { font-size: 11px; color: #94A3B8; margin-top: 2px; }

        /* CTA button */
        .db-btn-demarrer {
          width: 100%; padding: 16px;
          background: ${ACCENT}; color: #fff;
          font-size: 13px; font-weight: 800; letter-spacing: .5px;
          border: none; border-radius: 10px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity .15s; text-transform: uppercase;
          box-shadow: 0 4px 14px rgba(0,79,69,0.3);
        }
        .db-btn-demarrer:hover { opacity: .88; }

        /* Secondary actions */
        .db-patient-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .db-btn-sec {
          padding: 10px; border-radius: 8px;
          background: #F8FAFB; border: 1px solid #E9EFF5;
          font-size: 12px; font-weight: 600; color: #475569; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          transition: border-color .15s, color .15s;
        }
        .db-btn-sec:hover { border-color: ${ACCENT}; color: ${ACCENT}; }

        /* Empty patient */
        .db-patient-empty {
          background: #fff; border: 2px dashed #E2E8F0;
          border-radius: 16px; padding: 48px 32px; text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .db-empty-icon {
          width: 52px; height: 52px; border-radius: 16px;
          background: #F1F5F9; display: flex; align-items: center; justify-content: center;
        }
        .db-patient-empty h4 { font-size: 15px; font-weight: 700; color: #475569; margin: 0; }
        .db-patient-empty p  { font-size: 13px; color: #94A3B8; margin: 0; }

        /* ─ SALLE D'ATTENTE ─ */
        .db-salle-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px;
        }
        .db-tabs { display: flex; gap: 6px; }
        .db-tab {
          font-size: 11px; font-weight: 700; padding: 5px 14px;
          border-radius: 20px; border: none; cursor: pointer; letter-spacing: .3px;
          transition: background .15s, color .15s;
        }
        .db-tab-active  { background: ${ACCENT}; color: #fff; }
        .db-tab-inactive { background: #F1F5F9; color: #64748B; }

        .db-salle-card {
          background: #fff; border: 1px solid #E9EFF5; border-radius: 16px; overflow: hidden;
        }
        .db-salle-table { width: 100%; border-collapse: collapse; }
        .db-salle-table thead th {
          font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
          color: #94A3B8; padding: 14px 18px 10px; text-align: left;
          border-bottom: 1px solid #F1F5F9;
        }
        .db-salle-table tbody tr {
          border-bottom: 1px solid #F8FAFB; transition: background .12s;
        }
        .db-salle-table tbody tr:last-child { border-bottom: none; }
        .db-salle-table tbody tr:hover { background: #FAFBFC; }
        .db-salle-table td { padding: 14px 18px; vertical-align: middle; }

        .db-row-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800; flex-shrink: 0;
        }
        .db-row-name  { font-size: 13px; font-weight: 700; color: #0F172A; }
        .db-row-motif { font-size: 10px; color: #94A3B8; font-weight: 600; text-transform: uppercase; margin-top: 2px; letter-spacing: .3px; }

        .db-action-btn {
          width: 30px; height: 30px; border-radius: 7px;
          background: #F8FAFB; border: 1px solid #E9EFF5;
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer; color: #64748B; transition: all .15s;
        }
        .db-action-btn:hover { background: ${ACCENT_LIGHT}; color: ${ACCENT}; border-color: ${ACCENT}; }
        .db-action-btn.danger:hover { background: #FEE2E2; color: #B91C1C; border-color: #FECACA; }

        .db-salle-footer {
          padding: 12px 18px; border-top: 1px solid #F1F5F9;
          background: #FAFBFC; text-align: center;
        }
        .db-salle-footer button {
          font-size: 11px; font-weight: 800; color: ${ACCENT};
          background: none; border: none; cursor: pointer; letter-spacing: .5px;
          text-transform: uppercase;
        }
        .db-salle-footer button:hover { text-decoration: underline; }

        .db-salle-empty {
          padding: 40px 24px; text-align: center; color: #94A3B8;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .db-salle-empty h4 { font-size: 14px; font-weight: 600; color: #64748B; margin: 0; }
        .db-salle-empty p  { font-size: 12px; margin: 0; }
      `}</style>

      <div className="db-root">

        {/* ═══ HEADER ═══ */}
        <div className="db-header">
          <div>
            <div className="db-greeting">Bonjour, {doctorName}</div>
            <div className="db-subline">Voici le point sur votre activité aujourd'hui, {dateStr}.</div>
          </div>
          <button className="db-btn-rdv" onClick={() => openGlobalModal('appointment')}>
            <CalendarPlus size={16} />
            Nouveau RDV
          </button>
        </div>

        {/* ═══ KPI ROW ═══ */}
        <div className="db-kpi-row">
          {/* Salle d'attente */}
          <div className="db-kpi-card">
            <div>
              <div className="db-kpi-label">Salle d'attente</div>
              <div className="db-kpi-value">{salleCount}</div>
              <div className="db-kpi-sub">patients actuellement en attente</div>
            </div>
            <div className="db-kpi-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2"/><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z"/><line x1="6" x2="6" y1="19" y2="22"/><line x1="18" x2="18" y1="19" y2="22"/>
              </svg>
            </div>
          </div>

          {/* RDV Du Jour */}
          <div className="db-kpi-card">
            <div>
              <div className="db-kpi-label">RDV Du Jour</div>
              <div className="db-kpi-value">
                {confirmedCount} <span>/ {totalRdv}</span>
              </div>
              <div className="db-kpi-sub">
                {totalRdv > 0 ? Math.round((confirmedCount / totalRdv) * 100) : 0}% de confirmations reçues
              </div>
            </div>
            <div className="db-kpi-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/>
              </svg>
            </div>
          </div>

          {/* Revenu Du Jour */}
          <div className="db-kpi-card">
            <div>
              <div className="db-kpi-label">Revenu Du Jour</div>
              <div className="db-kpi-value">
                {revenuJour.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span>MAD</span>
              </div>
              <div className="db-kpi-sub green">
                ↗ À jour pour aujourd'hui
              </div>
            </div>
            <div className="db-kpi-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ═══ MAIN GRID ═══ */}
        <div className="db-main-grid">

          {/* ─── LEFT: Prochain Patient ─── */}
          <div>
            <div className="db-section-title">
              <Stethoscope size={15} />
              Prochain Patient
            </div>

            {prochainRdv ? (
              <div className="db-patient-card">

                {/* Identity */}
                <div className="db-patient-identity">
                  <div className="db-patient-avatar">
                    <User size={26} color={ACCENT} />
                    <div className="db-patient-avatar-check">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <div className="db-patient-name">
                      {civility(prochainPatient?.sexe)} {prochainPatient?.prenom} {prochainPatient?.nom}
                    </div>
                    <div className="db-patient-meta">
                      {age(prochainPatient?.date_naissance) && `${age(prochainPatient.date_naissance)} ans · `}
                      {prochainPatient?.telephone || `RDV à ${formatTime(prochainRdv.date_rdv)}`}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {(prochainPatient?.groupe_sanguin || prochainPatient?.antecedents) && (
                  <div className="db-patient-tags">
                    {prochainPatient.groupe_sanguin && (
                      <span className="db-tag db-tag-gray">GROUPE {prochainPatient.groupe_sanguin}</span>
                    )}
                    {prochainPatient.antecedents && (
                      <span className="db-tag db-tag-red">{prochainPatient.antecedents.slice(0, 30).toUpperCase()}</span>
                    )}
                  </div>
                )}

                {/* Info boxes */}
                <div className="db-info-boxes">
                  <div className="db-info-box">
                    <div className="db-info-box-label">
                      <Activity size={10} />
                      Constantes
                    </div>
                    <div className="db-info-box-value">
                      {prochainPatient?.tension || '—'}
                    </div>
                    <div className="db-info-box-sub">
                      {prochainPatient?.poids ? `Poids: ${prochainPatient.poids} kg` : 'Non renseignées'}
                    </div>
                  </div>
                  <div className="db-info-box">
                    <div className="db-info-box-label">
                      <Calendar size={10} />
                      Heure du RDV
                    </div>
                    <div className="db-info-box-value">{formatTime(prochainRdv.date_rdv)}</div>
                    <div className="db-info-box-sub">
                      {prochainRdv.notes || prochainRdv.motif || 'Consultation générale'}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <button className="db-btn-demarrer" onClick={demarrerConsultation}>
                  <PlayCircle size={17} />
                  Démarrer la Consultation
                </button>

                {/* Secondary actions */}
                <div className="db-patient-actions">
                  <button className="db-btn-sec" onClick={() => openGlobalModal('patient')}>
                    <StickyNote size={13} />
                    Ajouter Note
                  </button>
                  <button className="db-btn-sec" onClick={() => prochainPatient?.id && navigate(`/patients/${prochainPatient.id}`)}>
                    <FileText size={13} />
                    Voir Dossier
                  </button>
                </div>
              </div>
            ) : (
              <div className="db-patient-empty">
                <div className="db-empty-icon">
                  <CalendarPlus size={22} color="#94A3B8" />
                </div>
                <h4>Aucun Patient Prévu</h4>
                <p>La liste des rendez-vous confirmés est vide aujourd'hui.</p>
                <button
                  className="db-btn-demarrer"
                  style={{ marginTop: 8, padding: '11px 24px', width: 'auto', borderRadius: 8 }}
                  onClick={() => openGlobalModal('appointment')}
                >
                  <CalendarPlus size={15} />
                  Planifier un RDV
                </button>
              </div>
            )}
          </div>

          {/* ─── RIGHT: Salle d'attente ─── */}
          <div>
            <div className="db-salle-header">
              <div className="db-section-title" style={{ marginBottom: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Détails Salle d'attente
              </div>
              <div className="db-tabs">
                <button
                  className={`db-tab ${salleTab === 'actifs' ? 'db-tab-active' : 'db-tab-inactive'}`}
                  onClick={() => setSalleTab('actifs')}
                >
                  ACTIFS ({activeList.length})
                </button>
                <button
                  className={`db-tab ${salleTab === 'tous' ? 'db-tab-active' : 'db-tab-inactive'}`}
                  onClick={() => setSalleTab('tous')}
                >
                  TOUS
                </button>
              </div>
            </div>

            <div className="db-salle-card">
              {salleList.length > 0 ? (
                <>
                  <table className="db-salle-table">
                    <thead>
                      <tr>
                        <th>Patient &amp; Motif</th>
                        <th>Attente</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions Rapides</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salleList.map(rdv => {
                        const av = getAvatarColor(rdv.patient_id || rdv.id)
                        const initials = getInitials(rdv.patients?.prenom, rdv.patients?.nom)
                        return (
                          <tr key={rdv.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className="db-row-avatar" style={{ background: av.bg, color: av.text }}>
                                  {initials}
                                </div>
                                <div>
                                  <div className="db-row-name">
                                    {civility(rdv.patients?.sexe)} {rdv.patients?.prenom} {rdv.patients?.nom}
                                  </div>
                                  <div className="db-row-motif">
                                    {rdv.notes || rdv.motif || 'Consultation'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td><WaitCell rdv={rdv} /></td>
                            <td><StatusBadge status={rdv.status} /></td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button className="db-action-btn" title="Notifier" onClick={() =>
                                  notify({ title: 'Notification', description: `${rdv.patients?.prenom} a été notifié.` })
                                }>
                                  <Bell size={13} />
                                </button>
                                {rdv.status !== RDV_STATUSES.IN_CONSULTATION && (
                                  <button className="db-action-btn" title="Démarrer" onClick={() =>
                                    navigate(`/salle-attente`)
                                  }>
                                    <PlayCircle size={13} />
                                  </button>
                                )}
                                <button className="db-action-btn danger" title="Plus">
                                  <MoreHorizontal size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className="db-salle-footer">
                    <button onClick={() => navigate('/salle-attente')}>
                      Gérer la Salle d'attente Complète &rsaquo;
                    </button>
                  </div>
                </>
              ) : (
                <div className="db-salle-empty">
                  <div className="db-empty-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <h4>Salle vide</h4>
                  <p>Aucun patient en attente ou en consultation pour l'instant.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {practiceInsight ? (
          <PracticeInsightsCard insight={practiceInsight} metrics={practiceMetrics} />
        ) : null}

      </div>
    </PinLock>
  )
}
