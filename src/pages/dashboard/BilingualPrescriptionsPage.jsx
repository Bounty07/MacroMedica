import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Loader2, Printer, Search, Trash2 } from 'lucide-react'
import BilingualOrdonnanceFormModal from '../../components/forms/BilingualOrdonnanceFormModal'
import { AppButton, ContentCard } from '../../components/dashboard/DashboardPrimitives'
import { useAppContext } from '../../context/AppContext'
import { useCabinetId } from '../../hooks/useCabinetId'
import { deleteDocument, getOrdonnances } from '../../lib/api'
import { buildBilingualText } from '../../lib/prescriptionUtils'

function formatDate(dateStr) {
  if (!dateStr) return ''

  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Casablanca',
  })
}

function BilingualMedicationBlock({ medication, index }) {
  const name = buildBilingualText(medication.nom, medication.nom_en)
  const posology = buildBilingualText(medication.posologie, medication.posologie_en)
  const duration = buildBilingualText(medication.duree, medication.duree_en)

  return (
    <div className="flex items-baseline gap-4">
      <p className="w-6 text-base font-bold text-slate-400">{index + 1}.</p>
      <div>
        <p className="text-xl font-bold text-black">{name.french || '-'}</p>
        <p className="mt-1 text-base text-slate-700">
          <span className="font-semibold text-slate-500">EN:</span> {name.english || '-'}
        </p>
        <p className="mt-3 text-lg text-slate-800">
          <span className="font-semibold text-slate-500">FR:</span> {posology.french || '-'}
          {duration.french ? <span className="font-medium"> {' - '} {duration.french}</span> : null}
        </p>
        <p className="mt-1 text-base text-slate-700">
          <span className="font-semibold text-slate-500">EN:</span> {posology.english || '-'}
          {duration.english ? <span className="font-medium"> {' - '} {duration.english}</span> : null}
        </p>
      </div>
    </div>
  )
}

