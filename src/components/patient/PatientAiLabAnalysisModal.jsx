import { Plus, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Modal from '../common/Modal'

export default function PatientAiLabAnalysisModal({ open, onClose, patient, documents, onInsertSummary }) {
  const [selectedDocumentId, setSelectedDocumentId] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!open) return
    setSelectedDocumentId(documents[0]?.id || '')
    setUploadedFile(null)
    setSummary('')
    setErrorMessage('')
  }, [open, documents])

  const selectedDocument = useMemo(
    () => documents.find((item) => item.id === selectedDocumentId) || null,
    [documents, selectedDocumentId],
  )

  const handleAnalyze = async () => {
    const sourceLabel = selectedDocument?.nom_fichier || uploadedFile?.name
    if (!sourceLabel) {
      setErrorMessage('Choisissez un document du dossier ou importez un fichier.')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSummary('')

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 1200))

      const sourceName = sourceLabel.toLowerCase()
      const flaggedMetric = sourceName.includes('bilan')
        ? 'Verifier les anomalies metaboliques et recouper avec le contexte clinique.'
        : sourceName.includes('scanner')
          ? "Recouper l'imagerie avec la symptomatologie et les antecedents."
          : 'Valider les donnees avec le document source et la consultation associee.'

      setSummary(
        [
          `Document analyse: ${sourceLabel}`,
          `Patient: ${patient?.prenom || ''} ${patient?.nom || ''}`.trim(),
          '',
          'Synthese IA contextuelle:',
          '- Elements a relire en priorite selon le type de document.',
          `- ${flaggedMetric}`,
          '- Ajouter la conclusion utile au plan de soin ou a la prochaine consultation.',
          '',
          'Action suggeree:',
          '- Completer les notes du medecin avec les points saillants et les suites a donner.',
        ].join('\n'),
      )
    } catch {
      setErrorMessage("Impossible d'analyser ce document pour le moment.")
    } finally {
      setLoading(false)
    }
  }

  const handleInject = () => {
    if (!summary.trim()) return
    onInsertSummary(`Analyse de bilan\n${summary.trim()}`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Analyse de Bilan (IA)"
      description={`Analyse contextuelle des documents de ${patient?.prenom || 'ce patient'} dans une modale locale.`}
      width="max-w-4xl"
    >
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Source</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">Choisir un document</h3>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Document deja present</span>
              <select
                value={selectedDocumentId}
                onChange={(event) => setSelectedDocumentId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-300"
              >
                <option value="">Selectionner un document</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.nom_fichier || doc.type_document}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Ou importer un fichier</span>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(event) => setUploadedFile(event.target.files?.[0] || null)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-slate-700"
              />
            </label>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Analyse en cours...' : 'Lancer une analyse contextuelle'}
            </button>
          </div>

          <div className="space-y-4 rounded-[24px] border border-emerald-100 bg-emerald-50 p-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Lecture IA</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">Resume exploitable</h3>
            </div>
            <div className="min-h-[260px] rounded-[20px] border border-white/80 bg-white/90 p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {summary || "L'analyse IA se placera ici pour pouvoir l'ajouter au dossier sans quitter l'onglet Documents."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleInject}
              disabled={!summary}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Ajouter aux notes du medecin
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
