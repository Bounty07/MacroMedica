import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  FileText,
  FlaskConical,
  FolderOpen,
  HeartPulse,
  Menu,
  MessageCircle,
  Mic,
  Pill,
  Plus,
  Save,
  Sparkles,
  Stethoscope,
  Thermometer,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Modal from '../../components/common/Modal'
import BilingualOrdonnanceFormModal from '../../components/forms/BilingualOrdonnanceFormModal'
import { useAppContext } from '../../context/AppContext'
import {
  createConsultation,
  generatePdf,
  getPatientDashboardData,
  updateConsultation,
} from '../../lib/api'

const DEFAULT_TAB = 'vue-ensemble'
const TAB_LABELS = {
  'vue-ensemble': "Vue d'ensemble",
  'analyse-clinique': 'Analyse Clinique',
  'infos-personnelles': 'Infos personnelles',
  historique: 'Historique',
  ordonnances: 'Ordonnances',
  documents: 'Documents',
  notes: 'Notes',
}

const EMPTY_DRAFT = {
  motif: '',
  note: '',
  conclusion: '',
  aiSynthesis: '',
  extractedTasks: [],
  medications: [],
  workflowStatus: 'draft',
  updatedAt: null,
}

const DEMO_VITALS = {
  tension_systolique: 132,
  tension_diastolique: 81,
  frequence_cardiaque: 72,
  saturation: 98,
  temperature: 36.8,
}

const DEMO_AI_SYNTHESIS = "Patient hypertendu stable sous Amlodipine. Toux persistante sans signe de gravite immediate. Ferritine basse anterieure pouvant contribuer a la fatigue. Recontroler le bilan biologique et eviter toute prescription de penicilline si allergie confirmee."

const DEMO_PLAN_ITEMS = [
  {
    id: 'demo_med_1',
    label: 'Amlodipine 5 mg',
    detail: '1 cp le matin • renouvellement 3 mois',
    type: 'medication',
    done: true,
  },
  {
    id: 'demo_lab_1',
    label: 'Bilan sanguin de controle',
    detail: 'NFS, ferritine, CRP • a jeun',
    type: 'bilan',
    done: false,
  },
  {
    id: 'demo_followup_1',
    label: 'Reevaluation clinique',
    detail: 'Revoir le patient dans 10 jours si la toux persiste',
    type: 'followup',
    done: false,
  },
]

const DEMO_DOCUMENTS = [
  { id: 'demo_doc_1', nom_fichier: 'ECG_controle_15-01-2024.pdf', type_document: 'compte-rendu', created_at: '2024-01-15T10:00:00Z' },
  { id: 'demo_doc_2', nom_fichier: 'Bilan_sanguin_03-10-2023.pdf', type_document: 'biologie', created_at: '2023-10-03T08:30:00Z' },
]

const GENERALIST_DEMO_PATIENT = {
  id: 'demo-generaliste',
  prenom: 'Hatim',
  nom: 'Mazgouri',
  date_naissance: '1987-09-12',
  sexe: 'M',
  cin: 'GM-24001',
  telephone: '0660001122',
  email: 'hatim.mazgouri@example.com',
  adresse: 'Maarif, Casablanca',
  antecedents: 'HTA connue depuis 2021, dyslipidemie.',
  notes_medecin: 'Suivi chronique en cabinet de medecine generale.',
  allergies: [{ type: 'Penicilline', severity: 'Importante' }],
}

const PEDIATRIC_DEMO_VITALS = {
  tension_systolique: 98,
  tension_diastolique: 62,
  frequence_cardiaque: 96,
  saturation: 99,
  temperature: 37.1,
}

const PEDIATRIC_DEMO_AI_SYNTHESIS = "Enfant vu pour syndrome viral ORL avec otalgie droite moderee. Hydratation correcte, saturation normale, absence de signe de detresse respiratoire. Surveillance a domicile, antalgique si besoin et reevaluation rapide si fievre persistante."

const PEDIATRIC_DEMO_PLAN_ITEMS = [
  {
    id: 'demo_ped_med_1',
    label: 'Paracetamol si douleur ou fievre',
    detail: '15 mg/kg/prise, max 4 prises par jour',
    type: 'medication',
    done: true,
  },
  {
    id: 'demo_ped_followup_1',
    label: 'Controle clinique pediatrique',
    detail: 'Revoir dans 48-72h si otalgie persistante',
    type: 'followup',
    done: false,
  },
  {
    id: 'demo_ped_parent_1',
    label: 'Conseils parents',
    detail: 'Hydratation, lavage nasal, surveillance du sommeil et de l appetit',
    type: 'education',
    done: false,
  },
]

const PEDIATRIC_DEMO_DOCUMENTS = [
  { id: 'demo_ped_doc_1', nom_fichier: 'Carnet_vaccinal_maj_12-02-2026.pdf', type_document: 'vaccination', created_at: '2026-02-12T09:30:00Z' },
  { id: 'demo_ped_doc_2', nom_fichier: 'Courbe_croissance_09-04-2026.pdf', type_document: 'suivi pediatrique', created_at: '2026-04-09T11:00:00Z' },
]

const PEDIATRIC_DEMO_CONTEXT = {
  child: {
    prenom: 'Adam',
    nom: 'Bennani',
    ageLabel: '6 ans',
    date_naissance: '2019-04-14',
    sexe: 'M',
    dossierNumber: 'PED-0001',
    classe: 'CP - Groupe scolaire Atlas',
    couverture: 'CNSS ayants droit',
    poids: '22 kg',
    taille: '118 cm',
    adresse: 'Quartier Palmier, Casablanca',
  },
  guardians: [
    {
      relation: 'Mere',
      nom: 'Salma Bennani',
      telephone: '0661234567',
      email: 'salma.bennani@example.com',
    },
    {
      relation: 'Pere',
      nom: 'Youssef Bennani',
      telephone: '0678123456',
      email: 'youssef.bennani@example.com',
    },
  ],
  emergencyContact: {
    relation: 'Tante',
    nom: 'Khadija Bennani',
    telephone: '0655443322',
  },
  clinicalNotes: [
    'Vaccins a jour selon le calendrier national.',
    'Naissance a terme, aucune hospitalisation neonatale.',
    'Aucune allergie medicamenteuse connue.',
  ],
}

