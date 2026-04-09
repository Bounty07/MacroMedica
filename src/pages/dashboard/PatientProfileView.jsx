import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, BadgeInfo, CalendarDays, Edit3, FileText, FlaskConical, FolderOpen, HeartPulse, IdCard, MapPin, Phone, Plus, Ruler, Save, Scale, ShieldCheck, Sparkles, Stethoscope, Thermometer, UserRound, Waves, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/common/Modal'
import PatientAiLabAnalysisModal from '../../components/patient/PatientAiLabAnalysisModal'
import PatientAiScribeModal from '../../components/patient/PatientAiScribeModal'
import { useAppContext } from '../../context/AppContext'
import { createSigneVital, getConsultationsByPatient, getDocuments, getOrdonnancesByPatient, getPatientById, getRdv, getSignesVitauxByPatient, updateConsultation, updatePatient, updateSigneVital } from '../../lib/api'
import { normalizeDoctorNotes, savePatientConsultation } from '../../lib/consultationNotes'
import { supabase } from '../../lib/supabase'

const OVERVIEW_TAB = "Vue d'ensemble"
const CLINICAL_ANALYSIS_TAB = 'Analyse Clinique'

function formatDate(value, withTime = false) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('fr-FR', withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Casablanca' }
    : { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Casablanca' })
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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
  const diff = today.getMonth() - birth.getMonth()
  if (diff < 0 || (diff === 0 && today.getDate() < birth.getDate())) age -= 1
  return age
}

function calcImc(poids, taille) {
  const p = Number(poids)
  const t = Number(taille)
  if (!p || !t) return null
  return Number((p / ((t / 100) * (t / 100))).toFixed(1))
}

function getImcMeta(imc) {
  const value = Number(imc)
  if (!value) return { tone: 'slate', label: 'Non mesure' }
  if (value < 18.5) return { tone: 'blue', label: 'Insuffisance ponderale' }
  if (value < 25) return { tone: 'green', label: 'Zone normale' }
  if (value < 30) return { tone: 'orange', label: 'Surpoids' }
  return { tone: 'red', label: 'Obesite' }
}

function parsePrescriptionNotes(rawNotes) {
  if (!rawNotes) return null
  try {
    const parsed = JSON.parse(rawNotes)
    return parsed?.type === 'ordonnance' ? parsed : null
  } catch {
    return null
  }
}

function formatTableDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Africa/Casablanca',
  }).replace(/\//g, '-')
}

function getConsultationMotif(item) {
  const parsed = parsePrescriptionNotes(item?.notes)
  if (item?.motif) return item.motif
  if (parsed?.medicaments?.length) return 'Renouvellement traitement'
  return 'Consultation generale'
}

function getConsultationConclusion(item) {
  const parsed = parsePrescriptionNotes(item?.notes)
  if (parsed?.medicaments?.length) {
    return `Prescription remise: ${parsed.medicaments.map((med) => med.nom).filter(Boolean).join(', ')}.`
  }
  return item?.notes || 'Sans conclusion detaillee.'
}

function buildDemoConsultations(patient) {
  const patientLabel = `${patient?.prenom || 'Patient'} ${patient?.nom || ''}`.trim()
  return [
    {
      id: 'demo_consult_0',
      motif: 'Suivi gastro-enterologie',
      notes: `${patientLabel} se presente pour diarrhee intermittente avec amelioration clinique. Conseils dietetiques reinforces et surveillance de l'hydratation.`,
      date_consult: '2026-04-01',
      montant: 300,
      statut: 'paye',
      isDemo: true,
    },
    {
      id: 'demo_consult_1',
      motif: 'Controle digestif',
      notes: `${patientLabel} revient pour douleurs abdominales moderees avec bonne evolution sous traitement symptomatique. Hydratation, regime leger et surveillance sur 72h.`,
      date_consult: '2026-03-28',
      montant: 250,
      statut: 'paye',
      isDemo: true,
    },
    {
      id: 'demo_consult_2',
      motif: 'Renouvellement traitement',
      notes: 'Patient stable. Renouvellement du traitement habituel et rappel des mesures hygieno-dietetiques.',
      date_consult: '2026-02-16',
      montant: 250,
      statut: 'paye',
      isDemo: true,
    },
    {
      id: 'demo_consult_3',
      motif: 'Suivi fatigue chronique',
      notes: 'Bilan biologique demande. Reevaluation clinique dans 15 jours avec surveillance des symptomes.',
      date_consult: '2026-01-09',
      montant: 300,
      statut: 'credit',
      isDemo: true,
    },
    {
      id: 'demo_consult_4',
      motif: 'Bilan infectieux',
      notes: 'Episode febrile avec diarrhee. Bilan biologique demande, traitement symptomatique et reevaluation a 48h.',
      date_consult: '2025-11-26',
      montant: 250,
      statut: 'paye',
      isDemo: true,
    },
    {
      id: 'demo_consult_5',
      motif: 'Douleurs abdominales',
      notes: 'Suspicion de gastro-enterite virale. Surveillance clinique et ordonnance de rehydratation orale.',
      date_consult: '2025-08-14',
      montant: 220,
      statut: 'paye',
      isDemo: true,
    },
    {
      id: 'demo_consult_6',
      motif: 'Consultation initiale',
      notes: 'Premiere consultation au cabinet pour troubles digestifs recurrentes. Antecedents documentes et plan de suivi etabli.',
      date_consult: '2025-03-05',
      montant: 200,
      statut: 'paye',
      isDemo: true,
    },
  ]
}

function buildDemoOrdonnances() {
  return [
    {
      id: 'demo_ord_0',
      nom_fichier: 'Ordonnance - Avril 2026',
      created_at: '2026-04-01T09:20:00Z',
      consultations: {
        notes: JSON.stringify({
          type: 'ordonnance',
          medicaments: [
            { nom: 'Smecta' },
            { nom: 'Ultra-Levure' },
            { nom: 'Spasfon' },
          ],
        }),
      },
      isDemo: true,
    },
    {
      id: 'demo_ord_1',
      nom_fichier: 'Ordonnance - Mars 2026',
      created_at: '2026-03-28T10:15:00Z',
      consultations: {
        notes: JSON.stringify({
          type: 'ordonnance',
          medicaments: [
            { nom: 'Paracetamol 1g' },
            { nom: 'Spasfon' },
            { nom: 'Omeprazole 20 mg' },
          ],
        }),
      },
      isDemo: true,
    },
    {
      id: 'demo_ord_2',
      nom_fichier: 'Ordonnance - Fevrier 2026',
      created_at: '2026-02-16T09:00:00Z',
      consultations: {
        notes: JSON.stringify({
          type: 'ordonnance',
          medicaments: [
            { nom: 'Vitamine D3' },
            { nom: 'Magnesium B6' },
          ],
        }),
      },
      isDemo: true,
    },
  ]
}

function buildDemoDocuments() {
  return [
    {
      id: 'demo_doc_0',
      nom_fichier: 'Compte-rendu scanner abdomino-pelvien.pdf',
      type_document: 'fiche_cnss',
      created_at: '2025-12-02T15:20:00Z',
      isDemo: true,
    },
    {
      id: 'demo_doc_1',
      nom_fichier: 'Scan ordonnance mobile.jpg',
      type_document: 'ordonnance',
      created_at: '2026-03-29T08:20:00Z',
      isDemo: true,
    },
    {
      id: 'demo_doc_2',
      nom_fichier: 'Bilan sanguin.pdf',
      type_document: 'fiche_cnss',
      created_at: '2026-03-18T11:45:00Z',
      isDemo: true,
    },
    {
      id: 'demo_doc_3',
      nom_fichier: 'Attestation CNSS.pdf',
      type_document: 'fiche_cnss',
      created_at: '2026-02-10T14:10:00Z',
      isDemo: true,
    },
  ]
}

