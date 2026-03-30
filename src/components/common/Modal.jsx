import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

function Modal({ open, title, description, children, onClose, width = 'max-w-2xl' }) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 py-6" onMouseDown={onClose}>
      <div className={`surface-card relative max-h-[90vh] w-full overflow-y-auto ${width}`} onMouseDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-teal-200 hover:text-teal-700"
        >
          <X className="h-4 w-4" />
        </button>
        {(title || description) ? (
          <div className="border-b border-slate-100 px-6 py-5 pr-16">
            {title ? <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2> : null}
            {description ? <p className="mt-2 text-base text-slate-500">{description}</p> : null}
          </div>
        ) : null}
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export default Modal
