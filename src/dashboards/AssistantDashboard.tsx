// C:/Users/MonPc/Downloads/MMFR/src/pages/dashboards/AssistantDashboard.tsx
import { useState } from 'react'

const stats = [
  { label: 'A preparer', value: '9', hint: 'Dossiers avant 12h' },
  { label: 'Signes saisis', value: '17', hint: 'Depuis ce matin' },
  { label: 'Taches restantes', value: '6', hint: '2 urgentes' },
]

const patients = [
  { id: 1, name: 'Amina Lahlou', age: '43 ans' },
  { id: 2, name: 'Walid Benjelloun', age: '51 ans' },
  { id: 3, name: 'Nora El Fassi', age: '36 ans' },
]

const initialTasks = [
  { id: 1, label: 'Verifier les salles de consultation', done: true },
  { id: 2, label: 'Preparer les dossiers du matin', done: true },
  { id: 3, label: 'Saisir les signes vitaux en attente', done: false },
  { id: 4, label: 'Mettre a jour les consommables', done: false },
]

const progressWidths: Record<number, string> = {
  0: 'w-0',
  25: 'w-1/4',
  50: 'w-1/2',
  75: 'w-3/4',
  100: 'w-full',
}

function AssistantDashboard() {
  const [openPatientId, setOpenPatientId] = useState<number | null>(null)
  const [tasks, setTasks] = useState(initialTasks)

  const completedTasks = tasks.filter((task) => task.done).length
  const progress = Math.round((completedTasks / tasks.length) * 100)

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

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Patients a preparer</h2>
          <p className="mb-4 text-base text-slate-500">Saisissez les signes vitaux avant la consultation</p>
          <div className="space-y-4">
            {patients.map((patient) => {
              const isOpen = patient.id === openPatientId

              return (
                <div key={patient.id} className="rounded-2xl border border-gray-100 bg-[#F7F8FA] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{patient.name}</p>
                      <p className="text-sm text-slate-500">{patient.age}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenPatientId(isOpen ? null : patient.id)}
                      className="w-fit rounded-full bg-slate-900 px-4 py-2 text-base font-semibold text-white"
                    >
                      Signes
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <input placeholder="Tension" className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base outline-none" />
                      <input placeholder="Temperature" className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base outline-none" />
                      <input placeholder="Pouls" className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base outline-none" />
                      <input placeholder="SpO2" className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base outline-none" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Checklist du jour</h2>
                <p className="text-base text-slate-500">Cliquez pour marquer chaque tache</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">{progress}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full bg-emerald-500 ${progressWidths[progress] ?? 'w-1/2'}`} />
            </div>
            <div className="mt-4 space-y-3">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() =>
                    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item)))
                  }
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${
                    task.done ? 'border-emerald-100 bg-emerald-50' : 'border-gray-100 bg-[#F7F8FA]'
                  }`}
                >
                  <span className="text-base font-medium text-slate-900">{task.label}</span>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${task.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {task.done ? 'Fait' : 'A faire'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Acces limite</h2>
            <p className="mt-2 text-base text-slate-600">
              Les modules prescriptions et facturation sont verrouilles pour le profil assistant.
            </p>
            <div className="mt-4 rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-4 text-base text-rose-700">
              Votre espace est dedie au triage, a la preparation patient et aux taches de support.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AssistantDashboard
