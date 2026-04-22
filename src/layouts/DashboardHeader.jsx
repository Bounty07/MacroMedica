import { Bell, Mic, Search, User, Settings, LogOut, Menu, Loader2, Calendar, Stethoscope } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

function DashboardHeader({
  onMenuClick,
  search,
  setSearch,
  searchResults,
  searchLoading,
  voiceCommandRecording,
  voiceCommandProcessing,
  voiceCommandSupported,
  onToggleVoiceCommand,
  patientContext = false,
}) {
  const navigate = useNavigate()
  const { profile, currentUser, logout } = useAppContext()

  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const searchRef = useRef(null)
  const inputRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Open dropdown when results come in
  useEffect(() => {
    if (search?.length >= 1 && searchResults && (searchResults.patients?.length || searchResults.rdv?.length || searchResults.consultations?.length)) {
      setIsOpen(true)
    }
  }, [searchResults, search])

  const userName = profile?.nom_complet || currentUser?.name || 'Utilisateur'
  const userRole = profile?.role || currentUser?.role || 'Staff'
  const initials = userName.slice(0, 2).toUpperCase()

  const hasAnyResults = searchResults && (searchResults.patients?.length || searchResults.rdv?.length || searchResults.consultations?.length)
  const showDropdown = isOpen && search?.length >= 1
  const accentBorder = patientContext ? 'border-blue-200' : 'border-teal-200'
  const accentSoftBorder = patientContext ? 'border-blue-300' : 'border-teal-300'
  const accentRing = patientContext ? 'ring-blue-100' : 'ring-teal-100'
  const accentText = patientContext ? 'text-blue-700' : 'text-teal-700'
  const accentBg = patientContext ? 'bg-blue-50' : 'bg-teal-50'
  const accentFill = patientContext ? 'bg-blue-600' : 'bg-teal-600'
  const accentHoverBorder = patientContext ? 'hover:border-blue-200' : 'hover:border-teal-200'
  const accentHoverText = patientContext ? 'hover:text-blue-700' : 'hover:text-teal-700'
  const focusAccentBorder = patientContext ? 'focus-within:border-blue-300' : 'focus-within:border-teal-300'
  const headerStyle = patientContext
    ? { background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(12px)', borderBottomColor: 'rgba(226,232,240,0.95)' }
    : { background: 'rgba(240,253,249,0.9)', backdropFilter: 'blur(12px)', borderBottomColor: 'rgba(13,148,136,0.08)' }

  const handleResultClick = (path) => {
    navigate(path)
    setSearch('')
    setIsOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 flex h-[72px] items-center justify-between border-b px-5 py-2 md:px-9" style={headerStyle}>

      <div className="flex flex-1 items-center gap-4">
        <button type="button" onClick={onMenuClick} className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition ${accentHoverBorder} ${accentHoverText} lg:hidden`}>
          <Menu className="h-5 w-5" />
        </button>

        {/* ── Search ── */}
        <div ref={searchRef} className="relative w-full max-w-lg">
          <label className={`flex h-11 items-center gap-3 rounded-2xl border bg-white px-5 shadow-sm transition ${isOpen ? `${accentSoftBorder} ring-2 ${accentRing}` : `border-slate-200 ${focusAccentBorder}`}`}>
            {searchLoading ? <Loader2 className={`h-5 w-5 animate-spin ${patientContext ? 'text-blue-600' : 'text-teal-600'}`} /> : <Search className="h-5 w-5 text-slate-400" />}
            <input
              ref={inputRef}
              type="text"
              value={search || ''}
              onChange={(e) => { setSearch(e.target.value); if (e.target.value.length >= 1) setIsOpen(true) }}
              onFocus={() => { if (search?.length >= 1) setIsOpen(true) }}
              placeholder="Nom, prénom, téléphone..."
              className="h-full w-full border-0 bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400"
            />
            {search?.length > 0 && (
              <button type="button" onClick={() => { setSearch(''); setIsOpen(false); inputRef.current?.focus() }} className="text-slate-400 hover:text-slate-600 outline-none">
                <span className="text-lg leading-none">×</span>
              </button>
            )}
          </label>

          {/* ── Results dropdown ── */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[520px] overflow-y-auto overflow-x-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">

              {searchLoading && !hasAnyResults ? (
                <div className="p-4 space-y-3">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-12 w-full animate-pulse rounded-xl bg-slate-50" />
                  <div className="h-12 w-full animate-pulse rounded-xl bg-slate-50" />
                </div>
              ) : !hasAnyResults ? (
                <div className="p-6 text-center">
                  <p className="mb-2 text-3xl">🔍</p>
                  <p className="text-sm font-semibold text-slate-700">Aucun résultat pour "{search}"</p>
                  <p className="mt-1 text-xs text-slate-500">Essayez: nom complet, initiales (ex: AB), CIN (AB123456) ou téléphone</p>
                </div>
              ) : (
                <>
                  {/* Patients */}
                  {searchResults.patients?.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <User className="h-3.5 w-3.5" /> Patients ({searchResults.patients.length})
                      </div>
                      {searchResults.patients.map((p) => (
                        <button key={p.id} type="button" onClick={() => handleResultClick(p.path)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-teal-50/50 border-b border-slate-50">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                            {p.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">{p.label}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                              <span className="truncate">{p.subtitle}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* RDV */}
                  {searchResults.rdv?.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <Calendar className="h-3.5 w-3.5" /> Rendez-vous ({searchResults.rdv.length})
                      </div>
                      {searchResults.rdv.map((r) => (
                        <button key={r.id} type="button" onClick={() => handleResultClick(r.path)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-teal-50/50 border-b border-slate-50">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">{r.label}</p>
                            <p className="text-xs text-slate-500 truncate">{r.subtitle}</p>
                          </div>
                          {r.badge && (
                            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.badgeClass}`}>{r.badge}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Consultations */}
                  {searchResults.consultations?.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <Stethoscope className="h-3.5 w-3.5" /> Consultations ({searchResults.consultations.length})
                      </div>
                      {searchResults.consultations.map((c) => (
                        <button key={c.id} type="button" onClick={() => handleResultClick(c.path)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-teal-50/50 border-b border-slate-50">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                            <Stethoscope className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">{c.label}</p>
                            <p className="text-xs text-slate-500 truncate">{c.subtitle}</p>
                          </div>
                          {c.badge && (
                            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.badgeClass}`}>{c.badge}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-5">
        <div className="relative">
          <button
            type="button"
            onClick={onToggleVoiceCommand}
            disabled={voiceCommandProcessing}
            className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl border bg-white shadow-sm transition ${
              voiceCommandRecording
                ? 'border-rose-300 text-rose-700'
                : voiceCommandProcessing
                  ? 'border-amber-300 text-amber-700'
                : 'border-slate-200 text-slate-700 hover:border-teal-200 hover:text-teal-700'
            } ${!voiceCommandSupported ? 'opacity-60' : ''}`}
            title={
              !voiceCommandSupported
                ? 'Commande vocale indisponible sur cet appareil'
                : voiceCommandProcessing
                  ? 'Analyse vocale en cours'
                  : voiceCommandRecording
                    ? "Arreter et envoyer l'audio"
                    : 'Demarrer une commande vocale'
            }
          >
            {voiceCommandProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
            {voiceCommandRecording || voiceCommandProcessing ? (
              <span className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ${
                voiceCommandRecording ? 'bg-rose-500 animate-pulse' : 'bg-amber-400 animate-pulse'
              }`} />
            ) : null}
          </button>
        </div>

        <div className="relative">
          <button type="button" onClick={() => setShowNotifications(!showNotifications)} className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-teal-700">
            <Bell className="h-6 w-6" />
          </button>
        </div>

        <div className="relative">
          <button type="button" onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-1 pl-3 shadow-sm hover:border-teal-200 transition">
            <div className="hidden text-right sm:block">
              <p className="text-base font-semibold text-slate-900">{userName}</p>
              <p className="text-sm text-slate-500">{userRole}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-base font-bold text-white">
              {initials}
            </div>
          </button>
          {showProfileMenu ? (
            <div className="surface-card absolute right-0 top-[calc(100%+0.5rem)] z-20 w-56 p-2 shadow-lg ring-1 ring-slate-100 rounded-2xl bg-white">
              <button type="button" onClick={() => { setShowProfileMenu(false); navigate('/dashboard/settings') }} className="interactive flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base text-slate-700 hover:bg-slate-50">
                <User className="h-4 w-4" /> Profil
              </button>
              <button type="button" onClick={() => { setShowProfileMenu(false); navigate('/dashboard/settings') }} className="interactive flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base text-slate-700 hover:bg-slate-50">
                <Settings className="h-4 w-4" /> Paramètres
              </button>
              <button type="button" onClick={() => { setShowProfileMenu(false); logout(); navigate('/') }} className="interactive flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base text-rose-700 hover:bg-rose-50">
                <LogOut className="h-4 w-4" /> Déconnexion
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
