import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { requestVoiceAgentIntent } from '../lib/voiceCommandAgent'
import { useAudioRecorder } from './useAudioRecorder'

export function useVoiceCommand({
  onIntent,
  onError,
}) {
  const recorder = useAudioRecorder()
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastIntent, setLastIntent] = useState(null)

  useEffect(() => {
    if (recorder.error) {
      onError?.(recorder.error)
    }
  }, [onError, recorder.error])

  const processRecording = async (recording) => {
    if (!recording?.base64) {
      return null
    }

    setIsProcessing(true)

    try {
      const intent = await requestVoiceAgentIntent({
        supabaseClient: supabase,
        audioBase64: recording.base64,
        audioMimeType: recording.mimeType,
      })

      setLastIntent(intent)
      await onIntent?.(intent)
      recorder.clearRecording()
      return intent
    } catch (processingError) {
      const message = processingError instanceof Error
        ? processingError.message
        : "Impossible d'analyser la commande vocale."
      onError?.(message)
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  const startListening = async () => {
    if (isProcessing) return false

    try {
      await recorder.startRecording()
      return true
    } catch (recordingError) {
      const message = recordingError instanceof Error
        ? recordingError.message
        : "Impossible de demarrer l'enregistrement vocal."
      onError?.(message)
      return false
    }
  }

  const stopListening = async () => {
    try {
      const recording = await recorder.stopRecording()
      return processRecording(recording)
    } catch (recordingError) {
      const message = recordingError instanceof Error
        ? recordingError.message
        : "Impossible d'arreter l'enregistrement vocal."
      onError?.(message)
      return null
    }
  }

  const toggleListening = async () => {
    if (isProcessing) return null
    return recorder.isRecording ? stopListening() : startListening()
  }

  return {
    isSupported: recorder.isSupported,
    isRecording: recorder.isRecording,
    isProcessing,
    audioLevel: recorder.audioLevel,
    recordingDurationMs: recorder.recordingDurationMs,
    lastIntent,
    startListening,
    stopListening,
    toggleListening,
  }
}
