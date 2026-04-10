import { Bot, FileSearch, Loader2, Mic, PauseCircle, Sparkles, Stethoscope, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMatch } from 'react-router-dom'
import AiConsultantCard from '../ui/AiConsultantCard'
import AiLabReaderCard from '../ui/AiLabReaderCard'
import AiScribeCard from '../ui/AiScribeCard'
import { getPatientById } from '../../lib/api'

const TOOLS = [
  {
    id: 'scribe',
    label: 'AI Scribe',
    description: 'Dictee et reformulation clinique',
    icon: Stethoscope,
    render: (context) => <AiScribeCard {...context} />,
  },
  {
    id: 'lab-reader',
    label: 'Lab Reader',
    description: 'Analyse de bilans et documents',
    icon: FileSearch,
    render: () => <AiLabReaderCard />,
  },
  {
    id: 'insights',
    label: 'Practice Insights',
    description: 'Lecture operationnelle du cabinet',
    icon: Sparkles,
    render: () => <AiConsultantCard />,
  },
]

function ToolTab({ item, active, onClick }) {
  const Icon = item.icon

  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      className={`rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${active ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-black tracking-[-0.02em]">{item.label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
        </div>
      </div>
    </button>
  )
}

export default function FloatingAiHub({
  isProcessing = false,
  voiceCommandSupported = true,
  voiceCommandRecording = false,
  voiceCommandProcessing = false,
  onToggleVoiceCommand,
}) {
  const [open, setOpen] = useState(false)
  const [activeTool, setActiveTool] = useState(TOOLS[0].id)
  const patientRouteMatch = useMatch('/patients/:id')
  const patientConsultationRouteMatch = useMatch('/patients/:id/consultations/:consultationId')
  const patientInfoRouteMatch = useMatch('/patients/:id/info')
  const activePatientId =
    patientConsultationRouteMatch?.params.id ||
    patientInfoRouteMatch?.params.id ||
    patientRouteMatch?.params.id ||
    null
  const { data: activePatient, isLoading: isLoadingActivePatient } = useQuery({
    queryKey: ['ai-hub-active-patient', activePatientId],
    queryFn: () => getPatientById(activePatientId),
    enabled: open && Boolean(activePatientId),
    staleTime: 60_000,
    retry: 1,
  })

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open])

  const activeToolConfig = useMemo(
    () => TOOLS.find((item) => item.id === activeTool) || TOOLS[0],
    [activeTool],
  )
  const aiToolContext = useMemo(() => ({
    activePatientId,
    activePatientRecord: activePatient || null,
    patientLocked: Boolean(activePatientId),
  }), [activePatient, activePatientId])
  const voiceStatus = voiceCommandProcessing
    ? 'Analyse de la commande en cours...'
    : voiceCommandRecording
      ? 'Enregistrement actif. Recliquez pour envoyer.'
      : voiceCommandSupported
        ? 'Agent vocal pret pour le Darija, le francais et l anglais.'
        : "Le micro n'est pas disponible sur cet appareil."

  return (
    <>
      <style>{`
        @keyframes ai-hub-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.35), 0 22px 50px rgba(15, 23, 42, 0.18); }
          50% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0.08), 0 26px 55px rgba(15, 23, 42, 0.22); }
        }
      `}</style>

      {open ? (
        <div className="fixed inset-0 z-[72] bg-slate-950/35 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-[73] w-full max-w-[780px] transform border-r border-slate-200 bg-[linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(255,255,255,0.98))] shadow-[0_30px_80px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-[105%]'
        }`}
      >
        <div className="flex h-full flex-col" onClick={(event) => event.stopPropagation()}>
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                  <Bot className="h-3.5 w-3.5" />
                  AI Hub
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-slate-950">Robot MacroMedica</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Retrouvez vos outils IA dans un seul espace, accessibles depuis n importe quel onglet.
                </p>
                <div className="mt-5 rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Agent vocal</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">Tony Stark Mode</p>
                      <p className="mt-1 text-xs leading-6 text-slate-500">{voiceStatus}</p>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleVoiceCommand}
                      disabled={!voiceCommandSupported || voiceCommandProcessing}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                        voiceCommandRecording
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : voiceCommandProcessing
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
                      } disabled:opacity-50`}
                    >
                      {voiceCommandProcessing ? (
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      ) : voiceCommandRecording ? (
                        <PauseCircle className="h-4.5 w-4.5" />
                      ) : (
                        <Mic className="h-4.5 w-4.5" />
                      )}
                      {voiceCommandRecording ? 'Stop' : 'Parler'}
                    </button>
                  </div>
                </div>
                <div className="mt-4 rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Contexte patient</p>
                  {activePatientId ? (
                    isLoadingActivePatient ? (
                      <div className="mt-3 space-y-2">
                        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                      </div>
                    ) : (
                      <>
                        <div className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                          Patient actif
                        </div>
                        <p className="mt-3 text-sm font-bold text-slate-900">
                          {activePatient?.nom} {activePatient?.prenom}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-slate-500">
                          Ce patient est detecte automatiquement depuis la page ouverte. Les outils cliniques utiliseront ce contexte sans demander une nouvelle selection.
                        </p>
                      </>
                    )
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Aucun dossier patient actif. Le Hub reste disponible en mode global avec selection manuelle si necessaire.
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[280px_1fr]">
            <div className="border-r border-slate-200 bg-slate-50/80 p-4">
              <div className="space-y-3">
                {TOOLS.map((item) => (
                  <ToolTab key={item.id} item={item} active={item.id === activeTool} onClick={setActiveTool} />
                ))}
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto bg-white">
              {activeToolConfig.render(aiToolContext)}
            </div>
          </div>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-[74] flex h-16 w-16 items-center justify-center rounded-full border border-white/70 bg-[linear-gradient(135deg,_#0f172a,_#0b3b36_65%,_#10b981)] text-white shadow-[0_22px_50px_rgba(15,23,42,0.18)] transition hover:scale-[1.04] relative"
        style={isProcessing ? { animation: 'ai-hub-pulse 1.4s ease-in-out infinite' } : undefined}
        aria-label="Ouvrir le hub IA"
      >
        <Bot className="h-7 w-7" />
        {voiceCommandRecording ? <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-rose-500 ring-4 ring-white/30" /> : null}
      </button>
    </>
  )
}
