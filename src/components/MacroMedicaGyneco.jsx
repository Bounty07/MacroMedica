import {
  Baby,
  ClipboardCheck,
  FolderOpen,
  LayoutGrid,
  Stethoscope,
} from 'lucide-react'
import { MacroMedicaClinicalWorkspace } from './MacroMedicaGP'

const GYNECO_CARD_CLASS = 'rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm'
const GYNECO_INPUT_CLASS =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
const GYNECO_LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-wider text-slate-500'

const TABS = [
  { id: 'overview', label: "Vue d'ensemble", icon: LayoutGrid },
  { id: 'consultation', label: 'Consultation en cours', icon: Stethoscope },
  { id: 'ordonnances', label: 'Ordonnances', icon: ClipboardCheck },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
]

const GYNECO_PATIENT = {
  id: 'GYN-204',
  name: 'Fatima Benali',
  initials: 'FB',
  sex: 'Femme',
  age: 34,
  dossier: 'gyn-204',
  pathologies: ['Suivi grossesse'],
  allergies: [],
  heightCm: 165,
  weightKg: 63,
  baselineBiometry: [
    { label: 'Taille', value: '165 cm' },
    { label: 'Poids', value: '63 kg' },
    { label: 'IMC', value: '23.1' },
    { label: 'Groupe', value: 'A+' },
  ],
  contacts: {
    phone: '0662334455',
    address: 'Casablanca, Maroc',
    whatsapp: 'Lien WhatsApp',
  },
  treatment: [{ name: 'Acide folique 5mg', posology: '1 comprime par jour' }],
  upcoming: [
    { label: 'Echo T1', meta: '03 mai', tone: 'amber' },
    { label: 'Frottis de controle', meta: 'A planifier', tone: 'blue' },
  ],
  safetyAlerts: ['Grossesse en cours - verifier toute prescription.'],
  documents: [
    { name: 'Echo_T1.pdf', meta: 'Imagerie - 01/04/2026' },
    { name: 'Frottis_2025.pdf', meta: 'Depistage - 14/11/2025' },
    { name: 'Biologie_1er_trimestre.pdf', meta: 'Bilan - 08/04/2026' },
  ],
  planItems: [
    { id: 'g-plan-1', label: 'Biologie du 1er trimestre', done: true },
    { id: 'g-plan-2', label: 'Echo de datation', done: true },
    { id: 'g-plan-3', label: 'Planifier frottis apres grossesse', done: false },
  ],
  initialConstantes: {
    tas: '110',
    tad: '70',
    fc: '78',
    temp: '36.7',
    poids: '63',
    spo2: '',
    glycemie: '',
  },
  gyneco: {
    ddr: '2026-03-10',
    g: '2',
    p: '1',
    a: '0',
    contraception: 'Pilule',
    cycle: 'Regulier',
    dernierFrottis: '14/11/2025',
  },
  timeline: [
    {
      id: 'g-tl-1',
      type: 'GROSSESSE',
      date: '18 avril 2026',
      doctor: 'Dr. Salma Idrissi',
      motif: 'Suivi grossesse',
      summary: 'Nausees moderees. Evolution rassurante a 6 SA.',
      details:
        "Pas de metrorragie. Conseils d'hygiene de vie et adaptation du traitement symptomatique.",
      flags: ['Biologie', 'Echo'],
      constantes: [
        { label: 'TA', value: '110/70' },
        { label: 'Poids', value: '63 kg' },
        { label: 'SA', value: '6 SA' },
      ],
    },
    {
      id: 'g-tl-2',
      type: 'DEPISTAGE',
      date: '14 nov 2025',
      doctor: 'Dr. Salma Idrissi',
      motif: 'Frottis / depistage',
      summary: 'Frottis satisfaisant, HPV negatif.',
      details:
        'Controle recommande selon calendrier standard. Absence de lesion suspecte a la colposcopie.',
      flags: ['HPV', 'Frottis'],
      constantes: [
        { label: 'HPV', value: 'Negatif' },
        { label: 'Col', value: 'Normal' },
        { label: 'Poids', value: '61 kg' },
      ],
    },
    {
      id: 'g-tl-3',
      type: 'CONTRACEPTION',
      date: '02 aout 2025',
      doctor: 'Dr. Salma Idrissi',
      motif: 'Contraception',
      summary: 'Bonne tolerance de la pilule, renouvellement 6 mois.',
      details:
        "Pas d'effet indesirable majeur. Information renforcee sur l'observance et les signes d'alerte.",
      flags: ['Ordonnance'],
      constantes: [
        { label: 'TA', value: '112/72' },
        { label: 'Poids', value: '60 kg' },
        { label: 'Cycle', value: 'Regulier' },
      ],
    },
  ],
  timelineCount: 12,
}

