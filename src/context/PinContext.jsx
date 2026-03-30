import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppContext } from './AppContext'

const PinContext = createContext({})

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000 // 15 minutes

export function PinProvider({ children }) {
  const { cabinetId } = useAppContext()
  const [pinUnlockedAt, setPinUnlockedAt] = useState(null)
  
  // Fonction pour valider le PIN via Edge Function
  // Fonction pour valider le PIN via localStorage
  const unlockPin = async (pinCode) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Non connecté")
      
      const pinEnabled = localStorage.getItem(`pin_enabled_${session.user.id}`)
      const storedHash = localStorage.getItem(`pin_hash_${session.user.id}`)

      if (pinEnabled !== 'true' || !storedHash) {
        // If pin wasn't properly configured but we somehow hit the lock screen, automatically unlock
        setPinUnlockedAt(Date.now())
        return true
      }

      const expectedHash = btoa(`${session.user.id}:${pinCode}:macromedica`)
      
      if (storedHash !== expectedHash) {
        throw new Error("PIN incorrect")
      }
      
      setPinUnlockedAt(Date.now())
      return true
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const lockPin = useCallback(() => {
    setPinUnlockedAt(null)
  }, [])

  const isUnlocked = useCallback(() => {
    if (!pinUnlockedAt) return false
    if (Date.now() - pinUnlockedAt > INACTIVITY_LIMIT_MS) {
      setPinUnlockedAt(null)
      return false
    }
    return true
  }, [pinUnlockedAt])

  // Gérer l'inactivité pour prolonger le PIN si on interagit
  useEffect(() => {
    if (!pinUnlockedAt) return

    const resetTimer = () => {
      if (pinUnlockedAt) {
         setPinUnlockedAt(Date.now()) // Rafraîchit l'expiration
      }
    }

    // Capture user interaction
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }))

    // Vérification en tâche de fond pour l'expiration au bout de 15m
    const interval = setInterval(() => {
       if (pinUnlockedAt && Date.now() - pinUnlockedAt > INACTIVITY_LIMIT_MS) {
          setPinUnlockedAt(null)
       }
    }, 60000) // Vérifie chaque minute

    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer))
      clearInterval(interval)
    }
  }, [pinUnlockedAt])

  return (
    <PinContext.Provider value={{ isUnlocked, unlockPin, lockPin }}>
      {children}
    </PinContext.Provider>
  )
}

export function usePin() {
  return useContext(PinContext)
}
