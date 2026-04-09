import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Modal from '../common/Modal'
import { useAppContext } from '../../context/AppContext'
import { useCabinetId } from '../../hooks/useCabinetId'
import { getPatients, createRdv, updateRdv as apiUpdateRdv } from '../../lib/api'

const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30',
  '14:00','14:30','15:00','15:30','16:00','16:30',
  '17:00','17:30','18:00','18:30','19:00','19:30','20:00',
]

const initialForm = {
  patient_id: '',
  date: '',
  heure: '09:00',
  status: 'confirme',
  notes: '',
}

function AppointmentFormModal({ open, onClose, appointment, onSuccess }) {
  const { notify } = useAppContext()
  const { cabinetId } = useCabinetId()

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: getPatients,
    enabled: open,
  })

  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      if (appointment) {
        // Parse existing TIMESTAMPTZ back into date + time
        const dt = new Date(appointment.date_rdv)
        const datePart = !isNaN(dt)
          ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
          : ''
        const timePart = !isNaN(dt)
          ? `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
          : '09:00'

        setForm({
          patient_id: appointment.patient_id || '',
          date: datePart,
          heure: timePart,
          status: appointment.status || appointment.statut || 'confirme',
          notes: appointment.notes || '',
        })
      } else {
        setForm(initialForm)
      }
      setError(null)
    }
  }, [open, appointment])

  const title = appointment ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'

  const handleChange = (key, value) => setForm((c) => ({ ...c, [key]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    if (!form.patient_id) { setError('Veuillez sélectionner un patient.'); return }
    if (!form.date) { setError('Veuillez sélectionner une date.'); return }
    if (!form.heure) { setError("Veuillez sélectionner une heure."); return }

    // Combine date + time into TIMESTAMPTZ ISO string
    const dateTime = new Date(`${form.date}T${form.heure}:00`)
    if (isNaN(dateTime.getTime())) {
      setError('Date ou heure invalide.')
      return
    }
    const isoString = dateTime.toISOString()

    if (!cabinetId) {
      setError('Session expirée — reconnectez-vous.')
      return
    }

    setLoading(true)
    try {
      if (appointment) {
        await apiUpdateRdv(appointment.id, {
          patient_id: form.patient_id,
          date_rdv: isoString,
          status: form.status,
          notes: form.notes || null,
        })
      } else {
        await createRdv({
          patient_id: form.patient_id,
          cabinet_id: cabinetId,
          date_rdv: isoString,
          status: form.status || 'confirme',
          notes: form.notes || null,
          rappel_envoye: false,
        })
      }
      notify({ title: 'Succès', description: appointment ? 'RDV modifié.' : 'RDV créé.' })
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('AppointmentForm submit error:', err)
      setError(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-300 text-base text-slate-800'
  const labelClass = 'mb-2 block text-base font-medium text-slate-700'

  return (
    <Modal open={open} onClose={onClose} title={title} description="Ajoutez ou modifiez un rendez-vous du cabinet.">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {/* Patient */}
        <label className="block">
          <span className={labelClass}>Patient <span className="text-rose-500">*</span></span>
          <select value={form.patient_id} onChange={(e) => handleChange('patient_id', e.target.value)} className={inputClass}>
            <option value="">— Sélectionner un patient —</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Date */}
          <label className="block">
            <span className={labelClass}>Date <span className="text-rose-500">*</span></span>
            <input type="date" value={form.date} onChange={(e) => handleChange('date', e.target.value)} className={inputClass} />
          </label>

          {/* Heure — 30-min slots */}
          <label className="block">
            <span className={labelClass}>Heure <span className="text-rose-500">*</span></span>
            <select value={form.heure} onChange={(e) => handleChange('heure', e.target.value)} className={inputClass}>
              <option value="">Choisir l'heure</option>
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          {/* Status */}
          <label className="block">
            <span className={labelClass}>Statut</span>
            <select value={form.status} onChange={(e) => handleChange('status', e.target.value)} className={inputClass}>
              <option value="confirme">Confirmé</option>
              <option value="arrive">Arrivé</option>
              <option value="en_consultation">En consultation</option>
              <option value="termine">Terminé</option>
              <option value="absent">Absent</option>
              <option value="annule">Annulé</option>
            </select>
          </label>
        </div>

        {/* Notes */}
        <label className="block">
          <span className={labelClass}>Notes</span>
          <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={3} className={inputClass + ' resize-none'} />
        </label>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            ⚠️ {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="interactive rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base font-medium text-slate-700">Annuler</button>
          <button type="submit" disabled={loading} className="interactive inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-medium text-white disabled:opacity-70">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</> : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AppointmentFormModal