const PEDIATRIC_DEMO_PATIENT = {
  id: 'demo-pediatrie',
  prenom: 'Adam',
  nom: 'Bennani',
  date_naissance: '2019-04-14',
  sexe: 'M',
  cin: 'PED-0001',
  telephone: '0661234567',
  email: 'salma.bennani@example.com',
  adresse: 'Quartier Palmier, Casablanca',
  antecedents: 'Otites recidivantes, episodes ORL saisonniers.',
  notes_medecin: 'Patient mineur accompagne par sa mere. Consentement recueilli.',
  allergies: [],
}

const DASHBOARD_SPECIALTY_FLAGS = {
  generaliste: {
    showConstantes: true,
    showNotes: true,
    showClinicalAi: true,
    showGrowthCharts: false,
  },
  pediatrie: {
    showConstantes: true,
    showNotes: true,
    showClinicalAi: true,
    showGrowthCharts: true,
  },
}

function formatDate(value, options = {}) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Africa/Casablanca',
    ...options,
  })
}

function formatDateLong(value) {
  return formatDate(value, { month: 'long' })
}

function formatTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Casablanca',
  })
}

function calcAge(dateStr) {
  if (!dateStr) return null
  const birth = new Date(dateStr)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return age
}

function getInitials(patient) {
  return `${patient?.prenom?.[0] || ''}${patient?.nom?.[0] || ''}`.toUpperCase() || 'PT'
}

function normalizeSpecialtyForDashboard(value) {
  const normalized = (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalized.includes('pedi')) return 'pediatrie'
  return 'generaliste'
}

function formatWhatsAppPhone(phone) {
  if (!phone) return ''
  let normalized = String(phone).replace(/[^\d]/g, '')
  if (normalized.startsWith('00')) normalized = normalized.slice(2)
  if (normalized.startsWith('0')) normalized = `212${normalized.slice(1)}`
  return normalized
}

function buildWhatsAppIntakeMessage(patient) {
  const patientName = [patient?.prenom, patient?.nom].filter(Boolean).join(' ').trim() || 'cher patient'
  return `Bonjour ${patientName}, veuillez remplir votre dossier médical avant votre consultation sur ce lien sécurisé : https://macromedica.ma/intake/placeholder`
}

function buildPatientWhatsAppMessage(patient, pediatricContext) {
  if (pediatricContext?.guardians?.[0]) {
    const guardianName = pediatricContext.guardians[0].nom
    const childName = [patient?.prenom || pediatricContext.child.prenom, patient?.nom || pediatricContext.child.nom].filter(Boolean).join(' ').trim()
    return `Bonjour ${guardianName}, veuillez remplir le dossier medical de ${childName} avant la consultation sur ce lien securise : https://macromedica.ma/intake/placeholder`
  }

  return buildWhatsAppIntakeMessage(patient)
}

function toDraftFromNotes(notes, consultation) {
  if (!notes) {
    return { ...EMPTY_DRAFT, updatedAt: consultation?.created_at || new Date().toISOString() }
  }
  try {
    const parsed = typeof notes === 'string' ? JSON.parse(notes) : notes
    if (parsed && typeof parsed === 'object') {
      return {
        ...EMPTY_DRAFT,
        ...parsed,
        note: parsed.note || parsed.notes || '',
        extractedTasks: Array.isArray(parsed.extractedTasks) ? parsed.extractedTasks : [],
        medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      }
    }
  } catch {
    // Legacy plain text note.
  }
  return {
    ...EMPTY_DRAFT,
    note: String(notes),
    updatedAt: consultation?.created_at || new Date().toISOString(),
  }
}

function buildConsultationPayload(draft) {
  return JSON.stringify({
    motif: draft.motif,
    note: draft.note,
    conclusion: draft.conclusion,
    aiSynthesis: draft.aiSynthesis,
    extractedTasks: draft.extractedTasks,
    medications: draft.medications,
    workflowStatus: draft.workflowStatus || 'draft',
    updatedAt: draft.updatedAt || new Date().toISOString(),
  })
}

function buildLocalStorageKey(patientId, consultationId) {
  return `macromedica-patient-draft:${patientId}:${consultationId || 'new'}`
}

function extractMedicationCandidates(text) {
  if (!text) return []
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  const matches = []
  lines.forEach((line) => {
    const match = line.match(/(Amlodipine\s+\d+(?:[.,]\d+)?\s?mg|Metformine\s+\d+(?:[.,]\d+)?\s?mg|Paracetamol\s+\d+(?:[.,]\d+)?\s?g)/i)
    if (match) {
      const posology = line
        .replace(match[1], '')
        .replace(/^-+/, '')
        .replace(/^:+/, '')
        .trim()
      matches.push({
        id: `med_${Math.random().toString(36).slice(2, 8)}`,
        nom: match[1],
        posologie,
        duree: '',
        nom_en: '',
        posologie_en: '',
        duree_en: '',
      })
    }
  })
  return matches
}

function fallbackAiExtraction(draft, patient) {
  const note = draft.note || ''
  const medications = extractMedicationCandidates(note)
  const extractedTasks = []

  if (/bilan|nfs|ferritine|crp/i.test(note)) {
    extractedTasks.push({
      id: 'task_bilan',
      label: 'Bilan sanguin',
      detail: 'NFS, ferritine, CRP',
      type: 'bilan',
      done: false,
    })
  }
  medications.forEach((medication, index) => {
    extractedTasks.push({
      id: `task_med_${index}`,
      label: medication.nom,
      detail: medication.posologie || 'Prescription detectee',
      type: 'medication',
      done: false,
    })
  })

  return {
    aiSynthesis: draft.aiSynthesis || `${patient?.prenom || 'Le patient'} est en consultation pour ${draft.motif || 'un suivi clinique'}.`,
    extractedTasks,
    medications,
  }
}

