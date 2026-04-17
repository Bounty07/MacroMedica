import { Copy, FileText, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { generateWithGemini } from '../../lib/gemini'

const LETTER_TYPES = [
  'Lettre de liaison',
  "Courrier d'adressage",
  'Certificat médical',
]

function buildFallbackLetter({ patient, letterType, consultationNotes, recipientDoctor }) {
  const recipientLine = recipientDoctor?.trim() || 'Docteur destinataire'
  const notes = consultationNotes.trim() || 'Patient venu en consultation, avec prise en charge symptomatique et consignes de suivi.'
  const allergyLine = patient.allergies.length ? patient.allergies.join(', ') : 'Aucune allergie connue'
  const medicationLine = patient.currentMedication.length ? patient.currentMedication.join(', ') : 'Aucun traitement déclaré'

  if (letterType === 'Certificat médical') {
    return `CERTIFICAT MÉDICAL

Je soussigné(e), Dr ${recipientLine}, certifie avoir examiné ce jour M. ${patient.name}, âgé de ${patient.age} ans (${patient.weight}).

Motif / constat clinique:
${notes}

Éléments de contexte:
- Allergies connues: ${allergyLine}
- Traitement actuel: ${medicationLine}

L'état clinique du patient justifie une prise en charge médicale adaptée avec surveillance selon l'évolution.

Certificat établi à la demande de l'intéressé pour servir et valoir ce que de droit.`
  }

  const opening = letterType === "Courrier d'adressage"
    ? `J'adresse à votre évaluation M. ${patient.name}, ${patient.age} ans, vu ce jour au cabinet.`
    : `Je vous transmets un résumé de la consultation de M. ${patient.name}, ${patient.age} ans, vu ce jour au cabinet.`

  return `${letterType.toUpperCase()}

À l'attention de ${recipientLine}

Objet: ${letterType} concernant M. ${patient.name}

Cher confrère,

${opening}

Contexte patient:
- Poids: ${patient.weight}
- Allergies: ${allergyLine}
- Traitement en cours: ${medicationLine}

Notes de consultation:
${notes}

Une surveillance clinique est recommandée selon l'évolution des symptômes, avec réévaluation si persistance ou aggravation.

Je reste à votre disposition pour tout complément d'information.

Bien confraternellement,
Dr MacroMedica`
}

export default function AiLetterGeneratorCard({ mockPatientContext }) {
  const patient = useMemo(() => mockPatientContext || {
    name: 'Karim Benali',
    age: 45,
    weight: '82kg',
    allergies: ['Pénicilline'],
    currentMedication: ['Paracétamol'],
  }, [mockPatientContext])

  const [letterType, setLetterType] = useState(LETTER_TYPES[0])
  const [consultationNotes, setConsultationNotes] = useState('')
  const [recipientDoctor, setRecipientDoctor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedLetter, setGeneratedLetter] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerateLetter = async () => {
    if (!consultationNotes.trim()) return

    setLoading(true)
    setError('')
    setGeneratedLetter('')

    const prompt = `
Tu es le générateur de courriers médicaux de MacroMedica.
Rédige uniquement le courrier final en texte brut, en français, sans balises Markdown ni JSON.
Le ton doit être professionnel, synthétique et exploitable en cabinet.

Patient:
- Nom: ${patient.name}
- Âge: ${patient.age} ans
- Poids: ${patient.weight}
- Allergies: ${patient.allergies.join(', ')}
- Traitement en cours: ${patient.currentMedication.join(', ')}

Type de courrier: ${letterType}
Médecin destinataire: ${recipientDoctor.trim() || 'Docteur destinataire'}
Notes de consultation:
${consultationNotes.trim()}

Consignes:
- Commence par un en-tête adapté au type de courrier.
- Intègre le contexte patient utile.
- Termine par une formule confraternelle sobre.
`.trim()

    try {
      const rawResponse = await generateWithGemini(prompt)
      setGeneratedLetter(rawResponse || buildFallbackLetter({
        patient,
        letterType,
        consultationNotes,
        recipientDoctor,
      }))
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Génération du courrier indisponible.')
      setGeneratedLetter(buildFallbackLetter({
        patient,
        letterType,
        consultationNotes,
        recipientDoctor,
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedLetter) return

    try {
      await navigator.clipboard.writeText(generatedLetter)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Copie impossible sur ce navigateur.')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Générateur de Courriers</p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">Production rapide de documents médicaux</h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Préparez une lettre de liaison, un courrier d&apos;adressage ou un certificat médical à partir du dossier patient simulé et de vos notes de consultation.
            </p>
          </div>
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">Patient simulé</p>
            <p className="mt-1 text-sm font-semibold text-emerald-900">{patient.name}</p>
            <p className="mt-1 text-xs leading-6 text-emerald-700">
              {patient.age} ans • {patient.weight} • Traitement: {patient.currentMedication.join(', ')}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Type de courrier</span>
            <select
              value={letterType}
              onChange={(event) => setLetterType(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            >
              {LETTER_TYPES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Médecin destinataire</span>
            <input
              type="text"
              value={recipientDoctor}
              onChange={(event) => setRecipientDoctor(event.target.value)}
              placeholder="Médecin destinataire"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Notes de consultation</span>
          <textarea
            value={consultationNotes}
            onChange={(event) => setConsultationNotes(event.target.value)}
            placeholder="Patient venu pour douleurs lombaires, prescrit kiné"
            rows={6}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <button
          type="button"
          onClick={handleGenerateLetter}
          disabled={loading || !consultationNotes.trim()}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {loading ? 'Génération...' : 'Générer le courrier'}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      {generatedLetter ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Courrier généré</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{letterType}</p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>

          <textarea
            readOnly
            value={generatedLetter}
            rows={16}
            className="mt-4 w-full resize-none rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 outline-none"
          />
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-white px-5 py-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Aucun courrier généré</p>
          <p className="mt-2 text-sm text-slate-500">
            Renseignez le type, les notes et le destinataire puis lancez la génération pour obtenir le texte complet.
          </p>
        </div>
      )}
    </div>
  )
}
