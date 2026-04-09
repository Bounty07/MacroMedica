import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Patient {
  id: string
  nom: string
  prenom: string
  telephone?: string
  date_naissance?: string
  cin?: string
  adresse?: string
  mutuelle?: string
  numero_cnss?: string
  antecedents?: string
  allergies?: string
  created_at: string
}

interface PatientForm {
  nom: string
  prenom: string
  telephone: string
  date_naissance: string
  cin: string
  adresse: string
  mutuelle: string
  numero_cnss: string
  antecedents: string
  allergies: string
}

const emptyForm: PatientForm = {
  nom: '', prenom: '', telephone: '', date_naissance: '',
  cin: '', adresse: '', mutuelle: '', numero_cnss: '',
  antecedents: '', allergies: ''
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<Patient | null>(null)
  const [form, setForm] = useState<PatientForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => { fetchPatients() }, [])

  async function fetchPatients() {
    setLoading(true)
    const { data } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
    setPatients(data ?? [])
    setLoading(false)
  }

  async function savePatient() {
    if (!form.nom.trim() || !form.prenom.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('cabinet_id')
      .eq('id', user?.id)
      .single()

    if (editId) {
      await supabase.from('patients').update(form).eq('id', editId)
    } else {
      await supabase.from('patients').insert({
        ...form,
        cabinet_id: profile?.cabinet_id
      })
    }

    setSaving(false)
    setShowForm(false)
    setForm(emptyForm)
    setEditId(null)
    fetchPatients()
  }

  function openEdit(patient: Patient) {
    setForm({
      nom: patient.nom,
      prenom: patient.prenom,
      telephone: patient.telephone ?? '',
      date_naissance: patient.date_naissance ?? '',
      cin: patient.cin ?? '',
      adresse: patient.adresse ?? '',
      mutuelle: patient.mutuelle ?? '',
      numero_cnss: patient.numero_cnss ?? '',
      antecedents: patient.antecedents ?? '',
      allergies: patient.allergies ?? ''
    })
    setEditId(patient.id)
    setShowForm(true)
    setShowDetail(null)
  }

  async function deletePatient(id: string) {
    if (!confirm('Supprimer ce patient ?')) return
    await supabase.from('patients').delete().eq('id', id)
    setShowDetail(null)
    fetchPatients()
  }

  const filtered = patients.filter(p =>
    `${p.nom} ${p.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
    p.telephone?.includes(search) ||
    p.cin?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Patients</h1>
            <p className="text-gray-500 text-sm mt-1">{patients.length} patient(s) enregistré(s)</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setForm(emptyForm); setEditId(null) }}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-medium"
          >
            + Nouveau patient
          </button>
        </div>

        {/* Recherche */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, téléphone ou CIN..."
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-gray-800"
        />

        {/* Liste patients */}
        {loading ? (
          <p className="text-gray-400 text-center py-8">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400">Aucun patient trouvé</p>
            <button
              onClick={() => { setShowForm(true); setForm(emptyForm) }}
              className="mt-4 text-sky-600 hover:underline text-sm"
            >
              Ajouter le premier patient
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(patient => (
              <div
                key={patient.id}
                onClick={() => setShowDetail(patient)}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex justify-between items-center hover:border-sky-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-sm">
                    {patient.prenom[0]}{patient.nom[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{patient.prenom} {patient.nom}</p>
                    <p className="text-sm text-gray-500">{patient.telephone ?? 'Pas de téléphone'}</p>
                  </div>
                </div>
                <div className="text-right">
                  {patient.mutuelle && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      {patient.mutuelle}
                    </span>
                  )}
                  {patient.allergies && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full ml-1">
                      Allergies
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                {editId ? 'Modifier le patient' : 'Nouveau patient'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'prenom', label: 'Prénom *', type: 'text' },
                { key: 'nom', label: 'Nom *', type: 'text' },
                { key: 'telephone', label: 'Téléphone', type: 'tel' },
                { key: 'date_naissance', label: 'Date de naissance', type: 'date' },
                { key: 'cin', label: 'CIN', type: 'text' },
                { key: 'numero_cnss', label: 'N° CNSS', type: 'text' },
                { key: 'mutuelle', label: 'Mutuelle / Assurance', type: 'text' },
                { key: 'adresse', label: 'Adresse', type: 'text' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={form[field.key as keyof PatientForm]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-800 text-sm"
                  />
                </div>
              ))}
            </div>

            {[
              { key: 'antecedents', label: 'Antécédents médicaux' },
              { key: 'allergies', label: 'Allergies' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                <textarea
                  rows={2}
                  value={form[field.key as keyof PatientForm]}
                  onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-800 text-sm resize-none"
                />
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={savePatient}
                disabled={saving || !form.nom.trim() || !form.prenom.trim()}
                className="flex-1 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 font-medium"
              >
                {saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail Patient */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold">
                  {showDetail.prenom[0]}{showDetail.nom[0]}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{showDetail.prenom} {showDetail.nom}</h2>
                  <p className="text-sm text-gray-500">{showDetail.telephone}</p>
                </div>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Date de naissance', value: showDetail.date_naissance },
                { label: 'CIN', value: showDetail.cin },
                { label: 'N° CNSS', value: showDetail.numero_cnss },
                { label: 'Mutuelle', value: showDetail.mutuelle },
                { label: 'Adresse', value: showDetail.adresse },
              ].map(item => item.value && (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            {showDetail.antecedents && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700">Antécédents médicaux</p>
                <p className="text-sm text-amber-800 mt-1">{showDetail.antecedents}</p>
              </div>
            )}

            {showDetail.allergies && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700">Allergies</p>
                <p className="text-sm text-red-800 mt-1">{showDetail.allergies}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => openEdit(showDetail)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Modifier
              </button>
              <button
                onClick={() => deletePatient(showDetail.id)}
                className="py-2.5 px-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}