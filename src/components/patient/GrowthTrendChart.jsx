import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function GrowthTooltip({ active, payload, label, unit, seriesLabel }) {
  if (!active || !payload?.length) return null

  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">
        {seriesLabel}: {point.value} {unit}
      </p>
      {point.note ? <p className="mt-1 text-xs leading-5 text-slate-500">{point.note}</p> : null}
    </div>
  )
}

export default function GrowthTrendChart({
  data,
  unit = 'kg',
  seriesLabel = 'Poids / Age',
  color = '#0f766e',
  height = 260,
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        Aucune donnee de croissance disponible pour le moment.
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
            width={40}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            cursor={{ stroke: '#99f6e4', strokeWidth: 1.5, strokeDasharray: '3 3' }}
            content={<GrowthTooltip unit={unit} seriesLabel={seriesLabel} />}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: '#ffffff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
