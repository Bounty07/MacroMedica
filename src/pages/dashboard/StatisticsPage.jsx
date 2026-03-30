import { useMemo } from 'react'
import { ContentCard, StatCard } from '../../components/dashboard/DashboardPrimitives'
import { useAppContext } from '../../context/AppContext'
import PinLock from '../../components/common/PinLock'

function StatisticsPage() {
  const { patients, appointments, invoices } = useAppContext()

  const totals = useMemo(() => {
    const totalRevenue = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.amount, 0)
    const consultationCount = appointments.filter((appointment) => appointment.status === 'completed').length || 1
    return {
      totalRevenue,
      avgConsultation: Math.round(totalRevenue / consultationCount),
    }
  }, [appointments, invoices])

  const monthlyRevenue = useMemo(() => {
    const months = ['Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar']
    return months.map((month, index) => ({ label: month, value: [3200, 4100, 4600, 5200, 6100, totals.totalRevenue][index] || 0 }))
  }, [totals.totalRevenue])

  const weeklyAppointments = useMemo(() => [
    { label: 'S1', value: 9 },
    { label: 'S2', value: 12 },
    { label: 'S3', value: 8 },
    { label: 'S4', value: appointments.length },
  ], [appointments.length])

  const typeDistribution = useMemo(() => {
    const counts = appointments.reduce((accumulator, appointment) => {
      accumulator[appointment.type] = (accumulator[appointment.type] || 0) + 1
      return accumulator
    }, {})
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1
    return Object.entries(counts).slice(0, 4).map(([label, value]) => ({ label, value, percent: Math.round((value / total) * 100) }))
  }, [appointments])

  return (
    <PinLock>
      <div className="space-y-8">
        <div className="grid gap-6 xl:grid-cols-4">
          <StatCard label="Patients total" value={String(patients.length)} helper="dossiers enregistrés" />
          <StatCard label="Revenu encaissé" value={`${totals.totalRevenue} MAD`} helper="factures payées" />
          <StatCard label="RDV total" value={String(appointments.length)} helper="toutes périodes mock" />
          <StatCard label="Moyenne / consultation" value={`${totals.avgConsultation} MAD`} helper="revenu moyen" />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <ContentCard title="Revenu par mois" subtitle="6 derniers mois">
            <div className="flex h-64 items-end justify-between gap-3">
              {monthlyRevenue.map((item) => (
                <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
                  <div className="flex h-full w-full items-end rounded-[24px] bg-slate-100 p-2">
                    <div className="w-full rounded-[18px] bg-gradient-to-t from-teal-300 to-teal-600" style={{ height: `${Math.max(12, item.value / 80)}%` }} />
                  </div>
                  <span className="text-sm text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
          </ContentCard>

          <ContentCard title="Rendez-vous par semaine" subtitle="Bar chart simplifié">
            <div className="space-y-4">
              {weeklyAppointments.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-base text-slate-600">
                    <span>{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-4 rounded-full bg-slate-100">
                    <div className="h-4 rounded-full bg-teal-500" style={{ width: `${item.value * 8}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </ContentCard>

          <ContentCard title="Répartition des types" subtitle="Lecture proportionnelle">
            <div className="space-y-4">
              {typeDistribution.map((item) => (
                <div key={item.label} className="rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-100">
                  <div className="flex items-center justify-between text-base">
                    <span className="font-medium text-slate-800">{item.label}</span>
                    <span className="text-slate-500">{item.percent}%</span>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-white">
                    <div className="h-3 rounded-full bg-teal-500" style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </ContentCard>
        </div>
      </div>
    </PinLock>
  )
}

export default StatisticsPage
