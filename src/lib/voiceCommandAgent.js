import {
  clearEdgeFunctionUnavailable,
  describeEdgeFunctionError,
  isEdgeFunctionTemporarilyUnavailable,
  markEdgeFunctionUnavailable,
} from './edgeFunctionErrors'

const ACTION_ALIASES = {
  'add-note': 'add_note',
  'add note': 'add_note',
  'save-record': 'save_record',
  'save record': 'save_record',
  'save dossier': 'save_record',
  'search-patient': 'search_patient',
  'search patient': 'search_patient',
  'delete-appointment': 'delete_appointment',
  'delete appointment': 'delete_appointment',
}

const ALLOWED_NAVIGATION_ROUTES = new Set(['/dashboard', '/patients', '/agenda', '/parametres'])

function stripCodeFence(rawText) {
  const trimmed = (rawText || '').trim()
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  return trimmed
}

export function normalizeVoiceAgentAction(action) {
  const normalized = String(action || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

  if (!normalized) return ''

  return ACTION_ALIASES[normalized]
    || normalized.replace(/[-\s]+/g, '_')
}

export function normalizeVoiceAgentRoute(payload) {
  const value = String(payload || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return ''
  const route = value.startsWith('/') ? value : `/${value.replace(/^\/+/, '')}`
  return ALLOWED_NAVIGATION_ROUTES.has(route) ? route : ''
}

export function normalizeVoiceSearchText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function findVoicePatientMatch(patients, query) {
  const normalizedQuery = normalizeVoiceSearchText(query)
  if (!normalizedQuery) return null

  const compactQuery = normalizedQuery.replace(/\s+/g, '')
  const tokens = normalizedQuery.split(' ').filter(Boolean)
  let bestMatch = null
  let bestScore = 0

  for (const patient of patients || []) {
    const prenom = normalizeVoiceSearchText(patient?.prenom)
    const nom = normalizeVoiceSearchText(patient?.nom)
    const fullName = `${prenom} ${nom}`.trim()
    const reverseName = `${nom} ${prenom}`.trim()
    const compactFullName = fullName.replace(/\s+/g, '')
    const compactReverseName = reverseName.replace(/\s+/g, '')

    let score = 0

    if (fullName === normalizedQuery || reverseName === normalizedQuery) {
      score = 100
    } else if (compactFullName === compactQuery || compactReverseName === compactQuery) {
      score = 95
    } else {
      const everyTokenMatches = tokens.length > 0 && tokens.every((token) => (
        fullName.includes(token) || reverseName.includes(token)
      ))

      if (everyTokenMatches) score = 80
      if (fullName.includes(normalizedQuery) || reverseName.includes(normalizedQuery)) score = Math.max(score, 70)
      if (prenom.startsWith(normalizedQuery) || nom.startsWith(normalizedQuery)) score = Math.max(score, 60)
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = patient
    }
  }

  return bestMatch
}

export function parseVoiceAgentResponse(rawText) {
  const candidate = stripCodeFence(rawText)
  let parsed

  try {
    parsed = JSON.parse(candidate)
  } catch {
    throw new Error("La reponse de l'agent vocal n'est pas un JSON valide.")
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error("La reponse de l'agent vocal est invalide.")
  }

  const action = normalizeVoiceAgentAction(parsed.action)

  if (!action) {
    throw new Error("L'action retournee par l'agent vocal est vide.")
  }

  return {
    action,
    payload: parsed.payload ?? '',
    rawText: candidate,
  }
}

export async function requestVoiceAgentIntent({
  supabaseClient,
  audioBase64,
  audioMimeType,
}) {
  if (!supabaseClient) {
    throw new Error('Supabase n est pas configure.')
  }

  if (!audioBase64) {
    throw new Error("Aucun audio n'a ete enregistre.")
  }

  if (isEdgeFunctionTemporarilyUnavailable('ai-voice-command')) {
    throw new Error(describeEdgeFunctionError(
      new Error('Failed to send a request to the Edge Function'),
      'ai-voice-command',
    ))
  }

  const { data, error } = await supabaseClient.functions.invoke('ai-voice-command', {
    body: {
      audioBase64,
      audioMimeType: audioMimeType || 'audio/webm',
    },
  })

  if (error || data?.error) {
    markEdgeFunctionUnavailable('ai-voice-command')
    throw new Error(describeEdgeFunctionError(error || data?.error, 'ai-voice-command'))
  }

  const rawResponseText = data?.responseText || ''
  clearEdgeFunctionUnavailable('ai-voice-command')
  console.log('AI Command Raw Response:', rawResponseText)
  const aiResponse = parseVoiceAgentResponse(rawResponseText)
  console.log('AI Command Received:', aiResponse)
  return aiResponse
}
