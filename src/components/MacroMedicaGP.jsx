import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  AudioLines,
  Ban,
  Bell,
  Bold,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FolderOpen,
  FlaskConical,
  HeartPulse,
  Italic,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  MessageCircle,
  Mic,
  Pill,
  Phone,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  TestTube2,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import Modal from './common/Modal'
import useAudioRecorder from '../hooks/useAudioRecorder'
import {
  checkDrugSafety,
  generateSummary,
  suggestCIM10,
  transcribeAndStructure,
} from '../services/geminiService'

const BASE_TABS = [
  { id: 'overview', label: "Vue d'ensemble", icon: LayoutGrid },
  { id: 'consultation', label: 'Consultation en cours', icon: Stethoscope },
  { id: 'ordonnances', label: 'Ordonnances', icon: ClipboardCheck },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
]

const GP_CIM_CODES = [
  { code: 'E11', label: 'Diabete sucre de type 2' },
  { code: 'I10', label: 'Hypertension essentielle' },
  { code: 'J06.9', label: 'Infection aigue des voies respiratoires superieures' },
  { code: 'R10.4', label: 'Douleur abdominale, sans precision' },
  { code: 'M54.5', label: 'Lombalgie' },
  { code: 'K21.9', label: 'Reflux gastro-oesophagien' },
  { code: 'R07.4', label: 'Douleur thoracique' },
  { code: 'E78.5', label: 'Hyperlipidemie' },
]

const GP_PRESCRIPTION_CATALOG = [
  {
    name: 'Doliprane 1000 mg',
    molecule: 'Paracetamol',
    posology: '1 comprime 3 fois par jour pendant 5 jours',
    category: 'Douleur / Fievre',
    keywords: ['paracetamol', 'douleur', 'fievre'],
  },
  {
    name: 'Metformine 500 mg',
    molecule: 'Metformine',
    posology: '1 comprime 2 fois par jour',
    category: 'Diabete',
    keywords: ['metformine', 'diabete', 'sucre'],
  },
  {
    name: 'Amlodipine 5 mg',
    molecule: 'Amlodipine',
    posology: '1 comprime le soir',
    category: 'HTA',
    keywords: ['hta', 'tension', 'amlodipine'],
  },
  {
    name: 'Omeprazole 20 mg',
    molecule: 'Omeprazole',
    posology: '1 gelule le matin avant le petit-dejeuner',
    category: 'Gastro',
    keywords: ['gastro', 'brulure', 'estomac'],
  },
  {
    name: 'Augmentin 1 g',
    molecule: 'Amoxicilline / Acide clavulanique',
    posology: '1 comprime 2 fois par jour',
    category: 'Antibiotique',
    keywords: ['augmentin', 'amoxicilline', 'infection'],
    riskHint: 'penicilline',
  },
  {
    name: 'Bactrim forte',
    molecule: 'Sulfamethoxazole / Trimethoprime',
    posology: '1 comprime 2 fois par jour',
    category: 'Antibiotique',
    keywords: ['bactrim', 'sulfamide', 'infection'],
    riskHint: 'sulfamides',
  },
]

const GP_PATIENT = {
  id: 'MM-092',
  name: 'Hazim Mazgouri',
  initials: 'HM',
  sex: 'Homme',
  age: 46,
  dossier: '092-sanguin',
  pathologies: ['Diabete type 2', 'HTA'],
  allergies: ['Penicilline', 'Sulfamides'],
  heightCm: 178,
  weightKg: 82,
  baselineBiometry: [
    { label: 'Taille', value: '178 cm' },
    { label: 'Poids', value: '82 kg' },
    { label: 'IMC', value: '25.9' },
    { label: 'Groupe', value: 'O+' },
  ],
  contacts: {
    phone: '07150524',
    address: 'Rabat, Maroc',
    whatsapp: 'Lien WhatsApp',
  },
  treatment: [
    { name: 'Metformine 500mg', posology: '2 comprimes par jour' },
    { name: 'Amlodipine 5mg', posology: '1 comprime par jour' },
  ],
  upcoming: [
    { label: 'Bilan sanguin', meta: 'En attente', tone: 'amber' },
    { label: 'RDV Controle', meta: '15 juillet', tone: 'blue' },
  ],
  safetyAlerts: ['Allergie Penicilline, Sulfamides'],
  documents: [
    { name: 'Bilan_sanguin.pdf', meta: 'Bilan - 02/04/2026' },
    { name: 'Ordonnance_Mars.pdf', meta: 'Ordonnance - 01/03/2026' },
    { name: 'Consultation_avril.pdf', meta: 'Compte rendu - 15/04/2026' },
  ],
  planItems: [
    { id: 'plan-1', label: 'Bilan sanguin (HbA1c, creatinine)', done: true },
    { id: 'plan-2', label: 'Controle tension arterielle', done: true },
    { id: 'plan-3', label: 'Examen du pied diabetique', done: false },
  ],
  initialConstantes: {
    tas: '120',
    tad: '80',
    fc: '72',
    fr: '16',
    temp: '37.0',
    spo2: '98',
    glycemie: '1.10',
    poids: '',
  },
  timeline: [
    {
      id: 'tl-1',
      type: 'SUIVI',
      date: '15 avril 2026',
      doctor: 'Dr. Othmane Tougari',
      motif: 'Suivi diabetique',
      summary: 'HbA1c stable a 6.8%. Reduction Metformine envisagee.',
      details:
        "Patient equilibre, pas d'hypoglycemie declaree. Education therapeutique renforcee.",
      flags: ['Ordonnance modifiee', 'Bilan prescrit'],
      constantes: [
        { label: 'TA', value: '128/82' },
        { label: 'HbA1c', value: '6.8%' },
        { label: 'Poids', value: '82 kg' },
      ],
    },
    {
      id: 'tl-2',
      type: 'GENERALE',
      date: '28 mars 2026',
      doctor: 'Dr. Martin Kowsiki',
      motif: 'Consultation generale',
      summary: 'Douleurs lombaires chroniques. Antalgiques + kine.',
      details:
        'Absence de signes neurologiques. Conseils posturaux et prise en charge symptomatique proposes.',
      flags: ['Ordonnance'],
      constantes: [
        { label: 'TA', value: '126/78' },
        { label: 'FC', value: '76 bpm' },
        { label: 'Poids', value: '82 kg' },
      ],
    },
    {
      id: 'tl-3',
      type: 'CONTROLE',
      date: '10 jan 2026',
      doctor: 'Dr. Othmane Tougari',
      motif: 'Controle annuel',
      summary: 'Bilan complet sans anomalie. Vaccinations a jour.',
      details:
        "Profil lipidique corrige. Pas de nouvelles plaintes. Plan de prevention maintenu.",
      flags: ['Bilan'],
      constantes: [
        { label: 'TA', value: '124/79' },
        { label: 'LDL', value: '0.92 g/L' },
        { label: 'Poids', value: '81 kg' },
      ],
    },
  ],
  timelineCount: 12,
}

