export type SpecialiteFeatureFlags = {
  analyseClinique: boolean
  doctorNotes: boolean
  aiScribe: boolean
  aiLabAnalysis: boolean
}

export type SpecialiteConfig = {
  key: string
  label: string
  family: 'generaliste' | 'medicale' | 'chirurgicale'
  features: SpecialiteFeatureFlags
}

const defaultFeatures: SpecialiteFeatureFlags = {
  analyseClinique: true,
  doctorNotes: true,
  aiScribe: true,
  aiLabAnalysis: true,
}

export const DEFAULT_SPECIALITE_KEY = 'medecine-generale'

export const SPECIALITES_CONFIG: Record<string, SpecialiteConfig> = {
  'medecine-generale': {
    key: 'medecine-generale',
    label: 'Médecine Générale',
    family: 'generaliste',
    features: defaultFeatures,
  },
  cardiologie: {
    key: 'cardiologie',
    label: 'Cardiologie',
    family: 'medicale',
    features: defaultFeatures,
  },
  'chirurgie-dentaire': {
    key: 'chirurgie-dentaire',
    label: 'Chirurgie Dentaire',
    family: 'chirurgicale',
    features: defaultFeatures,
  },
  'chirurgie-generale': {
    key: 'chirurgie-generale',
    label: 'Chirurgie Générale',
    family: 'chirurgicale',
    features: defaultFeatures,
  },
  dermatologie: {
    key: 'dermatologie',
    label: 'Dermatologie',
    family: 'medicale',
    features: defaultFeatures,
  },
  endocrinologie: {
    key: 'endocrinologie',
    label: 'Endocrinologie',
    family: 'medicale',
    features: defaultFeatures,
  },
  'gastro-enterologie': {
    key: 'gastro-enterologie',
    label: 'Gastro-entérologie',
    family: 'medicale',
    features: defaultFeatures,
  },
  gynecologie: {
    key: 'gynecologie',
    label: 'Gyn\u00e9cologie',
    family: 'medicale',
    features: defaultFeatures,
  },
  'gynecologie-obstetrique': {
    key: 'gynecologie-obstetrique',
    label: 'Gynécologie Obstétrique',
    family: 'medicale',
    features: defaultFeatures,
  },
  neurologie: {
    key: 'neurologie',
    label: 'Neurologie',
    family: 'medicale',
    features: defaultFeatures,
  },
  ophtalmologie: {
    key: 'ophtalmologie',
    label: 'Ophtalmologie',
    family: 'medicale',
    features: defaultFeatures,
  },
  orl: {
    key: 'orl',
    label: 'ORL',
    family: 'medicale',
    features: defaultFeatures,
  },
  orthopedie: {
    key: 'orthopedie',
    label: 'Orthopédie',
    family: 'chirurgicale',
    features: defaultFeatures,
  },
  pediatrie: {
    key: 'pediatrie',
    label: 'Pédiatrie',
    family: 'medicale',
    features: defaultFeatures,
  },
  pneumologie: {
    key: 'pneumologie',
    label: 'Pneumologie',
    family: 'medicale',
    features: defaultFeatures,
  },
  psychiatrie: {
    key: 'psychiatrie',
    label: 'Psychiatrie',
    family: 'medicale',
    features: defaultFeatures,
  },
  rhumatologie: {
    key: 'rhumatologie',
    label: 'Rhumatologie',
    family: 'medicale',
    features: defaultFeatures,
  },
  urologie: {
    key: 'urologie',
    label: 'Urologie',
    family: 'chirurgicale',
    features: defaultFeatures,
  },
  autre: {
    key: 'autre',
    label: 'Autre',
    family: 'generaliste',
    features: defaultFeatures,
  },
}

export const SPECIALITE_OPTIONS = Object.values(SPECIALITES_CONFIG)

export const SPECIALITES = SPECIALITE_OPTIONS.map((item) => item.label)

const SPECIALITE_ALIASES: Record<string, string> = {
  'médecine générale': 'medecine-generale',
  'medecine generale': 'medecine-generale',
  'médecin généraliste': 'medecine-generale',
  'medecin generaliste': 'medecine-generale',
  cardiologie: 'cardiologie',
  'chirurgie dentaire': 'chirurgie-dentaire',
  'chirurgie générale': 'chirurgie-generale',
  'chirurgie generale': 'chirurgie-generale',
  dermatologie: 'dermatologie',
  endocrinologie: 'endocrinologie',
  'gastro-entérologie': 'gastro-enterologie',
  'gastro-enterologie': 'gastro-enterologie',
  'gastro enterologie': 'gastro-enterologie',
  'gyn\u00e9cologie': 'gynecologie',
  gynecologie: 'gynecologie',
  gyneco: 'gynecologie',
  'gynécologie obstétrique': 'gynecologie-obstetrique',
  'gynecologie obstetrique': 'gynecologie-obstetrique',
  neurologie: 'neurologie',
  ophtalmologie: 'ophtalmologie',
  orl: 'orl',
  orthopédie: 'orthopedie',
  orthopedie: 'orthopedie',
  pédiatrie: 'pediatrie',
  pediatrie: 'pediatrie',
  pneumologie: 'pneumologie',
  psychiatrie: 'psychiatrie',
  rhumatologie: 'rhumatologie',
  urologie: 'urologie',
  autre: 'autre',
}

function normalizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function normalizeSpecialiteKey(value?: string | null) {
  if (!value) return DEFAULT_SPECIALITE_KEY
  const normalized = normalizeToken(value)

  if (SPECIALITES_CONFIG[normalized]) {
    return normalized
  }

  return SPECIALITE_ALIASES[normalized] || DEFAULT_SPECIALITE_KEY
}

export function getSpecialiteConfig(value?: string | null) {
  return SPECIALITES_CONFIG[normalizeSpecialiteKey(value)] || SPECIALITES_CONFIG[DEFAULT_SPECIALITE_KEY]
}
