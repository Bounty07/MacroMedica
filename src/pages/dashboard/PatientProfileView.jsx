import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  FilePenLine,
  FlaskConical,
  Info,
  Mic,
  Pause,
  Pill,
  Plus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Thermometer,
  Weight,
  Waves,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getConsultationsByPatient, getPatientById, getSignesVitauxByPatient } from '../../lib/api'

const TEAL = '#0D9488'
const SCRIBE_TABS = ['Transcription brute', 'Note structurée', 'Ordonnance']

const fallbackPatient = {
  prenom: 'Hatim',
  nom: 'Mazgouri',
  date_naissance: '1979-04-01',
  sexe: 'homme',
  allergies: 'Pénicilline',
}

const fallbackVitals = {
  poids: 78,
  taille: 176,
  imc: 25.2,
  saturation: 98,
  temperature: 36.8,
}

const fallbackHistory = [
  {
    id: 'history-1',
    date_consult: '2024-04-01',
    motif: 'Suivi de fatigue persistante',
    notes: 'Réévaluation clinique et adaptation des conseils hygiéno-diététiques.',
  },
  {
    id: 'history-2',
    date_consult: '2024-01-12',
    motif: 'Bilan de routine',
    notes: 'Examen général stable, bilan sanguin recommandé pour contrôle.',
  },
  {
    id: 'history-3',
    date_consult: '2023-09-22',
    motif: 'Consultation initiale',
    notes: 'Constitution du dossier, antécédents revus et surveillance programmée.',
  },
]

const rawTranscription =
  'Patient Hatim Mazgouri, quarante-sept ans, vu pour suivi. Rapport de fatigue persistante depuis trois semaines. TA douze huit. Examen clinique sans particularité. Je suspecte syndrome...'

const structuredNote = {
  motif: 'Fatigue persistante depuis trois semaines dans le cadre d’un suivi clinique.',
  examen: 'Constantes globalement stables. Examen clinique sans particularité notable.',
  hypothese: 'Syndrome de fatigue fonctionnelle à préciser. Bilan biologique à actualiser.',
  plan: 'Demander un bilan sanguin, poursuivre la surveillance, réévaluer à la prochaine consultation.',
}

const prescriptionLines = [
  'Vitamine D3 1000 UI, une capsule par jour pendant 30 jours.',
  'Magnésium B6, un comprimé matin et soir pendant 15 jours.',
  'Bilan sanguin de contrôle à programmer cette semaine.',
]

function formatDate(value) {
  if (!value) return '--'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Africa/Casablanca',
  })
}

function calcAge(dateStr) {
  if (!dateStr) return 47
  const birth = new Date(dateStr)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const diff = today.getMonth() - birth.getMonth()
  if (diff < 0 || (diff === 0 && today.getDate() < birth.getDate())) age -= 1
  return age
}

function formatTimer(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function VitalsCard({ icon: Icon, label, value, suffix }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
        <div className="rounded-xl bg-teal-50 p-2 text-teal-700">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
        <span className="ml-1 text-sm font-medium text-slate-500">{suffix}</span>
      </p>
    </div>
  )
}

