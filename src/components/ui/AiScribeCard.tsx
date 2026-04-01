import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AiScribeCard() {
  const [notes, setNotes] = useState('')
  const [letter, setLetter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [recording, setRecording] = useState(false)
  const [volume, setVolume] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<any>(null)
  const analyserRef = useRef<any>(null)
  const animationRef = useRef<any>(null)
  const streamRef = useRef<any>(null)

  useEffect(() => {
    async function fetchPatients() {
      const { data } = await supabase.from('patients').select('id, nom, prenom').order('nom')
      if (data) setPatients(data)
    }
    fetchPatients()
    return () => stopAudio()
  }, [])

  function stopAudio() {
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach((t: any) => t.stop())
    if (audioContextRef.current) audioContextRef.current.close()
    setVolume(0)
  }

  async function startVolumeDetection() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      analyser.fftSize = 256
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      function tick() {
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setVolume(Math.min(100, avg * 2))
        animationRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      setError("Microphone inaccessible.")
    }
  }

  function toggleRecording() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError("Utilisez Chrome.")
      return
    }

    if (recording) {
      recognitionRef.current?.stop()
      stopAudio()
      setRecording(false)
      setTranscript('')
      return
    }

    setError('')
    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => {
      setRecording(true)
      startVolumeDetection()
    }

    recognition.onresult = (event: any) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' '
        } else {
          interim += event.results[i][0].transcript
        }
      }
      if (final) setNotes(prev => prev + final)
      setTranscript(interim)
    }

    recognition.onerror = () => {
      stopAudio()
      setRecording(false)
      setTranscript('')
    }

    recognition.onend = () => {
      stopAudio()
      setRecording(false)
      setTranscript('')
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  async function generateLetter() {
    if (!notes.trim()) return
    if (recording) {
      recognitionRef.current?.stop()
      stopAudio()
      setRecording(false)
    }
    setLoading(true)
    setError('')
    setLetter('')

    const { data, error: fnError } = await supabase.functions.invoke('ai-scribe', {
      body: { notes }
    })

    if (fnError || data?.error) {
      setError("Erreur IA.")
      setLoading(false)
      return
    }

    setLetter(data.letter)
    setLoading(false)
  }

  async function copyText() {
    await navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveToPatientRecord() {
    if (!selectedPatient || !letter) return
    setIsSaving(true)
    const { error: dbError } = await supabase.from('consultations').insert([{
      patient_id: selectedPatient,
      notes: letter,
      statut: 'Terminée',
      date_consult: new Date().toISOString()
    }])
    setIsSaving(false)
    if (!dbError) {
      setNotes('')
      setLetter('')
      setSelectedPatient('')
      alert("Sauvegardé avec succès.")
    } else {
      setError("Erreur de sauvegarde.")
    }
  }

  const bars = [3, 5, 8, 5, 3, 7, 4, 6, 8, 4]

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Assistant IA</h1>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <select 
          value={selectedPatient}
          onChange={(e) => setSelectedPatient(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-gray-50 text-gray-800 text-sm mb-4"
        >
          <option value="">-- Sélectionnez un patient --</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>
          ))}
        </select>

        <div className="relative">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes..."
            rows={5}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-800 resize-none text-sm"
          />
          {transcript && <p className="text-xs text-gray-400 italic px-1 mt-1">{transcript}...</p>}
        </div>

        <button
          onClick={toggleRecording}
          className={`w-full flex items-center justify-center gap-3 py-3 rounded-lg border transition-all font-medium text-sm ${
            recording ? 'bg-red-50 border-red-300 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          {recording ? (
            <>
              <div className="flex items-end gap-0.5 h-5">
                {bars.map((base, i) => (
                  <div key={i} className="w-1 bg-red-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(4, (volume / 100) * base * 4)}px` }} />
                ))}
              </div>
              <span>Enregistrement en cours</span>
            </>
          ) : (
            "Dicter"
          )}
        </button>

        <button
          onClick={generateLetter}
          disabled={loading || !notes.trim()}
          className="w-full py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors font-medium text-sm"
        >
          {loading ? "Rédaction..." : "Générer la lettre"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm p-3 bg-red-50 rounded-lg">{error}</p>}

      {letter && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Lettre générée</span>
            <div className="flex gap-2">
              <button onClick={copyText} className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                {copied ? "Copié !" : "Copier"}
              </button>
              <button onClick={saveToPatientRecord} disabled={isSaving || !selectedPatient} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {isSaving ? "Sauvegarde..." : "Enregistrer au dossier"}
              </button>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{letter}</p>
          </div>
        </div>  
      )}
    </div>
  )
}