function buildDemoPatientForSpecialty(isPediatricView) {
  return isPediatricView ? PEDIATRIC_DEMO_PATIENT : GENERALIST_DEMO_PATIENT
}

function CardSection({ title, subtitle, actions, children, badge }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{subtitle}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
        </div>
        {badge || actions ? (
          <div className="flex w-full flex-wrap items-center gap-2">
            {badge ? <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{badge}</span> : null}
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function GrowthChartsPlaceholder() {
  const growthMetrics = [
    { label: 'Poids / Age', percentile: 'P62', width: '62%' },
    { label: 'Taille / Age', percentile: 'P58', width: '58%' },
    { label: 'IMC / Age', percentile: 'P51', width: '51%' },
  ]

  return (
    <CardSection title="Courbes de croissance" subtitle="Pediatrie">
      <div className="space-y-4">
        <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
          <p className="text-sm font-medium text-slate-700">
            Placeholder pediatrique pour les demos. Les percentiles et courbes OMS apparaîtront ici quand le module sera branché.
          </p>
        </div>
        <div className="space-y-3">
          {growthMetrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">{metric.label}</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {metric.percentile}
                </span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400" style={{ width: metric.width }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </CardSection>
  )
}

function PediatricContextCard({ patient, context }) {
  if (!context) return null

  const childName = [patient?.prenom || context.child.prenom, patient?.nom || context.child.nom].filter(Boolean).join(' ').trim()
  const numericAge = patient?.date_naissance ? calcAge(patient.date_naissance) : null
  const childAge = numericAge != null ? `${numericAge} ans` : context.child.ageLabel

  return (
    <CardSection title="Contexte familial" subtitle="Pediatrie">
      <div className="space-y-4">
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Enfant</p>
          <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <p><strong>Nom:</strong> {childName}</p>
            <p><strong>Age:</strong> {childAge}</p>
            <p><strong>Classe:</strong> {context.child.classe}</p>
            <p><strong>Couverture:</strong> {context.child.couverture}</p>
            <p><strong>Poids:</strong> {context.child.poids}</p>
            <p><strong>Taille:</strong> {context.child.taille}</p>
          </div>
        </div>

        <div className="grid gap-3">
          {context.guardians.map((guardian) => (
            <div key={`${guardian.relation}_${guardian.telephone}`} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{guardian.relation}</p>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                <p><strong>Nom:</strong> {guardian.nom}</p>
                <p><strong>Telephone:</strong> {guardian.telephone}</p>
                <p><strong>Email:</strong> {guardian.email}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Urgence & suivi</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p><strong>Contact urgence:</strong> {context.emergencyContact.nom} ({context.emergencyContact.relation}) - {context.emergencyContact.telephone}</p>
            {context.clinicalNotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </div>
      </div>
    </CardSection>
  )
}

function SectionDrawer({ title, open, onClose, children }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[85] bg-slate-950/50 md:hidden" onClick={onClose}>
      <div className="absolute inset-y-0 left-0 w-[88%] max-w-sm overflow-y-auto bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button type="button" className="rounded-xl border border-slate-200 p-2 text-slate-500" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

function PatientInfoModal({ patient, open, onClose, pediatricContext }) {
  if (!patient) return null

  return (
    <Modal open={open} onClose={onClose} title="Infos personnelles" description="Details administratifs et medicaux du patient." width="max-w-3xl">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Identite</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p><strong>Nom:</strong> {patient.prenom} {patient.nom}</p>
            <p><strong>Date de naissance:</strong> {patient.date_naissance ? formatDate(patient.date_naissance) : 'Non renseignee'}</p>
            <p><strong>Age:</strong> {calcAge(patient.date_naissance) || '--'} ans</p>
            <p><strong>Sexe:</strong> {patient.sexe || '--'}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Contact</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p><strong>Telephone:</strong> {patient.telephone || 'Non renseigne'}</p>
            <p><strong>Email:</strong> {patient.email || 'Non renseigne'}</p>
            <p><strong>Adresse:</strong> {patient.adresse || 'Non renseignee'}</p>
          </div>
        </div>
        {pediatricContext ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Pediatrie - parents & tuteurs</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {pediatricContext.guardians.map((guardian) => (
                <div key={`${guardian.relation}_${guardian.telephone}`} className="rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-slate-700">
                  <p><strong>{guardian.relation}:</strong> {guardian.nom}</p>
                  <p><strong>Telephone:</strong> {guardian.telephone}</p>
                  <p><strong>Email:</strong> {guardian.email}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-700">
              <strong>Contact urgence:</strong> {pediatricContext.emergencyContact.nom} ({pediatricContext.emergencyContact.relation}) - {pediatricContext.emergencyContact.telephone}
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

function ConsultationHistoryModal({ consultation, open, onClose, onCopy }) {
  const draft = useMemo(() => toDraftFromNotes(consultation?.notes, consultation), [consultation])

  return (
    <Modal open={open} onClose={onClose} title={consultation ? `Consultation du ${formatDate(consultation.date_consult)}` : 'Historique'} description="Lecture seule." width="max-w-4xl">
      {!consultation ? null : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Motif</p>
            <p className="mt-2 text-sm text-slate-700">{draft.motif || 'Non renseigne'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Compte-rendu</p>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-700">{draft.note || consultation.notes || 'Aucune note.'}</pre>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600" onClick={onClose}>
              Fermer
            </button>
            <button type="button" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" onClick={() => onCopy?.(draft)}>
              Copier
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function PatientDashboardPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { notify, profile, requestConfirmation, cabinetSpecialite, specialiteKey } = useAppContext()
  const { id: patientId, consultationId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const routeInfoOpen = location.pathname.endsWith('/info')
  const activeTab = searchParams.get('tab') || DEFAULT_TAB
  const specialtyOverride = searchParams.get('specialty')
  const localStorageKey = buildLocalStorageKey(patientId, consultationId)

  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isFinalized, setIsFinalized] = useState(false)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)
  const [ordonnanceOpen, setOrdonnanceOpen] = useState(activeTab === 'ordonnances')
  const [mobileDrawer, setMobileDrawer] = useState(null)
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechError, setSpeechError] = useState('')

  const noteEditorRef = useRef(null)
  const aiRef = useRef(null)
  const historyRef = useRef(null)
  const documentsRef = useRef(null)
  const speechRef = useRef(null)

  const dashboardQuery = useQuery({
    queryKey: ['patient-dashboard', patientId],
    queryFn: () => getPatientDashboardData(patientId),
    enabled: !!patientId,
    staleTime: 60_000,
    retry: 1,
  })

  const specialtyForView = normalizeSpecialtyForDashboard(specialtyOverride || profile?.specialite || cabinetSpecialite || specialiteKey)
  const isPediatricView = specialtyForView === 'pediatrie'
  const fallbackPatient = useMemo(() => buildDemoPatientForSpecialty(isPediatricView), [isPediatricView])
  const patient = dashboardQuery.data?.patient || fallbackPatient
  const consultations = dashboardQuery.data?.consultations || []
  const documents = dashboardQuery.data?.documents || []
  const vitalsHistory = dashboardQuery.data?.vitalsHistory || []
  const currentConsultation = useMemo(
    () => consultations.find((entry) => entry.id === consultationId) || null,
    [consultationId, consultations],
  )

  const patientAllergies = useMemo(() => {
    if (!patient?.allergies) return []
    if (Array.isArray(patient.allergies)) return patient.allergies
    return String(patient.allergies)
      .split(/[;,]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => ({ type: entry, severity: 'Non precisee' }))
  }, [patient])

  const mutateDraft = useCallback((updater) => {
    setDraft((current) => {
      const patch = typeof updater === 'function' ? updater(current) : updater
      return { ...current, ...patch }
    })
    setIsDirty(true)
  }, [])

  const saveDraftToLocalStorage = useCallback((nextDraft) => {
    localStorage.setItem(localStorageKey, JSON.stringify({
      ...nextDraft,
      updatedAt: new Date().toISOString(),
    }))
  }, [localStorageKey])

  useEffect(() => {
    setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition))
  }, [])

  useEffect(() => {
    if (activeTab === 'ordonnances') setOrdonnanceOpen(true)
    const targetMap = {
      'analyse-clinique': aiRef,
      historique: historyRef,
      documents: documentsRef,
    }
    const target = targetMap[activeTab]
    if (target?.current) {
      window.setTimeout(() => target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [activeTab])

  useEffect(() => {
    if (!patientId) return
    const localDraftRaw = localStorage.getItem(localStorageKey)
    let nextDraft = currentConsultation ? toDraftFromNotes(currentConsultation.notes, currentConsultation) : { ...EMPTY_DRAFT }

    if (localDraftRaw) {
      try {
        nextDraft = { ...nextDraft, ...JSON.parse(localDraftRaw) }
      } catch {
        // Ignore malformed local draft.
      }
    }

    setDraft(nextDraft)
    setLastSavedAt(nextDraft.updatedAt || currentConsultation?.created_at || null)
    setIsFinalized(nextDraft.workflowStatus === 'finalized')
    setIsDirty(false)
  }, [currentConsultation, localStorageKey, patientId])

  useEffect(() => {
    if (!isDirty || isFinalized) return undefined
    const debounce = window.setTimeout(() => {
      saveDraftToLocalStorage(draft)
      setLastSavedAt(new Date().toISOString())
    }, 5000)
    return () => window.clearTimeout(debounce)
  }, [draft, isDirty, isFinalized, saveDraftToLocalStorage])

  useEffect(() => {
    if (!isDirty || isFinalized) return undefined
    const interval = window.setInterval(() => {
      saveDraftToLocalStorage(draft)
      setLastSavedAt(new Date().toISOString())
    }, 30000)
    return () => window.clearInterval(interval)
  }, [draft, isDirty, isFinalized, saveDraftToLocalStorage])

  useEffect(() => () => {
    if (speechRef.current) speechRef.current.stop()
  }, [])

  const wordCount = useMemo(() => {
    const text = `${draft.motif} ${draft.note} ${draft.conclusion}`.trim()
    return text ? text.split(/\s+/).filter(Boolean).length : 0
  }, [draft.conclusion, draft.motif, draft.note])

  const extractedMedications = useMemo(() => {
    if (draft.medications?.length) return draft.medications
    return extractMedicationCandidates(draft.note)
  }, [draft.medications, draft.note])
  const doctor = useMemo(() => ({
    specialite: specialtyForView,
  }), [specialtyForView])
  const specialtyFlags = DASHBOARD_SPECIALTY_FLAGS[doctor.specialite] || DASHBOARD_SPECIALTY_FLAGS.generaliste
  const pediatricContext = useMemo(() => {
    if (!isPediatricView) return null
    return {
      ...PEDIATRIC_DEMO_CONTEXT,
      child: {
        ...PEDIATRIC_DEMO_CONTEXT.child,
        prenom: patient?.prenom || PEDIATRIC_DEMO_CONTEXT.child.prenom,
        nom: patient?.nom || PEDIATRIC_DEMO_CONTEXT.child.nom,
      },
    }
  }, [isPediatricView, patient])
  const displayPatient = useMemo(() => {
    if (!patient) return null
    if (!isPediatricView || !pediatricContext) return patient

    return {
      ...patient,
      prenom: pediatricContext.child.prenom,
      nom: pediatricContext.child.nom,
      date_naissance: pediatricContext.child.date_naissance,
      sexe: pediatricContext.child.sexe,
      cin: pediatricContext.child.dossierNumber,
      telephone: pediatricContext.guardians[0]?.telephone || patient.telephone,
      email: pediatricContext.guardians[0]?.email || patient.email,
      adresse: pediatricContext.child.adresse || patient.adresse,
      antecedents: 'Otites recidivantes, episodes ORL saisonniers.',
      notes_medecin: 'Patient mineur accompagne par sa mere. Consentement recueilli.',
    }
  }, [isPediatricView, patient, pediatricContext])
  const currentVitals = vitalsHistory[0] || (isPediatricView ? PEDIATRIC_DEMO_VITALS : DEMO_VITALS)
  const displayAiSynthesis = draft.aiSynthesis || (isPediatricView ? PEDIATRIC_DEMO_AI_SYNTHESIS : DEMO_AI_SYNTHESIS)
  const displayPlanItems = draft.extractedTasks?.length ? draft.extractedTasks : (isPediatricView ? PEDIATRIC_DEMO_PLAN_ITEMS : DEMO_PLAN_ITEMS)
  const displayDocuments = documents.length ? documents.slice(0, 6) : (isPediatricView ? PEDIATRIC_DEMO_DOCUMENTS : DEMO_DOCUMENTS)

  const buildPatientSearch = useCallback((tabValue = activeTab) => {
    const next = new URLSearchParams()
    if (tabValue && tabValue !== DEFAULT_TAB) next.set('tab', tabValue)
    if (specialtyOverride) next.set('specialty', specialtyOverride)
    return next.toString() ? `?${next.toString()}` : ''
  }, [activeTab, specialtyOverride])

  const refreshAiExtraction = async () => {
    const next = fallbackAiExtraction(draft, displayPatient)
    mutateDraft({
      aiSynthesis: next.aiSynthesis,
      extractedTasks: next.extractedTasks,
      medications: next.medications,
    })
    notify({
      title: 'Synthese IA mise a jour',
      description: 'Les suggestions ont ete recalculees a partir de la note.',
    })
  }

  const persistConsultation = async ({ finalize = false } = {}) => {
    if (!patientId || !profile?.cabinet_id) return null
    const nextDraft = {
      ...draft,
      workflowStatus: finalize ? 'finalized' : 'draft',
      updatedAt: new Date().toISOString(),
      medications: extractedMedications,
    }

    setIsSaving(true)
    try {
      const payload = {
        cabinet_id: profile.cabinet_id,
        patient_id: patientId,
        montant: currentConsultation?.montant || 0,
        statut: currentConsultation?.statut || 'paye',
        date_consult: currentConsultation?.date_consult || new Date().toISOString().split('T')[0],
        notes: buildConsultationPayload(nextDraft),
      }
      const saved = currentConsultation?.id
        ? await updateConsultation(currentConsultation.id, payload)
        : await createConsultation(payload)

      localStorage.removeItem(localStorageKey)
      setDraft(nextDraft)
      setIsDirty(false)
      setLastSavedAt(nextDraft.updatedAt)
      setIsFinalized(finalize)
      await queryClient.invalidateQueries({ queryKey: ['patient-dashboard', patientId] })
      if (!consultationId || consultationId !== saved.id) {
        navigate(`/patients/${patientId}/consultations/${saved.id}${buildPatientSearch(activeTab)}`, { replace: true })
      }
      return saved
    } catch (error) {
      console.error(error)
      notify({
        title: finalize ? 'Finalisation impossible' : 'Sauvegarde impossible',
        description: error?.message || "Une erreur s'est produite.",
        tone: 'error',
      })
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    const saved = await persistConsultation()
    if (saved) {
      notify({
        title: 'Brouillon sauvegarde',
        description: 'Derniere sauvegarde mise a jour.',
      })
    }
  }

  const handleFinalize = async () => {
    if (!draft.motif.trim() || !draft.conclusion.trim()) {
      notify({
        title: 'Champs requis manquants',
        description: 'Le motif et la conclusion sont obligatoires.',
        tone: 'error',
      })
      return
    }

    const saved = await persistConsultation({ finalize: true })
    if (!saved) return
    try {
      await generatePdf({
        type_document: 'recu_consultation',
        consultation_id: saved.id,
        patient_id: patientId,
        cabinet_id: profile.cabinet_id,
      })
    } catch (error) {
      console.warn('generatePdf failed', error)
    }
    setFinalizeModalOpen(false)
    notify({
      title: 'Consultation finalisee',
      description: 'Le dossier est maintenant verrouille.',
    })
  }

  const handleCancelChanges = () => {
    requestConfirmation({
      title: 'Annuler les modifications ?',
      description: 'Les changements non sauvegardes seront perdus.',
      confirmLabel: 'Annuler les modifications',
      onConfirm: () => {
        localStorage.removeItem(localStorageKey)
        const nextDraft = currentConsultation ? toDraftFromNotes(currentConsultation.notes, currentConsultation) : { ...EMPTY_DRAFT }
        setDraft(nextDraft)
        setIsDirty(false)
        setLastSavedAt(nextDraft.updatedAt || currentConsultation?.created_at || null)
      },
    })
  }

  const changeTab = (tab) => {
    if (tab === 'infos-personnelles') {
      navigate(`/patients/${patientId}/info${buildPatientSearch(activeTab)}`)
      return
    }
    const next = new URLSearchParams(searchParams)
    if (tab === DEFAULT_TAB) next.delete('tab')
    else next.set('tab', tab)
    if (routeInfoOpen) {
      navigate(`/patients/${patientId}${consultationId ? `/consultations/${consultationId}` : ''}${next.toString() ? `?${next.toString()}` : ''}`)
    } else {
      setSearchParams(next)
    }
  }

  const insertTextAtCursor = useCallback((text) => {
    const textarea = noteEditorRef.current
    if (!textarea) {
      mutateDraft((current) => ({ note: `${current.note}${current.note ? '\n' : ''}${text}` }))
      return
    }
    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const nextValue = `${draft.note.slice(0, start)}${text}${draft.note.slice(end)}`
    mutateDraft({ note: nextValue })
    window.requestAnimationFrame(() => {
      textarea.focus()
      const cursor = start + text.length
      textarea.setSelectionRange(cursor, cursor)
    })
  }, [draft.note, mutateDraft])

  const togglePlanItem = (itemId) => {
    mutateDraft((current) => {
      const sourceItems = current.extractedTasks?.length ? current.extractedTasks : (isPediatricView ? PEDIATRIC_DEMO_PLAN_ITEMS : DEMO_PLAN_ITEMS)
      const nextItems = sourceItems.map((item) => item.id === itemId ? { ...item, done: !item.done } : item)
      const item = nextItems.find((entry) => entry.id === itemId)
      if (!item) return { extractedTasks: sourceItems }
      let nextNote = current.note || ''
      const marker = `[✓] ${item.label}`
      if (item.done && !nextNote.includes(marker)) {
        nextNote = `${nextNote.trim()}${nextNote.trim() ? '\n' : ''}${marker}`
      }
      if (!item.done) {
        nextNote = nextNote.replace(new RegExp(`\\n?\\[✓\\]\\s${item.label}`, 'g'), '').trim()
      }
      return { extractedTasks: nextItems, note: nextNote }
    })
  }

  const handleHistoryCopy = (historyDraft) => {
    mutateDraft((current) => ({
      note: `${current.note.trim()}${current.note.trim() ? '\n\n' : ''}${historyDraft.note || ''}`.trim(),
    }))
    setSelectedHistoryItem(null)
    notify({
      title: 'Historique copie',
      description: 'Le texte a ete insere dans la note courante.',
    })
  }

  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechError("La reconnaissance vocale n'est pas disponible sur cet appareil.")
      return
    }
    if (speechRef.current) {
      speechRef.current.stop()
      speechRef.current = null
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onstart = () => {
      setSpeechError('')
      setIsListening(true)
    }
    recognition.onend = () => {
      setIsListening(false)
      speechRef.current = null
    }
    recognition.onerror = (event) => {
      setSpeechError(event.error || 'Erreur de micro')
      setIsListening(false)
      speechRef.current = null
    }
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .slice(event.resultIndex)
        .map((entry) => entry[0]?.transcript || '')
        .join(' ')
        .trim()
      if (text) insertTextAtCursor(`${text} `)
    }
    speechRef.current = recognition
    recognition.start()
  }

  const handleOpenWhatsAppIntake = () => {
    const formattedPhone = formatWhatsAppPhone(displayPatient?.telephone || pediatricContext?.guardians?.[0]?.telephone)
    if (!formattedPhone) {
      notify({
        title: 'Numero indisponible',
        description: 'Ajoutez un numero de telephone valide pour envoyer le lien WhatsApp.',
        tone: 'error',
      })
      return
    }

    const message = encodeURIComponent(buildPatientWhatsAppMessage(displayPatient, pediatricContext))
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank', 'noopener,noreferrer')
  }

  const handleStartNewConsultation = () => {
    localStorage.removeItem(localStorageKey)
    const nextDraft = { ...EMPTY_DRAFT }
    setDraft(nextDraft)
    setIsDirty(false)
    setLastSavedAt(null)
    setIsFinalized(false)
    setOrdonnanceOpen(false)
    setFinalizeModalOpen(false)
    setSelectedHistoryItem(null)
    navigate(`/patients/${patientId}${buildPatientSearch(DEFAULT_TAB)}`, { replace: true })
  }

  if (dashboardQuery.isLoading) {
    return <div className="flex justify-center p-20 text-slate-500">Chargement du dossier patient...</div>
  }

  if (!patient) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700">Patient introuvable.</div>
  }

  const topAlerts = [
    ...patientAllergies.map((item) => ({
      key: item.type,
      title: 'Alerte allergie',
      body: `${item.type}${item.severity ? ` - ${item.severity}` : ''}`,
    })),
    ...(draft.note.match(/bilan|ferritine|nfs/i) ? [{
      key: 'labs',
      title: 'Rappel biologique',
      body: 'Un bilan est mentionne dans la consultation en cours.',
    }] : []),
  ].slice(0, 2)

  const leftSidebar = (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-white">
            {getInitials(displayPatient)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{displayPatient.prenom} {displayPatient.nom}</h2>
            <p className="text-sm text-slate-500">{calcAge(displayPatient.date_naissance) || '--'} ans • {displayPatient.sexe || '--'}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Dossier</p>
            <p className="mt-1 text-slate-700">{displayPatient.cin || displayPatient.id?.split('-')[0] || '--'}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Telephone</p>
            <p className="mt-1 text-slate-700">{displayPatient.telephone || 'Non renseigne'}</p>
          </div>
        </div>
      </section>

      <div ref={historyRef}>
        <CardSection
          title="Historique clinique"
          subtitle="Historique"
          badge="Lecture seule"
        >
          <div className="space-y-4">
            {consultations.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune consultation precedente.</p>
            ) : consultations.map((entry) => {
              const entryDraft = toDraftFromNotes(entry.notes, entry)
              return (
                <button
                  key={entry.id}
                  type="button"
                  className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-200 hover:bg-teal-50/40"
                  onClick={() => setSelectedHistoryItem(entry)}
                >
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">{formatDate(entry.date_consult)}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{entryDraft.motif || 'Consultation de suivi'}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{entryDraft.conclusion || entryDraft.note || 'Aucune note complementaire.'}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </CardSection>
      </div>

      <section className="grid grid-cols-3 gap-2 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
        <button type="button" className="rounded-2xl p-3 text-center text-sm text-slate-700 transition hover:bg-slate-50" onClick={() => setOrdonnanceOpen(true)}>
          <Pill className="mx-auto h-5 w-5" />
          <span className="mt-2 block text-xs font-medium">Ordonnance</span>
        </button>
        <button type="button" className="rounded-2xl p-3 text-center text-sm text-slate-700 transition hover:bg-slate-50" onClick={() => insertTextAtCursor('\nBilan recommande:\n- NFS\n- Ferritine\n- CRP\n')}>
          <FlaskConical className="mx-auto h-5 w-5" />
          <span className="mt-2 block text-xs font-medium">Bilan</span>
        </button>
        <button type="button" className="rounded-2xl p-3 text-center text-sm text-slate-700 transition hover:bg-slate-50" onClick={() => navigate('/agenda')}>
          <CalendarDays className="mx-auto h-5 w-5" />
          <span className="mt-2 block text-xs font-medium">RV</span>
        </button>
      </section>
      {isPediatricView ? <PediatricContextCard patient={displayPatient} context={pediatricContext} /> : null}
    </div>
  )

  const rightSidebar = (
    <div className="space-y-4">
      {specialtyFlags.showConstantes ? (
        <CardSection title="Constantes du jour" subtitle="Constantes">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(138px,1fr))] gap-3">
          {[
            { label: 'TA', value: currentVitals.tension_systolique && currentVitals.tension_diastolique ? `${currentVitals.tension_systolique}/${currentVitals.tension_diastolique}` : '--', suffix: 'mmHg', icon: HeartPulse },
            { label: 'FC', value: currentVitals.frequence_cardiaque || '--', suffix: 'bpm', icon: Activity },
            { label: 'SpO2', value: currentVitals.saturation || '--', suffix: '%', icon: Stethoscope },
            { label: 'Temp', value: currentVitals.temperature || '--', suffix: '°C', icon: Thermometer },
          ].map((item) => (
            <div key={item.label} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{item.label}</span>
                <item.icon className="h-4 w-4 text-teal-600" />
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-x-1 gap-y-1">
                <p className="text-[1.75rem] font-semibold leading-none tracking-tight text-slate-900">{item.value}</p>
                <span className="pb-0.5 text-xs font-medium text-slate-400">{item.suffix}</span>
              </div>
            </div>
          ))}
        </div>
        </CardSection>
      ) : null}

      {specialtyFlags.showGrowthCharts ? <GrowthChartsPlaceholder /> : null}

      {specialtyFlags.showClinicalAi ? (
        <div ref={aiRef}>
          <CardSection
            title="Synthese IA"
            subtitle="Analyse clinique"
            actions={(
              <>
                <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600" onClick={refreshAiExtraction}>
                  Ajouter
                </button>
                <button type="button" className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white" onClick={() => insertTextAtCursor(`${displayAiSynthesis}\n`)}>
                  Inserer au CR
                </button>
              </>
            )}
          >
            <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Synthese IA MacroMedica</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{displayAiSynthesis}</p>
            </div>
          </CardSection>
        </div>
      ) : null}

      <CardSection title="Plan & prescriptions" subtitle="Plan">
        <div className="space-y-3">
          {displayPlanItems.map((item) => (
            <div key={item.id} className={`flex items-start gap-3 rounded-2xl border p-3 ${item.done ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white'}`}>
              <button
                type="button"
                aria-pressed={Boolean(item.done)}
                aria-label={item.done ? `Marquer ${item.label} comme non fait` : `Marquer ${item.label} comme fait`}
                onClick={() => togglePlanItem(item.id)}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${item.done ? 'border-emerald-600 bg-white text-emerald-700' : 'border-slate-300 bg-white text-transparent hover:border-teal-500'}`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${item.done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              </div>
              {item.type === 'medication' ? <Pill className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> : <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
            </div>
          ))}
        </div>
      </CardSection>

      <div ref={documentsRef}>
        <CardSection title="Documents recents" subtitle="Documents">
          <div className="space-y-2">
            {displayDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white">
                  <FileText className="h-4 w-4 text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{doc.nom_fichier}</p>
                  <p className="text-xs text-slate-500">{doc.type_document} • {formatDate(doc.created_at)}</p>
                </div>
                <FolderOpen className="h-4 w-4 text-slate-400" />
              </div>
            ))}
          </div>
        </CardSection>
      </div>
    </div>
  )

  const closeInfoModal = () => {
    navigate(`/patients/${patientId}${consultationId ? `/consultations/${consultationId}` : ''}${buildPatientSearch(activeTab)}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-teal-200 hover:text-teal-700" onClick={() => navigate('/patients')}>
          <ChevronLeft className="h-4 w-4" />
          Retour aux patients
        </button>
        <div className="flex items-center gap-2 xl:hidden">
          <button type="button" className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500" onClick={() => setMobileDrawer('history')}>
            <Menu className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500" onClick={() => setMobileDrawer('plan')}>
            <ClipboardList className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>Dossier Patient</span>
              <span>›</span>
              <button type="button" className="font-medium text-teal-700" onClick={handleStartNewConsultation}>
                {displayPatient.prenom} {displayPatient.nom}
              </button>
              <span>›</span>
              <span className="font-medium text-slate-800">Consultation du {formatDate(currentConsultation?.date_consult || new Date().toISOString())}</span>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900 text-xl font-semibold text-white">
                {getInitials(displayPatient)}
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{displayPatient.prenom} {displayPatient.nom}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {calcAge(displayPatient.date_naissance) || '--'} ans • {displayPatient.sexe || '--'} • Dossier #{displayPatient.cin || displayPatient.id?.split('-')[0] || '--'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isFinalized ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                {isFinalized ? 'Finalisee' : 'Brouillon'}
              </span>
              <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                <CalendarDays className="h-4 w-4" />
                {lastSavedAt ? `Derniere sauvegarde ${formatTime(lastSavedAt)}` : 'Aucune sauvegarde'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {patientAllergies.slice(0, 2).map((item) => (
                <span key={item.type} className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700">
                  Allergie: {item.type}
                </span>
              ))}
              {isPediatricView ? (
                <span className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700">
                  Pediatrie active
                </span>
              ) : null}
              <button
                type="button"
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                onClick={handleOpenWhatsAppIntake}
              >
                <MessageCircle className="mr-2 inline h-4 w-4" />
                Lien WhatsApp
              </button>
              <button type="button" className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white" onClick={handleStartNewConsultation}>
                <Plus className="mr-2 inline h-4 w-4" />
                Nouvelle consultation
              </button>
            </div>
          </div>
        </div>
      </div>

      {topAlerts.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {topAlerts.map((alert) => (
            <div key={alert.key} className="flex items-start gap-3 rounded-[24px] border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">{alert.title}</p>
                <p className="mt-1 text-sm text-slate-700">{alert.body}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-2">
          {Object.entries(TAB_LABELS).map(([tabKey, label]) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => changeTab(tabKey)}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${activeTab === tabKey || (tabKey === 'infos-personnelles' && routeInfoOpen) ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <aside className="hidden xl:col-span-3 xl:block">{leftSidebar}</aside>

        <main className="xl:col-span-6">
          {specialtyFlags.showNotes ? (
          <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Consultation du {formatDateLong(currentConsultation?.date_consult || new Date().toISOString())}</h2>
                <p className="mt-1 text-sm text-slate-500">Dossier medical unifie • consultation active</p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isFinalized ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                {isFinalized ? 'Finalisee' : 'Brouillon'}
              </span>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Motif de consultation</label>
                <input
                  value={draft.motif}
                  disabled={isFinalized}
                  onChange={(event) => mutateDraft({ motif: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-teal-300 focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100"
                  placeholder="Motif principal de consultation"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[displayPatient.antecedents, displayPatient.notes_medecin, ...patientAllergies.map((item) => `Allergie ${item.type}`)]
                  .filter(Boolean)
                  .slice(0, 5)
                  .map((entry, index) => (
                    <span key={`${entry}_${index}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                      {String(entry)}
                    </span>
                  ))}
              </div>

              <div className="relative overflow-hidden rounded-[24px] border border-slate-200">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-white">
                    <strong>B</strong>
                  </button>
                  <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-white">
                    <em>I</em>
                  </button>
                  <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-white">•</button>
                  <div className="mx-1 h-5 w-px bg-slate-300" />
                  <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white" onClick={refreshAiExtraction}>
                    <Sparkles className="h-3.5 w-3.5" />
                    IA
                  </button>
                </div>

                <textarea
                  ref={noteEditorRef}
                  value={draft.note}
                  disabled={isFinalized}
                  onChange={(event) => mutateDraft({ note: event.target.value })}
                  className="min-h-[360px] w-full resize-none bg-white px-5 py-5 text-base leading-7 text-slate-700 outline-none disabled:cursor-not-allowed disabled:bg-slate-50"
                  placeholder="Saisissez le compte-rendu, l'examen clinique, les hypotheses et le plan..."
                />

                <button
                  type="button"
                  onClick={startSpeechRecognition}
                  disabled={isFinalized}
                  className={`absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition ${isListening ? 'bg-rose-600' : 'bg-teal-600 hover:bg-teal-700'} disabled:cursor-not-allowed disabled:bg-slate-400 md:h-14 md:w-14`}
                >
                  <Mic className="h-5 w-5" />
                </button>
              </div>

              {speechError ? (
                <p className="text-sm text-rose-600">{speechError}</p>
              ) : speechSupported ? (
                <p className="text-sm text-slate-500">{isListening ? 'Dictee en cours (francais/darija selon le navigateur).' : 'Le micro insere le texte a la position du curseur.'}</p>
              ) : (
                <p className="text-sm text-slate-500">Reconnaissance vocale non disponible sur ce navigateur.</p>
              )}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Conclusion</label>
                <textarea
                  value={draft.conclusion}
                  disabled={isFinalized}
                  onChange={(event) => mutateDraft({ conclusion: event.target.value })}
                  className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-teal-300 focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100"
                  placeholder="Conclusion, diagnostic retenu et suites a donner"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                {isSaving ? <Save className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                <span>{lastSavedAt ? `Derniere sauvegarde a ${formatTime(lastSavedAt)}` : 'Non sauvegarde'}</span>
                <span className="text-slate-400">•</span>
                <span>{wordCount} mots</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700" onClick={handleCancelChanges}>
                  Annuler
                </button>
                <button type="button" className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white" onClick={handleSave} disabled={isSaving || isFinalized}>
                  Enregistrer
                </button>
                <button type="button" className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white" onClick={() => setFinalizeModalOpen(true)} disabled={isSaving || isFinalized}>
                  Finaliser
                </button>
                <button type="button" className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-teal-700 ring-1 ring-teal-200" onClick={() => setOrdonnanceOpen(true)}>
                  Generer ordonnance
                </button>
              </div>
            </div>
          </section>
          ) : null}
        </main>

        <aside className="hidden xl:col-span-3 xl:block">{rightSidebar}</aside>
      </div>

      <SectionDrawer title="Historique clinique" open={mobileDrawer === 'history'} onClose={() => setMobileDrawer(null)}>
        {leftSidebar}
      </SectionDrawer>
      <SectionDrawer title="Plan & documents" open={mobileDrawer === 'plan'} onClose={() => setMobileDrawer(null)}>
        {rightSidebar}
      </SectionDrawer>

      <PatientInfoModal patient={displayPatient} open={routeInfoOpen} onClose={closeInfoModal} pediatricContext={pediatricContext} />
      <ConsultationHistoryModal consultation={selectedHistoryItem} open={Boolean(selectedHistoryItem)} onClose={() => setSelectedHistoryItem(null)} onCopy={handleHistoryCopy} />

      <Modal open={finalizeModalOpen} onClose={() => setFinalizeModalOpen(false)} title="Finaliser la consultation" description="Cette action verrouille l'edition et lance la generation du PDF." width="max-w-xl">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p><strong>Motif:</strong> {draft.motif || 'Non renseigne'}</p>
            <p className="mt-2"><strong>Conclusion:</strong> {draft.conclusion || 'Non renseignee'}</p>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600" onClick={() => setFinalizeModalOpen(false)}>
              Retour
            </button>
            <button type="button" className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white" onClick={handleFinalize}>
              Confirmer la finalisation
            </button>
          </div>
        </div>
      </Modal>

      <BilingualOrdonnanceFormModal
        open={ordonnanceOpen}
        onClose={() => {
          setOrdonnanceOpen(false)
          if (activeTab === 'ordonnances') changeTab(DEFAULT_TAB)
        }}
        initialPatientId={patientId}
        initialDate={(currentConsultation?.date_consult || new Date().toISOString()).slice(0, 10)}
        initialMedications={extractedMedications}
        initialInstructions={draft.aiSynthesis || draft.conclusion}
      />
    </div>
  )
}
