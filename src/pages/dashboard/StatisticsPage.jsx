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
      <style>{`
        .ds-page {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          min-height: 100%;
        }

        /* ── Header ── */
        .ds-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        .ds-greeting {
          font-size: 26px;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.3px;
          line-height: 1.2;
        }
        .ds-date {
          font-size: 13px;
          color: #94A3B8;
          margin-top: 4px;
          font-weight: 500;
        }
        .ds-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #2563EB;
          color: #fff;
          font-weight: 600;
          font-size: 14px;
          padding: 10px 22px;
          border-radius: 24px;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
          box-shadow: 0 2px 8px rgba(37,99,235,0.25);
        }
        .ds-btn-primary:hover {
          background: #1D4ED8;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(37,99,235,0.35);
        }
        .ds-btn-primary:active { transform: translateY(0); }

        /* ── Stats Row ── */
        .ds-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        @media (max-width: 768px) {
          .ds-stats-row { grid-template-columns: 1fr; }
        }
        .ds-stat-card {
          background: #FFFFFF;
          border: 1px solid #F1F5F9;
          border-radius: 16px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .ds-stat-card:hover {
          border-color: #E2E8F0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }
        .ds-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ds-stat-label {
          font-size: 12px;
          font-weight: 500;
          color: #94A3B8;
          text-transform: capitalize;
          margin-bottom: 4px;
        }
        .ds-stat-value {
          font-size: 28px;
          font-weight: 800;
          color: #0F172A;
          line-height: 1;
          letter-spacing: -0.5px;
        }
        .ds-stat-value span {
          font-size: 16px;
          font-weight: 500;
          color: #94A3B8;
        }
        .ds-stat-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 20px;
          margin-left: auto;
          white-space: nowrap;
        }
        .ds-stat-dots {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
          font-size: 11px;
          color: #94A3B8;
          font-weight: 500;
        }
        .ds-stat-dots .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 4px;
        }

        /* ── Main Grid ── */
        .ds-main-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .ds-main-grid { grid-template-columns: 1fr; }
        }

        /* ── Prochain Patient ── */
        .ds-prochain-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .ds-prochain-header h3 {
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .ds-action-badge {
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          background: #2563EB;
          padding: 4px 14px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .ds-prochain-card {
          background: #FFFFFF;
          border: 1px solid #F1F5F9;
          border-radius: 20px;
          padding: 32px;
          position: relative;
          overflow: hidden;
        }
        .ds-prochain-name {
          font-size: 32px;
          font-weight: 800;
          color: #0F172A;
          margin-bottom: 16px;
          letter-spacing: -0.5px;
          line-height: 1.1;
        }
        .ds-prochain-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }
        .ds-tag {
          font-size: 12px;
          font-weight: 600;
          padding: 5px 14px;
          border-radius: 20px;
          background: #F1F5F9;
          color: #475569;
        }
        .ds-tag-accent {
          background: #DBEAFE;
          color: #2563EB;
          font-weight: 700;
        }
        .ds-prochain-visit {
          font-size: 13px;
          color: #94A3B8;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ds-prochain-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 8px;
        }
        .ds-btn-outline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #FFFFFF;
          color: #64748B;
          font-weight: 600;
          font-size: 14px;
          padding: 14px 20px;
          border-radius: 14px;
          border: 1.5px solid #E2E8F0;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ds-btn-outline:hover {
          border-color: #CBD5E1;
          color: #334155;
          background: #F8FAFC;
        }
        .ds-btn-blue {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #2563EB;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 14px 20px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 8px rgba(37,99,235,0.2);
        }
        .ds-btn-blue:hover {
          background: #1D4ED8;
          box-shadow: 0 4px 16px rgba(37,99,235,0.3);
        }

        /* Time badge */
        .ds-time-badge {
          position: absolute;
          top: 24px;
          right: 24px;
          background: #2563EB;
          color: #fff;
          border-radius: 16px;
          padding: 16px 20px;
          text-align: center;
          box-shadow: 0 4px 16px rgba(37,99,235,0.25);
        }
        .ds-time-badge-label {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          opacity: 0.8;
          margin-bottom: 6px;
        }
        .ds-time-badge-value {
          font-size: 26px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.5px;
        }
        .ds-time-badge-ampm {
          font-size: 13px;
          font-weight: 700;
          margin-top: 2px;
          opacity: 0.9;
        }

        /* ── Salle d'attente Table ── */
        .ds-salle-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .ds-salle-header h3 {
          font-size: 16px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
        }
        .ds-salle-link {
          font-size: 13px;
          font-weight: 600;
          color: #2563EB;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          padding: 0;
          transition: color 0.15s;
        }
        .ds-salle-link:hover { color: #1D4ED8; }
        .ds-salle-card {
          background: #FFFFFF;
          border: 1px solid #F1F5F9;
          border-radius: 20px;
          overflow: hidden;
        }
        .ds-salle-table {
          width: 100%;
          border-collapse: collapse;
        }
        .ds-salle-table thead th {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #94A3B8;
          padding: 16px 20px 12px;
          text-align: left;
          border-bottom: 1px solid #F1F5F9;
        }
        .ds-salle-table thead th:last-child { text-align: right; }
        .ds-salle-table tbody tr {
          border-bottom: 1px solid #F8FAFC;
          transition: background 0.12s ease;
        }
        .ds-salle-table tbody tr:hover { background: #F8FAFC; }
        .ds-salle-table tbody tr:last-child { border-bottom: none; }
        .ds-salle-table td {
          padding: 14px 20px;
          vertical-align: middle;
        }
        .ds-salle-table td:last-child { text-align: right; }

        .ds-patient-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ds-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .ds-patient-name {
          font-size: 14px;
          font-weight: 600;
          color: #0F172A;
          line-height: 1.3;
        }
        .ds-patient-sub {
          font-size: 11px;
          color: #94A3B8;
          font-weight: 500;
          margin-top: 1px;
        }
        .ds-status-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }
        .ds-wait-label {
          font-size: 13px;
          font-weight: 600;
          color: #64748B;
        }

        /* Footer bar */
        .ds-salle-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-top: 1px solid #F1F5F9;
          background: #FAFBFC;
        }
        .ds-salle-footer-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #94A3B8;
        }
        .ds-salle-footer-badge {
          font-size: 12px;
          font-weight: 700;
          color: #2563EB;
        }

        /* ── Empty State ── */
        .ds-empty {
          padding: 48px 32px;
          text-align: center;
          color: #94A3B8;
        }
        .ds-empty-icon {
          width: 48px;
          height: 48px;
          background: #F1F5F9;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        .ds-empty h4 {
          font-size: 15px;
          font-weight: 600;
          color: #64748B;
          margin: 0 0 6px;
        }
        .ds-empty p {
          font-size: 13px;
          margin: 0;
        }

        /* ── Prochain Patient Empty ── */
        .ds-prochain-empty {
          background: #FFFFFF;
          border: 2px dashed #E2E8F0;
          border-radius: 20px;
          padding: 48px 32px;
          text-align: center;
        }
        .ds-prochain-empty h4 {
          font-size: 16px;
          font-weight: 600;
          color: #64748B;
          margin: 12px 0 6px;
        }
        .ds-prochain-empty p {
          font-size: 13px;
          color: #94A3B8;
          margin: 0;
        }
      `}</style>

      <div className="ds-page">

        {/* ═══ HEADER ═══ */}
        <div className="ds-header">
          <div>
            <div className="ds-greeting">{getGreeting()}, Dr. {doctorName.split(' ').pop()}</div>
            <div className="ds-date">{dateStr}</div>
          </div>
          <button
            className="ds-btn-primary"
            onClick={() => openGlobalModal('appointment')}
          >
            <Plus size={18} strokeWidth={2.5} />
            Nouveau RDV
          </button>
        </div>

        {/* ═══ STATS ROW ═══ */}
        <div className="ds-stats-row">

          {/* Stat 1: Salle d'attente */}
          <div className="ds-stat-card">
            <div className="ds-stat-icon" style={{ background: '#EEF2FF' }}>
              <Users size={22} color="#4F46E5" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="ds-stat-label">Salle d'attente</div>
              <div className="ds-stat-value">{salleCount} <span>patients</span></div>
            </div>
            {salleCount > 0 && (
              <span className="ds-stat-badge" style={{ background: '#DBEAFE', color: '#2563EB' }}>
                +{salleCount} actifs
              </span>
            )}
          </div>

          {/* Stat 2: RDV du Jour */}
          <div className="ds-stat-card">
            <div className="ds-stat-icon" style={{ background: '#F0FDF4' }}>
              <CalendarDays size={22} color="#16A34A" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="ds-stat-label">RDV du Jour</div>
              <div className="ds-stat-value">{confirmedCount} <span>/ {totalRdv} confirmés</span></div>
            </div>
          </div>

          {/* Stat 3: Revenu du Jour */}
          <div className="ds-stat-card">
            <div className="ds-stat-icon" style={{ background: '#FEF3C7' }}>
              <Receipt size={22} color="#D97706" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="ds-stat-label">Revenu du Jour</div>
              <div className="ds-stat-value">{revenuJour.toLocaleString('fr-FR')} <span>MAD</span></div>

            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}>
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* ═══ TWO-COLUMN GRID ═══ */}
        <div className="ds-main-grid">

          {/* ── LEFT: Prochain Patient ── */}
          <div>
            <div className="ds-prochain-header">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} />
              <h3>Prochain Patient</h3>
              {prochainRdv && <span className="ds-action-badge">Action Requise</span>}
            </div>

            {prochainRdv ? (
              <div className="ds-prochain-card">
                {/* Blue time badge */}
                <div className="ds-time-badge">
                  <div className="ds-time-badge-label">Heure Prévue</div>
                  <div className="ds-time-badge-value">
                    {formatTimeAmPm(prochainRdv.date_rdv).split(' ')[0]}
                  </div>
                  <div className="ds-time-badge-ampm">
                    {formatTimeAmPm(prochainRdv.date_rdv).split(' ')[1]}
                  </div>
                </div>

                {/* Patient name */}
                <div className="ds-prochain-name">
                  {prochainPatient?.prenom} {prochainPatient?.nom}
                </div>

                {/* Tags */}
                <div className="ds-prochain-tags">
                  {prochainPatient?.age && (
                    <span className="ds-tag">{prochainPatient.age} ans</span>
                  )}
                  {prochainPatient?.sexe && (
                    <span className="ds-tag">{prochainPatient.sexe === 'M' ? 'Homme' : 'Femme'}</span>
                  )}
                  {prochainRdv.motif && (
                    <span className="ds-tag ds-tag-accent">{prochainRdv.motif.toUpperCase()}</span>
                  )}
                </div>

                {/* Last visit */}
                <div className="ds-prochain-visit">
                  <Clock size={14} />
                  Heure prévue : {formatTime(prochainRdv.date_rdv)}
                </div>

                {/* Action buttons */}
                <div className="ds-prochain-actions">
                  <button className="ds-btn-outline" onClick={annulerRdv}>
                    <XCircle size={16} />
                    Annuler RDV
                  </button>
                  <button className="ds-btn-blue" onClick={ajouterSalle}>
                    <ArrowRightToLine size={16} />
                    Ajouter à la salle
                  </button>
                </div>
              </div>
            ) : (
              <div className="ds-prochain-empty">
                <CalendarDays size={32} color="#CBD5E1" />
                <h4>Aucun patient planifié</h4>
                <p>Tous les RDV d'aujourd'hui ont été traités</p>
              </div>
            )}
          </div>

          {/* ── RIGHT: Salle d'attente Table ── */}
          <div>
            <div className="ds-salle-header">
              <h3>Salle d'attente</h3>
              <button className="ds-salle-link" onClick={() => navigate('/salle-attente')}>
                Registre complet <ChevronRight size={14} />
              </button>
            </div>

            <div className="ds-salle-card">
              {salleList.length > 0 ? (
                <>
                  <table className="ds-salle-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Statut</th>
                        <th>Attente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salleList.map(rdv => {
                        const p = rdv.patients
                        const initials = getInitials(p?.prenom, p?.nom)
                        const avatarColor = getAvatarColor(rdv.id)
                        const motif = rdv.motif || rdv.notes || ''

                        return (
                          <tr key={rdv.id}>
                            <td>
                              <div className="ds-patient-cell">
                                <div
                                  className="ds-avatar"
                                  style={{ background: avatarColor.bg, color: avatarColor.text }}
                                >
                                  {initials}
                                </div>
                                <div>
                                  <div className="ds-patient-name">
                                    {p?.prenom} {p?.nom}
                                  </div>
                                  {motif && (
                                    <div className="ds-patient-sub">{motif}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <StatusBadge status={rdv.status} />
                            </td>
                            <td>
                              <WaitTimeCell since={rdv.updated_at || rdv.date_rdv} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {/* Footer */}
                  <div className="ds-salle-footer">
                    <span className="ds-salle-footer-label">Flux Patients</span>
                    <span className="ds-salle-footer-badge">
                      {salleList.length > 0 ? `+${Math.round((salleList.length / Math.max(totalRdv, 1)) * 100)}%` : '—'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="ds-empty">
                  <div className="ds-empty-icon">
                    <Users size={22} color="#94A3B8" />
                  </div>
                  <h4>Salle d'attente vide</h4>
                  <p>Les patients arrivés apparaîtront ici</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </PinLock>
  )
}
