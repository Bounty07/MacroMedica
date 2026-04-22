const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const GEMINI_MODEL = 'gemini-1.5-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const LOCAL_PREGNANCY_CONFLICTS = [
  'isotretinoine',
  'methotrexate',
  'valproate',
  'acide valproique',
  'warfarine',
  'misoprostol',
  'thalidomide',
  'ramipril',
  'enalapril',
  'lisinopril',
]

function ensureApiKey() {
  if (!GEMINI_API_KEY) {
    throw new Error("La cle Gemini n'est pas configuree.")
  }
}

function stripCodeFence(raw = '') {
  return raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function extractTextPayload(payload = {}) {
  return payload?.candidates
    ?.flatMap((candidate) => candidate?.content?.parts || [])
    ?.map((part) => part?.text || '')
    ?.join('\n')
    ?.trim()
}

function parseJsonResponse(rawText) {
  const cleaned = stripCodeFence(rawText)

  if (!cleaned) {
    throw new Error("La reponse Gemini est vide.")
  }

  try {
    return JSON.parse(cleaned)
  } catch (error) {
    throw new Error("La reponse Gemini n'est pas un JSON valide.")
  }
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function normalizeArray(input) {
  if (Array.isArray(input)) return input.filter(Boolean)
  if (!input) return []
  return [input].filter(Boolean)
}

function normalizeSafety(input = {}) {
  const severity = ['none', 'warning', 'danger'].includes(input?.severity)
    ? input.severity
    : 'none'
  const conflictType = ['allergy', 'interaction', 'pregnancy', 'none'].includes(input?.conflictType)
    ? input.conflictType
    : 'none'

  return {
    safe: typeof input?.safe === 'boolean' ? input.safe : severity !== 'danger',
    severity,
    message: input?.message || '',
    conflictType,
  }
}

async function callGeminiJson({ systemPrompt, parts, signal }) {
  ensureApiKey()

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const apiMessage =
      payload?.error?.message ||
      payload?.error?.status ||
      "L'appel Gemini a echoue."
    throw new Error(apiMessage)
  }

  return parseJsonResponse(extractTextPayload(payload))
}

function buildAudioParts(audioBase64, patientContext) {
  const safeBase64 = String(audioBase64 || '').replace(/^data:.*?;base64,/, '')

  return [
    {
      text: `Contexte patient: ${JSON.stringify({
        patientAge: patientContext?.patientAge ?? null,
        patientSex: patientContext?.patientSex ?? null,
        allergies: normalizeArray(patientContext?.allergies),
      })}`,
    },
    {
      inlineData: {
        mimeType: 'audio/webm',
        data: safeBase64,
      },
    },
  ]
}

function buildFallbackSafety(drugName, patientAllergies, currentPrescriptions, isPregnant) {
  const drug = normalizeText(drugName)
  const allergies = normalizeArray(patientAllergies).map(normalizeText)
  const current = normalizeArray(currentPrescriptions).map((item) =>
    normalizeText(typeof item === 'string' ? item : item?.name),
  )

  if (
    allergies.some((item) => item.includes('penicill')) &&
    /(augmentin|amoxicill|penicill)/.test(drug)
  ) {
    return {
      safe: false,
      severity: 'danger',
      message: "Contre-indication: allergie connue a la penicilline.",
      conflictType: 'allergy',
    }
  }

  if (
    allergies.some((item) => item.includes('sulfam')) &&
    /(bactrim|sulfam|cotrimoxazole|sulfamethoxazole)/.test(drug)
  ) {
    return {
      safe: false,
      severity: 'danger',
      message: "Contre-indication: allergie connue aux sulfamides.",
      conflictType: 'allergy',
    }
  }

  if (isPregnant && LOCAL_PREGNANCY_CONFLICTS.some((item) => drug.includes(item))) {
    return {
      safe: false,
      severity: 'danger',
      message: "Grossesse: ce medicament est potentiellement contre-indique.",
      conflictType: 'pregnancy',
    }
  }

  if (
    current.some((item) => item.includes('warfarine') || item.includes('anticoagul')) &&
    /(ibuprof|diclofenac|ketoprofen)/.test(drug)
  ) {
    return {
      safe: true,
      severity: 'warning',
      message: "Interaction possible avec un anticoagulant en cours.",
      conflictType: 'interaction',
    }
  }

  return {
    safe: true,
    severity: 'none',
    message: 'Aucune contre-indication evidente detectee.',
    conflictType: 'none',
  }
}

export async function transcribeAndStructure(audioBase64, patientContext = {}) {
  if (!audioBase64) {
    throw new Error("Aucun audio a transcrire.")
  }

  const data = await callGeminiJson({
    systemPrompt:
      "Transcris cette consultation medicale (francais/darija). Retourne UNIQUEMENT un JSON: {motif, interrogatoire, examenClinique, constantes: {tas, tad, fc, fr, temp, poids, glycemie}, conduite: {biologie: [], imagerie: [], referencement, arretTravailJours, rdvDate}}. Null si absent.",
    parts: buildAudioParts(audioBase64, patientContext),
  })

  return {
    motif: data?.motif ?? null,
    interrogatoire: data?.interrogatoire ?? null,
    examenClinique: data?.examenClinique ?? null,
    constantes: data?.constantes ?? {},
    conduite: data?.conduite ?? {},
  }
}

export async function suggestCIM10(consultationText) {
  if (!consultationText?.trim()) {
    return {
      principal: null,
      associes: [],
    }
  }

  const data = await callGeminiJson({
    systemPrompt:
      "Analyse ce texte medical. Suggere diagnostic principal + jusqu'a 3 associes. JSON: {principal: {code, label, confidence}, associes: [{code, label}]}. CIM-10 valides uniquement.",
    parts: [
      {
        text: consultationText,
      },
    ],
  })

  return {
    principal: data?.principal ?? null,
    associes: Array.isArray(data?.associes) ? data.associes.slice(0, 3) : [],
  }
}

export async function checkDrugSafety(
  drugName,
  patientAllergies = [],
  currentPrescriptions = [],
  isPregnant = false,
) {
  const fallback = () =>
    buildFallbackSafety(drugName, patientAllergies, currentPrescriptions, isPregnant)

  if (!drugName?.trim()) {
    return fallback()
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 800)

  try {
    const data = await callGeminiJson({
      systemPrompt: `Verifie si medicament est sur. Allergies: [${normalizeArray(patientAllergies).join(', ')}]. Medicaments en cours: [${normalizeArray(currentPrescriptions)
        .map((item) => (typeof item === 'string' ? item : item?.name))
        .filter(Boolean)
        .join(', ')}]. JSON: {safe: boolean, severity: 'none'|'warning'|'danger', message: string, conflictType: 'allergy'|'interaction'|'pregnancy'|'none'}.`,
      parts: [
        {
          text: JSON.stringify({
            drugName,
            isPregnant,
          }),
        },
      ],
      signal: controller.signal,
    })

    return normalizeSafety(data)
  } catch (error) {
    return fallback()
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function generateSummary(consultationData = {}) {
  const data = await callGeminiJson({
    systemPrompt:
      "Resume cette consultation en francais. 4-5 phrases. Structure: Motif, Constantes, Diagnostic, Conduite.",
    parts: [
      {
        text: JSON.stringify(consultationData),
      },
    ],
  })

  return {
    summaryHTML: data?.summaryHTML || '<p>Resume indisponible.</p>',
  }
}

export default {
  transcribeAndStructure,
  suggestCIM10,
  checkDrugSafety,
  generateSummary,
}
