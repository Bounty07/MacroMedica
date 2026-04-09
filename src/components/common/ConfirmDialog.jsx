import Modal from './Modal'

function ConfirmDialog({ open, title, description, onCancel, onConfirm, confirmLabel = 'Confirmer' }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} description={description} width="max-w-lg">
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="interactive rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base font-medium text-slate-700">
          Annuler
        </button>
        <button type="button" onClick={onConfirm} className="interactive rounded-2xl bg-rose-600 px-5 py-3 text-base font-medium text-white">
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
