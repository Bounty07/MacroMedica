import { Copy, Mic, PauseCircle, Save, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import {
  DEFAULT_SCRIBE_LANGUAGE_MODE,
  getScribeLanguageOption,
  requestAiScribeLetter,
  SCRIBE_LANGUAGE_OPTIONS,
} from '../../lib/aiScribe'
import { savePatientConsultation } from '../../lib/consultationNotes'
import { supabase } from '../../lib/supabase'

type PatientRecord = {
  id: string | number
  cabinet_id?: string | null
  nom?: string | null
  prenom?: string | null
  date_naissance?: string | null
  antecedents?: string | null
  allergies?: string | null
}

function formatRecordingDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round((durationMs || 0) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function AiScribeCard() {
  const { notify } = useAppContext()
  const [notes, setNotes] = useState('')
  const [letter, setLetter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [languageMode, setLanguageMode] = useState(DEFAULT_SCRIBE_LANGUAGE_MODE)

  const recorder = useAudioRecorder()
  const selectedLanguage = useMemo(
    () => getScribeLanguageOption(languageMode),
    [languageMode],
  )
  const selectedPatientRecord = patients.find((patient) => String(patient.id) === String(selectedPatient))
  const hasAudio = Boolean(recorder.audioBase64)
  const bars = [3, 5, 8, 5, 3, 7, 4, 6, 8, 4]

  useEffect(() => {
    async function fetchPatients() {
      const { data } = await supabase
        .from('patients')
        .select('id, cabinet_id, nom, prenom, date_naissance, antecedents, allergies')
        .order('nom')

      if (data) {
        setPatients(data)
      }
    }

    fetchPatients()

    return () => {
      recorder.stopRecording().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (recorder.error) {
      setError(recorder.error)
    }
  }, [recorder.error])

  const toggleRecording = async () => {
    setError('')

    try {
      await recorder.toggleRecording()
    } catch (recordingError) {
      setError(recordingError instanceof Error ? recordingError.message : 'Microphone inaccessible.')
    }
  }

  const generateLetter = async () => {
    if (!notes.trim() && !hasAudio) return

    setLoading(true)
    setError('')
    setLetter('')

    try {
      if (recorder.isRecording) {
        await recorder.stopRecording()
      }

      const nextLetter = await requestAiScribeLetter({
        supabaseClient: supabase,
        patient: selectedPatientRecord,
        notes,
        audioBase64: recorder.audioBase64,
        audioMimeType: recorder.audioMimeType,
        languageMode,
      })

      setLetter(nextLetter)
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Erreur IA.')
    } finally {
      setLoading(false)
    }
  }

  const copyText = async () => {
    await navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveToPatientRecord = async () => {
    if (!selectedPatientRecord?.id || !letter) return

    setIsSaving(true)
    setError('')

    try {
      await savePatientConsultation({
        supabaseClient: supabase,
        cabinetId: selectedPatientRecord.cabinet_id,
        patientId: selectedPatientRecord.id,
        notes: letter,
        statut: 'paye',
      })

      setNotes('')
      setLetter('')
      setSelectedPatient('')
      recorder.clearRecording()
      notify({
        title: 'Consultation sauvegardee',
        description: 'La note a ete ajoutee au dossier patient.',
      })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erreur de sauvegarde.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100">
          <Sparkles className="h-5 w-5 text-sky-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">IA Scribe / Dictee</h1>
          <p className="text-sm text-gray-500">Enregistrez la voix, puis laissez Gemini rediger la note en francais medical.</p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <select
          value={selectedPatient}
          onChange={(event) => setSelectedPatient(event.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">-- Selectionnez un patient --</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>{patient.nom} {patient.prenom}</option>
          ))}
        </select>

        <select
          value={languageMode}
          onChange={(event) => setLanguageMode(event.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          {SCRIBE_LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Audio capture</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {recorder.isRecording
                  ? `Enregistrement en cours (${formatRecordingDuration(recorder.recordingDurationMs)})`
                  : hasAudio
                    ? `Audio pret (${formatRecordingDuration(recorder.recordingDurationMs)})`
                    : 'Pret a enregistrer une commande clinique'}
              </p>
              <p className="mt-1 text-xs text-slate-500">{selectedLanguage.helper}</p>
            </div>
            <div className="flex items-end gap-0.5">
              {bars.map((base, index) => (
                <div
                  key={index}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    recorder.isRecording ? 'bg-sky-500' : 'bg-slate-200'
                  }`}
                  style={{ height: `${Math.max(4, (recorder.audioLevel / 100) * base * 4)}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ajoutez si besoin des precisions cliniques, un motif, ou des observations complementaires."
            rows={5}
            className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <button
          onClick={toggleRecording}
          disabled={loading}
          className={`flex w-full items-center justify-center gap-3 rounded-lg border py-3 text-sm font-medium transition-all ${
            recorder.isRecording
              ? 'border-red-300 bg-red-50 text-red-600'
              : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          {recorder.isRecording ? <PauseCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          <span>{recorder.isRecording ? 'Arreter lenregistrement' : 'Enregistrer la voix'}</span>
        </button>

        <button
          onClick={generateLetter}
          disabled={loading || (!notes.trim() && !hasAudio)}
          className="w-full rounded-lg bg-sky-600 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-40"
        >
          {loading ? 'Redaction...' : 'Generer la lettre'}
        </button>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}

      {letter ? (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Lettre generee</span>
            <div className="flex gap-2">
              <button
                onClick={copyText}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copie !' : 'Copier'}
              </button>
              <button
                onClick={saveToPatientRecord}
                disabled={isSaving || !selectedPatient}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Sauvegarde...' : 'Enregistrer au dossier'}
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{letter}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