const GYNECO_CIM_CODES = [
  { code: 'N80.9', label: 'Endometriose, sans precision' },
  { code: 'N92.0', label: 'Menstruations excessives et frequentes' },
  { code: 'N94.6', label: 'Dysmenorrhee, sans precision' },
  { code: 'N76.0', label: 'Vaginite aigue' },
  { code: 'O21.9', label: 'Vomissements de la grossesse' },
  { code: 'O26.9', label: 'Suivi de grossesse, sans complication' },
  { code: 'Z30.4', label: 'Surveillance de contraception' },
  { code: 'Z12.4', label: 'Depistage du col uterin' },
]

const GYNECO_DRUGS = [
  {
    name: 'Acide folique 5 mg',
    molecule: 'Acide folique',
    posology: '1 comprime par jour',
    category: 'Grossesse',
    keywords: ['grossesse', 'folique', 'vitamine'],
  },
  {
    name: 'Cerazette 75 ug',
    molecule: 'Desogestrel',
    posology: '1 comprime par jour',
    category: 'Contraception',
    keywords: ['contraception', 'pilule', 'desogestrel'],
  },
  {
    name: 'Monazol ovule',
    molecule: 'Miconazole',
    posology: '1 ovule le soir pendant 3 jours',
    category: 'Infection',
    keywords: ['infection', 'leucorrhees', 'mycose'],
  },
  {
    name: 'Paracetamol 1 g',
    molecule: 'Paracetamol',
    posology: '1 comprime si douleur, max 3/j',
    category: 'Douleur pelvienne',
    keywords: ['douleur', 'pelvienne'],
  },
  {
    name: 'Patch Estradiol',
    molecule: 'Estradiol',
    posology: '1 patch deux fois par semaine',
    category: 'Menopause',
    keywords: ['menopause', 'ths'],
  },
  {
    name: 'Isotretinoine 20 mg',
    molecule: 'Isotretinoine',
    posology: '1 gelule par jour',
    category: 'Infection',
    keywords: ['isotretinoine', 'acne'],
  },
]

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