function AnalysisCard({ title, confidence, recommendation, tone = 'neutral' }) {
  const classes = {
    primary: 'border-l-4 border-l-teal-600 bg-white',
    neutral: 'border-l-4 border-l-slate-300 bg-white',
    alert: 'border-l-4 border-l-rose-500 bg-rose-50',
  }

  const badgeClasses = tone === 'alert'
    ? 'bg-rose-100 text-rose-700'
    : confidence >= 90
      ? 'bg-teal-50 text-teal-700'
      : 'bg-slate-100 text-slate-600'

  return (
    <div className={`rounded-2xl border border-gray-200 p-4 shadow-sm ${classes[tone] || classes.neutral}`}>
      <div className="flex items-start justify-between gap-3">
        <h4 className={`text-sm font-semibold ${tone === 'alert' ? 'text-rose-700' : 'text-slate-900'}`}>{title}</h4>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${badgeClasses}`}>{confidence}%</span>
      </div>
      <p className={`mt-3 text-sm leading-6 ${tone === 'alert' ? 'text-rose-700' : 'text-slate-600'}`}>{recommendation}</p>
    </div>
  )
}

function QuickActionButton({ icon: Icon, label, active = false }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${active ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700'}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

export default function PatientProfileView({ patientId, onBack }) {
  const [isRecording, setIsRecording] = useState(true)
  const [elapsedSeconds, setElapsedSeconds] = useState(42)
  const [activeScribeTab, setActiveScribeTab] = useState(SCRIBE_TABS[0])

  const { data: patientData } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatientById(patientId),
    enabled: !!patientId,
    retry: false,
  })

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations', patientId],
    queryFn: () => getConsultationsByPatient(patientId),
    enabled: !!patientId,
    retry: false,
  })

  const { data: vitalsHistory = [] } = useQuery({
    queryKey: ['signes-vitaux', patientId],
    queryFn: () => getSignesVitauxByPatient(patientId),
    enabled: !!patientId,
    retry: false,
  })

  useEffect(() => {
    if (!isRecording) return undefined

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [isRecording])

  const patient = useMemo(() => ({ ...fallbackPatient, ...patientData }), [patientData])
  const latestVitals = useMemo(() => ({ ...fallbackVitals, ...(vitalsHistory[0] || {}) }), [vitalsHistory])
  const recentHistory = useMemo(() => (consultations.length ? consultations.slice(0, 3) : fallbackHistory), [consultations])

  const age = calcAge(patient.date_naissance)
  const initials = `${patient.prenom?.[0] || 'H'}${patient.nom?.[0] || 'M'}`.toUpperCase()

  const renderedTabContent = useMemo(() => {
    if (activeScribeTab === 'Note structurée') {
      return (
        <div className="space-y-4 text-sm leading-7 text-slate-700">
          <p><strong>MOTIF</strong> {structuredNote.motif}</p>
          <p><strong>EXAMEN</strong> {structuredNote.examen}</p>
          <p><strong>HYPOTHÈSE</strong> {structuredNote.hypothese}</p>
          <p><strong>PLAN</strong> {structuredNote.plan}</p>
        </div>
      )
    }

    if (activeScribeTab === 'Ordonnance') {
      return (
        <div className="space-y-3 text-sm leading-7 text-slate-700">
          {prescriptionLines.map((line) => (
            <div key={line} className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
              {line}
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="text-sm leading-7 text-slate-700">
        {rawTranscription}
      </div>
    )
  }, [activeScribeTab])

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-teal-200 hover:text-teal-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </button>
      </div>

      <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-lg font-semibold text-teal-700">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{patient.prenom} {patient.nom}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {age} ans, {patient.sexe === 'homme' ? 'H' : patient.sexe === 'femme' ? 'F' : 'H'} • Dernière visite {formatDate('2024-04-01')}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="inline-flex items-center justify-center rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700">
              Allergie: Pénicilline
            </span>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Nouvelle consultation
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm md:grid-cols-2">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-white/70 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">Alerte allergie</p>
            <p className="mt-1 text-sm font-medium text-slate-700">Allergie connue à la Pénicilline. Vérifier toute prescription antibiotique.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-white/70 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">Rappel biologique</p>
            <p className="mt-1 text-sm font-medium text-slate-700">Bilan sanguin &gt; 6 mois. Actualisation recommandée lors de cette consultation.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <aside className="space-y-6 xl:col-span-3">
          <section className="rounded-2xl border border-gray-200 bg-slate-50 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Contexte</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Signes vitaux</h2>
              </div>
              <Waves className="h-5 w-5 text-teal-700" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <VitalsCard icon={Weight} label="Poids" value={latestVitals.poids || 78} suffix="kg" />
              <VitalsCard icon={Stethoscope} label="Taille" value={latestVitals.taille || 176} suffix="cm" />
              <VitalsCard icon={ClipboardList} label="IMC" value={latestVitals.imc || 25.2} suffix="" />
              <VitalsCard icon={Waves} label="Sat" value={latestVitals.saturation || 98} suffix="%" />
              <VitalsCard icon={Thermometer} label="Temp" value={latestVitals.temperature || 36.8} suffix="°C" />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-slate-50 p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Historique</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Dernières consultations</h2>
            </div>
            <div className="space-y-4">
              {recentHistory.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-teal-700 shadow-sm">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div className="mt-2 h-full w-px bg-gray-200 last:hidden" />
                  </div>
                  <div className="min-w-0 pb-4">
                    <p className="text-sm font-semibold text-slate-900">{formatDate(item.date_consult)}</p>
                    <p className="mt-1 text-sm text-slate-700">{item.motif || 'Consultation de suivi'}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.notes || 'Aucune note complémentaire.'}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="space-y-6 xl:col-span-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">IA Scribe — Dictée médicale</h2>
                    <div className="group relative">
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-500 transition hover:border-teal-200 hover:text-teal-700"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                      <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-64 -translate-x-1/2 rounded-2xl border border-gray-200 bg-slate-900 px-4 py-3 text-xs leading-5 text-white shadow-lg group-hover:block">
                        Conforme RGPD. La dictée est chiffrée localement, traitée de façon sécurisée et non partagée en dehors du dossier patient.
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-teal-700" />
                    Sécurité renforcée et traitement confidentiel de la consultation
                  </div>
                </div>

                <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-slate-50 px-5 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => setIsRecording((current) => !current)}
                    className={`relative flex h-28 w-28 items-center justify-center rounded-full text-white shadow-lg transition ${isRecording ? 'bg-[#0D9488]' : 'bg-slate-400'}`}
                    aria-label={isRecording ? 'Mettre en pause la dictée' : 'Reprendre la dictée'}
                  >
                    {isRecording ? <Mic className="relative z-10 h-10 w-10" /> : <Pause className="relative z-10 h-10 w-10" />}
                    {isRecording ? (
                      <>
                        <span className="absolute inset-0 animate-ping rounded-full bg-[#0D9488] opacity-20" />
                        <span className="absolute inset-2 rounded-full border border-white/30" />
                      </>
                    ) : null}
                  </button>
                  <p className="mt-4 text-sm font-semibold text-slate-900">{isRecording ? 'Dictée en cours' : 'En pause'}</p>
                  <p className="mt-1 text-sm text-slate-500">{formatTimer(elapsedSeconds)}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#f9fafb] p-5">
                <div className="flex min-h-[160px] items-start">
                  <p className="text-sm leading-7 text-slate-700">
                    {rawTranscription}
                    {activeScribeTab === 'Transcription brute' ? <span className="ml-1 inline-block h-5 w-0.5 animate-pulse align-middle" style={{ backgroundColor: TEAL }} /> : null}
                  </p>
                </div>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
                  Dictée chiffrée localement • Non partagée
                </div>
              </div>

              <div className="border-b border-gray-200">
                <div className="flex flex-wrap gap-5">
                  {SCRIBE_TABS.map((tab) => {
                    const active = activeScribeTab === tab
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveScribeTab(tab)}
                        className={`border-b-2 pb-3 text-sm font-medium transition ${active ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                      >
                        {tab}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                {renderedTabContent}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                  style={{ backgroundColor: TEAL }}
                >
                  <FilePenLine className="h-4 w-4" />
                  Enregistrer la dictée
                </button>
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-6 xl:col-span-3">
          <section className="rounded-2xl border border-gray-200 bg-slate-50 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Analyse Clinique IA</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Signaux en temps réel</h2>
              </div>
              <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Real-time
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <AnalysisCard
                title="Fatigue persistante 3 sem."
                confidence={92}
                recommendation="Corréler avec le bilan sanguin récent et vérifier sommeil, carences et surcharge de stress."
                tone="primary"
              />
              <AnalysisCard
                title="Suivi clinique stable"
                confidence={87}
                recommendation="Aucune anomalie d’examen immédiate. Poursuivre la surveillance et documenter l’évolution."
              />
              <AnalysisCard
                title="Alerte allergie médicamenteuse"
                confidence={100}
                recommendation="Éviter toute prescription contenant de la pénicilline. Vérifier les alternatives avant validation."
                tone="alert"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-slate-50 p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Actions rapides</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Raccourcis</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionButton icon={Mic} label="Dictée" active />
              <QuickActionButton icon={ClipboardList} label="Modèle" />
              <QuickActionButton icon={Pill} label="Prescrire" />
              <QuickActionButton icon={FlaskConical} label="Examen" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