function buildDemoVitals(patient) {
  const poids = 78
  const taille = 176
  return {
    id: 'demo_vitals_1',
    patient_id: patient?.id,
    cabinet_id: patient?.cabinet_id,
    poids,
    taille,
    imc: calcImc(poids, taille),
    tension_systolique: 124,
    tension_diastolique: 79,
    frequence_cardiaque: 74,
    temperature: 36.8,
    saturation: 98,
    measured_at: '2026-03-28T10:20:00Z',
    isDemo: true,
  }
}

function supervisionContext({ patient, latestVitals, consultations, prescriptions, laboDocs }) {
  return [
    `Patient: ${patient?.prenom || ''} ${patient?.nom || ''}`.trim(),
    `Age: ${calcAge(patient?.date_naissance) || 'non renseigne'}`,
    `Antecedents: ${patient?.antecedents || 'aucun antecedent renseigne'}`,
    `Allergies: ${patient?.allergies || 'aucune allergie renseignee'}`,
    `Mutuelle: ${patient?.mutuelle || 'non renseignee'}`,
    `CNSS: ${patient?.numero_cnss || 'non renseigne'}`,
    `Derniers signes vitaux: ${latestVitals ? JSON.stringify(latestVitals) : 'aucune mesure'}`,
    `Dernieres consultations: ${consultations.map((item) => `${formatDate(item.date_consult)} - ${item.notes || item.motif || 'sans note'}`).join(' | ') || 'aucune'}`,
    `Prescriptions actives: ${prescriptions.map((item) => item.title).join(' | ') || 'aucune'}`,
    `Bilans labo recents: ${laboDocs.map((item) => `${item.nom_fichier || item.type_document} - ${formatDate(item.created_at)}`).join(' | ') || 'aucun'}`,
  ].join('\n')
}

function getDoctorNotesStorageKey(patientId) {
  return `macromedica-doctor-notes-${patientId}`
}

function readLocalDoctorNotes(patientId) {
  if (!patientId) return ''
  try {
    return localStorage.getItem(getDoctorNotesStorageKey(patientId)) || ''
  } catch {
    return ''
  }
}

function writeLocalDoctorNotes(patientId, value) {
  if (!patientId) return
  try {
    localStorage.setItem(getDoctorNotesStorageKey(patientId), value)
  } catch {
    // ignore local storage failures
  }
}

function clearLocalDoctorNotes(patientId) {
  if (!patientId) return
  try {
    localStorage.removeItem(getDoctorNotesStorageKey(patientId))
  } catch {
    // ignore local storage failures
  }
}