export default function BilingualPrescriptionsPage() {
  const { notify } = useAppContext()
  const { cabinetId } = useCabinetId()
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [printData, setPrintData] = useState(null)

  const { data: ordonnances, isLoading } = useQuery({
    queryKey: ['ordonnances', cabinetId],
    queryFn: () => getOrdonnances(cabinetId),
    enabled: Boolean(cabinetId),
  })

  const { mutate: handleDelete } = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      notify({
        title: 'Ordonnance supprimee',
        description: "L'ordonnance a ete retiree.",
      })
      queryClient.invalidateQueries({ queryKey: ['ordonnances', cabinetId] })
    },
  })

  const parsedOrdonnances = useMemo(() => {
    if (!ordonnances) return []

    return ordonnances.map((documentItem) => {
      let parsedData = {}

      try {
        if (documentItem.consultations?.notes) {
          parsedData = JSON.parse(documentItem.consultations.notes)
        }
      } catch {
        parsedData = {}
      }

      return {
        ...documentItem,
        parsedData,
      }
    })
  }, [ordonnances])

  const filteredOrdonnances = useMemo(() => {
    return parsedOrdonnances.filter((documentItem) => {
      const patientName = `${documentItem.patients?.nom || ''} ${documentItem.patients?.prenom || ''}`.toLowerCase()
      if (search && !patientName.includes(search.toLowerCase())) return false

      const docDate = new Date(documentItem.created_at)
      const now = new Date()

      if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(now.getDate() - 7)
        if (docDate < weekAgo) return false
      } else if (dateFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(now.getMonth() - 1)
        if (docDate < monthAgo) return false
      }

      return true
    })
  }, [dateFilter, parsedOrdonnances, search])

  const stats = useMemo(() => {
    const now = new Date()
    const monthAgo = new Date()
    monthAgo.setMonth(now.getMonth() - 1)
    const weekAgo = new Date()
    weekAgo.setDate(now.getDate() - 7)

    return {
      totalMonth: parsedOrdonnances.filter((item) => new Date(item.created_at) >= monthAgo).length,
      totalWeek: parsedOrdonnances.filter((item) => new Date(item.created_at) >= weekAgo).length,
      lastDate: parsedOrdonnances.length > 0 ? formatDate(parsedOrdonnances[0].created_at) : '-',
    }
  }, [parsedOrdonnances])

  const openPrintPreview = (documentItem) => {
    setPrintData({
      patient: `${documentItem.patients?.prenom || ''} ${documentItem.patients?.nom || ''}`.trim(),
      date: formatDate(documentItem.consultations?.date_consult || documentItem.created_at),
      ville: documentItem.parsedData?.ville || '',
      medicaments: documentItem.parsedData?.medicaments || [],
      instructions: documentItem.parsedData?.instructions || '',
      instructionsEn: documentItem.parsedData?.instructions_en || '',
      medecin: documentItem.parsedData?.medecin || '',
      specialite: documentItem.parsedData?.specialite || '',
      adresse: documentItem.parsedData?.adresse || '',
      telephone: documentItem.parsedData?.telephone || '',
      signe: documentItem.parsedData?.signe || false,
    })

    window.setTimeout(() => {
      window.print()
      window.setTimeout(() => setPrintData(null), 1000)
    }, 100)
  }

  if (isLoading) {
    return <div className="flex justify-center p-20"><Loader2 className="h-10 w-10 animate-spin text-teal-600" /></div>
  }

  return (
    <div className="space-y-8 print:m-0 print:p-0">
      <div className="print:hidden space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Ordonnances / Prescriptions bilingues</h1>
            <p className="mt-2 text-base text-slate-500">Creez et imprimez vos ordonnances en francais et en anglais.</p>
          </div>
          <AppButton onClick={() => setShowCreate(true)}>+ Nouvelle ordonnance</AppButton>
        </div>

        {parsedOrdonnances.length === 0 && !search ? (
          <div className="rounded-[24px] bg-white py-20 text-center shadow-sm ring-1 ring-slate-100">
            <div className="mb-4 text-6xl opacity-80">Prescription</div>
            <h3 className="text-xl font-bold text-slate-900">Aucune ordonnance</h3>
            <p className="mx-auto mt-2 max-w-sm text-slate-500">Creez votre premiere ordonnance bilingue pour la lier a un patient.</p>
            <div className="mt-8">
              <AppButton onClick={() => setShowCreate(true)}>+ Nouvelle ordonnance</AppButton>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <ContentCard>
                <p className="text-sm font-medium text-slate-500">Ordonnances ce mois</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalMonth}</p>
              </ContentCard>
              <ContentCard>
                <p className="text-sm font-medium text-slate-500">Cette semaine</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalWeek}</p>
              </ContentCard>
              <ContentCard>
                <p className="text-sm font-medium text-slate-500">Derniere creation</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.lastDate}</p>
              </ContentCard>
            </div>

            <ContentCard>
              <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex h-12 w-full max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition hover:border-slate-300 focus-within:border-teal-300 focus-within:ring-2 focus-within:ring-teal-100">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    type="text"
                    placeholder="Rechercher par patient..."
                    className="h-full w-full border-0 bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </label>
                <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-medium text-slate-700 outline-none hover:border-slate-300 focus:border-teal-300">
                  <option value="all">Toutes les dates</option>
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois</option>
                </select>
              </div>

              <div className="space-y-3">
                {filteredOrdonnances.map((documentItem) => {
                  const patientInitials = `${documentItem.patients?.prenom?.[0] || ''}${documentItem.patients?.nom?.[0] || ''}`.toUpperCase()

                  return (
                    <div key={documentItem.id} className="group interactive flex items-center justify-between rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm hover:border-slate-200">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-teal-50 text-base font-bold text-teal-700">
                          {patientInitials || 'P'}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-slate-900">{documentItem.patients?.prenom} {documentItem.patients?.nom}</p>
                          <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
                            <span>{formatDate(documentItem.created_at)}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>FR / EN</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-l border-slate-100 pl-4 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => openPrintPreview(documentItem)} title="Voir" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => openPrintPreview(documentItem)} title="Imprimer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition hover:bg-teal-100 hover:text-teal-700">
                            <Printer className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => { if (window.confirm('Supprimer cette ordonnance ?')) handleDelete(documentItem.id) }} title="Supprimer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {filteredOrdonnances.length === 0 && search ? (
                  <div className="py-10 text-center text-slate-500">Aucune ordonnance trouvee pour cette recherche.</div>
                ) : null}
              </div>
            </ContentCard>
          </>
        )}
      </div>

      {showCreate ? (
        <BilingualOrdonnanceFormModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['ordonnances'] })}
        />
      ) : null}

      {printData ? (
        <div className="ordonnance-print hidden print:block">
          <div className="mb-10 flex items-start justify-between border-b-[3px] border-slate-800 pb-4">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wide text-black">Dr. {printData.medecin}</h1>
              <p className="mt-1 text-lg text-slate-800">{printData.specialite}</p>
            </div>
            <div className="max-w-[250px] text-right text-sm leading-relaxed text-slate-700">
              <p>{printData.adresse}</p>
              <p className="mt-1 font-semibold">Tel: {printData.telephone}</p>
            </div>
          </div>

          <div className="mb-12 text-center">
            <h2 className="inline-block rounded-sm border-2 border-slate-800 px-10 py-3 text-3xl font-black uppercase tracking-[0.2em] text-black">
              Ordonnance / Prescription
            </h2>
          </div>

          <div className="mb-12 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 text-lg">
            <p className="font-medium text-black">
              <span className="mr-2 text-sm uppercase text-slate-500">Patient / Patient:</span>
              <b>{printData.patient}</b>
            </p>
            <p className="text-right font-medium text-black">
              <span className="mr-1 text-sm uppercase text-slate-500">Date / Le:</span> {printData.date}
              {printData.ville ? <span className="ml-4"><span className="mr-1 text-sm uppercase text-slate-500">Lieu / In:</span> {printData.ville}</span> : null}
            </p>
          </div>

          <div className="mb-16">
            <h3 className="mb-8 border-l-4 border-slate-300 pl-4 text-4xl font-bold italic text-slate-300">Rx / Treatment</h3>
            <div className="space-y-8 pl-8">
              {printData.medicaments.map((medication, index) => (
                <BilingualMedicationBlock key={`${medication.nom}-${index}`} medication={medication} index={index} />
              ))}
            </div>
          </div>

          {(printData.instructions || printData.instructionsEn) ? (
            <div className="mt-12 border-t border-dashed border-slate-300 pt-6">
              <strong className="mb-4 block text-sm uppercase tracking-wider text-slate-500">Instructions supplementaires / Additional instructions</strong>
              <div className="space-y-3">
                <p className="whitespace-pre-wrap text-lg leading-relaxed text-black">
                  <span className="font-semibold text-slate-500">FR:</span> {buildBilingualText(printData.instructions, printData.instructionsEn).french || '-'}
                </p>
                <p className="whitespace-pre-wrap text-lg leading-relaxed text-black">
                  <span className="font-semibold text-slate-500">EN:</span> {buildBilingualText(printData.instructions, printData.instructionsEn).english || '-'}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-24 flex justify-end">
            <div className="border-t border-slate-200 px-12 pt-4 text-center">
              <p className="mb-8 text-sm font-medium uppercase tracking-wider text-slate-500">Signature du medecin / Physician signature</p>
              {printData.signe ? (
                <p className="font-[cursive] text-4xl text-black -rotate-3">Dr. {printData.medecin.split(' ').pop()}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