function renderGynecoAddon({ patient, setPatient }) {
  const pregnancy = calculatePregnancyStats(patient.gyneco?.ddr)

  function updateGynecoField(key, value) {
    setPatient((current) => ({
      ...current,
      gyneco: {
        ...current.gyneco,
        [key]: value,
      },
    }))
  }

  return (
    <div className={GYNECO_CARD_CLASS}>
      <div className="flex items-center gap-2">
        <Baby className="h-4 w-4 text-fuchsia-600" />
        <div>
          <p className="text-xs font-bold text-slate-900">Gynecologie-Obstetrique</p>
          <p className={GYNECO_LABEL_CLASS}>
            Contexte specialise
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className={GYNECO_LABEL_CLASS + ' mb-1 block'}>DDR</label>
          <input
            type="date"
            value={patient.gyneco?.ddr || ''}
            onChange={(event) => updateGynecoField('ddr', event.target.value)}
            className={GYNECO_INPUT_CLASS}
          />
          {pregnancy.isPregnant ? (
            <p className="mt-2 text-[11px] text-fuchsia-700">
              {pregnancy.saLabel} - {pregnancy.termLabel}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            ['g', 'G'],
            ['p', 'P'],
            ['a', 'A'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className={GYNECO_LABEL_CLASS + ' mb-1 block'}>{label}</label>
              <input
                value={patient.gyneco?.[key] || ''}
                onChange={(event) => updateGynecoField(key, event.target.value)}
                className={GYNECO_INPUT_CLASS}
              />
            </div>
          ))}
        </div>

        <div>
          <label className={GYNECO_LABEL_CLASS + ' mb-1 block'}>
            Contraception
          </label>
          <select
            value={patient.gyneco?.contraception || 'Aucune'}
            onChange={(event) => updateGynecoField('contraception', event.target.value)}
            className={GYNECO_INPUT_CLASS}
          >
            {['Aucune', 'Pilule', 'DIU', 'Implants', 'Patch', 'Sterilet'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={GYNECO_LABEL_CLASS + ' mb-2 block'}>Cycle</label>
          <div className="grid grid-cols-3 gap-2">
            {['Regulier', 'Irregulier', 'Menopausee'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => updateGynecoField('cycle', item)}
                className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                  patient.gyneco?.cycle === item
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const GYNECO_CONFIG = {
  variantId: 'gyneco',
  label: 'gyneco',
  patient: GYNECO_PATIENT,
  tabs: TABS,
  consultationBadge: 'Mode Sprint active',
  motifOptions: [
    'Consultation Gynecologique',
    'Suivi Grossesse',
    'Contraception',
    'Frottis / Depistage',
    'Menopause',
    'Infertilite',
    'Douleurs pelviennes',
    'Leucorrhees',
  ],
  constantFields: [
    { key: 'tas', label: 'TAS', unit: 'mmHg' },
    { key: 'tad', label: 'TAD', unit: 'mmHg' },
    { key: 'fc', label: 'FC', unit: 'bpm' },
    { key: 'temp', label: 'Temp', unit: '°C' },
    { key: 'poids', label: 'Poids', unit: 'kg' },
    {
      key: 'spo2',
      label: 'SpO2',
      unit: '%',
      showIf: (patient) =>
        patient.pathologies.some((item) => /asthme|resp|bpco/i.test(item)),
    },
    {
      key: 'glycemie',
      label: 'Glycemie',
      unit: 'g/L',
      showIf: (patient) => patient.pathologies.some((item) => /diabet/i.test(item)),
    },
  ],
  textAreas: [
    {
      key: 'interrogatoire',
      title: 'Interrogatoire',
      placeholder: "Symptomes, contexte hormonal, antecedents et attentes de la patiente...",
      minHeight: 'min-h-[128px]',
    },
    {
      key: 'examenClinique',
      title: 'Examen Clinique',
      placeholder: 'Etat general, douleur, abdomen, seins, constantes de consultation...',
      minHeight: 'min-h-[110px]',
    },
    {
      key: 'examenGynecologique',
      title: 'Examen Gynecologique',
      placeholder: 'Speculum, toucher vaginal, echographie endovaginale...',
      minHeight: 'min-h-[110px]',
    },
    {
      key: 'synthese',
      title: 'Synthese & Conclusion',
      placeholder: 'Conclusion gynecologique et plan de suivi...',
      minHeight: 'min-h-[96px]',
    },
  ],
  bioOptions: [
    'NFS',
    'B-HCG',
    'Frottis cervico-uterin',
    'HPV',
    'Chlamydia',
    'Gonocoque',
    'Syphilis',
    'HIV',
    'TSH',
    'FSH / LH / Oestradiol',
  ],
  imagerieOptions: [
    'Echographie pelvienne',
    'Echographie endovaginale',
    'Echographie mammaire',
    'Mammographie',
    'Colposcopie',
    'Hysterographie',
  ],
  referencementOptions: ['Chirurgien gynecologue', 'Oncologue', 'Endocrinologue'],
  ordonnanceTypes: [
    'Contraception',
    'Grossesse',
    'Infection',
    'Menopause',
    'Douleur pelvienne',
  ],
  prescriptionCatalog: GYNECO_DRUGS,
  cimDatabase: GYNECO_CIM_CODES,
  currentPrescriptions: [{ name: 'Acide folique 5mg', posology: '1 comprime / jour' }],
  quickActions: [
    { label: 'Nouvelle Consultation' },
    { label: 'Nouvelle Ordonnance' },
    { label: 'Demander un bilan' },
    { label: 'Programmer Echo' },
  ],
  renderLeftAddon: renderGynecoAddon,
  timelineStyles: {
    GROSSESSE: {
      bubble: 'bg-pink-500 text-white',
      tag: 'bg-pink-50 text-pink-700 border-pink-100',
    },
    DEPISTAGE: {
      bubble: 'bg-purple-500 text-white',
      tag: 'bg-purple-50 text-purple-700 border-purple-100',
    },
    CONTRACEPTION: {
      bubble: 'bg-indigo-500 text-white',
      tag: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    },
    GENERALE: {
      bubble: 'bg-slate-500 text-white',
      tag: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  },
  buildOverviewSections: ({ patient, pregnancy }) => [
    {
      title: 'Contexte clinique',
      content: {
        type: 'dual-chips',
        primary: patient.pathologies.map((item) => ({ label: item, tone: 'blue' })),
        secondaryTitle: 'Allergies',
        secondary: (patient.allergies.length ? patient.allergies : ['Aucune']).map((item) => ({
          label: item,
          tone: item === 'Aucune' ? 'green' : 'red',
        })),
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
      title: 'Contexte gyneco',
      content: {
        type: 'list',
        items: [
          {
            icon: 'pill',
            label: `DDR : ${patient.gyneco.ddr}`,
            meta: pregnancy.isPregnant ? `${pregnancy.saLabel} - ${pregnancy.termLabel}` : 'Pas de grossesse en cours',
          },
          {
            icon: 'pill',
            label: 'Dernier frottis',
            meta: patient.gyneco.dernierFrottis,
          },
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

export default function MacroMedicaGyneco() {
  return <MacroMedicaClinicalWorkspace config={GYNECO_CONFIG} />
}
