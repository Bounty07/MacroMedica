import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Clock4, Loader2, Trash2, CheckCircle2, XCircle, Pencil } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AppButton, ContentCard, StatusBadge } from '../../components/dashboard/DashboardPrimitives'
import AppointmentFormModal from '../../components/forms/AppointmentFormModal'
import Modal from '../../components/common/Modal'
import { getRdv, updateRdv, deleteRdv } from '../../lib/api'
import { useAppContext } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import { isValidTransition, RDV_STATUSES } from '../../lib/workflow'

/* ═══════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════ */

const TZ = 'Africa/Casablanca'

const STATUS_LABELS = { 
  [RDV_STATUSES.SCHEDULED]: 'Planifié', 
  [RDV_STATUSES.ARRIVED]: 'En salle d\'attente', 
  [RDV_STATUSES.IN_CONSULTATION]: 'En consultation', 
  [RDV_STATUSES.COMPLETED]: 'Terminé', 
  [RDV_STATUSES.ABSENT]: 'Absent',
  // legacy mapping
  confirme: 'Confirmé',
  annule: 'Annulé',
  termine: 'Terminé'
}

const STATUS_TONES  = { 
  [RDV_STATUSES.SCHEDULED]: 'neutral', 
  [RDV_STATUSES.ARRIVED]: 'info', 
  [RDV_STATUSES.IN_CONSULTATION]: 'success', 
  [RDV_STATUSES.COMPLETED]: 'neutral', 
  [RDV_STATUSES.ABSENT]: 'danger',
  // legacy mapping
  confirme: 'warning', 
  annule: 'danger', 
  termine: 'success' 
}

const WEEK_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const TIME_SLOTS = []
for (let h = 8; h <= 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 20) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

/** Get date key in YYYY-MM-DD using Morocco TZ */
function getRdvDateKey(dateRdv) {
  return new Date(dateRdv).toLocaleDateString('fr-CA', { timeZone: TZ })
}

/** Get HH:MM string using Morocco TZ */
function getRdvTime(dateRdv) {
  return new Date(dateRdv).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: TZ,
  })
}

/** Format date for display using Morocco TZ */
function formatDateDisplay(dateRdv, opts = {}) {
  return new Date(dateRdv).toLocaleDateString('fr-FR', { timeZone: TZ, ...opts })
}

/** Build a YYYY-MM-DD key from year/month(0-based)/day */
function makeDayKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Calendar grid cells for a given month */
function getMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  let startWd = first.getDay()          // 0=Sun
  startWd = startWd === 0 ? 6 : startWd - 1 // Mon=0

  const cells = []
  const prevLast = new Date(year, month, 0).getDate()
  for (let i = startWd - 1; i >= 0; i--)
    cells.push({ day: prevLast - i, month: month - 1, year, outside: true })

  for (let d = 1; d <= last.getDate(); d++)
    cells.push({ day: d, month, year, outside: false })

  const rem = 7 - (cells.length % 7)
  if (rem < 7) for (let d = 1; d <= rem; d++)
    cells.push({ day: d, month: month + 1, year, outside: true })

  return cells
}

/** 7-day array starting from Monday of the week containing `date` */
function getWeekDays(date) {
  const d = new Date(date)
  const wd = d.getDay()
  const diff = wd === 0 ? -6 : 1 - wd
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)

  return Array.from({ length: 7 }, (_, i) => {
    const c = new Date(mon)
    c.setDate(mon.getDate() + i)
    return { day: c.getDate(), month: c.getMonth(), year: c.getFullYear(), dateObj: c }
  })
}

/** Period label for header */
function periodLabel(view, year, month, focus) {
  const M = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  if (view === 'month') return `${M[month]} ${year}`
  if (view === 'week') {
    const w = getWeekDays(focus)
    return w[0].month === w[6].month
      ? `${w[0].day} – ${w[6].day} ${M[w[0].month]} ${w[0].year}`
      : `${w[0].day} ${M[w[0].month]} – ${w[6].day} ${M[w[6].month]} ${w[6].year}`
  }
  const DN = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
  const dd = new Date(focus)
  return `${DN[dd.getDay()]} ${dd.getDate()} ${M[dd.getMonth()]} ${dd.getFullYear()}`
}

