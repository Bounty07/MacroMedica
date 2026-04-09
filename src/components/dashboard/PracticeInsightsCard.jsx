import { Activity, Clock3, MessageSquareQuote, Sparkles } from 'lucide-react'

function formatMetric(value, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A'
  return `${value}${suffix}`
}

export default function PracticeInsightsCard({ insight, metrics }) {
  if (!insight || (!insight.headline && !insight.issue && !insight?.suggestions?.length)) {
    return null
  }

  const metricBadges = [
    {
      key: 'reviews',
      icon: MessageSquareQuote,
      label: metrics?.reviews?.count
        ? `${formatMetric(metrics.reviews.averageRating, '/5')} sur ${metrics.reviews.count} avis`
        : 'Avis indisponibles',
    },
    {
      key: 'wait',
      icon: Clock3,
      label: metrics?.waitTime?.sampleCount
        ? `${formatMetric(metrics.waitTime.average, ' min')} attente moyenne${metrics.waitTime.estimated ? ' estimee' : ''}`
        : 'Attente non calculee',
    },
    {
      key: 'duration',
      icon: Activity,
      label: metrics?.consultationDuration?.sampleCount
        ? `${formatMetric(metrics.consultationDuration.average, ' min')} par consultation${metrics.consultationDuration.estimated ? ' estimee' : ''}`
        : 'Duree non calculee',
    },
    {
      key: 'booking',
      icon: Sparkles,
      label: metrics?.bookingLeadTime?.sampleCount
        ? `${formatMetric(metrics.bookingLeadTime.averageDays, ' j')} avant le RDV`
        : 'Delai de reservation indisponible',
    },
  ]

  return (
    <section className="rounded-[28px] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_38%),linear-gradient(135deg,_rgba(255,255,255,1),_rgba(240,253,250,0.95)_55%,_rgba(239,246,255,0.95)_100%)] p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            Suggestions & Performance
          </div>
          <h3 className="mt-4 text-2xl font-black tracking-[-0.03em] text-slate-900">
            {insight.headline || 'Optimisation douce du cabinet'}
          </h3>
          {insight.issue ? (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {insight.issue}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {metricBadges.map(({ key, icon: Icon, label }) => (
            <div
              key={key}
              className="min-w-[210px] rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <Icon className="h-3.5 w-3.5 text-emerald-600" />
                Signal
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {insight?.suggestions?.length ? (
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {insight.suggestions.map((suggestion, index) => (
            <div
              key={`${index + 1}-${suggestion.slice(0, 18)}`}
              className="rounded-2xl border border-emerald-100 bg-white/85 px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                Piste {index + 1}
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{suggestion}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
