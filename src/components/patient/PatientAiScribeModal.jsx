import { Mic, PauseCircle, Plus, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import {
  DEFAULT_SCRIBE_LANGUAGE_MODE,
  getScribeLanguageOption,
  requestAiScribeLetter,
  SCRIBE_LANGUAGE_OPTIONS,
} from '../../lib/aiScribe'
import { supabase } from '../../lib/supabase'
import Modal from '../common/Modal'

function formatRecordingDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round((durationMs || 0) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function PatientAiScribeModal({ open, onClose, patient, onInsertNotes }) {
  const [draftNotes, setDraftNotes] = useState('')
  const [generatedNote, setGeneratedNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [languageMode, setLanguageMode] = useState(DEFAULT_SCRIBE_LANGUAGE_MODE)

  const recorder = useAudioRecorder()
  const selectedLanguage = useMemo(
    () => getScribeLanguageOption(languageMode),
    [languageMode],
  )

  useEffect(() => {
    if (!open) {
      recorder.stopRecording().catch(() => {})
      recorder.clearRecording()
      return
    }

    setDraftNotes('')
    setGeneratedNote('')
    setErrorMessage('')
    setLanguageMode(DEFAULT_SCRIBE_LANGUAGE_MODE)
    recorder.clearRecording()
  }, [open, patient?.id])

  useEffect(() => {
    if (recorder.error) {
      setErrorMessage(recorder.error)
    }
  }, [recorder.error])

  const toggleRecording = async () => {
    setErrorMessage('')

    try {
      await recorder.toggleRecording()
    } catch (recordingError) {
      setErrorMessage(recordingError?.message || "Impossible d'utiliser le microphone.")
    }
  }

  const generateNote = async () => {
    if (!draftNotes.trim() && !recorder.audioBase64) return

    setLoading(true)
    setErrorMessage('')
    setGeneratedNote('')

    try {
      if (recorder.isRecording) {
        await recorder.stopRecording()
      }

      const letter = await requestAiScribeLetter({
        supabaseClient: supabase,
        patient,
        notes: draftNotes,
        audioBase64: recorder.audioBase64,
        audioMimeType: recorder.audioMimeType,
        languageMode,
      })

      setGeneratedNote(letter)
    } catch (generationError) {
      setErrorMessage(generationError?.message || "Impossible de generer une note avec l'IA.")
    } finally {
      setLoading(false)
    }
  }

  const handleInject = () => {
    const nextText = (generatedNote || draftNotes).trim()
    if (!nextText) return
    onInsertNotes(nextText)
    onClose()
  }

  const hasAudio = Boolean(recorder.audioBase64)
  const volumeBars = [4, 6, 8, 10, 8, 6, 4]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="IA Scribe / Dictee"
      description={`Enregistrez ou structurez une note clinique pour ${patient?.prenom || 'le patient'} sans quitter le dossier.`}
      width="max-w-4xl"
    >
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
          <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Brouillon clinique</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">Notes de depart</h3>
                <p className="mt-2 text-xs text-slate-500">
                  Enregistrez votre voix en Darija, francais ou mixte, puis laissez Gemini structurer la note en francais medical.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <select
                  value={languageMode}
                  onChange={(event) => setLanguageMode(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-300"
                >
                  {SCRIBE_LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                    recorder.isRecording
                      ? 'border border-rose-200 bg-rose-50 text-rose-700'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:text-emerald-700'
                  }`}
                >
                  {recorder.isRecording ? <PauseCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {recorder.isRecording ? 'Arreter lenregistrement' : 'Demarrer lenregistrement'}
                </button>
              </div>
            </div>

            <div className="rounded-[20px] border border-white/80 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Audio clinique</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {recorder.isRecording
                      ? `Enregistrement en cours (${formatRecordingDuration(recorder.recordingDurationMs)})`
                      : hasAudio
                        ? `Audio pret (${formatRecordingDuration(recorder.recordingDurationMs)})`
                        : 'Aucun audio capture pour le moment'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{selectedLanguage.helper}</p>
                </div>
                <div className="flex h-10 items-end gap-1">
                  {volumeBars.map((bar) => (
                    <div
                      key={bar}
                      className={`w-1.5 rounded-full transition-all duration-100 ${
                        recorder.isRecording ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                      style={{ height: `${Math.max(6, (recorder.audioLevel / 100) * bar * 3)}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <textarea
              value={draftNotes}
              onChange={(event) => setDraftNotes(event.target.value)}
              rows={10}
              placeholder="Ajoutez si besoin des observations manuelles, points de contexte ou precisions cliniques."
              className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700 outline-none focus:border-emerald-300"
            />

            <button
              type="button"
              onClick={generateNote}
              disabled={loading || (!draftNotes.trim() && !hasAudio)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Generation en cours...' : 'Generer une note propre'}
            </button>
          </div>

          <div className="space-y-4 rounded-[24px] border border-sky-100 bg-sky-50 p-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Resultat IA</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">Note prete a injecter</h3>
            </div>
            <div className="min-h-[260px] rounded-[20px] border border-white/80 bg-white/90 p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {generatedNote || "L'IA reformule ici la note clinique une fois la generation lancee."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleInject}
              disabled={!generatedNote && !draftNotes.trim()}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm font-bold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Inserer dans les notes du medecin
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
