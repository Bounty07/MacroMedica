import { Activity, CalendarRange, Clock3, Stethoscope, TrendingUp, UserRoundX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import { buildPracticeAnalyticsMetrics, loadPracticeAnalyticsSourceData } from '../../lib/practiceAnalytics'
import { supabase } from '../../lib/supabase'

const LOOKBACK_OPTIONS = [30, 60, 90]

function formatMetric(value, suffix = '', fallback = 'N/A') {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback
  return `${value}${suffix}`
}

function getEfficiencyHeadline(metrics) {
  if (!metrics) return 'Vue d ensemble indisponible'

  const waitAverage = metrics.waitTime?.average ?? null
  const durationAverage = metrics.consultationDuration?.average ?? null
  const noShowRate = metrics.noShowRate?.rate ?? null

  if (
    noShowRate !== null
    && noShowRate <= 8
    && waitAverage !== null
    && waitAverage <= 15
    && durationAverage !== null
    && durationAverage <= 30
  ) {
    return 'Flux clinique tres bien maitrise'
  }

  if (noShowRate !== null && noShowRate >= 20) {
    return 'Le principal point de vigilance vient des rendez-vous manques'
  }

  if (waitAverage !== null && waitAverage >= 25) {
    return "L attente patient est actuellement le signal le plus fort"
  }

  if (durationAverage !== null && durationAverage >= 35) {
    return 'Les consultations s etirent davantage que prevu'
  }

  return 'Le cabinet conserve une dynamique plutot stable'
}

function AnalyticsCard({ icon: Icon, label, value, accent, detail }) {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950">{value}</p>
          {detail ? <p className="mt-3 text-sm leading-6 text-slate-500">{detail}</p> : null}
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg"
          style={{ background: accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function DistributionRow({ label, count, percent, tone = 'emerald' }) {
  const tones = {
    emerald: {
      rail: 'bg-emerald-100',
      fill: 'bg-emerald-500',
      text: 'text-emerald-700',
    },
    amber: {
      rail: 'bg-amber-100',
      fill: 'bg-amber-500',
      text: 'text-amber-700',
    },
    slate: {
      rail: 'bg-slate-100',
      fill: 'bg-slate-500',
      text: 'text-slate-700',
    },
  }
  const palette = tones[tone] || tones.emerald

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-semibold text-slate-700">{label}</p>
        <p className={`shrink-0 text-xs font-black uppercase tracking-[0.14em] ${palette.text}`}>
          {count} cas
        </p>
      </div>
      <div className={`h-3 overflow-hidden rounded-full ${palette.rail}`}>
        <div className={`h-full rounded-full ${palette.fill}`} style={{ width: `${Math.max(percent, 8)}%` }} />
      </div>
    </div>
  )
}

export default function AnalyticsDashboardPage() {
  const { profile } = useAppContext()
  const [lookbackDays, setLookbackDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    if (!profile?.cabinet_id || !supabase) {
      setMetrics(null)
      setLoading(false)
      return undefined
    }

    let cancelled = false

    async function loadAnalytics() {
      setLoading(true)
      setErrorMessage('')

      try {
        const sourceData = await loadPracticeAnalyticsSourceData({
          client: supabase,
          cabinetId: profile.cabinet_id,
          lookbackDays,
        })

        if (cancelled) return

        setMetrics(buildPracticeAnalyticsMetrics(sourceData))
      } catch (error) {
        console.error('Analytics dashboard error:', error)
        if (!cancelled) {
          setErrorMessage(error?.message || "Impossible de charger les analytics du cabinet.")
          setMetrics(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAnalytics()

    return () => {
      cancelled = true
    }
  }, [lookbackDays, profile?.cabinet_id])

  const reasonDistribution = metrics?.visitReasonDistribution || []
  const totalReasonCount = reasonDistribution.reduce((sum, item) => sum + item.count, 0)
  const topReason = reasonDistribution[0] || null
  const statusBreakdown = metrics?.appointmentStatusBreakdown || []
  const observationNotes = metrics?.notes || []
  const heroLabel = useMemo(() => getEfficiencyHeadline(metrics), [metrics])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 text-sm font-semibold text-slate-500 shadow-sm">
          Chargement du tableau analytique...
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-5 text-sm font-semibold text-rose-700">
        {errorMessage}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_30%),linear-gradient(135deg,_#ffffff,_#f0fdfa_58%,_#eff6ff)] p-7 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
              Tableau de bord analytique
            </div>
            <h1 className="mt-4 text-[2.3rem] font-black tracking-[-0.05em] text-slate-950">
              Une lecture rapide de l efficacite du cabinet
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Cette vue rassemble les signaux operationnels les plus utiles pour suivre les rendez-vous, le temps
              passe avec les patients et la charge quotidienne du cabinet.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Fenetre d analyse</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {LOOKBACK_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLookbackDays(option)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    lookbackDays === option
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {option} jours
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">{heroLabel}</p>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              {metrics?.sourceCounts?.appointments || 0} rendez-vous et {metrics?.sourceCounts?.consultations || 0} consultations analyses.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <AnalyticsCard
          icon={UserRoundX}
          label="Taux d absentéisme"
          value={formatMetric(metrics?.noShowRate?.rate, '%')}
          detail={`${metrics?.noShowRate?.noShowCount || 0} rendez-vous absents ou annules sur ${metrics?.noShowRate?.totalAppointments || 0}`}
          accent="linear-gradient(135deg, #f97316, #ef4444)"
        />
        <AnalyticsCard
          icon={Clock3}
          label="Temps d attente moyen"
          value={formatMetric(metrics?.waitTime?.average, ' min')}
          detail={metrics?.waitTime?.estimated ? 'Calcule a partir des horodatages disponibles.' : 'Mesure basee sur les temps de prise en charge.'}
          accent="linear-gradient(135deg, #0ea5e9, #14b8a6)"
        />
        <AnalyticsCard
          icon={Stethoscope}
          label="Duree moyenne de consultation"
          value={formatMetric(metrics?.consultationDuration?.average, ' min')}
          detail={metrics?.consultationDuration?.estimated ? 'Valeur estimee depuis les consultations et les RDV.' : 'Mesure directe sur les consultations.'}
          accent="linear-gradient(135deg, #22c55e, #10b981)"
        />
        <AnalyticsCard
          icon={CalendarRange}
          label="Motif principal"
          value={topReason?.label || 'Aucun motif'}
          detail={topReason ? `${topReason.count} consultations ou rendez-vous sur la periode.` : 'Aucun motif suffisamment renseigne pour cette periode.'}
          accent="linear-gradient(135deg, #6366f1, #8b5cf6)"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Repartition des motifs</p>
              <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">Motifs de visite les plus frequents</h2>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
              {totalReasonCount} occurrences
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {reasonDistribution.length > 0 ? (
              reasonDistribution.map((item, index) => (
                <DistributionRow
                  key={`${item.label}-${item.count}`}
                  label={item.label}
                  count={item.count}
                  percent={totalReasonCount ? (item.count / totalReasonCount) * 100 : 0}
                  tone={index === 0 ? 'emerald' : index === 1 ? 'amber' : 'slate'}
                />
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                Aucun motif de visite exploitable n a ete detecte sur cette periode.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Statuts RDV</p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">Lecture rapide des statuts</h2>

            <div className="mt-6 space-y-3">
              {statusBreakdown.length > 0 ? (
                statusBreakdown.slice(0, 5).map((item) => (
                  <div key={`${item.status}-${item.count}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-600">{item.status || 'inconnu'}</span>
                    <span className="text-sm font-black text-slate-950">{item.count}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">
                  Aucun statut n a encore ete charge.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,_#0f172a,_#111827_55%,_#0b3b36)] p-6 text-white shadow-[0_22px_48px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <Activity className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200/80">Qualite de mesure</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Confiance analytique</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {observationNotes.length > 0 ? (
                observationNotes.map((note) => (
                  <div key={note} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200">
                    {note}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                  Les indicateurs principaux disposent d une base de mesure cohérente sur cette periode.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
