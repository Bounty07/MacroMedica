// C:/Users/MonPc/Downloads/MMFR/src/pages/dashboards/MedecinDashboard.tsx
import { useState } from 'react'

type PatientRecord = {
  id: number
  name: string
  reason: string
  status: string
  tension: string
  temperature: string
  pulse: string
  spo2: string
  history: string
  notes: string
}

const stats = [
  { label: "Patients aujourd'hui", value: '14', hint: '2 urgences signalees' },
  { label: 'Consultations ce mois', value: '89', hint: '12 teleconsultations' },
  { label: 'En attente', value: '4', hint: 'Salle 2 et salle 3' },
]

const patients: PatientRecord[] = [
  {
    id: 1,
    name: 'Amina Lahlou',
    reason: 'Suivi diabetique',
    status: 'En salle',
    tension: '12/8',
    temperature: '36.8 C',
    pulse: '78 bpm',
    spo2: '98%',
    history: 'Diabete type 2. Allergie a la penicilline.',
    notes: 'Controle glycemie satisfaisant. Ajuster alimentation.',
  },
  {
    id: 2,
    name: 'Hicham Bennani',
    reason: 'Toux persistante',
    status: 'A appeler',
    tension: '13/8',
    temperature: '37.2 C',
    pulse: '82 bpm',
    spo2: '97%',
    history: 'Asthme leger. Aucun antecedent chirurgical.',
    notes: 'Examiner auscultation et demander radio si besoin.',
  },
  {
    id: 3,
    name: 'Nora El Fassi',
    reason: 'Resultats analyses',
    status: 'Pret',
    tension: '11/7',
    temperature: '36.5 C',
    pulse: '72 bpm',
    spo2: '99%',
    history: 'Anemie ferropenique en suivi.',
    notes: 'Verifier hemoglobine et renouveler traitement.',
  },
]

function MedecinDashboard() {
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0].id)
  const [notes, setNotes] = useState(patients[0].notes)

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? patients[0]

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

      <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">File patients</h2>
          <p className="mb-4 text-base text-slate-500">Cliquez pour ouvrir le dossier clinique du jour</p>
          <div className="space-y-3">
            {patients.map((patient) => {
              const active = patient.id === selectedPatientId

              return (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => {
                    setSelectedPatientId(patient.id)
                    setNotes(patient.notes)
                  }}
                  className={`w-full rounded-2xl border p-4 text-left shadow-sm ${
                    active ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-100 bg-[#F7F8FA] text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold">{patient.name}</p>
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${active ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-700'}`}>
                      {patient.status}
                    </span>
                  </div>
                  <p className={`mt-2 text-sm ${active ? 'text-slate-200' : 'text-slate-500'}`}>{patient.reason}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{selectedPatient.name}</h2>
                <p className="text-base text-slate-500">{selectedPatient.reason}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                Consultation active
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Tension', value: selectedPatient.tension },
                { label: 'Temperature', value: selectedPatient.temperature },
                { label: 'Pouls', value: selectedPatient.pulse },
                { label: 'SpO2', value: selectedPatient.spo2 },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-gray-100 bg-[#F7F8FA] p-4">
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-[#F7F8FA] p-4">
                <h3 className="text-base font-semibold text-slate-900">Antecedents</h3>
                <p className="mt-2 text-base leading-6 text-slate-600">{selectedPatient.history}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-[#F7F8FA] p-4">
                <h3 className="text-base font-semibold text-slate-900">Notes de consultation</h3>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-3 h-40 w-full resize-none rounded-2xl border border-gray-200 bg-white p-4 text-base outline-none"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <button className="rounded-full bg-slate-900 px-4 py-2 text-base font-semibold text-white">
                    Enregistrer
                  </button>
                  <button className="rounded-full border border-gray-200 bg-white px-4 py-2 text-base font-semibold text-slate-700">
                    Creer ordonnance
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Acces limite</h2>
            <p className="mt-2 text-base text-slate-600">
              Les modules facturation et administration restent verrouilles pour le profil medecin.
            </p>
            <div className="mt-4 rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-4 text-base text-rose-700">
              Vous pouvez consulter les dossiers, saisir les notes et editer les ordonnances.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default MedecinDashboard
