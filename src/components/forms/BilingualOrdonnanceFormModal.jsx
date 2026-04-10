import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Modal from '../common/Modal'
import { useAppContext } from '../../context/AppContext'
import { useCabinetId } from '../../hooks/useCabinetId'
import { createConsultation, createDocument, getPatients } from '../../lib/api'
import { createEmptyPrescriptionMedication } from '../../lib/prescriptionUtils'
import { supabase } from '../../lib/supabase'

export default function BilingualOrdonnanceFormModal({
  open,
  onClose,
  onSuccess,
  initialPatientId = '',
  initialDate = '',
  initialMedications = null,
  initialInstructions = '',
}) {
  const { notify, profile, cabinet, specialiteConfig } = useAppContext()
  const { cabinetId } = useCabinetId()

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: getPatients,
    enabled: open,
  })

  const [form, setForm] = useState({
    patient_id: '',
    date: new Date().toISOString().split('T')[0],
    ville: '',
    medicaments: [createEmptyPrescriptionMedication()],
    instructions: '',
    instructions_en: '',
    signe: true,
    nomMedecin: '',
    specialite: '',
    adresse: '',
    telephone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    setForm({
      patient_id: initialPatientId || '',
      date: initialDate || new Date().toISOString().split('T')[0],
      ville: cabinet?.adresse?.split(',')[0] || cabinet?.ville || '',
      medicaments: initialMedications?.length ? initialMedications : [createEmptyPrescriptionMedication()],
      instructions: initialInstructions || '',
      instructions_en: '',
      signe: true,
      nomMedecin: profile?.nom_complet || '',
      specialite: specialiteConfig.label,
      adresse: cabinet?.adresse || '',
      telephone: cabinet?.telephone || '',
    })
    setError('')
  }, [open, profile, cabinet, specialiteConfig.label, initialDate, initialInstructions, initialMedications, initialPatientId])

  const handleMedicationChange = (id, key, value) => {
    setForm((current) => ({
      ...current,
      medicaments: current.medicaments.map((medication) => (
        medication.id === id ? { ...medication, [key]: value } : medication
      )),
    }))
  }

  const addMedication = () => {
    setForm((current) => ({
      ...current,
      medicaments: [...current.medicaments, createEmptyPrescriptionMedication()],
    }))
  }

  const removeMedication = (id) => {
    setForm((current) => ({
      ...current,
      medicaments: current.medicaments.length > 1
        ? current.medicaments.filter((medication) => medication.id !== id)
        : current.medicaments,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.patient_id) {
      setError('Selectionnez un patient.')
      return
    }

    if (!form.medicaments[0].nom.trim()) {
      setError('Ajoutez au moins un medicament en francais.')
      return
    }

    if (!cabinetId) {
      setError('Cabinet introuvable. Reconnectez-vous.')
      return
    }

    setLoading(true)

    try {
      const selectedPatient = patients.find((patient) => patient.id === form.patient_id)
      const medicaments = form.medicaments.filter((medication) => medication.nom.trim())

      const consultation = await createConsultation({
        cabinet_id: cabinetId,
        patient_id: form.patient_id,
        montant: 0,
        statut: 'paye',
        date_consult: form.date,
        notes: JSON.stringify({
          type: 'ordonnance',
          language_mode: 'fr-en',
          medicaments,
          instructions: form.instructions,
          instructions_en: form.instructions_en,
          ville: form.ville,
          signe: form.signe,
          medecin: form.nomMedecin,
          specialite: form.specialite,
          adresse: form.adresse,
          telephone: form.telephone,
        }),
      })

      await createDocument({
        cabinet_id: cabinetId,
        patient_id: form.patient_id,
        consultation_id: consultation.id,
        type_document: 'ordonnance',
        nom_fichier: `ordonnance_${selectedPatient?.nom || 'patient'}_${selectedPatient?.prenom || ''}_${form.date}.pdf`.replace(/\s+/g, '_'),
        storage_path: 'pending',
      })

      try {
        supabase.functions.invoke('generate-pdf', {
          body: {
            type_document: 'ordonnance',
            patient_id: form.patient_id,
            cabinet_id: cabinetId,
            consultation_id: consultation.id,
          },
        }).catch(() => {})
      } catch {
        // Optional background generation only.
      }

      notify({
        title: 'Ordonnance enregistree',
        description: 'La version bilingue francais / english est prete.',
      })
      onSuccess?.()
      onClose()
    } catch (submitError) {
      console.error('Bilingual ordonnance submit error:', submitError)
      setError(submitError?.message || "Erreur lors de l'enregistrement de l'ordonnance.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle ordonnance bilingue"
      description="Renseignez la prescription en francais et en english, puis imprimez-la en version bilingue."
      width="max-w-5xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
          <p className="mb-4 text-base font-semibold text-slate-800">En-tete du document</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">Nom du medecin</span>
              <input
                value={form.nomMedecin}
                onChange={(event) => setForm((current) => ({ ...current, nomMedecin: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">Specialite</span>
              <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
                {form.specialite || 'Specialite non configuree'}
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">Adresse du cabinet</span>
              <input
                value={form.adresse}
                onChange={(event) => setForm((current) => ({ ...current, adresse: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">Telephone</span>
              <input
                value={form.telephone}
                onChange={(event) => setForm((current) => ({ ...current, telephone: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-base font-medium text-slate-700">Patient *</span>
            <select
              value={form.patient_id}
              onChange={(event) => setForm((current) => ({ ...current, patient_id: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-300"
            >
              <option value="">Rechercher un patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.prenom} {patient.nom} {patient.telephone ? `(${patient.telephone})` : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-2 block text-base font-medium text-slate-700">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-teal-300"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-base font-medium text-slate-700">Ville</span>
              <input
                type="text"
                value={form.ville}
                onChange={(event) => setForm((current) => ({ ...current, ville: event.target.value }))}
                placeholder="Ville"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-teal-300"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <span className="block text-base font-medium text-slate-700">Medicaments / Medications</span>
          {form.medicaments.map((medication, index) => (
            <div key={medication.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-500">
                    {index + 1}
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Traitement bilingue</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeMedication(medication.id)}
                  className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 text-slate-400 transition hover:border-red-200 hover:text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-[110px_1fr_1fr_180px]">
                <div className="flex items-center rounded-2xl bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Francais
                </div>
                <input
                  value={medication.nom}
                  onChange={(event) => handleMedicationChange(medication.id, 'nom', event.target.value)}
                  placeholder="Nom du medicament"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal-300"
                />
                <input
                  value={medication.posologie}
                  onChange={(event) => handleMedicationChange(medication.id, 'posologie', event.target.value)}
                  placeholder="Posologie"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal-300"
                />
                <input
                  value={medication.duree}
                  onChange={(event) => handleMedicationChange(medication.id, 'duree', event.target.value)}
                  placeholder="Duree"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal-300"
                />
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[110px_1fr_1fr_180px]">
                <div className="flex items-center rounded-2xl bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  English
                </div>
                <input
                  value={medication.nom_en}
                  onChange={(event) => handleMedicationChange(medication.id, 'nom_en', event.target.value)}
                  placeholder="Medication name"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal-300"
                />
                <input
                  value={medication.posologie_en}
                  onChange={(event) => handleMedicationChange(medication.id, 'posologie_en', event.target.value)}
                  placeholder="Directions"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal-300"
                />
                <input
                  value={medication.duree_en}
                  onChange={(event) => handleMedicationChange(medication.id, 'duree_en', event.target.value)}
                  placeholder="Duration"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal-300"
                />
              </div>
            </div>
          ))}

          <button type="button" onClick={addMedication} className="interactive ml-8 flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700">
            <Plus className="h-4 w-4" />
            Ajouter un medicament
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-base font-medium text-slate-700">Instructions supplementaires (Francais)</span>
            <textarea
              value={form.instructions}
              onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-300"
              placeholder="A prendre au milieu du repas, etc."
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-base font-medium text-slate-700">Additional instructions (English)</span>
            <textarea
              value={form.instructions_en}
              onChange={(event) => setForm((current) => ({ ...current, instructions_en: event.target.value }))}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-300"
              placeholder="Take with food, keep hydrated, etc."
            />
          </label>
        </div>

        <div className="flex items-center gap-3 rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-100">
          <input
            type="checkbox"
            id="signe"
            checked={form.signe}
            onChange={(event) => setForm((current) => ({ ...current, signe: event.target.checked }))}
            className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
          />
          <label htmlFor="signe" className="cursor-pointer select-none text-base font-medium text-slate-700">
            Apposer ma signature sur le document
          </label>
          {form.signe ? (
            <blockquote className="ml-auto pr-4 font-[cursive] text-lg italic text-slate-800">
              Dr. {form.nomMedecin.split(' ').pop()}
            </blockquote>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="interactive rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base font-medium text-slate-700">
            Annuler
          </button>
          <button type="submit" disabled={loading} className="interactive inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-medium text-white disabled:opacity-70">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : 'Generer l ordonnance'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
