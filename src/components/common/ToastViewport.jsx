import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { useAppContext } from '../../context/AppContext'

function ToastViewport() {
  const { toasts, dismissToast } = useAppContext()

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto surface-card flex items-start gap-3 p-4">
          <div className={toast.tone === 'error' ? 'text-rose-600' : 'text-teal-600'}>
            {toast.tone === 'error' ? <CircleAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-slate-950">{toast.title}</p>
            {toast.description ? <p className="mt-1 text-base text-slate-500">{toast.description}</p> : null}
          </div>
          <button type="button" onClick={() => dismissToast(toast.id)} className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default ToastViewport