function EditButton({ onClick, label = 'Modifier' }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">
      <Edit3 className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

function CriticalBanners({ items, onDismiss }) {
  return (
    <div className="fixed right-4 top-4 z-[9999] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-rose-200 bg-rose-600 px-4 py-4 text-white shadow-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-100">Alerte critique</p>
              <p className="mt-1 text-sm font-semibold leading-6">{item.message}</p>
            </div>
            <button type="button" onClick={() => onDismiss(item.id)} className="rounded-full p-1 text-rose-100 transition hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function VitalCard({ icon: Icon, label, value, helper, tone = 'slate', action }) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-900',
    blue: 'border-sky-100 bg-sky-50 text-sky-900',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-900',
    orange: 'border-amber-100 bg-amber-50 text-amber-900',
    red: 'border-rose-100 bg-rose-50 text-rose-900',
  }
  return (
    <div className={`rounded-[20px] border p-5 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-slate-500 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        {action}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-[34px] font-black tracking-tight">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
    </div>
  )
}

function QuickJumpCard({ title, subtitle, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[20px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </button>
  )
}

function InfoFieldCard({ icon: Icon, label, value, helper, onClick, featured = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-[24px] border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${featured ? 'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50' : 'border-slate-200 bg-white hover:border-emerald-200'}`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${featured ? 'bg-white text-emerald-600 shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-2 text-base font-bold leading-7 text-slate-900">{value || '-'}</p>
          {helper ? <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p> : null}
        </div>
      </div>
    </button>
  )
}

function SimpleModal({ open, onClose, title, children, width = 'max-w-3xl' }) {
  return <Modal open={open} onClose={onClose} title={title} width={width}>{children}</Modal>
}

export default function PatientProfileView({ patientId, onBack }) {
  const { profile, cabinetId, notify, registerVoiceCommandHandler, setInboxAlertCount, specialiteConfig } = useAppContext()
  const [activeTab, setActiveTab] = useState(OVERVIEW_TAB)
  const [refreshKey, setRefreshKey] = useState(0)
  const [patientModalOpen, setPatientModalOpen] = useState(false)
  const [patientFieldConfig, setPatientFieldConfig] = useState(null)
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false)
  const [consultationEditItem, setConsultationEditItem] = useState(null)
  const [documentEditItem, setDocumentEditItem] = useState(null)
  const [criticalBanners, setCriticalBanners] = useState([])
  const [supervisionState, setSupervisionState] = useState({ loading: false, unavailable: false, summary: '', alerts: [] })
  const [doctorNotes, setDoctorNotes] = useState('')
  const [doctorNotesState, setDoctorNotesState] = useState({ saving: false, savedAt: '', savedSource: '', error: '', lastSavedSignature: '' })
  const [scribeModalOpen, setScribeModalOpen] = useState(false)
  const [labModalOpen, setLabModalOpen] = useState(false)

  const { data: patient, isLoading: loadingPatient } = useQuery({ queryKey: ['patient', patientId, refreshKey], queryFn: () => getPatientById(patientId), enabled: !!patientId })
  const { data: consultations = [] } = useQuery({ queryKey: ['consultations', patientId, refreshKey], queryFn: () => getConsultationsByPatient(patientId), enabled: !!patientId })
  const { data: allRdvs = [] } = useQuery({ queryKey: ['rdv', cabinetId, refreshKey], queryFn: getRdv, enabled: !!cabinetId })
  const { data: vitalsHistory = [] } = useQuery({ queryKey: ['signes-vitaux', patientId, refreshKey], queryFn: () => getSignesVitauxByPatient(patientId), enabled: !!patientId })
  const { data: documents = [] } = useQuery({ queryKey: ['documents', patientId, refreshKey], queryFn: () => getDocuments(patientId), enabled: !!patientId })
  const { data: ordonnances = [] } = useQuery({ queryKey: ['ordonnances', patientId, refreshKey], queryFn: () => getOrdonnancesByPatient(patientId), enabled: !!patientId })

  const tabs = useMemo(() => {
    const nextTabs = [OVERVIEW_TAB]
    if (specialiteConfig.features.analyseClinique) nextTabs.push(CLINICAL_ANALYSIS_TAB)
    return [...nextTabs, 'Infos personnelles', 'Historique consultations', 'Ordonnances', 'Documents / scans', 'Notes medicales']
  }, [specialiteConfig.features.analyseClinique])

  useEffect(() => {
    if (!tabs.includes(activeTab)) {
      setActiveTab(tabs[0])
    }
  }, [tabs, activeTab])

  const demoVitals = useMemo(() => buildDemoVitals(patient), [patient])
  const displayConsultations = consultations.length > 0 ? consultations : buildDemoConsultations(patient)
  const displayOrdonnances = ordonnances.length > 0 ? ordonnances : buildDemoOrdonnances()
  const displayDocuments = documents.length > 0 ? documents : buildDemoDocuments()
  const latestVitals = vitalsHistory[0] || demoVitals
  const nextRdv = useMemo(() => allRdvs.filter((item) => item.patient_id === patientId).find((item) => new Date(item.date_rdv) >= new Date()) || null, [allRdvs, patientId])
  const recentConsultations = displayConsultations.slice(0, 3)
  const recentLaboDocs = displayDocuments.filter((item) => item.type_document !== 'ordonnance').slice(0, 3)
  const activePrescriptions = useMemo(() => displayOrdonnances.slice(0, 5).map((doc) => ({ id: doc.id, title: doc.nom_fichier || 'Ordonnance', medications: parsePrescriptionNotes(doc.consultations?.notes)?.medicaments || [] })), [displayOrdonnances])
  const imcValue = latestVitals?.imc ?? calcImc(latestVitals?.poids, latestVitals?.taille)
  const imcMeta = getImcMeta(imcValue)

  useEffect(() => {
    setDoctorNotesState({ saving: false, savedAt: '', savedSource: '', error: '', lastSavedSignature: '' })
  }, [patientId])

  useEffect(() => {
    const remoteNotes = patient?.notes_medecin || patient?.notes || ''
    const localNotes = readLocalDoctorNotes(patientId)
    setDoctorNotes(remoteNotes || localNotes)
    setDoctorNotesState((current) => ({
      ...current,
      error: '',
      savedSource: current.savedAt ? current.savedSource : remoteNotes ? 'database' : localNotes ? 'local' : '',
    }))
  }, [patientId, patient?.notes_medecin, patient?.notes])

  const localAlerts = useMemo(() => {
    const alerts = []
    if (Number(imcValue) >= 30) alerts.push({ level: 'warning', message: `IMC eleve (${imcValue}) : un suivi metabolique est recommande.` })
    if (latestVitals?.saturation && Number(latestVitals.saturation) < 92) alerts.push({ level: 'critical', message: `Saturation basse (${latestVitals.saturation}%).` })
    if (latestVitals?.temperature && Number(latestVitals.temperature) >= 39) alerts.push({ level: 'warning', message: `Temperature elevee (${latestVitals.temperature}°C).` })
    return alerts
  }, [imcValue, latestVitals])

  const contextText = useMemo(() => patient ? supervisionContext({ patient, latestVitals, consultations: recentConsultations, prescriptions: activePrescriptions, laboDocs: recentLaboDocs }) : '', [patient, latestVitals, recentConsultations, activePrescriptions, recentLaboDocs])

  useEffect(() => {
    if (!specialiteConfig.features.analyseClinique) {
      setSupervisionState({ loading: false, unavailable: false, summary: '', alerts: [] })
      return
    }
    if (!patient || !contextText) return
    let cancelled = false
    setSupervisionState((current) => ({ ...current, loading: true, unavailable: false }))
    supabase.functions.invoke('ai-diagnosis', { body: { mode: 'supervision', patientContext: contextText } }).then(({ data, error }) => {
      if (cancelled) return
      if (error || data?.error) {
        setSupervisionState({ loading: false, unavailable: true, summary: '', alerts: [] })
        return
      }
      setSupervisionState({ loading: false, unavailable: false, summary: data?.summary || '', alerts: Array.isArray(data?.alerts) ? data.alerts : [] })
    }).catch(() => {
      if (!cancelled) setSupervisionState({ loading: false, unavailable: true, summary: '', alerts: [] })
    })
    return () => { cancelled = true }
  }, [patient, contextText, specialiteConfig.features.analyseClinique])

  const mergedAlerts = useMemo(() => [...localAlerts, ...(supervisionState.alerts || [])], [localAlerts, supervisionState.alerts])
  const nonCriticalAlerts = useMemo(() => mergedAlerts.filter((item) => item.level !== 'critical'), [mergedAlerts])
  const criticalAlerts = useMemo(() => mergedAlerts.filter((item) => item.level === 'critical'), [mergedAlerts])
  const criticalAlertSignature = useMemo(() => criticalAlerts.map((item) => `${item.level}:${item.message}`).join('|'), [criticalAlerts])

  useEffect(() => {
    setInboxAlertCount(nonCriticalAlerts.length)
    return () => setInboxAlertCount(0)
  }, [nonCriticalAlerts.length, setInboxAlertCount])

  useEffect(() => {
    if (!criticalAlerts.length) {
      setCriticalBanners([])
      return
    }
    const items = criticalAlerts.map((item, index) => ({ id: `critical_${index}_${item.message}`, message: item.message }))
    setCriticalBanners(items)
    const timers = items.map((item) => window.setTimeout(() => setCriticalBanners((current) => current.filter((entry) => entry.id !== item.id)), 10000))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [criticalAlertSignature])

  const appendDoctorNotes = (text) => {
    setDoctorNotes((current) => {
      const base = current.trim()
      const next = text.trim()
      if (!base) return next
      if (!next) return base
      return `${base}\n\n${next}`
    })
    setActiveTab(OVERVIEW_TAB)
  }

  const handleSaveDoctorNotes = async () => {
    if (!patient?.id) return
    const normalizedNotes = normalizeDoctorNotes(doctorNotes)

    if (!normalizedNotes) {
      const message = 'Ajoutez une note clinique avant de sauvegarder la consultation.'
      setDoctorNotesState((current) => ({
        ...current,
        error: message,
      }))
      notify({ title: 'Consultation incomplète', description: message, tone: 'error' })
      return
    }

    if (doctorNotesState.lastSavedSignature === normalizedNotes) {
      notify({
        title: 'Note déjà enregistrée',
        description: "Modifiez la note avant de créer une nouvelle consultation.",
      })
      return
    }

    setDoctorNotesState((current) => ({ ...current, saving: true, error: '' }))

    try {
      await savePatientConsultation({
        supabaseClient: supabase,
        cabinetId: cabinetId || patient?.cabinet_id,
        patientId: patient.id,
        notes: normalizedNotes,
      })

      let savedSource = 'database'
      let syncDescription = ''

      try {
        await updatePatient(patient.id, { notes_medecin: normalizedNotes })
        clearLocalDoctorNotes(patient.id)
      } catch (syncError) {
        const syncMessage = syncError?.message || ''
        if (/notes_medecin|schema cache|column/i.test(syncMessage)) {
          writeLocalDoctorNotes(patient.id, normalizedNotes)
          savedSource = 'local'
          syncDescription = ' Une copie locale de la note reste disponible sur ce poste.'
        } else {
          savedSource = 'consultation_only'
          syncDescription = " La consultation est bien enregistrée, mais la note libre n'a pas pu être synchronisée au dossier."
          console.warn('Patient note sync failed after consultation insert:', syncError)
        }
      }

      setDoctorNotesState({
        saving: false,
        savedAt: new Date().toISOString(),
        savedSource,
        error: '',
        lastSavedSignature: normalizedNotes,
      })
      setRefreshKey((current) => current + 1)
      notify({
        title: 'Consultation sauvegardée',
        description: `La consultation a été ajoutée à l'historique du patient.${syncDescription}`,
      })
    } catch (error) {
      const message = error?.message || "Impossible d'enregistrer la consultation."

      setDoctorNotesState({
        saving: false,
        savedAt: '',
        savedSource: '',
        error: message,
        lastSavedSignature: doctorNotesState.lastSavedSignature,
      })
      notify({ title: 'Échec de sauvegarde', description: message, tone: 'error' })
    }
  }

  useEffect(() => {
    return registerVoiceCommandHandler('save-record', async () => {
      await handleSaveDoctorNotes()
      return true
    })
  }, [doctorNotes, doctorNotesState.lastSavedSignature, patient?.id, registerVoiceCommandHandler])

  useEffect(() => {
    return registerVoiceCommandHandler('add_note', async (payload) => {
      const nextText = typeof payload === 'string' ? payload.trim() : ''
      if (!nextText) return false

      appendDoctorNotes(nextText)
      return true
    })
  }, [appendDoctorNotes, registerVoiceCommandHandler])

  if (loadingPatient || !patient) {
    return <div className="flex min-h-[500px] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" /></div>
  }

  return (
    <>
      <PatientProfileContent
        patient={patient}
        profile={profile}
        cabinetId={cabinetId}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onBack={onBack}
        nextRdv={nextRdv}
        latestVitals={latestVitals}
        imcValue={imcValue}
        imcMeta={imcMeta}
        consultations={displayConsultations}
        ordonnances={displayOrdonnances}
        documents={displayDocuments}
        recentLaboDocs={recentLaboDocs}
        nonCriticalAlerts={nonCriticalAlerts}
        criticalBanners={criticalBanners}
        setCriticalBanners={setCriticalBanners}
        supervisionState={supervisionState}
        specialiteConfig={specialiteConfig}
        tabs={tabs}
        doctorNotes={doctorNotes}
        setDoctorNotes={setDoctorNotes}
        doctorNotesState={doctorNotesState}
        onSaveDoctorNotes={handleSaveDoctorNotes}
        onOpenScribeModal={() => setScribeModalOpen(true)}
        onOpenLabModal={() => setLabModalOpen(true)}
        refreshPage={() => setRefreshKey((current) => current + 1)}
        patientModalOpen={patientModalOpen}
        setPatientModalOpen={setPatientModalOpen}
        patientFieldConfig={patientFieldConfig}
        setPatientFieldConfig={setPatientFieldConfig}
        vitalsModalOpen={vitalsModalOpen}
        setVitalsModalOpen={setVitalsModalOpen}
        consultationEditItem={consultationEditItem}
        setConsultationEditItem={setConsultationEditItem}
        documentEditItem={documentEditItem}
        setDocumentEditItem={setDocumentEditItem}
      />
      <PatientAiScribeModal
        open={scribeModalOpen}
        onClose={() => setScribeModalOpen(false)}
        patient={patient}
        onInsertNotes={appendDoctorNotes}
      />
      <PatientAiLabAnalysisModal
        open={labModalOpen}
        onClose={() => setLabModalOpen(false)}
        patient={patient}
        documents={displayDocuments}
        onInsertSummary={appendDoctorNotes}
      />
    </>
  )
}

function PatientProfileContent(props) {
  const {
    patient, profile, cabinetId, activeTab, setActiveTab, onBack, nextRdv, latestVitals, imcValue, imcMeta,
    consultations, ordonnances, documents, recentLaboDocs, nonCriticalAlerts, criticalBanners, setCriticalBanners,
    supervisionState, specialiteConfig, tabs, doctorNotes, setDoctorNotes, doctorNotesState, onSaveDoctorNotes, onOpenScribeModal, onOpenLabModal,
    refreshPage, patientModalOpen, setPatientModalOpen, vitalsModalOpen, setVitalsModalOpen,
    patientFieldConfig, setPatientFieldConfig, consultationEditItem, setConsultationEditItem, documentEditItem, setDocumentEditItem,
  } = props
  const [expandedConsultationId, setExpandedConsultationId] = useState(null)

  const aiSummary = supervisionState.unavailable
    ? `IA indisponible. Apercu clinique: ${patient.prenom} ${patient.nom} presente un suivi globalement stable. Derniere consultation le ${consultations[0] ? formatTableDate(consultations[0].date_consult) : '-'}, traitements actifs ${ordonnances.length || 0}, derniers bilans ${recentLaboDocs.length || 0}.`
    : supervisionState.summary || `${patient.prenom} ${patient.nom} est suivi au cabinet pour un parcours actif. Derniere evaluation le ${consultations[0] ? formatTableDate(consultations[0].date_consult) : '-'} avec evolution favorable, adherence therapeutique correcte et surveillance clinique concentree sur les antecedents, allergies et traitements en cours.`

  const personalInfoCards = [
    { key: 'nom', label: 'Nom', value: patient.nom || '-', helper: 'Identite civile', icon: UserRound, featured: true },
    { key: 'prenom', label: 'Prenom', value: patient.prenom || '-', helper: 'Identite civile', icon: BadgeInfo, featured: true },
    { key: 'telephone', label: 'Telephone', value: patient.telephone || '-', helper: 'Contact principal', icon: Phone },
    { key: 'date_naissance', label: 'Date de naissance', value: patient.date_naissance ? formatDate(patient.date_naissance) : '-', helper: calcAge(patient.date_naissance) ? `${calcAge(patient.date_naissance)} ans` : 'Age non renseigne', icon: CalendarDays },
    { key: 'cin', label: 'CIN', value: patient.cin || '-', helper: 'Piece d identite', icon: IdCard },
    { key: 'adresse', label: 'Adresse', value: patient.adresse || '-', helper: 'Adresse patient', icon: MapPin },
    { key: 'mutuelle', label: 'Mutuelle', value: patient.mutuelle || '-', helper: 'Couverture sociale', icon: ShieldCheck },
    { key: 'numero_cnss', label: 'Numero CNSS', value: patient.numero_cnss || '-', helper: 'Reference administrative', icon: FileText },
    { key: 'antecedents', label: 'Antecedents', value: patient.antecedents || 'Aucun antecedent renseigne', helper: 'Historique medical', icon: HeartPulse },
    { key: 'allergies', label: 'Allergies', value: patient.allergies || 'Aucune allergie renseignee', helper: 'Vigilance clinique', icon: AlertTriangle },
  ]

  const openPatientField = (key) => {
    const config = personalInfoCards.find((item) => item.key === key)
    if (!config) return
    setPatientFieldConfig(config)
    setPatientModalOpen(true)
  }

  return (
    <div className="-mx-4 -mt-4 min-h-[calc(100vh-2rem)] bg-[#f7f9fc]">
      <CriticalBanners items={criticalBanners} onDismiss={(id) => setCriticalBanners((current) => current.filter((item) => item.id !== id))} />

      <header className="border-b border-slate-200 bg-white px-8 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[24px] font-black tracking-tight text-slate-950">{patient.prenom} {patient.nom}</h1>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {specialiteConfig.label}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Un seul endroit pour les infos, consultations, ordonnances, scans et notes medicales</p>
              <p className="mt-1 text-sm text-slate-500">{calcAge(patient.date_naissance) ? `${calcAge(patient.date_naissance)} ans` : 'Age non renseigne'} • {patient.telephone || 'Telephone non renseigne'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setVitalsModalOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700">
              <HeartPulse className="h-4 w-4" />
              Ajouter une mesure
            </button>
            <button onClick={() => { window.location.href = nextRdv ? `/consultation/${nextRdv.id}` : '/agenda' }} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-emerald-500 px-5 text-sm font-bold text-white shadow-[0_6px_20px_rgba(16,185,129,0.24)] transition hover:bg-emerald-600">
              <Plus className="h-4 w-4" />
              Nouvelle Consultation
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white px-8">
        <div className="flex gap-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap border-b-2 py-5 text-[15px] font-bold transition ${activeTab === tab ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-8">
        {activeTab === OVERVIEW_TAB ? (
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-8">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <QuickJumpCard title="Infos" value="Patient" subtitle="Identite, antecedents, allergies" onClick={() => setActiveTab('Infos personnelles')} />
                <QuickJumpCard title="Consultations" value={consultations.length} subtitle="Historique complet en un clic" onClick={() => setActiveTab('Historique consultations')} />
                <QuickJumpCard title="Ordonnances" value={ordonnances.length} subtitle="Traitements et renouvellements" onClick={() => setActiveTab('Ordonnances')} />
                <QuickJumpCard title="Documents" value={documents.length} subtitle="Scans, bilans et PDF" onClick={() => setActiveTab('Documents / scans')} />
              </section>
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-emerald-600" />
                      <h2 className="text-lg font-bold text-slate-900">Notes du Medecin</h2>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Renseignez ici la note clinique de la consultation en cours. Le bouton de sauvegarde cree une consultation liee au patient et alimente son historique.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {specialiteConfig.features.aiScribe ? (
                      <button
                        type="button"
                        onClick={onOpenScribeModal}
                        className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                      >
                        <Sparkles className="h-4 w-4" />
                        IA Scribe / Dictee
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={onSaveDoctorNotes}
                      disabled={doctorNotesState.saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {doctorNotesState.saving ? 'Enregistrement...' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>

                <textarea
                  value={doctorNotes}
                  onChange={(event) => setDoctorNotes(event.target.value)}
                  rows={10}
                  placeholder="Tapez ici les notes libres du medecin..."
                  className="w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 outline-none focus:border-emerald-300"
                />

                <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {doctorNotesState.error ? (
                    <span className="font-semibold text-rose-700">{doctorNotesState.error}</span>
                  ) : doctorNotesState.savedSource === 'consultation_only' ? (
                    <span>
                      Consultation sauvegardee le {formatDateTime(doctorNotesState.savedAt)}. La note libre n'a pas pu etre synchronisee dans le dossier patient.
                    </span>
                  ) : doctorNotesState.savedSource === 'local' ? (
                    <span>
                      Consultation sauvegardee le {formatDateTime(doctorNotesState.savedAt)} et ajoutee a l'historique. Une copie locale de la note est conservee sur cet appareil.
                    </span>
                  ) : doctorNotesState.savedAt ? (
                    <span>Consultation sauvegardee et visible dans l'historique depuis le {formatDateTime(doctorNotesState.savedAt)}.</span>
                  ) : (
                    <span>Ces notes servent de brouillon clinique et seront ajoutees a l'historique des consultations du patient.</span>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <BadgeInfo className="h-4 w-4 text-amber-600" />
                  <h2 className="text-[14px] font-black uppercase tracking-[0.18em] text-slate-900">Alertes et supervision</h2>
                </div>
                <div className="space-y-3">
                  {nonCriticalAlerts.length > 0 ? nonCriticalAlerts.map((alert, index) => (
                    <div key={`${alert.level}_${index}`} className={`rounded-[18px] border px-4 py-4 text-sm ${alert.level === 'warning' ? 'border-amber-100 bg-amber-50 text-amber-800' : 'border-sky-100 bg-sky-50 text-sky-800'}`}>
                      <p className="font-semibold">{alert.message}</p>
                    </div>
                  )) : <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">Aucune alerte non urgente a afficher.</div>}
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[14px] font-black uppercase tracking-[0.18em] text-slate-900">Historique recent</h2>
                  <button onClick={() => setActiveTab('Historique consultations')} className="text-sm font-bold text-emerald-600">Voir tout</button>
                </div>
                <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                  <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600" style={{ gridTemplateColumns: '120px 1fr 1.35fr 110px 120px' }}>
                    <span>Date</span>
                    <span>Motif</span>
                    <span>Conclusion</span>
                    <span>Statut</span>
                    <span>Edition</span>
                  </div>
                  {consultations.slice(0, 4).map((item) => (
                    <div key={item.id} className="grid gap-4 border-b border-slate-100 px-4 py-4 text-sm last:border-b-0" style={{ gridTemplateColumns: '120px 1fr 1.35fr 110px 120px' }}>
                      <span className="font-semibold text-blue-600">{formatTableDate(item.date_consult)}</span>
                      <span className="font-medium text-slate-800">{getConsultationMotif(item)}</span>
                      <div>
                        <p className={`${expandedConsultationId === item.id ? '' : 'line-clamp-2'} leading-6 text-slate-600`}>{getConsultationConclusion(item)}</p>
                        <button type="button" onClick={() => setExpandedConsultationId((current) => current === item.id ? null : item.id)} className="mt-2 rounded-md border border-blue-200 px-2 py-1 text-xs font-bold text-blue-600 transition hover:bg-blue-50">
                          {expandedConsultationId === item.id ? 'Voir moins' : 'Voir plus'}
                        </button>
                      </div>
                      <span className={`font-bold ${item.isDemo ? 'text-sky-600' : 'text-rose-500'}`}>
                        {item.isDemo ? 'Demo' : item.statut === 'credit' ? 'A suivre' : item.statut === 'annule' ? 'Annule' : 'Termine'}
                      </span>
                      {item.isDemo ? <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Apercu</span> : <button type="button" onClick={() => setConsultationEditItem(item)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">Editer</button>}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-black uppercase tracking-[0.18em] text-slate-900">Signes vitaux</h2>
                <button type="button" onClick={() => setVitalsModalOpen(true)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">{latestVitals && !latestVitals.isDemo ? 'Modifier' : 'Ajouter'}</button>
              </div>
              <VitalCard icon={Scale} label="Poids" value={latestVitals?.poids ? `${latestVitals.poids}` : '-'} helper={latestVitals ? `Mesure du ${formatDate(latestVitals.measured_at, true)}` : 'Aucune mesure'} />
              <VitalCard icon={Ruler} label="Taille" value={latestVitals?.taille ? `${latestVitals.taille}` : '-'} helper="cm" />
              <VitalCard icon={Sparkles} label="IMC" value={imcValue || '-'} helper={imcMeta.label} tone={imcMeta.tone} />
              <VitalCard icon={Waves} label="Saturation" value={latestVitals?.saturation ? `${latestVitals.saturation}%` : '-'} helper={latestVitals?.frequence_cardiaque ? `${latestVitals.frequence_cardiaque} bpm` : 'Frequence non renseignee'} />
              <VitalCard icon={Thermometer} label="Temperature" value={latestVitals?.temperature ? `${latestVitals.temperature}°` : '-'} helper={latestVitals?.tension_systolique ? `${latestVitals.tension_systolique}/${latestVitals.tension_diastolique} mmHg` : 'Tension enregistree dans la mesure'} />
            </aside>
          </div>
        ) : null}

        {activeTab === CLINICAL_ANALYSIS_TAB ? (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-600" />
                  <h2 className="text-lg font-bold text-slate-900">Analyse clinique</h2>
                </div>
                <div className="rounded-[22px] border border-sky-100 bg-sky-50 p-6 text-[17px] leading-8 text-slate-700">
                  {supervisionState.loading ? 'Chargement de la supervision IA...' : aiSummary}
                </div>
                {supervisionState.unavailable ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[18px] border border-white/80 bg-white/80 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Point fort</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">Suivi recent documente avec consultations et traitements traces.</p>
                    </div>
                    <div className="rounded-[18px] border border-white/80 bg-white/80 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Surveillance</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">Verifier observance, evolution symptomatique et dernier bilan labo.</p>
                    </div>
                    <div className="rounded-[18px] border border-white/80 bg-white/80 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Action suggeree</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">Planifier un point de controle si symptomes recurrents ou nouvelle alerte vitale.</p>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <BadgeInfo className="h-4 w-4 text-amber-600" />
                  <h2 className="text-[14px] font-black uppercase tracking-[0.18em] text-slate-900">Alertes et supervision</h2>
                </div>
                <div className="space-y-3">
                  {nonCriticalAlerts.length > 0 ? nonCriticalAlerts.map((alert, index) => (
                    <div key={`${alert.level}_${index}`} className={`rounded-[18px] border px-4 py-4 text-sm ${alert.level === 'warning' ? 'border-amber-100 bg-amber-50 text-amber-800' : 'border-sky-100 bg-sky-50 text-sky-800'}`}>
                      <p className="font-semibold">{alert.message}</p>
                    </div>
                  )) : <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">Aucune alerte non urgente a afficher.</div>}
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-[14px] font-black uppercase tracking-[0.18em] text-slate-900">Documents de reference</h2>
                <div className="mt-4 space-y-3">
                  {recentLaboDocs.length > 0 ? recentLaboDocs.map((item) => (
                    <div key={item.id} className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-900">{item.nom_fichier || item.type_document}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{formatDate(item.created_at)}</p>
                    </div>
                  )) : <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">Aucun document recent a analyser.</div>}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-[14px] font-black uppercase tracking-[0.18em] text-slate-900">Traitements actifs</h2>
                <div className="mt-4 space-y-3">
                  {ordonnances.length > 0 ? ordonnances.slice(0, 5).map((doc) => (
                    <div key={doc.id} className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-900">{doc.nom_fichier || 'Ordonnance'}</p>
                      <p className="mt-2 text-sm text-slate-600">{(parsePrescriptionNotes(doc.consultations?.notes)?.medicaments || []).map((med) => med.nom).filter(Boolean).join(', ') || 'Sans details structures.'}</p>
                    </div>
                  )) : <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">Aucune ordonnance active.</div>}
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {activeTab === 'Historique consultations' ? (
          <div className="mx-auto max-w-5xl">
            <div className="hidden rounded-[28px] bg-white p-8 shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-sky-100 text-sky-600">
                <CalendarDays className="h-8 w-8" />
              </div>
              <h2 className="mt-8 text-5xl font-black tracking-tight text-slate-950">Historique complet et chronologique</h2>
              <p className="mt-6 max-w-xl text-[18px] leading-9 text-slate-500">
                Visualisez en un coup d'oeil l'ensemble du parcours de soin du patient. Chaque consultation, ordonnance, certificat ou bilan reste archivé chronologiquement.
              </p>
              <div className="mt-8 space-y-4 text-lg text-slate-700">
                <p>Acces rapide aux dernieres consultations</p>
                <p>Filtrage par type d'acte</p>
                <p>Comparaison des constantes vitales</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Consultations</h3>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                  <span>{consultations.length} enregistree{consultations.length > 1 ? 's' : ''}</span>
                </div>
              </div>
                <div className="overflow-hidden rounded-[20px] border border-slate-200">
                  <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600" style={{ gridTemplateColumns: '120px 1fr 1.35fr 110px 120px' }}>
                    <span>Date</span><span>Motif</span><span>Conclusion</span><span>Montant</span><span>Statut</span>
                  </div>
                  {consultations.map((item) => (
                    <div key={item.id} className="grid gap-4 border-b border-slate-100 px-4 py-4 text-sm last:border-b-0" style={{ gridTemplateColumns: '120px 1fr 1.35fr 110px 120px' }}>
                      <span className="font-semibold text-blue-600">{formatTableDate(item.date_consult)}</span>
                      <span className="font-medium text-slate-800">{getConsultationMotif(item)}</span>
                      <div>
                        <p className={`${expandedConsultationId === item.id ? '' : 'line-clamp-2'} leading-6 text-slate-600`}>{getConsultationConclusion(item)}</p>
                        <button type="button" onClick={() => setExpandedConsultationId((current) => current === item.id ? null : item.id)} className="mt-2 rounded-md border border-blue-200 px-2 py-1 text-xs font-bold text-blue-600 transition hover:bg-blue-50">
                          {expandedConsultationId === item.id ? 'Voir moins' : 'Voir plus'}
                        </button>
                    </div>
                    <span className="font-medium text-slate-700">{Number(item.montant || 0).toLocaleString('fr-FR')} MAD</span>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`font-bold ${item.isDemo ? 'text-sky-600' : 'text-rose-500'}`}>{item.isDemo ? 'Demo' : item.statut === 'credit' ? 'A suivre' : item.statut === 'annule' ? 'Annule' : 'Termine'}</span>
                      {item.isDemo ? <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Apercu</span> : <button type="button" onClick={() => setConsultationEditItem(item)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">Editer</button>}
                    </div>
                  </div>
                ))}
              </div>

                <div className="mt-6 rounded-[20px] border border-slate-200 bg-white p-5">
                  <h4 className="text-xl font-semibold tracking-tight text-slate-900">Resume des consultations</h4>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                  Ce patient a consulte <span className="font-bold text-slate-900">{consultations.length} fois</span>. La premiere consultation etait le <span className="font-bold text-slate-900">{consultations[consultations.length - 1] ? formatTableDate(consultations[consultations.length - 1].date_consult) : '-'}</span> pour <span className="font-bold text-slate-900">{consultations[consultations.length - 1] ? getConsultationMotif(consultations[consultations.length - 1]) : '-'}</span>. La derniere consultation etait le <span className="font-bold text-slate-900">{consultations[0] ? formatTableDate(consultations[0].date_consult) : '-'}</span>{consultations[0] ? <> pour <span className="font-bold text-slate-900">{getConsultationMotif(consultations[0])}</span></> : null}.
                  </p>
                <div className="mt-4 rounded-[18px] bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Traitement</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {ordonnances.length > 0
                      ? ordonnances.flatMap((item) => (parsePrescriptionNotes(item.consultations?.notes)?.medicaments || []).map((med) => med.nom)).filter(Boolean).slice(0, 4).join(', ')
                      : 'Aucune ordonnance active trouvee.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'Ordonnances' ? (
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">Ordonnances</h2>
            </div>
            <div className="space-y-4">
              {ordonnances.map((doc) => (
                <div key={doc.id} className="rounded-[20px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{doc.nom_fichier || 'Ordonnance'}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(doc.created_at)}</p>
                      <p className="mt-3 text-sm text-slate-600">
                        {(parsePrescriptionNotes(doc.consultations?.notes)?.medicaments || []).map((med) => med.nom).filter(Boolean).join(', ') || 'Ordonnance sans details structures.'}
                      </p>
                    </div>
                    {doc.isDemo ? <span className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-600">Apercu demo</span> : <EditButton onClick={() => setDocumentEditItem(doc)} label="Editer" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        

        {activeTab === 'Documents / scans' ? (
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900">Documents / scans</h2>
              </div>
              {specialiteConfig.features.aiLabAnalysis ? (
                <button
                  type="button"
                  onClick={onOpenLabModal}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  <Sparkles className="h-4 w-4" />
                  Analyse de Bilan (IA)
                </button>
              ) : null}
            </div>
            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Scans mobiles</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{documents.filter((doc) => (doc.nom_fichier || '').toLowerCase().includes('scan')).length}</p>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Bilans et PDF</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{documents.filter((doc) => !(doc.nom_fichier || '').toLowerCase().includes('scan')).length}</p>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Dernier ajout</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{documents[0] ? formatDate(documents[0].created_at) : '-'}</p>
              </div>
            </div>
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="rounded-[20px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{doc.nom_fichier || doc.type_document}</p>
                      <p className="mt-1 text-sm text-slate-500">{doc.type_document} • {formatDate(doc.created_at)}</p>
                    </div>
                    {doc.isDemo ? <span className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-600">Apercu demo</span> : <EditButton onClick={() => setDocumentEditItem(doc)} label="Editer" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'Infos personnelles' ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <BadgeInfo className="h-4 w-4 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">Informations du patient</h2>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-emerald-500 to-sky-500 text-2xl font-black text-white shadow-[0_10px_30px_rgba(16,185,129,0.2)]">
                    {`${patient.prenom?.[0] || ''}${patient.nom?.[0] || ''}` || 'P'}
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                      <h3 className="text-2xl font-black tracking-tight text-slate-950">{patient.prenom} {patient.nom}</h3>
                      <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Photo plus tard</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">Carte identite patient pensée pour accueillir une photo, les accès rapides et les informations essentielles.</p>
                    
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {personalInfoCards.map((item) => (
                  <InfoFieldCard key={item.key} icon={item.icon} label={item.label} value={item.value} helper={item.helper} onClick={() => openPatientField(item.key)} featured={item.featured} />
                ))}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Derniere mesure des signes vitaux</h3>
                <button type="button" onClick={() => setVitalsModalOpen(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">{latestVitals && !latestVitals.isDemo ? 'Modifier la mesure' : 'Ajouter mesure'}</button>
              </div>
              {latestVitals ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ['Poids', latestVitals.poids ? `${latestVitals.poids} kg` : '-'],
                    ['Taille', latestVitals.taille ? `${latestVitals.taille} cm` : '-'],
                    ['IMC', latestVitals.imc || '-'],
                    ['Frequence', latestVitals.frequence_cardiaque ? `${latestVitals.frequence_cardiaque} bpm` : '-'],
                    ['Temperature', latestVitals.temperature ? `${latestVitals.temperature}°C` : '-'],
                    ['Saturation', latestVitals.saturation ? `${latestVitals.saturation}%` : '-'],
                    ['Tension systolique', latestVitals.tension_systolique || '-'],
                    ['Tension diastolique', latestVitals.tension_diastolique || '-'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
              ) : <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">Aucune mesure disponible. Ajoute une mesure pendant ou apres la consultation.</div>}
            </div>
          </div>
        ) : null}

        {activeTab === 'Notes medicales' ? (
          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-[24px] bg-white p-8 shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-100 text-emerald-600">
                <FlaskConical className="h-8 w-8" />
              </div>
              <h2 className="mt-8 text-4xl font-black tracking-tight text-slate-950">Notes medicales utiles et actionnables</h2>
              <p className="mt-5 text-[18px] leading-9 text-slate-500">
                Retrouve ici les observations cliniques, conclusions et points de vigilance sans quitter le dossier patient.
              </p>
              <div className="mt-8 space-y-4 text-base text-slate-700">
                <p>Lecture rapide des observations recentes</p>
                <p>Notes rattachees aux consultations du patient</p>
                <p>Edition directe quand la note vient d'une vraie consultation</p>
              </div>
            </div>

            <div className="space-y-4">
              {consultations.map((item, index) => (
                <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Note medicale {index + 1}</p>
                      <h3 className="mt-2 text-lg font-bold text-slate-900">{item.motif || 'Consultation'}</h3>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(item.date_consult)} • {item.isDemo ? 'Apercu demo' : item.statut === 'credit' ? 'A suivre' : item.statut === 'annule' ? 'Annulee' : 'Cloturee'}</p>
                    </div>
                    {item.isDemo ? <span className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-600">Apercu demo</span> : <EditButton onClick={() => setConsultationEditItem(item)} label="Editer" />}
                  </div>
                  <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm leading-7 text-slate-700">{item.notes || 'Aucune note detaillee pour cette consultation.'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <PatientEditModal open={patientModalOpen} patient={patient} fieldConfig={patientFieldConfig} onClose={() => { setPatientModalOpen(false); setPatientFieldConfig(null) }} onSaved={refreshPage} />
      <VitalsModal open={vitalsModalOpen} patient={patient} cabinetId={cabinetId} vitals={latestVitals} onClose={() => setVitalsModalOpen(false)} onSaved={refreshPage} />
      <ConsultationEditModal open={Boolean(consultationEditItem)} consultation={consultationEditItem} onClose={() => setConsultationEditItem(null)} onSaved={refreshPage} />
      <DocumentEditModal open={Boolean(documentEditItem)} documentItem={documentEditItem} onClose={() => setDocumentEditItem(null)} onSaved={refreshPage} />
    </div>
  )
}

function PatientEditModal({ open, patient, fieldConfig, onClose, onSaved }) {
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', date_naissance: '', cin: '', adresse: '', mutuelle: '', numero_cnss: '', antecedents: '', allergies: '' })
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!patient || !open) return
    setForm({
      nom: patient.nom || '',
      prenom: patient.prenom || '',
      telephone: patient.telephone || '',
      date_naissance: patient.date_naissance || '',
      cin: patient.cin || '',
      adresse: patient.adresse || '',
      mutuelle: patient.mutuelle || '',
      numero_cnss: patient.numero_cnss || '',
      antecedents: patient.antecedents || '',
      allergies: patient.allergies || '',
    })
  }, [patient, open])

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const fieldDefinitions = [
    ['nom', 'Nom'],
    ['prenom', 'Prenom'],
    ['telephone', 'Telephone'],
    ['date_naissance', 'Date de naissance', 'date'],
    ['cin', 'CIN'],
    ['adresse', 'Adresse'],
    ['mutuelle', 'Mutuelle'],
    ['numero_cnss', 'Numero CNSS'],
    ['antecedents', 'Antecedents', 'textarea'],
    ['allergies', 'Allergies', 'textarea'],
  ]
  const visibleFields = fieldConfig
    ? fieldDefinitions.filter(([key]) => key === fieldConfig.key)
    : fieldDefinitions

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!patient?.id) return
    setSaving(true)
    setErrorMessage('')
    try {
      await updatePatient(patient.id, form)
      onSaved?.()
      onClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Impossible de sauvegarder les informations du patient.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SimpleModal open={open} onClose={onClose} title={fieldConfig ? `Modifier ${fieldConfig.label.toLowerCase()}` : 'Modifier les informations patient'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {fieldConfig ? (
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-500">Edition ciblee: tu modifies seulement l'information choisie, pas toute la fiche.</p>
          </div>
        ) : null}
        <div className={`grid gap-4 ${fieldConfig ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
          {visibleFields.map(([key, label, type]) => (
            <label key={key} className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
              {type === 'textarea' ? (
                <textarea value={form[key]} onChange={(e) => updateField(key, e.target.value)} rows={5} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300" />
              ) : (
                <input type={type || 'text'} value={form[key]} onChange={(e) => updateField(key, e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300" />
              )}
            </label>
          ))}
        </div>
        {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errorMessage}</div> : null}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600">Annuler</button>
          <button type="submit" disabled={saving} className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Enregistrement...' : 'Sauvegarder'}</button>
        </div>
      </form>
    </SimpleModal>
  )
}

function VitalsModal({ open, patient, cabinetId, vitals, onClose, onSaved }) {
  const [form, setForm] = useState({ poids: '', taille: '', imc: '', tension_systolique: '', tension_diastolique: '', frequence_cardiaque: '', temperature: '', saturation: '', measured_at: '' })
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!open) return
    setForm({
      poids: vitals?.poids ?? '',
      taille: vitals?.taille ?? '',
      imc: vitals?.imc ?? '',
      tension_systolique: vitals?.tension_systolique ?? '',
      tension_diastolique: vitals?.tension_diastolique ?? '',
      frequence_cardiaque: vitals?.frequence_cardiaque ?? '',
      temperature: vitals?.temperature ?? '',
      saturation: vitals?.saturation ?? '',
      measured_at: vitals?.measured_at ? new Date(vitals.measured_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    })
  }, [open, vitals])

  useEffect(() => {
    const nextImc = calcImc(form.poids, form.taille)
    setForm((current) => ({ ...current, imc: nextImc ?? '' }))
  }, [form.poids, form.taille])

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!patient?.id || !cabinetId) return
    setSaving(true)
    setErrorMessage('')
    const payload = {
      patient_id: patient.id,
      cabinet_id: cabinetId,
      poids: form.poids === '' ? null : Number(form.poids),
      taille: form.taille === '' ? null : Number(form.taille),
      imc: form.imc === '' ? null : Number(form.imc),
      tension_systolique: form.tension_systolique === '' ? null : Number(form.tension_systolique),
      tension_diastolique: form.tension_diastolique === '' ? null : Number(form.tension_diastolique),
      frequence_cardiaque: form.frequence_cardiaque === '' ? null : Number(form.frequence_cardiaque),
      temperature: form.temperature === '' ? null : Number(form.temperature),
      saturation: form.saturation === '' ? null : Number(form.saturation),
      measured_at: form.measured_at ? new Date(form.measured_at).toISOString() : new Date().toISOString(),
    }
    try {
      if (vitals?.id && !vitals?.isDemo) await updateSigneVital(vitals.id, payload)
      else await createSigneVital(payload)
      onSaved?.()
      onClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Impossible de sauvegarder les signes vitaux.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SimpleModal open={open} onClose={onClose} title={vitals?.id && !vitals?.isDemo ? 'Modifier la mesure' : 'Ajouter une mesure'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ['poids', 'Poids (kg)'],
            ['taille', 'Taille (cm)'],
            ['imc', 'IMC', 'number', true],
            ['tension_systolique', 'Tension systolique'],
            ['tension_diastolique', 'Tension diastolique'],
            ['frequence_cardiaque', 'Frequence cardiaque'],
            ['temperature', 'Temperature'],
            ['saturation', 'Saturation O2'],
          ].map(([key, label, type, disabled]) => (
            <label key={key} className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
              <input type={type || 'number'} step="0.1" disabled={Boolean(disabled)} value={form[key]} onChange={(e) => updateField(key, e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300 disabled:bg-slate-100 disabled:text-slate-400" />
            </label>
          ))}
          <label className="block xl:col-span-3">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Date de mesure</span>
            <input type="datetime-local" value={form.measured_at} onChange={(e) => updateField('measured_at', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300" />
          </label>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">L'IMC est calcule automatiquement a partir du poids et de la taille.</div>
        {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errorMessage}</div> : null}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600">Annuler</button>
          <button type="submit" disabled={saving} className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Enregistrement...' : 'Sauvegarder'}</button>
        </div>
      </form>
    </SimpleModal>
  )
}

function ConsultationEditModal({ open, consultation, onClose, onSaved }) {
  const [form, setForm] = useState({ date_consult: '', montant: '', statut: 'paye', notes: '' })
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!consultation || !open) return
    setForm({
      date_consult: consultation.date_consult || '',
      montant: consultation.montant ?? '',
      statut: consultation.statut || 'paye',
      notes: consultation.notes || '',
    })
  }, [consultation, open])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!consultation?.id) return
    setSaving(true)
    setErrorMessage('')
    try {
      await updateConsultation(consultation.id, { ...form, montant: Number(form.montant || 0) })
      onSaved?.()
      onClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Impossible de sauvegarder la consultation.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SimpleModal open={open} onClose={onClose} title="Modifier la consultation">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Date</span>
            <input type="date" value={form.date_consult} onChange={(e) => setForm((c) => ({ ...c, date_consult: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Montant</span>
            <input type="number" value={form.montant} onChange={(e) => setForm((c) => ({ ...c, montant: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Statut</span>
            <select value={form.statut} onChange={(e) => setForm((c) => ({ ...c, statut: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300">
              <option value="paye">Paye</option>
              <option value="credit">Credit</option>
              <option value="annule">Annule</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Notes</span>
          <textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} rows={5} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300" />
        </label>
        {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errorMessage}</div> : null}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600">Annuler</button>
          <button type="submit" disabled={saving} className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Enregistrement...' : 'Sauvegarder'}</button>
        </div>
      </form>
    </SimpleModal>
  )
}

function DocumentEditModal({ open, documentItem, onClose, onSaved }) {
  const [form, setForm] = useState({ nom_fichier: '', type_document: '' })
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!open || !documentItem) return
    setForm({
      nom_fichier: documentItem.nom_fichier || '',
      type_document: documentItem.type_document || '',
    })
  }, [open, documentItem])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!documentItem?.id) return
    setSaving(true)
    setErrorMessage('')
    try {
      const { error } = await supabase.from('documents').update(form).eq('id', documentItem.id)
      if (error) throw error
      onSaved?.()
      onClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Impossible de sauvegarder le document.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SimpleModal open={open} onClose={onClose} title="Modifier le document">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Nom du fichier</span>
          <input value={form.nom_fichier} onChange={(e) => setForm((c) => ({ ...c, nom_fichier: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Type</span>
          <input value={form.type_document} onChange={(e) => setForm((c) => ({ ...c, type_document: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300" />
        </label>
        {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errorMessage}</div> : null}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600">Annuler</button>
          <button type="submit" disabled={saving} className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Enregistrement...' : 'Sauvegarder'}</button>
        </div>
      </form>
    </SimpleModal>
  )
}
