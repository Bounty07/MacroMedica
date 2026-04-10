export function SectionHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-base font-semibold uppercase tracking-[0.25em] text-teal-700/80">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950 md:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-lg text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}

export function AppButton({ children, variant = 'primary', className = '', ...props }) {
  const styles =
    variant === 'secondary'
      ? 'border border-slate-200 bg-white text-slate-800 hover:border-teal-200 hover:text-teal-700'
      : variant === 'ghost'
        ? 'border border-transparent bg-slate-900/5 text-slate-700 hover:bg-slate-900/10'
        : 'border border-transparent bg-teal-600 text-white hover:bg-teal-700'

  return (
    <button
      type="button"
      className={`interactive inline-flex items-center justify-center rounded-2xl px-5 py-3 text-base font-medium ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function StatCard({ label, value, helper, trend, color = 'teal' }) {
  const colorStyles = {
    teal: 'bg-teal-50 text-teal-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    orange: 'bg-orange-50 text-orange-700',
    amber: 'bg-amber-50 text-amber-700',
  }

  return (
    <div className="surface-card interactive px-[24px] py-[20px]" style={{ height: "auto" }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-[500] text-[#64748b]">{label}</p>
          <p className="mt-1 text-[36px] font-[800] leading-[1.1] whitespace-nowrap text-slate-950">{value}</p>
        </div>
        {trend ? (
          <span className={`rounded-full px-2 py-1 text-[12px] font-[600] ${colorStyles[color] || colorStyles.teal}`}>{trend}</span>
        ) : null}
      </div>
      {helper ? <p className="mt-2 text-[13px] text-[#94a3b8]">{helper}</p> : null}
    </div>
  )
}

export function ContentCard({ title, subtitle, children, action, className = '' }) {
  return (
    <section className={`surface-card p-6 ${className}`}>
      {(title || action) ? (
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            {title ? <h2 className="text-[18px] font-[700] text-slate-950">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-[13px] text-[#94a3b8]">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function StatusBadge({ children, tone = 'neutral' }) {
  const styles = {
    danger: 'bg-rose-50 text-rose-700',
    info: 'bg-blue-50 text-blue-700',
    neutral: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
  }

  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${styles[tone]}`}>{children}</span>
}
