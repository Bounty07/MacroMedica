import { AlertTriangle, ClipboardList, Loader2, Pill, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { generateWithGemini } from '../../lib/gemini'

function normalizeJsonPayload(rawText) {
  if (!rawText) return null

  const cleaned = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()

  return JSON.parse(cleaned)
}

function shapeTherapeuticResult(payload, fallback) {
  if (!payload || typeof payload !== 'object') return fallback

  const alerts = Array.isArray(payload.alertesInteractions)
    ? payload.alertesInteractions
    : payload.alertesInteractions
      ? [String(payload.alertesInteractions)]
      : fallback.alertesInteractions

  const followUp = Array.isArray(payload.recommandationsSuivi)
    ? payload.recommandationsSuivi
    : payload.recommandationsSuivi
      ? [String(payload.recommandationsSuivi)]
      : fallback.recommandationsSuivi

  return {
    posologieRecommandee: payload.posologieRecommandee || fallback.posologieRecommandee,
    alertesInteractions: alerts.map((item) => String(item)),
    recommandationsSuivi: followUp.map((item) => String(item)),
  }
}

function buildFallbackTherapeuticResponse(medication, patient) {
  const normalizedMedication = medication.trim()
  const lowered = normalizedMedication.toLowerCase()
  const hasPenicillinAlert = /amoxic|penic|augmentin|cloxac/i.test(lowered)
  const hasExistingAnalgesic = patient.currentMedication.some((item) => /parac/i.test(item.toLowerCase()))

  let dosage = `Chez ${patient.name}, ${patient.age} ans (${patient.weight}), commencer par ${normalizedMedication} selon le RCP, à la dose minimale efficace, avec réévaluation clinique rapide.`

  if (/ibuprofen|ibuprofene/i.test(lowered)) {
    dosage = `Ibuprofène: 400 mg par prise toutes les 8 heures si besoin, après repas, sans dépasser 1 200 mg par jour sans validation médicale complémentaire.`
  } else if (/paracetamol|paracétamol/i.test(lowered)) {
    dosage = `Paracétamol: 1 g par prise toutes les 6 à 8 heures si besoin, sans dépasser 3 g par jour chez cet adulte de ${patient.weight}.`
  }

  const alerts = []

  if (hasPenicillinAlert) {
    alerts.push(`Allergie majeure à surveiller: patient allergique à ${patient.allergies.join(', ')}. Ce médicament doit être évité.`)
  } else {
    alerts.push(`Aucune interaction directe détectée avec l'allergie déclarée (${patient.allergies.join(', ')}), mais une vérification pharmaceutique reste recommandée.`)
  }

  if (hasExistingAnalgesic && /ibuprofen|ibuprofene/i.test(lowered)) {
    alerts.push(`Traitement actuel: ${patient.currentMedication.join(', ')}. Éviter les prises anarchiques avec d'autres antalgiques et surveiller la dose totale quotidienne.`)
  } else {
    alerts.push(`Médication actuelle: ${patient.currentMedication.join(', ')}. Vérifier la tolérance digestive, rénale et le contexte clinique avant initiation.`)
  }

  alerts.push('Confirmer les antécédents digestifs, rénaux et cardiovasculaires avant toute prescription définitive.')

  const followUp = [
    'Réévaluer l’efficacité clinique après 48 à 72 heures.',
    'Recontrôler les effets indésirables et documenter la tolérance dans le dossier patient.',
    'Renforcer les consignes de retour rapide si aggravation, rash, dyspnée ou douleur persistante.',
  ]

  return {
    posologieRecommandee: dosage,
    alertesInteractions: alerts,
    recommandationsSuivi: followUp,
  }
}

function ResultCard({ icon: Icon, title, accentClass, children }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accentClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">{title}</p>
          <div className="mt-3 text-sm leading-6 text-slate-600">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function AiTherapeuticAssistantCard({ mockPatientContext }) {
  const patient = useMemo(() => mockPatientContext || {
    name: 'Karim Benali',
    age: 45,
    weight: '82kg',
    allergies: ['Pénicilline'],
    currentMedication: ['Paracétamol'],
  }, [mockPatientContext])

  const [medicationQuery, setMedicationQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleCheckMedication = async () => {
    if (!medicationQuery.trim()) return

    setLoading(true)
    setError('')
    setResult(null)

    const prompt = `
Tu es l'assistant thérapeutique de MacroMedica.
Analyse la prescription demandée pour ce patient et réponds uniquement en JSON valide.
Format attendu strict:
{
  "posologieRecommandee": "string",
  "alertesInteractions": ["string", "string"],
  "recommandationsSuivi": ["string", "string"]
}

Patient:
- Nom: ${patient.name}
- Âge: ${patient.age} ans
- Poids: ${patient.weight}
- Allergies: ${patient.allergies.join(', ')}
- Traitement en cours: ${patient.currentMedication.join(', ')}

Médicament à vérifier: ${medicationQuery.trim()}

Consignes:
- Donne une posologie adulte réaliste et prudente.
- Vérifie les allergies et les interactions avec le traitement en cours.
- Ajoute des recommandations de suivi concrètes.
- Réponds en français médical clair.
`.trim()

    try {
      const rawResponse = await generateWithGemini(prompt)
      const fallback = buildFallbackTherapeuticResponse(medicationQuery, patient)
      const parsed = rawResponse ? normalizeJsonPayload(rawResponse) : null
      setResult(shapeTherapeuticResult(parsed, fallback))
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Analyse thérapeutique indisponible.')
      setResult(buildFallbackTherapeuticResponse(medicationQuery, patient))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Assistant Thérapeutique</p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">Vérification médicamenteuse guidée</h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Vérifiez une molécule en tenant compte du contexte patient simulé, des allergies déclarées et du traitement déjà en cours.
            </p>
          </div>
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">Patient simulé</p>
            <p className="mt-1 text-sm font-semibold text-emerald-900">{patient.name}</p>
            <p className="mt-1 text-xs leading-6 text-emerald-700">
              {patient.age} ans • {patient.weight} • Allergie: {patient.allergies.join(', ')}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="block">
            <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              Recherche
            </span>
            <input
              type="text"
              value={medicationQuery}
              onChange={(event) => setMedicationQuery(event.target.value)}
              placeholder="Rechercher un médicament (ex: Ibuprofène)"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <button
            type="button"
            onClick={handleCheckMedication}
            disabled={loading || !medicationQuery.trim()}
            className="inline-flex items-center justify-center gap-2 self-end rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {loading ? 'Vérification...' : 'Vérifier'}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {patient.allergies.map((item) => (
            <span key={item} className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700">
              Allergie: {item}
            </span>
          ))}
          {patient.currentMedication.map((item) => (
            <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Traitement: {item}
            </span>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <ResultCard icon={Pill} title="Posologie recommandée" accentClass="bg-emerald-100 text-emerald-700">
            <p>{result.posologieRecommandee}</p>
          </ResultCard>

          <ResultCard icon={AlertTriangle} title="Alertes & Interactions" accentClass="bg-amber-100 text-amber-700">
            <ul className="space-y-2">
              {result.alertesInteractions.map((item) => (
                <li key={item} className="rounded-2xl bg-amber-50 px-3 py-2 text-amber-900">
                  {item}
                </li>
              ))}
            </ul>
          </ResultCard>

          <ResultCard icon={ClipboardList} title="Recommandations de suivi" accentClass="bg-sky-100 text-sky-700">
            <ul className="space-y-2">
              {result.recommandationsSuivi.map((item) => (
                <li key={item} className="rounded-2xl bg-sky-50 px-3 py-2 text-sky-900">
                  {item}
                </li>
              ))}
            </ul>
          </ResultCard>
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-white px-5 py-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Aucune analyse lancée</p>
          <p className="mt-2 text-sm text-slate-500">
            Saisissez une molécule puis cliquez sur <strong>Vérifier</strong> pour générer la posologie, les alertes et le suivi.
          </p>
        </div>
      )}
    </div>
  )
}
