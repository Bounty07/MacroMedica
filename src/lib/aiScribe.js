export const MULTILINGUAL_SCRIBE_INSTRUCTION = 'The following transcription is a mix of Moroccan Arabic (Darija) and French. Understand the context, translate the Darija accurately, and generate a perfectly structured professional medical note entirely in formal French.'

export const DEFAULT_SCRIBE_LANGUAGE_MODE = 'mixed'

export const SCRIBE_LANGUAGE_OPTIONS = [
  {
    value: 'mixed',
    label: 'Darija + Francais',
    helper: 'Mode recommande pour une consultation melangeant Darija et francais.',
    promptHint: 'Priorisez une comprehension naturelle du melange Darija + francais.',
  },
  {
    value: 'french',
    label: 'Francais',
    helper: 'Priorise une transcription clinique en francais.',
    promptHint: 'La voix est principalement en francais.',
  },
  {
    value: 'arabic',
    label: 'Arabe',
    helper: 'Favorise la reconnaissance arabe pour les passages tres majoritairement arabophones.',
    promptHint: 'La voix contient surtout des passages arabophones marocains.',
  },
]

function calcAge(dateStr) {
  if (!dateStr) return null

  const birth = new Date(dateStr)
  if (Number.isNaN(birth.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }

  return age
}

export function getScribeLanguageOption(mode = DEFAULT_SCRIBE_LANGUAGE_MODE) {
  return SCRIBE_LANGUAGE_OPTIONS.find((item) => item.value === mode) || SCRIBE_LANGUAGE_OPTIONS[0]
}

export function buildAiScribePatientContext(patient) {
  const patientLabel = [patient?.prenom, patient?.nom].filter(Boolean).join(' ').trim() || 'Patient non selectionne'

  return [
    `Patient: ${patientLabel}`,
    `Age: ${calcAge(patient?.date_naissance) || 'non renseigne'}`,
    `Antecedents: ${patient?.antecedents || 'aucun antecedent renseigne'}`,
    `Allergies: ${patient?.allergies || 'aucune allergie renseignee'}`,
  ].join('\n')
}

export function buildAiScribePrompt({ patient, notes }) {
  const normalizedNotes = (notes || '').replace(/\r\n/g, '\n').trim()
  const patientContext = buildAiScribePatientContext(patient)

  return [
    MULTILINGUAL_SCRIBE_INSTRUCTION,
    '',
    patientContext,
    '',
    `Transcription clinique brute:\n${normalizedNotes}`,
  ].join('\n')
}

export function buildAiScribeRequest({
  patient,
  notes,
  audioBase64,
  audioMimeType,
  languageMode = DEFAULT_SCRIBE_LANGUAGE_MODE,
}) {
  const normalizedNotes = (notes || '').replace(/\r\n/g, '\n').trim()
  const selectedLanguage = getScribeLanguageOption(languageMode)

  return {
    patientContext: buildAiScribePatientContext(patient),
    notes: normalizedNotes,
    languageMode: selectedLanguage.value,
    languageHint: selectedLanguage.promptHint,
    audioBase64: audioBase64 || '',
    audioMimeType: audioMimeType || 'audio/webm',
  }
}

export async function requestAiScribeLetter({
  supabaseClient,
  patient,
  notes,
  audioBase64,
  audioMimeType,
  languageMode = DEFAULT_SCRIBE_LANGUAGE_MODE,
}) {
  const payload = buildAiScribeRequest({
    patient,
    notes,
    audioBase64,
    audioMimeType,
    languageMode,
  })

  if (!payload.notes && !payload.audioBase64) {
    throw new Error("Ajoutez des notes ou enregistrez de l'audio avant de lancer l'IA.")
  }

  if (!supabaseClient) {
    throw new Error('Supabase n est pas configure.')
  }

  const { data, error } = await supabaseClient.functions.invoke('ai-scribe', {
    body: payload,
  })

  if (error || data?.error) {
    throw new Error(data?.error || error?.message || 'Erreur IA.')
  }

  return data?.letter || ''
}