const GP_CONFIG = {
  variantId: 'gp',
  label: 'generaliste',
  patient: GP_PATIENT,
  tabs: BASE_TABS,
  consultationBadge: 'Mode Sprint active',
  motifOptions: ['Douleur', 'Suivi Diabete', 'Renouvellement', 'Bilan', 'Autre'],
  constantFields: [
    { key: 'tas', label: 'TAS', unit: 'mmHg' },
    { key: 'tad', label: 'TAD', unit: 'mmHg' },
    { key: 'fc', label: 'FC', unit: 'bpm' },
    { key: 'fr', label: 'FR', unit: 'mn' },
    { key: 'temp', label: 'Temp', unit: '°C' },
    { key: 'spo2', label: 'SpO2', unit: '%' },
    { key: 'glycemie', label: 'Glycemie', unit: 'g/L' },
    { key: 'poids', label: 'Poids du jour', unit: 'kg' },
  ],
  textAreas: [
    {
      key: 'interrogatoire',
      title: 'Interrogatoire',
      placeholder: "Decrivez le motif et les antecedents pertinents...",
      minHeight: 'min-h-[128px]',
    },
    {
      key: 'examenClinique',
      title: 'Examen Clinique',
      placeholder:
        'Examen clinique diabetique : pieds, inspection des plis, pouls pedieux, sensibilite...',
      minHeight: 'min-h-[120px]',
    },
    {
      key: 'synthese',
      title: 'Synthese & Conclusion',
      placeholder: 'Synthese globale de la consultation...',
      minHeight: 'min-h-[96px]',
    },
  ],
  bioOptions: ['NFS', 'Ionogramme', 'Bilan lipidique', 'HbA1c', 'Creatinine', 'TSH'],
  imagerieOptions: ['Radiographie', 'Echographie', 'ECG', 'Scanner', 'IRM'],
  referencementOptions: ['Specialiste', 'Cardiologue', 'Endocrinologue', 'Kinesitherapeute'],
  ordonnanceTypes: ['Diabete', 'Douleur / Fievre', 'Gastro', 'HTA'],
  prescriptionCatalog: GP_PRESCRIPTION_CATALOG,
  cimDatabase: GP_CIM_CODES,
  currentPrescriptions: [
    { name: 'Metformine 500mg', posology: '2 comprimes / jour' },
    { name: 'Amlodipine 5mg', posology: '1 comprime / jour' },
  ],
  quickActions: [
    { label: 'Nouvelle Consultation' },
    { label: 'Nouvelle Ordonnance' },
    { label: 'Demander un bilan' },
    { label: 'Programmer RDV' },
  ],
  timelineStyles: {
    SUIVI: {
      bubble: 'bg-blue-600 text-white',
      tag: 'bg-blue-50 text-blue-700 border-blue-100',
    },
    CONTROLE: {
      bubble: 'bg-emerald-500 text-white',
      tag: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    GENERALE: {
      bubble: 'bg-slate-500 text-white',
      tag: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    CHIRURGIE: {
      bubble: 'bg-orange-500 text-white',
      tag: 'bg-orange-50 text-orange-700 border-orange-100',
    },
    URGENCE: {
      bubble: 'bg-rose-500 text-white',
      tag: 'bg-rose-50 text-rose-700 border-rose-100',
    },
  },
  buildOverviewSections: ({ patient }) => [
    {
      title: 'Pathologies actives',
      content: {
        type: 'dual-chips',
        primary: patient.pathologies.map((item) => ({ label: item, tone: 'blue' })),
        secondaryTitle: 'Allergies',
        secondary: patient.allergies.map((item) => ({ label: item, tone: 'red' })),
      },
    },
    {
      title: 'Traitement en cours',
      content: {
        type: 'list',
        items: patient.treatment.map((item) => ({
          icon: 'pill',
          label: item.name,
          meta: item.posology,
        })),
      },
    },
    {
      title: 'Dernieres constantes',
      content: {
        type: 'metrics',
        items: [
          { label: 'Tension', value: '128/82', trend: 'up' },
          { label: 'HbA1c', value: '6.8%', trend: 'down' },
          { label: 'Poids', value: '82 kg', trend: 'up' },
        ],
      },
    },
    {
      title: 'Actions en attente',
      content: {
        type: 'badges',
        items: patient.upcoming,
      },
    },
  ],
}

const ICON_MAP = {
  pill: Pill,
}

const CARD_CLASS = 'rounded-xl border border-slate-200/80 bg-white shadow-sm'
const INPUT_CLASS =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-wider text-slate-500'

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function calculateImc(weightKg, heightCm) {
  const weight = Number.parseFloat(weightKg)
  const height = Number.parseFloat(heightCm)

  if (!weight || !height) return null
  return (weight / ((height / 100) * (height / 100))).toFixed(1)
}

function calculatePregnancyStats(ddr) {
  if (!ddr) return { isPregnant: false, saLabel: null, termLabel: null }

  const now = new Date()
  const start = new Date(ddr)

  if (Number.isNaN(start.getTime()) || start > now) {
    return { isPregnant: false, saLabel: null, termLabel: null }
  }

  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const weeks = Math.floor(diffDays / 7)
  const days = diffDays % 7

  if (weeks < 0 || weeks > 40) {
    return { isPregnant: false, saLabel: null, termLabel: null }
  }

  return {
    isPregnant: true,
    saLabel: `${weeks} SA + ${days}j`,
    termLabel: `${Math.max(0, 40 - weeks)} semaines avant terme`,
  }
}

function getRiskTint(drug, patient) {
  const allergies = patient?.allergies?.map(normalizeText) || []
  const riskHint = normalizeText(drug?.riskHint)
  return Boolean(riskHint && allergies.some((item) => item.includes(riskHint)))
}

function buildTextFromTranscription(target, result) {
  const pieces = []

  if (target === 'interrogatoire' && result?.interrogatoire) pieces.push(result.interrogatoire)
  if (target === 'examenClinique' && result?.examenClinique) pieces.push(result.examenClinique)
  if (target === 'examenGynecologique' && result?.examenClinique) pieces.push(result.examenClinique)
  if (target === 'synthese') {
    if (result?.motif) pieces.push(`Motif : ${result.motif}`)
    if (result?.interrogatoire) pieces.push(result.interrogatoire)
    if (result?.examenClinique) pieces.push(result.examenClinique)
  }

  return pieces.join('\n\n').trim()
}

function buildConsultationNarrative(textFields) {
  return Object.values(textFields).filter(Boolean).join('\n\n')
}

function toneClasses(tone) {
  if (tone === 'red') return 'bg-rose-50 text-rose-700 border-rose-100'
  if (tone === 'amber') return 'bg-amber-50 text-amber-700 border-amber-100'
  if (tone === 'green') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  return 'bg-blue-50 text-blue-700 border-blue-100'
}

export function MacroMedicaClinicalWorkspace({ config, initialPatient }) {
  const patientSeed = initialPatient || config.patient
  const [activeTab, setActiveTab] = useState('overview')
  const [patient, setPatient] = useState(patientSeed)
  const [savedAt, setSavedAt] = useState(formatTime())
  const [motif, setMotif] = useState(config.motifOptions[0] || '')
  const [textFields, setTextFields] = useState(() =>
    config.textAreas.reduce((acc, field) => ({ ...acc, [field.key]: '' }), {}),
  )
  const [pendingSuggestions, setPendingSuggestions] = useState({})
  const [motifSuggestion, setMotifSuggestion] = useState(null)
  const [constantes, setConstantes] = useState(patientSeed.initialConstantes || {})
  const [pendingConstantes, setPendingConstantes] = useState({})
  const [diagnosticMode, setDiagnosticMode] = useState('retenu')
  const [diagnosticSearch, setDiagnosticSearch] = useState('')
  const [diagnosticPrincipal, setDiagnosticPrincipal] = useState(null)
  const [diagnosticAssocies, setDiagnosticAssocies] = useState([])
  const [diagnosticFocused, setDiagnosticFocused] = useState(false)
  const [showAssocieInput, setShowAssocieInput] = useState(false)
  const [pendingAssocie, setPendingAssocie] = useState('')
  const [loadingCim, setLoadingCim] = useState(false)
  const [aiCimSuggestions, setAiCimSuggestions] = useState({ principal: null, associes: [] })
  const [conduite, setConduite] = useState({
    biologie: ['NFS', 'HbA1c', 'Creatinine'],
    imagerie: [],
    autreBio: '',
    referencement: '',
    motifReferencement: '',
    arretTravailJours: '',
    arretTravailDate: '',
    rdvDate: '',
    rdvMotif: '',
  })
  const [pendingConduite, setPendingConduite] = useState(null)
  const [planItems, setPlanItems] = useState(patientSeed.planItems || [])
  const [templateFilter, setTemplateFilter] = useState('')
  const [drugQuery, setDrugQuery] = useState('')
  const [selectedPrescriptions, setSelectedPrescriptions] = useState([])
  const [blockedDrug, setBlockedDrug] = useState(null)
  const [forceReason, setForceReason] = useState('')
  const [closingModalOpen, setClosingModalOpen] = useState(false)
  const [closingMode, setClosingMode] = useState('original+resume')
  const [summaryHtml, setSummaryHtml] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [activeScribeTarget, setActiveScribeTarget] = useState(null)
  const recorder = useAudioRecorder()

  const pregnancy = useMemo(
    () => calculatePregnancyStats(patient?.gyneco?.ddr),
    [patient?.gyneco?.ddr],
  )

  const visibleConstantFields = useMemo(
    () =>
      config.constantFields.filter((field) =>
        typeof field.showIf === 'function' ? field.showIf(patient) : true,
      ),
    [config.constantFields, patient],
  )

  const formSignature = useMemo(
    () =>
      JSON.stringify({
        activeTab,
        motif,
        textFields,
        constantes,
        diagnosticPrincipal,
        diagnosticAssocies,
        conduite,
        selectedPrescriptions,
        planItems,
      }),
    [activeTab, conduite, constantes, diagnosticAssocies, diagnosticPrincipal, motif, planItems, selectedPrescriptions, textFields],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSavedAt(formatTime())
    }, 600)

    return () => window.clearTimeout(timer)
  }, [formSignature])

  const consultationNarrative = useMemo(
    () => buildConsultationNarrative(textFields),
    [textFields],
  )

  useEffect(() => {
    if (!diagnosticFocused || consultationNarrative.trim().length < 20) return undefined

    const timer = window.setTimeout(async () => {
      try {
        setLoadingCim(true)
        const result = await suggestCIM10(consultationNarrative)
        setAiCimSuggestions({
          principal: result?.principal || null,
          associes: result?.associes || [],
        })
      } catch (error) {
        setAiCimSuggestions({ principal: null, associes: [] })
        toast.error('Service IA temporairement indisponible')
      } finally {
        setLoadingCim(false)
      }
    }, 500)

    return () => window.clearTimeout(timer)
  }, [consultationNarrative, diagnosticFocused])

  const searchPool = useMemo(() => {
    const query = normalizeText(diagnosticSearch)
    if (!query) return config.cimDatabase.slice(0, 6)

    return config.cimDatabase.filter(
      (item) =>
        normalizeText(item.code).includes(query) ||
        normalizeText(item.label).includes(query),
    )
  }, [config.cimDatabase, diagnosticSearch])

  const filteredDrugs = useMemo(() => {
    const query = normalizeText(drugQuery)
    const template = normalizeText(templateFilter)

    return config.prescriptionCatalog.filter((drug) => {
      const matchesTemplate = template
        ? normalizeText(drug.category).includes(template)
        : true
      const matchesQuery = query
        ? [drug.name, drug.molecule, ...(drug.keywords || [])]
            .map(normalizeText)
            .some((item) => item.includes(query))
        : true

      return matchesTemplate && matchesQuery
    })
  }, [config.prescriptionCatalog, drugQuery, templateFilter])

  const overviewSections = useMemo(
    () => config.buildOverviewSections({ patient, constantes, pregnancy }),
    [config, constantes, patient, pregnancy],
  )

  async function handleScribeToggle(target) {
    if (!recorder.isSupported) {
      toast.error("L'enregistrement audio n'est pas disponible sur cet appareil")
      return
    }

    if (!recorder.isRecording) {
      try {
        setActiveScribeTarget(target)
        await recorder.startRecording()
      } catch (error) {
        toast.error(error?.message || "Impossible d'acceder au microphone")
        setActiveScribeTarget(null)
      }
      return
    }

    if (activeScribeTarget !== target) {
      toast.error('Un autre champ est deja en cours de dictation')
      return
    }

    try {
      const payload = await recorder.stopRecording()

      if (!payload?.base64) {
        toast.error("Aucun audio n'a ete recupere")
        setActiveScribeTarget(null)
        return
      }

      const result = await transcribeAndStructure(payload.base64, {
        patientAge: patient.age,
        patientSex: patient.sex,
        allergies: patient.allergies,
      })

      const suggestionText = buildTextFromTranscription(target, result)

      if (suggestionText) {
        setPendingSuggestions((current) => ({
          ...current,
          [target]: suggestionText,
        }))
      }

      if (result?.motif) setMotifSuggestion(result.motif)
      if (result?.constantes && Object.keys(result.constantes).length > 0) {
        setPendingConstantes((current) => ({ ...current, ...result.constantes }))
      }
      if (result?.conduite && Object.keys(result.conduite).length > 0) {
        setPendingConduite(result.conduite)
      }

      toast.success('Suggestion IA prete a etre verifiee')
    } catch (error) {
      toast.error('Service IA temporairement indisponible')
    } finally {
      setActiveScribeTarget(null)
    }
  }

  function acceptTextSuggestion(key) {
    setTextFields((current) => ({
      ...current,
      [key]: pendingSuggestions[key] || current[key],
    }))
    setPendingSuggestions((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function rejectTextSuggestion(key) {
    setPendingSuggestions((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function acceptMotifSuggestion() {
    if (motifSuggestion) setMotif(motifSuggestion)
    setMotifSuggestion(null)
  }

  function applyConstanteSuggestion(fieldKey) {
    setConstantes((current) => ({
      ...current,
      [fieldKey]: pendingConstantes[fieldKey] ?? current[fieldKey],
    }))
    setPendingConstantes((current) => {
      const next = { ...current }
      delete next[fieldKey]
      return next
    })
  }

  function rejectConstanteSuggestion(fieldKey) {
    setPendingConstantes((current) => {
      const next = { ...current }
      delete next[fieldKey]
      return next
    })
  }

  function acceptConduiteSuggestion() {
    setConduite((current) => ({
      ...current,
      biologie: Array.from(
        new Set([...(current.biologie || []), ...(pendingConduite?.biologie || [])]),
      ),
      imagerie: Array.from(
        new Set([...(current.imagerie || []), ...(pendingConduite?.imagerie || [])]),
      ),
      referencement: pendingConduite?.referencement || current.referencement,
      arretTravailJours:
        pendingConduite?.arretTravailJours ?? current.arretTravailJours,
      rdvDate: pendingConduite?.rdvDate || current.rdvDate,
    }))
    setPendingConduite(null)
  }

  function addPrincipal(code) {
    setDiagnosticPrincipal(code)
    setDiagnosticSearch('')
  }

  function addAssocie(code) {
    setDiagnosticAssocies((current) => {
      if (current.some((item) => item.code === code.code)) return current
      return [...current, code]
    })
    setPendingAssocie('')
    setShowAssocieInput(false)
  }

  function toggleChoice(collectionKey, value) {
    setConduite((current) => {
      const source = current[collectionKey] || []
      const next = source.includes(value)
        ? source.filter((item) => item !== value)
        : [...source, value]

      return {
        ...current,
        [collectionKey]: next,
      }
    })
  }

  async function handleAddDrug(drug, force = false) {
    const safety = await checkDrugSafety(
      drug.name,
      patient.allergies,
      [...config.currentPrescriptions, ...selectedPrescriptions].map((item) => item.name),
      pregnancy.isPregnant,
    )

    if (safety.severity === 'danger' && !force) {
      setBlockedDrug({ drug, safety })
      setForceReason('')
      toast.error('Prescription bloquee tant que la contre-indication persiste')
      return
    }

    setSelectedPrescriptions((current) => [
      ...current,
      { ...drug, safety, forced: force, forceReason: force ? forceReason : '' },
    ])
    setBlockedDrug(null)
    setForceReason('')
    toast[safety.severity === 'warning' ? 'warning' : 'success'](
      safety.message || 'Prescription ajoutee',
    )
  }

  async function prepareClosing() {
    try {
      setSummaryLoading(true)
      const summary = await generateSummary({
        motif,
        constantes,
        diagnostic: {
          principal: diagnosticPrincipal,
          associes: diagnosticAssocies,
          mode: diagnosticMode,
        },
        conduite,
        interrogation: textFields.interrogatoire,
        examenClinique: textFields.examenClinique,
        synthese: textFields.synthese,
      })
      setSummaryHtml(summary.summaryHTML)
      setClosingModalOpen(true)
    } catch (error) {
      toast.error('Service IA temporairement indisponible')
      setSummaryHtml('<p>Le resume IA est indisponible pour le moment.</p>')
      setClosingModalOpen(true)
    } finally {
      setSummaryLoading(false)
    }
  }

  function handleCloseConsultation() {
    setClosingModalOpen(false)
    toast.success(`Consultation sauvegardee (${closingMode})`)
  }

  function removePrescription(name) {
    setSelectedPrescriptions((current) => current.filter((item) => item.name !== name))
  }

  const safetyBanner = blockedDrug?.safety
    ? blockedDrug.safety.conflictType === 'pregnancy'
      ? {
          title: 'Grossesse - Contre-indique',
          body: blockedDrug.safety.message,
          tone: 'purple',
        }
      : {
          title: 'CONTRE-INDICATION',
          body: blockedDrug.safety.message,
          tone: 'rose',
        }
    : config.variantId === 'gyneco' && pregnancy.isPregnant
      ? {
          title: 'Grossesse - Vigilance medicamenteuse',
          body: `Patiente enceinte (${pregnancy.saLabel}). Verifiez toute prescription avant validation.`,
          tone: 'purple',
        }
    : patient.allergies?.length
      ? {
          title: 'Allergie',
          body: `Patient allergique a ${patient.allergies.join(', ')}.`,
          tone: 'rose-soft',
        }
      : null

  const quickActionIcons = [Plus, ClipboardCheck, FlaskConical, CalendarDays]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-blue-200 hover:text-blue-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour
            </button>
            <span className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                {patient.initials}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{patient.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span>{patient.pathologies.join(' • ')}</span>
                  <span>{patient.sex} {patient.age} ans</span>
                  <span>Dossier : {patient.dossier}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvelle consultation
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid grid-cols-[250px_1fr_320px] gap-6">
          <aside className="space-y-4">
            <div className={cx(CARD_CLASS, 'overflow-hidden py-1')}>
              {config.tabs.map((tab) => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cx(
                      'flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left text-xs transition',
                      active
                        ? 'border-blue-600 bg-blue-50/60 font-semibold text-blue-700'
                        : 'border-transparent text-slate-500 hover:bg-slate-50',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {patient.allergies?.length ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 shadow-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-rose-500" />
                  <div>
                    <p className={cx(LABEL_CLASS, 'text-rose-500')}>
                      Allergies
                    </p>
                    <p className="mt-1 text-xs text-rose-700">{patient.allergies.join(', ')}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className={cx(CARD_CLASS, 'p-4')}>
              <div className="mb-4 flex items-center justify-between">
                <p className={LABEL_CLASS}>
                  Biometrie
                </p>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  Reference
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {patient.baselineBiometry.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3"
                  >
                    <p className={LABEL_CLASS}>
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={cx(CARD_CLASS, 'p-4')}>
              <p className={LABEL_CLASS}>
                Coordonnees
              </p>
              <div className="mt-3 space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <PhoneBadge />
                  {patient.contacts.phone}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-300" />
                  {patient.contacts.address}
                </div>
              </div>
              <button
                type="button"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 opacity-70 transition hover:border-blue-200 hover:text-blue-700 hover:opacity-100"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {patient.contacts.whatsapp}
              </button>
            </div>

            {typeof config.renderLeftAddon === 'function'
              ? config.renderLeftAddon({ patient, setPatient, pregnancy })
              : null}
          </aside>

          <section className="space-y-4">
            {activeTab === 'overview' ? (
              <>
                <ResumePatientCard sections={overviewSections} alerts={patient.safetyAlerts} />
                <TimelineCard
                  entries={patient.timeline}
                  styles={config.timelineStyles}
                  totalCount={patient.timelineCount || 12}
                />
              </>
            ) : null}

            {activeTab === 'consultation' ? (
              <>
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-bold text-slate-900">Consultation en cours</h1>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Save className="h-3.5 w-3.5" />
                    Sauvegarde a {savedAt}
                  </div>
                </div>

                <ConstantesJourCard
                  fields={visibleConstantFields}
                  values={constantes}
                  pending={pendingConstantes}
                  onChange={(key, value) =>
                    setConstantes((current) => ({ ...current, [key]: value }))
                  }
                  onAccept={applyConstanteSuggestion}
                  onReject={rejectConstanteSuggestion}
                  onReuseLatest={() => setConstantes(patient.initialConstantes)}
                  imc={calculateImc(constantes.poids, patient.heightCm)}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">
                    Motif de consultation :
                  </label>
                  <select
                    value={motif}
                    onChange={(event) => setMotif(event.target.value)}
                    className={cx(INPUT_CLASS, 'max-w-xs min-w-[240px] shadow-sm')}
                  >
                    {config.motifOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  {motif ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                      <Sparkles className="h-3 w-3" />
                      {config.consultationBadge}
                    </span>
                  ) : null}
                </div>

                {motifSuggestion ? (
                  <SuggestionBanner
                    title="Suggestion IA pour le motif"
                    body={motifSuggestion}
                    onAccept={acceptMotifSuggestion}
                    onReject={() => setMotifSuggestion(null)}
                  />
                ) : null}

                {config.textAreas.map((field) => (
                  <RichTextArea
                    key={field.key}
                    title={field.title}
                    placeholder={field.placeholder}
                    value={textFields[field.key]}
                    minHeight={field.minHeight}
                    pendingSuggestion={pendingSuggestions[field.key]}
                    isRecording={recorder.isRecording && activeScribeTarget === field.key}
                    onChange={(value) =>
                      setTextFields((current) => ({
                        ...current,
                        [field.key]: value,
                      }))
                    }
                    onMicClick={() => handleScribeToggle(field.key)}
                    onAcceptSuggestion={() => acceptTextSuggestion(field.key)}
                    onRejectSuggestion={() => rejectTextSuggestion(field.key)}
                  />
                ))}

                <DiagnosticCard
                  mode={diagnosticMode}
                  setMode={setDiagnosticMode}
                  search={diagnosticSearch}
                  setSearch={setDiagnosticSearch}
                  principal={diagnosticPrincipal}
                  associes={diagnosticAssocies}
                  loading={loadingCim}
                  aiSuggestions={aiCimSuggestions}
                  searchResults={searchPool}
                  showAssocieInput={showAssocieInput}
                  pendingAssocie={pendingAssocie}
                  setPendingAssocie={setPendingAssocie}
                  onFocus={() => setDiagnosticFocused(true)}
                  onBlur={() => window.setTimeout(() => setDiagnosticFocused(false), 120)}
                  onSelectPrincipal={addPrincipal}
                  onClearPrincipal={() => setDiagnosticPrincipal(null)}
                  onAddAssocie={addAssocie}
                  onRemoveAssocie={(code) =>
                    setDiagnosticAssocies((current) =>
                      current.filter((item) => item.code !== code),
                    )
                  }
                  onShowAssocieInput={() => setShowAssocieInput(true)}
                  isDropdownOpen={diagnosticFocused}
                />

                <ConduiteCard
                  bioOptions={config.bioOptions}
                  imagerieOptions={config.imagerieOptions}
                  referencementOptions={config.referencementOptions}
                  value={conduite}
                  pending={pendingConduite}
                  onToggleChoice={toggleChoice}
                  onFieldChange={(key, value) =>
                    setConduite((current) => ({ ...current, [key]: value }))
                  }
                  onAcceptPending={acceptConduiteSuggestion}
                  onRejectPending={() => setPendingConduite(null)}
                />

                <div className="flex items-center justify-between border-t border-slate-200/80 pt-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Save className="h-3.5 w-3.5" />
                    Sauvegarde automatiquement
                  </div>
                  <button
                    type="button"
                    onClick={prepareClosing}
                    disabled={summaryLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {summaryLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Cloturer la consultation
                  </button>
                </div>
              </>
            ) : null}

            {activeTab === 'ordonnances' ? (
              <InfoPanel
                icon={ClipboardCheck}
                title="Ordonnances"
                body="Retrouvez ici les prescriptions de la consultation et les modeles favoris du praticien."
              />
            ) : null}

            {activeTab === 'documents' ? (
              <InfoPanel
                icon={FolderOpen}
                title="Documents"
                body="Ce panneau regroupe les comptes rendus, bilans et documents partages avec le patient."
              />
            ) : null}
          </section>

          <aside className="space-y-4">
            {activeTab === 'consultation' ? (
              <>
                {safetyBanner ? (
                  <div className="sticky top-20 z-10">
                    <SafetyBanner
                      banner={safetyBanner}
                      blockedDrug={blockedDrug}
                      forceReason={forceReason}
                      setForceReason={setForceReason}
                      onForce={() => handleAddDrug(blockedDrug.drug, true)}
                      onCancel={() => {
                        setBlockedDrug(null)
                        setForceReason('')
                      }}
                    />
                  </div>
                ) : null}

                <div className={cx(CARD_CLASS, 'p-4')}>
                  <h3 className="text-sm font-bold text-slate-900">
                    Plan de traitement contextuel
                  </h3>
                  <div className="mt-4 space-y-3">
                    {planItems.map((item) => (
                      <label key={item.id} className="flex items-start gap-3 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() =>
                            setPlanItems((current) =>
                              current.map((entry) =>
                                entry.id === item.id ? { ...entry, done: !entry.done } : entry,
                              ),
                            )
                          }
                          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={cx('transition', item.done && 'line-through text-slate-400')}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="mt-4 text-xs font-medium text-blue-600 transition hover:text-blue-700"
                  >
                    + Ajouter une tache
                  </button>
                </div>

                <div className={CARD_CLASS}>
                  <div className="border-b border-slate-100 px-4 py-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      Ordonnance medicamenteuse
                    </h3>
                    <p className={cx(LABEL_CLASS, 'mt-2')}>
                      Ordonnances types
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {config.ordonnanceTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setTemplateFilter((current) => (current === type ? '' : type))
                          }
                          className={cx(
                            'rounded-md border px-2 py-1 text-[11px] font-medium transition',
                            templateFilter === type
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-slate-100 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                      <Search className="h-4 w-4 text-slate-300" />
                      <input
                        value={drugQuery}
                        onChange={(event) => setDrugQuery(event.target.value)}
                        placeholder="Rechercher un medicament..."
                        className="w-full border-0 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="max-h-[320px] space-y-2 overflow-y-auto px-4 py-4">
                    {filteredDrugs.map((drug) => (
                      <button
                        key={drug.name}
                        type="button"
                        onClick={() => handleAddDrug(drug)}
                        className={cx(
                          'w-full rounded-lg border px-3 py-3 text-left transition hover:border-blue-200 hover:shadow-sm',
                          getRiskTint(drug, patient)
                            ? 'border-rose-200 bg-rose-50'
                            : 'border-slate-100 bg-white',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{drug.name}</p>
                            <p className="mt-1 text-[11px] text-slate-500">{drug.molecule}</p>
                            <p className="mt-1 text-[11px] text-slate-400">{drug.posology}</p>
                          </div>
                          {getRiskTint(drug, patient) ? (
                            <span className="rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                              Allergie
                            </span>
                          ) : null}
                        </div>
                      </button>
                    ))}
                    {!filteredDrugs.length ? (
                      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                        Aucun medicament ne correspond a cette recherche.
                      </p>
                    ) : null}
                  </div>

                  {selectedPrescriptions.length ? (
                    <div className="border-t border-slate-100 px-4 py-4">
                      <div className="space-y-2">
                        {selectedPrescriptions.map((item) => (
                          <div
                            key={`${item.name}-${item.forceReason || 'normal'}`}
                            className={cx(
                              'group rounded-lg border px-3 py-3',
                              item.safety?.severity === 'warning'
                                ? 'border-amber-200 bg-amber-50'
                                : item.safety?.severity === 'danger'
                                  ? 'border-rose-200 bg-rose-50'
                                  : 'border-slate-100 bg-slate-50',
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  {item.safety?.severity === 'danger' ? (
                                    <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                                  ) : null}
                                  <p className="text-sm font-bold text-slate-900">{item.name}</p>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">{item.posology}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removePrescription(item.name)}
                                className="rounded-md p-1 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-white hover:text-slate-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {item.safety?.severity === 'warning' ? (
                              <p className="mt-2 text-[11px] text-amber-700">{item.safety.message}</p>
                            ) : null}
                            {item.forced ? (
                              <p className="mt-2 text-[11px] text-rose-600">
                                Force avec motif : {item.forceReason}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPrescriptions([])
                        setBlockedDrug(null)
                      }}
                      className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.success('Ordonnance validee')}
                      className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                      Valider
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className={cx(CARD_CLASS, 'p-4')}>
                  <h3 className="text-sm font-bold text-slate-900">Traitement en cours</h3>
                  <div className="mt-4 space-y-2">
                    {patient.treatment.map((item) => (
                      <div key={item.name} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                        <div className="flex items-start gap-2">
                          <Pill className="mt-0.5 h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.name}</p>
                            <p className="mt-1 text-[11px] text-slate-500">{item.posology}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={cx(CARD_CLASS, 'p-4')}>
                  <h3 className="text-sm font-bold text-slate-900">Prochaines echeances</h3>
                  <div className="mt-4 space-y-3">
                    {patient.upcoming.map((item) => (
                      <div key={item.label} className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <Bell className="mt-0.5 h-3.5 w-3.5 text-amber-400" />
                          <div>
                            <p className="text-xs font-medium text-slate-700">{item.label}</p>
                            <p className="text-[11px] text-slate-400">{item.meta}</p>
                          </div>
                        </div>
                        <span className={cx('rounded-full border px-2 py-0.5 text-[10px] font-semibold', toneClasses(item.tone))}>
                          {item.meta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={cx(CARD_CLASS, 'p-4')}>
                  <h3 className="text-sm font-bold text-slate-900">Actions Rapides</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {config.quickActions.map((item, index) => {
                      const Icon = quickActionIcons[index] || Plus
                      return (
                      <button
                        key={item.label}
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-4 text-center text-[11px] font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Icon className="mx-auto mb-2 h-4 w-4" />
                        {item.label}
                      </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </button>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 text-rose-500" />
                    <div>
                      <p className="text-xs font-semibold text-rose-700">Alertes de securite</p>
                      <p className="mt-1 text-[11px] text-rose-600">
                        {patient.safetyAlerts.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </main>

      <Modal
        open={closingModalOpen}
        onClose={() => setClosingModalOpen(false)}
        title="Cloture de la consultation"
        description="Selectionnez le contenu a enregistrer dans le dossier patient."
        width="max-w-3xl"
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900">Resume IA genere</h3>
            </div>
            <div
              className="prose prose-sm mt-3 max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: summaryHtml }}
            />
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                type="radio"
                checked={closingMode === 'original'}
                onChange={() => setClosingMode('original')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              Original
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                type="radio"
                checked={closingMode === 'original+resume'}
                onChange={() => setClosingMode('original+resume')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              Original + Resume
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                type="radio"
                checked={closingMode === 'resume'}
                onChange={() => setClosingMode('resume')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              Resume
            </label>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setClosingModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={handleCloseConsultation}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              Sauvegarder et cloturer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function PhoneBadge() {
  return (
    <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-slate-400">
      <Phone className="h-3 w-3" />
    </span>
  )
}

function ResumePatientCard({ sections, alerts }) {
  return (
    <div className={cx(CARD_CLASS, 'p-5')}>
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-blue-600" />
        <h2 className="text-sm font-bold text-slate-900">Panorama 360 - Resume Patient</h2>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
        {sections.map((section) => (
          <OverviewSection key={section.title} section={section} />
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-500" />
          <p className="text-[11px] text-rose-700">
            <span className="font-semibold">Alertes de securite :</span> {alerts.join(', ')}
          </p>
        </div>
      </div>
    </div>
  )
}

function OverviewSection({ section }) {
  const { title, content } = section

  return (
    <div>
      <h3 className={LABEL_CLASS}>{title}</h3>
      {content.type === 'dual-chips' ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {content.primary.map((item) => (
              <span
                key={item.label}
                className={cx(
                  'rounded-full border px-2 py-1 text-[11px] font-medium',
                  toneClasses(item.tone),
                )}
              >
                {item.label}
              </span>
            ))}
          </div>
          <div>
            <p className={cx(LABEL_CLASS, 'mb-2')}>{content.secondaryTitle}</p>
            <div className="flex flex-wrap gap-1.5">
              {content.secondary.map((item) => (
                <span
                  key={item.label}
                  className={cx(
                    'rounded-full border px-2 py-1 text-[11px] font-medium',
                    toneClasses(item.tone),
                  )}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {content.type === 'list' ? (
        <div className="mt-3 space-y-3">
          {content.items.map((item) => {
            const Icon = ICON_MAP[item.icon] || Pill
            return (
              <div key={item.label} className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs font-medium text-slate-700">{item.label}</p>
                  <p className="text-[11px] text-slate-400">{item.meta}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
      {content.type === 'metrics' ? (
        <div className="mt-3 space-y-3">
          {content.items.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{item.label}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                {item.trend === 'up' ? (
                  <ArrowUp className="h-3 w-3 text-rose-500" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-emerald-500" />
                )}
                {item.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {content.type === 'badges' ? (
        <div className="mt-3 space-y-2">
          {content.items.map((item) => (
            <div key={item.label}>
              <div
                className={cx(
                  'flex items-center justify-between gap-3 text-xs font-medium',
                  item.tone === 'amber'
                    ? 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700'
                    : 'px-1 text-blue-700',
                )}
              >
                <span>{item.label}</span>
                <span className="text-[11px] opacity-80">{item.meta}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function TimelineCard({ entries, styles, totalCount }) {
  const [expandedId, setExpandedId] = useState(null)

  return (
    <div className={cx(CARD_CLASS, 'p-5')}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Historique des consultations</h2>
        <span className="text-xs font-medium text-slate-400">{totalCount} consultations au total</span>
      </div>
      <div className="relative">
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-200" />
        <div className="space-y-4">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id
            const style = styles[entry.type] || styles.GENERALE

            return (
              <div key={entry.id} className="relative pl-12">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((current) => (current === entry.id ? null : entry.id))
                  }
                  className="absolute left-0 top-1"
                >
                  <span
                    className={cx(
                      'grid h-10 w-10 place-items-center rounded-full text-[11px] font-semibold',
                      style.bubble,
                    )}
                  >
                    {entry.doctor
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)}
                  </span>
                </button>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((current) => (current === entry.id ? null : entry.id))
                    }
                    className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-slate-400">{entry.date}</span>
                        <span
                          className={cx(
                            'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
                            style.tag,
                          )}
                        >
                          {entry.type}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700">{entry.doctor}</p>
                      <p className="text-sm text-slate-900">{entry.motif}</p>
                      <p className="text-sm text-slate-600">{entry.summary}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {entry.flags.map((flag) => (
                          <span
                            key={flag}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500"
                          >
                            {/ordonnance/i.test(flag) ? (
                              <Pill className="h-3 w-3" />
                            ) : (
                              <FlaskConical className="h-3 w-3" />
                            )}
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  {isExpanded ? (
                    <div className="border-t border-slate-100 px-4 py-4">
                      <p className="text-sm leading-6 text-slate-600">{entry.details}</p>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {entry.constantes.map((item) => (
                          <div
                            key={item.label}
                            className="rounded-md border border-slate-100 bg-slate-50 p-2"
                          >
                            <p className={LABEL_CLASS}>
                              {item.label}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ConstantesJourCard({
  fields,
  values,
  pending,
  onChange,
  onAccept,
  onReject,
  onReuseLatest,
  imc,
}) {
  const taPending = pending.tas !== undefined || pending.tad !== undefined
  const compactFields = fields.filter((field) => !['tas', 'tad'].includes(field.key))

  return (
    <div className={cx(CARD_CLASS, 'p-4')}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Constantes du Jour</h3>
        </div>
        <button
          type="button"
          onClick={onReuseLatest}
          className="text-[11px] font-medium text-blue-600 transition hover:text-blue-700"
        >
          Reprendre dernieres valeurs
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <div
          className={cx(
            'min-w-[176px] rounded-lg border px-3 py-3',
            taPending ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 bg-slate-50/60',
          )}
        >
          <div className="flex items-center justify-between">
            <p className={LABEL_CLASS}>TA</p>
            {taPending ? (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-semibold text-white">
                IA
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={values.tas || ''}
              onChange={(event) => onChange('tas', event.target.value)}
              className={cx(
                INPUT_CLASS,
                'w-[62px] px-2 py-1.5 text-sm font-semibold shadow-sm',
                pending.tas !== undefined && 'border-blue-400 bg-blue-50/30',
              )}
            />
            <span className="text-sm text-slate-300">/</span>
            <input
              value={values.tad || ''}
              onChange={(event) => onChange('tad', event.target.value)}
              className={cx(
                INPUT_CLASS,
                'w-[62px] px-2 py-1.5 text-sm font-semibold shadow-sm',
                pending.tad !== undefined && 'border-blue-400 bg-blue-50/30',
              )}
            />
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-400">mmHg</p>
          {taPending ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              {pending.tas !== undefined ? (
                <button type="button" onClick={() => onAccept('tas')} className="font-semibold text-blue-700">
                  TAS {pending.tas} accepter
                </button>
              ) : null}
              {pending.tad !== undefined ? (
                <button type="button" onClick={() => onAccept('tad')} className="font-semibold text-blue-700">
                  TAD {pending.tad} accepter
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  onReject('tas')
                  onReject('tad')
                }}
                className="font-medium text-slate-500"
              >
                Rejeter
              </button>
            </div>
          ) : null}
        </div>

        {compactFields.map((field) => {
          const hasPending = pending[field.key] !== undefined && pending[field.key] !== null
          return (
            <div
              key={field.key}
              className={cx(
                'min-w-[112px] rounded-lg border px-3 py-3 transition',
                hasPending
                  ? 'border-blue-400 bg-blue-50/30'
                  : 'border-slate-200 bg-slate-50/60',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={LABEL_CLASS}>{field.label}</p>
                {hasPending ? (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-semibold text-white">
                    IA
                  </span>
                ) : null}
              </div>
              <div className="mt-2">
                <input
                  value={values[field.key] || ''}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  className={cx(
                    INPUT_CLASS,
                    'w-full px-2 py-1.5 text-sm font-semibold shadow-sm',
                    hasPending && 'border-blue-400 bg-blue-50/30',
                  )}
                />
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-400">{field.unit}</p>
              {field.key === 'poids' && imc ? (
                <p className="mt-2 text-[11px] font-medium text-slate-500">IMC auto : {imc}</p>
              ) : null}
              {hasPending ? (
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className="text-blue-700">Proposition : {pending[field.key]}</span>
                  <button
                    type="button"
                    onClick={() => onAccept(field.key)}
                    className="font-semibold text-blue-700"
                  >
                    Accepter
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(field.key)}
                    className="font-medium text-slate-500"
                  >
                    Rejeter
                  </button>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RichTextArea({
  title,
  placeholder,
  value,
  pendingSuggestion,
  minHeight,
  isRecording,
  onChange,
  onMicClick,
  onAcceptSuggestion,
  onRejectSuggestion,
}) {
  const [selectionStart, setSelectionStart] = useState(0)
  const [selectionEnd, setSelectionEnd] = useState(0)

  function injectWrapper(prefix, suffix = prefix) {
    const before = value.slice(0, selectionStart)
    const selected = value.slice(selectionStart, selectionEnd)
    const after = value.slice(selectionEnd)
    onChange(`${before}${prefix}${selected}${suffix}${after}`)
  }

  return (
    <div className={cx(CARD_CLASS, 'overflow-hidden')}>
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <div className="flex items-center gap-2 text-slate-400">
          <button
            type="button"
            onClick={() => injectWrapper('**')}
            className="rounded-md p-1.5 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => injectWrapper('_')}
            className="rounded-md p-1.5 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => injectWrapper('- ', '')}
            className="rounded-md p-1.5 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <span className="h-4 w-px bg-slate-200" />
          <button
            type="button"
            onClick={onMicClick}
            className={cx(
              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition',
              isRecording
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
            )}
          >
            {isRecording ? <AudioLines className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            {isRecording ? 'Stop' : 'Mic'}
          </button>
        </div>
      </div>

      {pendingSuggestion ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 text-amber-500" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-800">Suggestion IA a valider</p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-amber-700">
                {pendingSuggestion}
              </p>
              <div className="mt-2 flex items-center gap-3 text-[11px]">
                <button
                  type="button"
                  onClick={onAcceptSuggestion}
                  className="font-semibold text-amber-800"
                >
                  Accepter
                </button>
                <button
                  type="button"
                  onClick={onRejectSuggestion}
                  className="font-medium text-amber-700/80"
                >
                  Rejeter
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onSelect={(event) => {
          setSelectionStart(event.currentTarget.selectionStart)
          setSelectionEnd(event.currentTarget.selectionEnd)
        }}
        placeholder={placeholder}
        className={cx(
          'w-full resize-none border-0 px-4 py-3 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-300',
          minHeight,
        )}
      />
    </div>
  )
}

function DiagnosticCard({
  mode,
  setMode,
  search,
  setSearch,
  principal,
  onClearPrincipal,
  associes,
  loading,
  aiSuggestions,
  searchResults,
  showAssocieInput,
  pendingAssocie,
  setPendingAssocie,
  onFocus,
  onBlur,
  onSelectPrincipal,
  onAddAssocie,
  onRemoveAssocie,
  onShowAssocieInput,
  isDropdownOpen,
}) {
  return (
    <div className={CARD_CLASS}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Diagnostic</h3>
          <span className="text-[11px] font-semibold text-rose-500">* Requis</span>
        </div>
        <div className="flex items-center gap-2">
          {['retenu', 'hypothese'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={cx(
                'rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition',
                mode === item
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-500',
              )}
            >
              {item === 'retenu' ? 'Retenu' : 'Hypothese'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div>
          <p className="mb-2 text-[11px] font-medium text-slate-500">
            Diagnostic principal (CIM-10)
          </p>
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
              <Search className="h-4 w-4 text-slate-300" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="Rechercher par code ou description..."
                className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-300"
              />
            </div>

            {isDropdownOpen ? (
              <div className="absolute inset-x-0 top-[calc(100%+8px)] z-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {loading ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Suggestions IA...
                  </div>
                ) : aiSuggestions.principal || aiSuggestions.associes.length ? (
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                      <Sparkles className="h-3.5 w-3.5" />
                      Suggestions IA
                    </p>
                    {aiSuggestions.principal ? (
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onSelectPrincipal(aiSuggestions.principal)}
                        className="flex w-full items-start justify-between rounded-lg px-3 py-2 text-left transition hover:bg-blue-50"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {aiSuggestions.principal.code}
                          </p>
                          <p className="text-xs text-slate-500">
                            {aiSuggestions.principal.label}
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          {Math.round((aiSuggestions.principal.confidence || 0.75) * 100)}%
                        </span>
                      </button>
                    ) : null}
                    {aiSuggestions.associes.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onAddAssocie(item)}
                        className="mt-1 flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50"
                      >
                        <span className="text-sm font-semibold text-slate-900">{item.code}</span>
                        <span className="text-xs text-slate-500">{item.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="max-h-56 overflow-y-auto py-2">
                  {searchResults.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => (principal ? onAddAssocie(item) : onSelectPrincipal(item))}
                      className="flex w-full items-start gap-3 px-4 py-2 text-left transition hover:bg-slate-50"
                    >
                      <span className="text-sm font-semibold text-slate-900">{item.code}</span>
                      <span className="text-xs leading-5 text-slate-500">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {principal ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <span>{principal.code} - {principal.label}</span>
              <button type="button" onClick={onClearPrincipal}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-medium text-slate-500">Diagnostics associes</p>
          <div className="flex flex-wrap items-center gap-2">
            {associes.map((item) => (
              <span
                key={item.code}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {item.code} - {item.label}
                <button type="button" onClick={() => onRemoveAssocie(item.code)}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}

            {showAssocieInput ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1">
                <input
                  value={pendingAssocie}
                  onChange={(event) => setPendingAssocie(event.target.value)}
                  placeholder="Code..."
                  className="w-20 border-0 bg-transparent text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    onAddAssocie({
                      code: pendingAssocie,
                      label: 'Diagnostic ajoute manuellement',
                    })
                  }
                  className="text-xs font-semibold text-blue-700"
                >
                  Ajouter
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onShowAssocieInput}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-blue-200 hover:text-blue-700"
              >
                + Ajouter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ConduiteCard({
  bioOptions,
  imagerieOptions,
  referencementOptions,
  value,
  pending,
  onToggleChoice,
  onFieldChange,
  onAcceptPending,
  onRejectPending,
}) {
  return (
    <div className={CARD_CLASS}>
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-bold text-slate-900">Conduite a Tenir</h3>
      </div>
      {pending ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold text-amber-800">Suggestion IA a valider</p>
          <p className="mt-1 text-xs text-amber-700">
            Biologie : {(pending.biologie || []).join(', ') || 'Aucune'} | Imagerie :{' '}
            {(pending.imagerie || []).join(', ') || 'Aucune'}
          </p>
          <div className="mt-2 flex items-center gap-3 text-[11px]">
            <button type="button" onClick={onAcceptPending} className="font-semibold text-amber-800">
              Accepter
            </button>
            <button type="button" onClick={onRejectPending} className="font-medium text-amber-700/80">
              Rejeter
            </button>
          </div>
        </div>
      ) : null}
      <div className="space-y-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-6">
          <ChecklistGroup
            title="Biologie"
            icon={FlaskConical}
            options={bioOptions}
            selected={value.biologie}
            onToggle={(item) => onToggleChoice('biologie', item)}
          />
          <ChecklistGroup
            title="Imagerie / Examens"
            icon={TestTube2}
            options={imagerieOptions}
            selected={value.imagerie}
            onToggle={(item) => onToggleChoice('imagerie', item)}
          />
        </div>

        <input
          value={value.autreBio}
          onChange={(event) => onFieldChange('autreBio', event.target.value)}
          placeholder="Autre..."
          className={INPUT_CLASS}
        />

        <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
          <div className="space-y-2">
            <p className={LABEL_CLASS}>Referencement</p>
            <select
              value={value.referencement}
              onChange={(event) => onFieldChange('referencement', event.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Selectionner...</option>
              {referencementOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input
              value={value.motifReferencement}
              onChange={(event) => onFieldChange('motifReferencement', event.target.value)}
              placeholder="Motif"
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-2">
            <p className={LABEL_CLASS}>Arret de travail</p>
            <input
              value={value.arretTravailJours}
              onChange={(event) => onFieldChange('arretTravailJours', event.target.value)}
              placeholder="Jours"
              className={INPUT_CLASS}
            />
            <input
              type="date"
              value={value.arretTravailDate}
              onChange={(event) => onFieldChange('arretTravailDate', event.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-2">
            <p className={LABEL_CLASS}>RDV controle</p>
            <input
              type="date"
              value={value.rdvDate}
              onChange={(event) => onFieldChange('rdvDate', event.target.value)}
              className={INPUT_CLASS}
            />
            <input
              value={value.rdvMotif}
              onChange={(event) => onFieldChange('rdvMotif', event.target.value)}
              placeholder="Motif"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ChecklistGroup({ title, icon: Icon, options, selected, onToggle }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-blue-500" />
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {title}
        </h4>
      </div>
      <div className="space-y-2">
        {options.map((item) => (
          <label key={item} className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={(selected || []).includes(item)}
              onChange={() => onToggle(item)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            {item}
          </label>
        ))}
      </div>
    </div>
  )
}

function SuggestionBanner({ title, body, onAccept, onReject }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 text-amber-500" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-amber-800">{title}</p>
          <p className="mt-1 text-xs text-amber-700">{body}</p>
          <div className="mt-2 flex items-center gap-3 text-[11px]">
            <button type="button" onClick={onAccept} className="font-semibold text-amber-800">
              Accepter
            </button>
            <button type="button" onClick={onReject} className="font-medium text-amber-700/80">
              Rejeter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SafetyBanner({
  banner,
  blockedDrug,
  forceReason,
  setForceReason,
  onForce,
  onCancel,
}) {
  const colorClasses =
    banner.tone === 'purple'
      ? 'border-purple-200 bg-purple-50 text-purple-800'
      : banner.tone === 'rose'
        ? 'border-rose-300 bg-rose-100 text-rose-800'
        : 'border-rose-200 bg-rose-50 text-rose-700'

  return (
    <div className={cx('rounded-xl border p-4 shadow-sm', colorClasses)}>
      <div className="flex items-start gap-2">
        {banner.tone === 'purple' ? (
          <Ban className="mt-0.5 h-4 w-4" />
        ) : (
          <ShieldAlert className="mt-0.5 h-4 w-4" />
        )}
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">{banner.title}</p>
          <p className="mt-1 text-xs leading-5">{banner.body}</p>

          {blockedDrug ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-current/15 bg-white/60 px-3 py-2 text-xs">
                Tentative d'ajout : <span className="font-semibold">{blockedDrug.drug.name}</span>
              </div>
              <textarea
                value={forceReason}
                onChange={(event) => setForceReason(event.target.value)}
                placeholder="Motif obligatoire pour forcer la prescription..."
                className="min-h-[80px] w-full rounded-lg border border-current/15 bg-white px-3 py-2 text-xs outline-none"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-lg border border-current/15 px-3 py-2 text-xs font-medium"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!forceReason.trim()}
                  onClick={onForce}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Forcer
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function InfoPanel({ icon: Icon, title, body }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{body}</p>
        </div>
      </div>
    </div>
  )
}

export default function MacroMedicaGP() {
  return <MacroMedicaClinicalWorkspace config={GP_CONFIG} />
}
