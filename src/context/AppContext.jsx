import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { RDV_STATUSES } from '../lib/workflow'

const AppContext = createContext(null)
const PREFS_KEY = 'macromedica-notification-prefs'

const buildId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

// Role mapping logic moved directly to App.jsx RootRedirect

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  const [patients, setPatients] = useState([])
  const [rdvList, setRdvList] = useState([])
  const [consultations, setConsultations] = useState([])
  const cabinetId = profile?.cabinet_id

  // Derived waiting list from rdvList
  const waitingList = useMemo(() => {
    return rdvList
      .filter(r => r.status === RDV_STATUSES.ARRIVED || r.status === RDV_STATUSES.IN_CONSULTATION)
      .sort((a, b) => new Date(a.date_rdv).getTime() - new Date(b.date_rdv).getTime())
  }, [rdvList])

  const [toasts, setToasts] = useState([])
  const [globalModal, setGlobalModal] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY) || '{"email":true,"browser":true,"reminders":true}')
    } catch {
      return { email: true, browser: true, reminders: true }
    }
  })

  const currentUserIdRef = useRef(null)
  const initDoneRef = useRef(false)

  // Fetch profile by user ID
  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, clinics(*)')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data
    } catch (err) {
      console.error('Profile fetch error:', err)
      return null
    }
  }, [])

  const loadPatients = useCallback(async (cId) => {
    const { data } = await supabase.from('patients').select('*').eq('cabinet_id', cId).order('created_at', { ascending: false })
    setPatients(data || [])
  }, [])

  const loadRdv = useCallback(async (cId) => {
    const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'Africa/Casablanca' })
    const { data } = await supabase
      .from('rdv')
      .select(`*, patients(id, nom, prenom, telephone)`)
      .eq('cabinet_id', cId)
      .gte('date_rdv', `${today}T00:00:00`)
      .lte('date_rdv', `${today}T23:59:59`)
      .order('date_rdv', { ascending: true })
    setRdvList(data || [])
  }, [])

  const loadConsultations = useCallback(async (cId) => {
    const { data } = await supabase.from('consultations').select(`*, patients(nom, prenom)`).eq('cabinet_id', cId).order('date_consult', { ascending: false })
    setConsultations(data || [])
  }, [])

  // Handle a valid session — set user + profile + authenticated
  const handleSession = useCallback(async (session) => {
    if (!session?.user) {
      // No session — clear everything
      currentUserIdRef.current = null
      setUser(null)
      setProfile(null)
      setIsAuthenticated(false)
      return
    }

    // Skip if we already loaded this user
    if (currentUserIdRef.current === session.user.id) return

    const prof = await fetchProfile(session.user.id)
    
    // Always authenticate if we have a valid session
    currentUserIdRef.current = session.user.id
    setUser(session.user)
    setIsAuthenticated(true)

    if (prof) {
      setProfile(prof)
      if (prof.cabinet_id) {
         Promise.all([
           loadPatients(prof.cabinet_id),
           loadRdv(prof.cabinet_id),
           loadConsultations(prof.cabinet_id)
         ]).catch(console.error)
      }
    } else {
      // Profile not found yet (new signup) — build minimal profile from user metadata
      const meta = session.user.user_metadata || {}
      setProfile({
        id: session.user.id,
        nom_complet: meta.nom_complet || 'Utilisateur',
        role: 'docteur',
        cabinet_id: null,
        clinics: null
      })
    }
  }, [fetchProfile])

  useEffect(() => {
    // SINGLE source of truth: getSession() on mount, then listen for changes.
    // We do NOT set isAuthenticated until the profile is successfully fetched.
    // This prevents the "stale session → redirect to dashboard → fail → back to login" loop.
    
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await handleSession(session)
      initDoneRef.current = true
      setIsInitializing(false)
    }).catch(() => {
      initDoneRef.current = true
      setIsInitializing(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignore events that fire before getSession has completed
        // This prevents the race condition
        if (!initDoneRef.current) return

        if (event === 'SIGNED_IN') {
          await handleSession(session)
        } else if (event === 'SIGNED_OUT') {
          currentUserIdRef.current = null
          setUser(null)
          setProfile(null)
          setIsAuthenticated(false)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Only update user object, don't re-fetch profile
          setUser(session.user)
        }
        // Ignore INITIAL_SESSION — already handled by getSession
      }
    )

    return () => subscription.unsubscribe()
  }, [handleSession])

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(notificationPrefs))
  }, [notificationPrefs])

  useEffect(() => {
    if (!cabinetId) return

    // Centralized realtime sync for the dashboard / waiting room
    const channel = supabase
      .channel('app-global-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rdv', filter: `cabinet_id=eq.${cabinetId}` },
        () => loadRdv(cabinetId)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [cabinetId, loadRdv])

  const pushToast = (toast) => {
    const id = buildId('toast')
    setToasts((current) => [...current, { id, tone: toast.tone || 'success', ...toast }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 3200)
  }

  // Login: sign in, then immediately fetch profile so navigation can happen
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      if (error.message.includes('Invalid')) {
        throw new Error('Email ou mot de passe incorrect')
      }
      if (error.message.includes('network')) {
        throw new Error('Problème de connexion réseau')
      }
      throw new Error(error.message)
    }
    // Set state immediately so the caller can navigate
    if (data.user) {
      const prof = await fetchProfile(data.user.id)
      currentUserIdRef.current = data.user.id
      setUser(data.user)
      setIsAuthenticated(true)

      if (prof) {
        setProfile(prof)
        if (prof.cabinet_id) {
           Promise.all([
             loadPatients(prof.cabinet_id),
             loadRdv(prof.cabinet_id),
             loadConsultations(prof.cabinet_id)
           ]).catch(console.error)
        }
      } else {
        // Profile not found — build minimal profile from user metadata
        const meta = data.user.user_metadata || {}
        setProfile({
          id: data.user.id,
          nom_complet: meta.nom_complet || 'Utilisateur',
          role: 'docteur',
          cabinet_id: null,
          clinics: null
        })
      }
    }
    pushToast({ title: 'Connexion réussie', description: `Bienvenue ${email}.` })
    return data
  }

  // Logout: clear everything and hard redirect
  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Logout error:', err)
    }
    currentUserIdRef.current = null
    setUser(null)
    setProfile(null)
    setIsAuthenticated(false)
    localStorage.removeItem(PREFS_KEY)
    window.location.href = '/'
  }

  const role = profile?.role || 'docteur'

  const value = useMemo(() => ({
    user,
    profile,
    role,
    cabinet: profile?.clinics,
    cabinetId: profile?.cabinet_id,
    currentUser: profile
      ? { name: profile.nom_complet, role: profile.role }
      : { name: 'Utilisateur', role: 'Staff' },
    isAuthenticated,
    isInitializing,
    toasts,
    globalModal,
    confirmDialog,
    notificationPrefs,

    login,
    logout,

    setNotificationPrefs,
    openGlobalModal(type, payload = {}) { setGlobalModal({ type, payload }) },
    closeGlobalModal() { setGlobalModal(null) },
    requestConfirmation(config) { setConfirmDialog(config) },
    closeConfirmation() { setConfirmDialog(null) },
    dismissToast(id) { setToasts((c) => c.filter((t) => t.id !== id)) },
    notify(toast) { pushToast(toast) },

    // Fallbacks for un-migrated components
    patients,
    rdvList,
    appointments: rdvList,
    consultations,
    waitingList,
    invoices: [],
    staff: [],
    getPatientName: () => 'Patient...',

    refreshPatients: () => profile?.cabinet_id && loadPatients(profile.cabinet_id),
    refreshRdv: () => profile?.cabinet_id && loadRdv(profile.cabinet_id),
    refreshConsultations: () => profile?.cabinet_id && loadConsultations(profile.cabinet_id),
    refreshAll: () => {
      if (profile?.cabinet_id) {
        loadPatients(profile.cabinet_id)
        loadRdv(profile.cabinet_id)
        loadConsultations(profile.cabinet_id)
      }
    },
  }), [user, profile, role, isAuthenticated, isInitializing, toasts, globalModal, confirmDialog, notificationPrefs, patients, rdvList, consultations, waitingList])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppContext must be used within AppProvider')
  return context
}

export const useApp = useAppContext
