// C:/Users/MonPc/Downloads/MMFR/src/pages/dashboards/SecretaireDashboard.tsx
import { useState } from 'react'

const stats = [
  { label: 'RDV du jour', value: '28', hint: '4 a confirmer' },
  { label: "Salle d'attente", value: '7', hint: '2 priorites' },
  { label: 'Nouveaux patients', value: '5', hint: 'Inscrits aujourd hui' },
]

const appointments = [
  { name: 'Amina Lahlou', phone: '06 61 12 33 44', time: '08:30', doctor: 'Dr Idrissi', status: 'scheduled' },
  { name: 'Walid Benjelloun', phone: '06 70 45 67 22', time: '09:00', doctor: 'Dr Chraibi', status: 'waiting' },
  { name: 'Salma Rami', phone: '06 62 81 23 10', time: '09:30', doctor: 'Dr Idrissi', status: 'done' },
  { name: 'Omar Hmimsa', phone: '06 74 10 88 42', time: '10:00', doctor: 'Dr Belkadi', status: 'scheduled' },
  { name: 'Nora Naciri', phone: '06 67 99 00 12', time: '10:20', doctor: 'Dr Chraibi', status: 'cancelled' },
]

const waitingRoom = [
  { name: 'Yasmine Ziani', reason: 'Controle annuel', wait: '12 min' },
  { name: 'Khalid Mernissi', reason: 'Renouvellement', wait: '20 min' },
  { name: 'Imane Tazi', reason: 'Resultats analyses', wait: '8 min' },
]

const statusClasses: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  done: 'bg-emerald-50 text-emerald-700',
  waiting: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-rose-50 text-rose-700',
}

const statusLabels: Record<string, string> = {
  scheduled: 'Planifie',
  done: 'Termine',
  waiting: 'En attente',
  cancelled: 'Annule',
}

function SecretaireDashboard() {
  const [query, setQuery] = useState('')

  const filteredAppointments = appointments.filter((appointment) => {
    const value = query.toLowerCase()
    return appointment.name.toLowerCase().includes(value) || appointment.phone.toLowerCase().includes(value)
  })

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-base text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
            <p className="mt-2 text-sm text-slate-500">{stat.hint}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Liste des rendez-vous</h2>
              <p className="text-base text-slate-500">Recherche par nom ou numero de telephone</p>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un patient"
              className="w-full rounded-full border border-gray-200 bg-[#F7F8FA] px-4 py-2 text-base outline-none md:max-w-xs"
            />
          </div>

          <div className="space-y-3">
            {filteredAppointments.map((appointment) => (
              <div
                key={`${appointment.time}-${appointment.name}`}
                className="grid gap-3 rounded-2xl border border-gray-100 bg-[#F7F8FA] p-4 md:grid-cols-[90px_1fr_170px_120px]"
              >
                <p className="text-base font-semibold text-slate-900">{appointment.time}</p>
                <div>
                  <p className="text-base font-semibold text-slate-900">{appointment.name}</p>
                  <p className="text-sm text-slate-500">{appointment.phone}</p>
                </div>
                <p className="text-base text-slate-600">{appointment.doctor}</p>
                <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${statusClasses[appointment.status]}`}>
                  {statusLabels[appointment.status]}
                </span>
              </div>
            ))}

            {!filteredAppointments.length && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-[#F7F8FA] p-6 text-base text-slate-500">
                Aucun patient ne correspond a votre recherche.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Salle d attente</h2>
            <p className="mb-4 text-base text-slate-500">Patients deja arrives au cabinet</p>
            <div className="space-y-3">
              {waitingRoom.map((patient) => (
                <div key={patient.name} className="rounded-2xl border border-gray-100 bg-[#F7F8FA] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-slate-900">{patient.name}</p>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                      {patient.wait}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{patient.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Acces limite</h2>
            <p className="mt-2 text-base text-slate-600">
              Les sections facturation et consultations sont verrouillees pour le profil secretaire.
            </p>
            <div className="mt-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4 text-base text-amber-700">
              Utilisez ce profil pour l accueil, la planification et le suivi de la salle d attente.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default SecretaireDashboard
