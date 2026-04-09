import { useEffect, useRef, useState } from 'react'

const MIME_TYPE_CANDIDATES = ['audio/webm', 'audio/mp4', 'audio/ogg']

function getRecorderSupport() {
  if (typeof window === 'undefined') return false

  return Boolean(window.MediaRecorder && navigator.mediaDevices?.getUserMedia)
}

function pickMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder) return ''

  if (typeof window.MediaRecorder.isTypeSupported !== 'function') {
    return MIME_TYPE_CANDIDATES[0]
  }

  return MIME_TYPE_CANDIDATES.find((item) => window.MediaRecorder.isTypeSupported(item)) || ''
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error("Impossible de convertir l'audio en base64."))
        return
      }

      const [, base64 = ''] = reader.result.split(',', 2)
      resolve(base64)
    }

    reader.onerror = () => reject(new Error("Impossible de lire l'enregistrement audio."))
    reader.readAsDataURL(blob)
  })
}

function stopMediaStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop())
}

export function useAudioRecorder() {
  const [isSupported, setIsSupported] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioBase64, setAudioBase64] = useState('')
  const [audioMimeType, setAudioMimeType] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingDurationMs, setRecordingDurationMs] = useState(0)
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const audioChunksRef = useRef([])
  const durationTimerRef = useRef(0)
  const recordingStartedAtRef = useRef(0)
  const audioContextRef = useRef(null)
  const animationFrameRef = useRef(0)
  const stopPromiseRef = useRef(null)
  const stopResolveRef = useRef(null)
  const stopRejectRef = useRef(null)
  const mimeTypeRef = useRef('')

  useEffect(() => {
    setIsSupported(getRecorderSupport())

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }

      if (durationTimerRef.current) {
        window.clearInterval(durationTimerRef.current)
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }

      stopMediaStream(mediaStreamRef.current)
    }
  }, [])

  const resetAudioMeter = () => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = 0
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }

    setAudioLevel(0)
  }

  const startAudioMeter = async (stream) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    try {
      const audioContext = new AudioContextClass()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      analyser.fftSize = 256
      source.connect(analyser)
      audioContextRef.current = audioContext

      const tick = () => {
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((total, value) => total + value, 0) / dataArray.length
        setAudioLevel(Math.min(100, Math.round(average * 1.6)))
        animationFrameRef.current = window.requestAnimationFrame(tick)
      }

      tick()
    } catch {
      setAudioLevel(0)
    }
  }

  const clearRecording = () => {
    setAudioBlob(null)
    setAudioBase64('')
    setAudioMimeType('')
    setRecordingDurationMs(0)
    setAudioLevel(0)
    setError('')
  }

  const startRecording = async () => {
    if (!getRecorderSupport()) {
      const message = "L'enregistrement audio n'est pas disponible sur cet appareil."
      setError(message)
      throw new Error(message)
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      return null
    }

    clearRecording()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMimeType()
      const recorder = mimeType
        ? new window.MediaRecorder(stream, { mimeType })
        : new window.MediaRecorder(stream)

      audioChunksRef.current = []
      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder
      mimeTypeRef.current = recorder.mimeType || mimeType || 'audio/webm'
      setAudioMimeType(mimeTypeRef.current)

      stopPromiseRef.current = new Promise((resolve, reject) => {
        stopResolveRef.current = resolve
        stopRejectRef.current = reject
      })

      recorder.onstart = () => {
        recordingStartedAtRef.current = Date.now()
        setIsRecording(true)
        setRecordingDurationMs(0)

        durationTimerRef.current = window.setInterval(() => {
          setRecordingDurationMs(Date.now() - recordingStartedAtRef.current)
        }, 250)

        startAudioMeter(stream).catch(() => {})
      }

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onerror = () => {
        const message = "L'enregistrement audio a ete interrompu."
        setError(message)
        setIsRecording(false)

        if (durationTimerRef.current) {
          window.clearInterval(durationTimerRef.current)
          durationTimerRef.current = 0
        }

        resetAudioMeter()
        stopMediaStream(mediaStreamRef.current)
        mediaStreamRef.current = null
        stopRejectRef.current?.(new Error(message))
      }

      recorder.onstop = async () => {
        if (durationTimerRef.current) {
          window.clearInterval(durationTimerRef.current)
          durationTimerRef.current = 0
        }

        resetAudioMeter()
        stopMediaStream(mediaStreamRef.current)
        mediaStreamRef.current = null

        setIsRecording(false)

        const durationMs = recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : 0
        setRecordingDurationMs(durationMs)

        try {
          const blob = new Blob(audioChunksRef.current, {
            type: mimeTypeRef.current || 'audio/webm',
          })

          if (!blob.size) {
            throw new Error("Aucun son n'a ete detecte pendant l'enregistrement.")
          }

          const base64 = await blobToBase64(blob)
          const resolvedMimeType = blob.type || mimeTypeRef.current || 'audio/webm'

          setAudioBlob(blob)
          setAudioBase64(base64)
          setAudioMimeType(resolvedMimeType)

          stopResolveRef.current?.({
            blob,
            base64,
            mimeType: resolvedMimeType,
            durationMs,
          })
        } catch (stopError) {
          const nextError = stopError instanceof Error
            ? stopError
            : new Error("Impossible de finaliser l'enregistrement audio.")
          setError(nextError.message)
          stopRejectRef.current?.(nextError)
        } finally {
          mediaRecorderRef.current = null
          stopResolveRef.current = null
          stopRejectRef.current = null
        }
      }

      recorder.start()
      return null
    } catch (startError) {
      const message = startError instanceof Error
        ? startError.message
        : "Impossible d'acceder au microphone."

      resetAudioMeter()
      stopMediaStream(mediaStreamRef.current)
      mediaStreamRef.current = null
      mediaRecorderRef.current = null
      setIsRecording(false)
      setError(message)
      throw new Error(message)
    }
  }

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current

    if (!recorder || recorder.state === 'inactive') {
      return audioBase64
        ? {
            blob: audioBlob,
            base64: audioBase64,
            mimeType: audioMimeType,
            durationMs: recordingDurationMs,
          }
        : null
    }

    const resultPromise = stopPromiseRef.current

    recorder.stop()

    return resultPromise
  }

  const toggleRecording = async () => {
    if (isRecording) {
      return stopRecording()
    }

    await startRecording()
    return null
  }

  return {
    isSupported,
    isRecording,
    audioBlob,
    audioBase64,
    audioMimeType,
    audioLevel,
    recordingDurationMs,
    error,
    clearRecording,
    startRecording,
    stopRecording,
    toggleRecording,
  }
}

export default useAudioRecorder
