import { CalendarClock } from 'lucide-react'
import { AppButton, ContentCard } from '../../components/dashboard/DashboardPrimitives'
import { useAppContext } from '../../context/AppContext'
import { weeklySchedule } from '../../lib/mock-data'

function SchedulePage() {
  const { notify } = useAppContext()

  return (
    <div className="space-y-8">

      <ContentCard title="Planning hebdomadaire" subtitle="Exemple de structure exploitable pour l’agenda et les disponibilités">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {weeklySchedule.map((entry) => (
            <div key={entry.day} className="interactive rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
              <p className="text-xl font-semibold text-slate-950">{entry.day}</p>
              <div className="mt-4 space-y-2">
                {entry.slots.map((slot) => (
                  <div key={slot} className="rounded-2xl bg-white px-4 py-3 text-base font-medium text-slate-700 shadow-sm">
                    {slot}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ContentCard>
    </div>
  )
}

export default SchedulePage