/* ═══════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════ */
function AppointmentsPage() {
  const { profile, notify } = useAppContext()

  const now   = new Date()
  const [view, setView]           = useState('month')
  const [curMonth, setCurMonth]   = useState(now.getMonth())
  const [curYear, setCurYear]     = useState(now.getFullYear())
  const [focusDate, setFocusDate] = useState(now)

  const [showCreate, setShowCreate]   = useState(false)
  const [editingRdv, setEditingRdv]   = useState(null)
  const [selectedRdv, setSelectedRdv] = useState(null)

  /* ── Data ── */
  const { data: rdvs = [], isLoading, refetch } = useQuery({
    queryKey: ['rdv', profile?.cabinet_id],
    queryFn: getRdv,
    enabled: !!profile?.cabinet_id,
  })

  /* ── Realtime ── */
  useEffect(() => {
    if (!profile?.cabinet_id) return
    const ch = supabase
      .channel('rdv_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rdv' }, () => refetch())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [profile?.cabinet_id, refetch])

  /* ── Group by date (Morocco TZ) ── */
  const rdvByDate = useMemo(() => {
    const map = {}
    rdvs.forEach(r => {
      const k = getRdvDateKey(r.date_rdv)
      ;(map[k] ||= []).push(r)
    })
    Object.values(map).forEach(a => a.sort((x, y) => new Date(x.date_rdv) - new Date(y.date_rdv)))
    return map
  }, [rdvs])

  const todayKey = makeDayKey(now.getFullYear(), now.getMonth(), now.getDate())

  /* ── Current time indicator ── */
  const nowTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })

  /* ── Navigation ── */
  const goToday = () => { const t = new Date(); setCurMonth(t.getMonth()); setCurYear(t.getFullYear()); setFocusDate(t) }
  const goPrev = () => {
    if (view === 'month') { if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1) } else setCurMonth(m => m - 1) }
    else { const d = new Date(focusDate); d.setDate(d.getDate() - (view === 'week' ? 7 : 1)); setFocusDate(d); setCurMonth(d.getMonth()); setCurYear(d.getFullYear()) }
  }
  const goNext = () => {
    if (view === 'month') { if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1) } else setCurMonth(m => m + 1) }
    else { const d = new Date(focusDate); d.setDate(d.getDate() + (view === 'week' ? 7 : 1)); setFocusDate(d); setCurMonth(d.getMonth()); setCurYear(d.getFullYear()) }
  }
  const clickDay = (y, m, d) => { setFocusDate(new Date(y, m, d)); setCurMonth(m); setCurYear(y); setView('day') }

  /* ── Actions ── */
  const handleStatus = async (id, currentStatus, newStatus) => {
    if (!isValidTransition(currentStatus, newStatus)) {
      notify({ title: 'Action invalide', description: 'Cette transition de statut n\'est pas permise.', variant: 'error' })
      return
    }

    try { 
      await updateRdv(id, { status: newStatus }); 
      refetch(); 
      setSelectedRdv(null); 
      notify({ title: 'Succès', description: `Statut RDV mis à jour.` }) 
    }
    catch (e) { console.error(e) }
  }
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce rendez-vous ?')) return
    try { await deleteRdv(id); refetch(); setSelectedRdv(null); notify({ title: 'Succès', description: 'RDV supprimé.' }) }
    catch (e) { console.error(e) }
  }
  const handleFormOk = () => refetch()

  /* ═══════════════════════════════════
     RENDER
     ═══════════════════════════════════ */
  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-teal-600" /></div>

  return (
    <div className="space-y-6">

      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <h2 className="text-[28px] font-bold text-slate-900">Agenda Mensuel</h2>
          <div className="inline-flex rounded-full border border-slate-200 bg-white overflow-hidden p-0.5">
            {[['day','Day'],['week','Week'],['month','Month']].map(([v,l]) => (
              <button key={v} type="button" onClick={() => setView(v)} className={`px-4 py-1.5 text-[13px] font-semibold rounded-full transition-all ${view === v ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 rounded-[14px] bg-teal-600 text-white font-bold text-[14px] shadow-[0_4px_12px_rgba(13,148,136,0.3)] shadow-teal-200 hover:scale-105 transition-all">
            + Nouveau RDV
          </button>
        </div>
      </div>

      {/* ══════════════════════════════
         MONTH VIEW
         ══════════════════════════════ */}
      {view === 'month' && (() => {
        const M = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
        const grid = getMonthGrid(curYear, curMonth)

        // Compute monthly stats
        const monthRdvs = rdvs.filter(r => {
          const d = new Date(r.date_rdv)
          return d.getMonth() === curMonth && d.getFullYear() === curYear
        })
        const confirmedCount = monthRdvs.filter(r => (r.status || r.statut) === 'confirme').length
        const terminatedCount = monthRdvs.filter(r => (r.status || r.statut) === 'termine').length
        const cancelledCount = monthRdvs.filter(r => (r.status || r.statut) === 'annule').length

        return (
          <>
            {/* Month Header */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold text-teal-600 uppercase tracking-[0.2em] mb-1">MacroMedica Intelligent View</p>
                <h1 className="text-[36px] font-bold text-slate-900 tracking-tight">{M[curMonth]} {curYear}</h1>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={goPrev} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-teal-200 hover:text-teal-600 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={goToday} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 hover:border-teal-200 hover:text-teal-600 transition-colors">Aujourd'hui</button>
                <button type="button" onClick={goNext} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-teal-200 hover:text-teal-600 transition-colors"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="rounded-2xl bg-white shadow-lg border border-slate-100 p-6 mt-4">
              {/* Week day headers */}
              <div className="grid grid-cols-7 mb-4 gap-4">
                {WEEK_HEADERS.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-3">
                {grid.map((cell, i) => {
                  const key = makeDayKey(cell.year, cell.month, cell.day)
                  const dayRdv = rdvByDate[key] || []
                  const isToday = key === todayKey
                  const rdvCount = dayRdv.length
                  const urgentRdvs = dayRdv.filter(r => r.notes?.toLowerCase().includes('urgent'))
                  const confirmedCount = dayRdv.filter(r => (r.status || r.statut) === 'confirme').length
                  const isChargeMax = rdvCount > 12
                  
                  // Determine if weekend (Sat=5, Sun=6 in our Mon-first grid)
                  const cellDayOfWeek = i % 7 // 0=Mon ... 5=Sat, 6=Sun
                  const isWeekend = cellDayOfWeek >= 5

                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => clickDay(cell.year, cell.month, cell.day)}
                      className={`relative flex flex-col min-h-[140px] rounded-2xl p-3 text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group ${
                        cell.outside
                          ? 'opacity-30 bg-slate-100'
                          : isToday
                            ? 'bg-white shadow-lg ring-2 ring-teal-400 border border-teal-200'
                            : 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 hover:border-teal-200'
                      }`}
                    >
                      {/* TODAY floating badge */}
                      {isToday && (
                        <span className="absolute -top-3 left-3 bg-teal-600 text-white text-[9px] font-extrabold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full shadow-md z-10">
                          Aujourd'hui
                        </span>
                      )}

                      {/* Row 1: Day number + badges */}
                      <div className="flex items-start justify-between mb-1.5">
                        <span className={`text-[18px] font-bold ${cell.outside ? 'text-slate-300' : 'text-slate-900'}`}>
                          {cell.day}
                        </span>
                        <div className="flex items-center gap-1">
                          {/* Charge Max badge */}
                          {isChargeMax && !cell.outside && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                              Charge Max
                            </span>
                          )}
                          {/* Urgency badge */}
                          {urgentRdvs.length > 0 && !cell.outside && !isChargeMax && (
                            <span className="flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">
                              ⚠ {urgentRdvs.length} Urgence{urgentRdvs.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {/* RDV count */}
                          {rdvCount > 0 && !cell.outside && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isChargeMax ? 'bg-amber-100 text-amber-700' : 'text-teal-600'
                            }`}>
                              {rdvCount} RDV
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Weekend label */}
                      {isWeekend && !cell.outside && rdvCount === 0 && (
                        <div className="flex-1 flex items-center justify-center">
                          <span className="text-[11px] italic text-slate-400 font-medium">
                            {cellDayOfWeek === 5 ? 'Samedi - Fermé' : 'Dimanche - Fermé'}
                          </span>
                        </div>
                      )}

                      {/* Appointment preview cards (max 2) */}
                      {!cell.outside && dayRdv.length > 0 && (
                        <div className="flex-1 space-y-1.5 mt-1">
                          {dayRdv.slice(0, 2).map(rdv => {
                            const time = getRdvTime(rdv.date_rdv)
                            const name = rdv.patients ? `${rdv.patients.prenom?.charAt(0)}. ${rdv.patients.nom}` : '?'
                            const typeLabel = rdv.notes?.split(' ')[0] || 'Consultation'
                            const isUrgent = rdv.notes?.toLowerCase().includes('urgent')
                            const isConfirmed = (rdv.status || rdv.statut) === 'confirme'

                            return (
                              <div
                                key={rdv.id}
                                onClick={e => { e.stopPropagation(); setSelectedRdv(rdv) }}
                                className={`rounded-xl px-2.5 py-1.5 cursor-pointer transition-colors ${
                                  isUrgent
                                    ? 'bg-rose-50 border border-rose-200'
                                    : 'bg-slate-50 border border-slate-100 hover:bg-teal-50'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-slate-500">{time}</span>
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isUrgent ? 'bg-rose-500' : 'bg-teal-500'}`} />
                                  <span className={`text-[11px] font-bold truncate ${isUrgent ? 'text-rose-700' : 'text-slate-800'}`}>
                                    {name}
                                  </span>
                                </div>
                                <p className={`text-[9px] font-medium mt-0.5 ml-[52px] ${isUrgent ? 'text-rose-500 uppercase font-bold' : 'text-slate-400'}`}>
                                  {isUrgent ? 'URGENT' : typeLabel}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Bottom section: Confirmed count + Capacity bar + Status dots */}
                      {rdvCount > 0 && !cell.outside && (
                        <div className="mt-auto pt-2 space-y-1.5">
                          {/* Confirmed count badge (shown when >3 rdvs and there are confirmed ones) */}
                          {rdvCount > 3 && confirmedCount > 0 && (
                            <div className="flex items-center justify-center">
                              <span className="text-[9px] font-bold text-teal-700 border border-teal-200 bg-teal-50 rounded-full px-2 py-0.5">
                                {confirmedCount} RDV confirmés
                              </span>
                            </div>
                          )}

                          {/* Capacity bar */}
                          <div className="h-[4px] w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isChargeMax ? 'bg-teal-500' : 'bg-teal-400'}`}
                              style={{ width: `${Math.min((rdvCount / 15) * 100, 100)}%` }}
                            />
                          </div>

                          {/* Status dots */}
                          <div className="flex items-center gap-1 justify-start">
                            {confirmedCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                            {dayRdv.some(r => (r.status || r.statut) === 'termine') && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            {dayRdv.some(r => (r.status || r.statut) === 'annule') && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Activity Summary ── */}
            <div className="grid gap-6 md:grid-cols-[1fr_auto] mt-6">
              {/* Stats Card */}
              <div className="rounded-2xl bg-white p-6 shadow-lg border border-slate-100">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">Aperçu de l'Activité</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-md">
                  Votre volume de patients ce mois.
                </p>
                <div className="flex items-end gap-12">
                  <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Confirmés</p>
                    <p className="text-5xl font-bold text-slate-900 leading-none">{String(confirmedCount).padStart(2, '0')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Terminés</p>
                    <p className="text-5xl font-bold text-slate-900 leading-none">{String(terminatedCount).padStart(2, '0')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Annulés</p>
                    <p className="text-5xl font-bold text-rose-600 leading-none">{String(cancelledCount).padStart(2, '0')}</p>
                  </div>
                </div>
              </div>

              {/* AI Suggestion Card */}
              <div className="rounded-2xl p-6 bg-gradient-to-br from-teal-700 to-teal-800 text-white shadow-lg min-w-[320px] max-w-[340px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-teal-100" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-teal-200">Intelligence Artificielle</span>
                  </div>
                  <h4 className="text-[20px] font-bold mb-2">Optimisation de l'Agenda</h4>
                  <p className="text-[14px] text-teal-100 leading-relaxed font-medium">
                    L'IA suggère de regrouper les consultations pour libérer des créneaux en fin d'après-midi.
                  </p>
                </div>
                <button className="mt-6 w-full py-3 rounded-xl bg-white text-teal-800 text-[13px] font-extrabold uppercase tracking-widest hover:bg-teal-50 hover:shadow-[0_4px_12px_rgba(255,255,255,0.2)] transition-all">
                  APPLIQUER
                </button>
              </div>
            </div>
          </>
        )
      })()}

      {/* ══════════════════════════════
         WEEK VIEW
         ══════════════════════════════ */}
      {view === 'week' && (() => {
        const week = getWeekDays(focusDate)
        return (
          <div className="rounded-2xl bg-white shadow-lg border border-slate-100 p-6">
            <div className="overflow-x-auto">
              <div className="grid min-w-[900px] grid-cols-[64px_repeat(7,1fr)] gap-px rounded-[20px] overflow-hidden border border-slate-100 bg-slate-100">
                {/* Header */}
                <div className="bg-slate-50" />
                {week.map((wd, i) => {
                  const key = makeDayKey(wd.year, wd.month, wd.day)
                  const isToday = key === todayKey
                  return (
                    <button type="button" key={i} onClick={() => clickDay(wd.year, wd.month, wd.day)}
                      className={`px-2 py-3 text-center transition-colors hover:bg-teal-50/50 ${isToday ? 'bg-teal-50' : 'bg-slate-50'}`}>
                      <p className="text-xs font-semibold uppercase text-slate-500">{WEEK_HEADERS[i]}</p>
                      <p className={`mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-teal-600 text-white' : 'text-slate-700'}`}>{wd.day}</p>
                    </button>
                  )
                })}
                {/* Time rows */}
                {TIME_SLOTS.filter((_, i) => i % 2 === 0).map((slot, si, fullHourSlots) => {
                  const nextSlot = fullHourSlots[si + 1] || '21:00'
                  const isNowSlot = nowTime >= slot && nowTime < nextSlot
                  return (
                    <div key={slot} className="contents">
                      <div className="flex items-start justify-end bg-white w-16 text-right text-slate-400 text-xs font-mono pr-3 pt-3">{slot}</div>
                      {week.map((wd, wi) => {
                        const key = makeDayKey(wd.year, wd.month, wd.day)
                        const slotRdvs = (rdvByDate[key] || []).filter(r => { const t = getRdvTime(r.date_rdv); return t >= slot && t < nextSlot })
                        const isTodayCol = key === todayKey
                        
                        let cellBgClass = 'bg-white'
                        if (isTodayCol) cellBgClass = 'bg-teal-50/30 border-x border-teal-100'
                        if (isNowSlot) cellBgClass += ' bg-teal-50/50'

                        return (
                          <div key={`${slot}-${wi}`} className={`relative min-h-[56px] px-1 py-1 ${cellBgClass}`}>
                            {isNowSlot && isTodayCol && (
                              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none flex items-center">
                                <div className="w-2 h-2 rounded-full bg-red-400 -ml-1 flex-shrink-0" />
                                <div className="flex-1 h-px bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
                              </div>
                            )}
                            {slotRdvs.map(rdv => {
                              const time = getRdvTime(rdv.date_rdv)
                              const name = rdv.patients ? `${rdv.patients.prenom} ${rdv.patients.nom?.charAt(0)}.` : '?'
                              
                              const currentStatus = rdv.status || rdv.statut
                              const bColor = currentStatus === 'termine' ? 'border-l-slate-400' : currentStatus === 'annule' ? 'border-l-rose-500' : 'border-l-teal-500'
                              const tColor = currentStatus === 'termine' ? 'text-slate-600' : currentStatus === 'annule' ? 'text-rose-700' : 'text-slate-800'

                              return (
                                <div key={rdv.id} onClick={() => setSelectedRdv(rdv)}
                                  className={`relative z-20 flex items-center gap-1 rounded-lg shadow-md border-l-4 ${bColor} bg-white px-1.5 py-1 mb-[3px] text-xs font-semibold ${tColor} truncate cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5`}>
                                  <span className="font-bold flex-shrink-0 opacity-70">{time}</span>
                                  <span className="truncate">{name}</span>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ══════════════════════════════
         DAY VIEW — Timeline Design
         ══════════════════════════════ */}
      {view === 'day' && (() => {
        const dayKey = makeDayKey(focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate())
        const dayRdv = rdvByDate[dayKey] || []
        const isToday = dayKey === todayKey

        // Build full-hour slots only (08:00 → 20:00)
        const fullHourSlots = TIME_SLOTS.filter(s => s.endsWith(':00'))

        // Current time position calculation
        const nowH = now.getHours()
        const nowM = now.getMinutes()

        // Large date display
        const DAYS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
        const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
        const dayName = DAYS_FR[focusDate.getDay()]
        const dayNum = focusDate.getDate()
        const monthName = MONTHS_FR[focusDate.getMonth()]

        return (
          <div className="rounded-[28px] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            {/* Day Header */}
            <div className="mb-8">
              {isToday && (
                <p className="text-[12px] font-bold text-teal-600 uppercase tracking-widest mb-1">Aujourd'hui</p>
              )}
              <h2 className="text-[32px] font-bold text-slate-900 tracking-tight">
                {dayName} {dayNum} {monthName}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {dayRdv.length === 0 ? 'Aucun rendez-vous' : `${dayRdv.length} rendez-vous`}
              </p>
            </div>

            {/* Timeline */}
            <div className="relative">
              {fullHourSlots.map((slot, si) => {
                const nextSlot = fullHourSlots[si + 1] || '21:00'
                const slotHour = parseInt(slot.split(':')[0])

                // Find RDVs that fall in this hour
                const slotRdvs = dayRdv.filter(r => {
                  const t = getRdvTime(r.date_rdv)
                  return t >= slot && t < nextSlot
                })

                // Current time indicator position
                const isNowSlot = isToday && nowH === slotHour
                const nowPct = isNowSlot ? (nowM / 60) * 100 : -1

                // Is this a lunch break?
                const isLunch = slot === '13:00'

                return (
                  <div key={slot} className="relative flex min-h-[80px]">
                    {/* Time label */}
                    <div className="w-[60px] flex-shrink-0 pt-0 text-[14px] font-medium text-slate-400 select-none">
                      {slot}
                    </div>

                    {/* Timeline content area */}
                    <div className="flex-1 relative border-t border-slate-100 ml-2 pl-6">
                      {/* Current time red line + dot */}
                      {isNowSlot && (
                        <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${nowPct}%` }}>
                          <div className="flex items-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-teal-600 -ml-[5px] flex-shrink-0 shadow-[0_0_8px_rgba(13,148,136,0.6)]" />
                            <div className="flex-1 h-[2px] bg-teal-600 shadow-[0_0_8px_rgba(13,148,136,0.5)]" />
                          </div>
                          <div className="absolute -left-[72px] -top-[12px] bg-teal-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-bold">
                            {nowTime}
                          </div>
                        </div>
                      )}

                      {/* Empty slot placeholder */}
                      {slotRdvs.length === 0 && !isLunch && (
                        <div 
                          className="absolute inset-x-0 inset-y-1 ml-6 rounded-lg border-2 border-transparent hover:border-dashed hover:border-slate-300 hover:bg-slate-100 cursor-pointer flex items-center justify-center group/slot transition-all z-10"
                          onClick={() => setShowCreate(true)}
                        >
                          <div className="opacity-0 group-hover/slot:opacity-100 flex items-center gap-2 text-slate-500 text-sm font-semibold transition-opacity">
                            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-white shadow-sm">+</span>
                            Nouveau RDV
                          </div>
                        </div>
                      )}

                      {/* Lunch break marker */}
                      {isLunch && slotRdvs.length === 0 && (
                        <div className="flex items-center justify-center py-4">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Pause déjeuner</span>
                        </div>
                      )}

                      {/* Appointment cards */}
                      <div className="py-2 space-y-3">
                        {slotRdvs.map(rdv => {
                          const time = getRdvTime(rdv.date_rdv)
                          const name = rdv.patients ? `${rdv.patients.prenom} ${rdv.patients.nom}` : 'Patient inconnu'
                          const activeStatus = rdv.status || rdv.statut || RDV_STATUSES.SCHEDULED
                          
                          // Define flags for visuals
                          const isCancelled = activeStatus === 'annule' || activeStatus === 'annulé' || activeStatus === RDV_STATUSES.ABSENT
                          const isTerminated = activeStatus === RDV_STATUSES.COMPLETED || activeStatus === 'termine' || activeStatus === RDV_STATUSES.PAID
                          const isArrived = activeStatus === RDV_STATUSES.ARRIVED
                          const inConsultation = activeStatus === RDV_STATUSES.IN_CONSULTATION

                          // Card style variations
                          let cardBg = 'bg-white'
                          let cardBorder = 'border-l-4 border-l-slate-300'
                          let statusBg = 'bg-slate-100 text-slate-500'
                          let statusLabel = STATUS_LABELS[activeStatus] || 'Planifié'

                          if (isTerminated) {
                            cardBg = 'bg-slate-50/50'
                            cardBorder = 'border-l-4 border-l-slate-800'
                            statusBg = 'bg-slate-800 text-white'
                          } else if (isCancelled) {
                            cardBg = 'bg-rose-50/30'
                            cardBorder = 'border-l-4 border-l-rose-400'
                            statusBg = 'bg-red-100 text-red-700'
                          } else if (inConsultation) {
                            cardBg = 'bg-green-50/50'
                            cardBorder = 'border-l-4 border-l-green-500'
                            statusBg = 'bg-green-100 text-green-700 font-bold animate-pulse'
                          } else if (isArrived) {
                            cardBg = 'bg-blue-50/50'
                            cardBorder = 'border-l-4 border-l-blue-500'
                            statusBg = 'bg-blue-100 text-blue-700 font-bold'
                          } else {
                            // default scheduled
                            cardBg = 'bg-white hover:bg-slate-50'
                            cardBorder = 'border-l-4 border-l-slate-300'
                          }

                          return (
                            <div
                              key={rdv.id}
                              onClick={() => setSelectedRdv(rdv)}
                              className={`${cardBg} ${cardBorder} rounded-[16px] px-5 py-4 shadow-[0_2px_12px_rgb(0,0,0,0.04)] cursor-pointer transition-all duration-200 hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 group`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  {/* Status + Duration row */}
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusBg}`}>
                                      {statusLabel}
                                    </span>
                                    <span className="flex items-center gap-1 text-[12px] text-slate-400">
                                      <Clock4 className="w-3 h-3" />
                                      15 min
                                    </span>
                                  </div>

                                  {/* Patient name */}
                                  <p className="text-[16px] font-bold text-slate-900 group-hover:text-teal-800 transition-colors">
                                    {name}
                                  </p>

                                  {/* Notes / description */}
                                  {rdv.notes && (
                                    <p className="text-[13px] text-slate-500 mt-1 line-clamp-2">{rdv.notes}</p>
                                  )}
                                </div>

                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ══════════════════════════════
         DETAIL MODAL
         ══════════════════════════════ */}
      <Modal open={Boolean(selectedRdv)} onClose={() => setSelectedRdv(null)} title="Détail du rendez-vous" width="max-w-xl">
        {selectedRdv && (() => {
          const dateStr = formatDateDisplay(selectedRdv.date_rdv, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
          const timeStr = getRdvTime(selectedRdv.date_rdv)
          const name = selectedRdv.patients ? `${selectedRdv.patients.prenom} ${selectedRdv.patients.nom}` : 'Patient inconnu'
          const phone = selectedRdv.patients?.telephone

          return (
            <div className="space-y-5">
              <div className="rounded-[22px] bg-slate-50 p-5 ring-1 ring-slate-100">
                <p className="text-xl font-semibold text-slate-950">{name}</p>
                {phone && <p className="mt-1 text-sm text-slate-500">📞 {phone}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-base text-slate-600">
                  <span>📅 {dateStr}</span>
                  <span>🕐 {timeStr}</span>
                </div>
                <div className="mt-3">
                   <StatusBadge tone={STATUS_TONES[selectedRdv.status || selectedRdv.statut] || 'neutral'}>
                     {STATUS_LABELS[selectedRdv.status || selectedRdv.statut] || 'Planifié'}
                   </StatusBadge>
                </div>
                {selectedRdv.notes && <p className="mt-3 text-base text-slate-600">{selectedRdv.notes}</p>}
              </div>

              {/* Secretary Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {(!selectedRdv.status || selectedRdv.status === RDV_STATUSES.SCHEDULED) && (
                  <>
                    <AppButton onClick={() => handleStatus(selectedRdv.id, selectedRdv.status, RDV_STATUSES.ARRIVED)}><CheckCircle2 className="mr-1.5 h-4 w-4" /> Marquer comme arrivé</AppButton>
                    <AppButton variant="secondary" onClick={() => handleStatus(selectedRdv.id, selectedRdv.status, RDV_STATUSES.ABSENT)}><XCircle className="mr-1.5 h-4 w-4" /> Absent</AppButton>
                  </>
                )}
                
                {selectedRdv.status === RDV_STATUSES.ARRIVED && (
                  <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold w-full text-center border border-blue-200">
                    Patient actuellement en salle d'attente.
                  </div>
                )}
                {selectedRdv.status === RDV_STATUSES.IN_CONSULTATION && (
                  <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-semibold w-full text-center border border-green-200">
                    En consultation avec le médecin !
                  </div>
                )}

                <AppButton variant="ghost" onClick={() => { setSelectedRdv(null); setEditingRdv(selectedRdv) }}><Pencil className="mr-1.5 h-4 w-4" /> Modifier</AppButton>
                {/* Allow canceling if not already cancelled or completed */}
                {selectedRdv.status !== RDV_STATUSES.COMPLETED && selectedRdv.status !== RDV_STATUSES.CANCELLED && selectedRdv.statut !== 'annule' && (
                  <AppButton variant="ghost" className="text-rose-600 hover:text-rose-700" onClick={() => handleStatus(selectedRdv.id, selectedRdv.status || selectedRdv.statut || RDV_STATUSES.SCHEDULED, RDV_STATUSES.CANCELLED)}>Annuler le RDV</AppButton>
                )}
                <AppButton variant="ghost" className="text-rose-600 hover:text-rose-700" onClick={() => handleDelete(selectedRdv.id)}><Trash2 className="mr-1.5 h-4 w-4" /> Supprimer</AppButton>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ── Form Modals ── */}
      <AppointmentFormModal open={showCreate} onClose={() => setShowCreate(false)} onSuccess={handleFormOk} />
      <AppointmentFormModal open={Boolean(editingRdv)} onClose={() => setEditingRdv(null)} appointment={editingRdv} onSuccess={handleFormOk} />
    </div>
  )
}

export default AppointmentsPage
