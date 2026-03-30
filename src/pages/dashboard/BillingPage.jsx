import { BadgeEuro, Printer, CheckCircle, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Modal from '../../components/common/Modal'
import { openPrintWindow } from '../../components/common/ReceiptPrint'
import { AppButton, ContentCard, StatusBadge, StatCard } from '../../components/dashboard/DashboardPrimitives'
import { getConsultations } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useAppContext } from '../../context/AppContext'
import { RDV_STATUSES } from '../../lib/workflow'

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Africa/Casablanca'
  })
}

function BillingPage() {
  const navigate = useNavigate()
  const { notify } = useAppContext()
  const [filter, setFilter] = useState('pending')
  const [selectedConsultation, setSelectedConsultation] = useState(null)
  
  const [processing, setProcessing] = useState(false)

  const { data: consultations = [], isLoading, refetch } = useQuery({
    queryKey: ['billing_consultations'],
    queryFn: getConsultations,
  })

  // Group by our mapped internal terminology
  const mappedConsultations = useMemo(() => {
    return consultations.map(c => ({
      ...c,
      status: c.statut === 'paye' ? 'paid' : c.statut === 'credit' ? 'pending' : 'cancelled'
    }))
  }, [consultations])

  const filteredConsultations = useMemo(() => {
    if (filter === 'all') return mappedConsultations
    return mappedConsultations.filter(c => c.status === filter)
  }, [mappedConsultations, filter])

  const totals = useMemo(() => ({
    paid: mappedConsultations.filter(c => c.status === 'paid').reduce((acc, c) => acc + Number(c.montant), 0),
    pending: mappedConsultations.filter(c => c.status === 'pending').reduce((acc, c) => acc + Number(c.montant), 0),
  }), [mappedConsultations])

  const processPayment = async (consultation) => {
    setProcessing(true)
    try {
      // 1. Update Consultation directly
      const { error: consultError } = await supabase
        .from('consultations')
        .update({ statut: 'paye' })
        .eq('id', consultation.id)
      if (consultError) throw consultError
      
      // 2. Clear out the RDV lifecycle
      if (consultation.rdv_id) {
         // Attempt to update the RDV. Since it might not exist (SQL migration pending), ignore if it fails silently natively or log it.
         await supabase.from('rdv').update({ status: RDV_STATUSES.PAID }).eq('id', consultation.rdv_id)
      }

      notify({ title: 'Paiement Valide', description: 'Le dossier a été encaissé avec succès.', variant: 'success'})
      refetch()
      setSelectedConsultation(null)
    } catch (e) {
      notify({ title: 'Erreur', description: 'Échec de l\'encaissement.', variant: 'error'})
    } finally {
      setProcessing(false)
    }
  }

  const printInvoice = (consultation) => {
    openPrintWindow({
      title: `Honoraires de Consultation`,
      subtitle: `${consultation.patients?.prenom} ${consultation.patients?.nom} • ${formatDateTime(consultation.created_at)}`,
      sections: [
        {
          title: 'Actes Médicaux',
          content: `<table><thead><tr><th>Désignation</th><th>Montant</th></tr></thead><tbody><tr><td>Consultation Médicale</td><td>${consultation.montant} MAD</td></tr></tbody></table>`,
        },
        { title: 'Total', content: `<p><strong>${consultation.montant} MAD</strong></p><p>${consultation.notes || ''}</p>` },
      ],
    })
  }

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin w-10 h-10 text-teal-600" /></div>

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Encaissements</h1>
          <p className="text-slate-500 mt-2">Validez et facturez les consultations terminées par le médecin.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <StatCard label="Total Encaissé" value={`${totals.paid} MAD`} helper="CA Validé" />
        <StatCard label="En Attente" value={`${totals.pending} MAD`} helper="Dossiers en attente de paiement" />
      </div>

      <ContentCard 
        title="Dossiers Cliniques" 
        subtitle="Dossiers clôturés transférés depuis les espaces de consultation" 
        action={
          <div className="flex gap-2">
            {['pending', 'paid', 'all'].map((item) => (
               <button 
                 key={item} 
                 type="button" 
                 onClick={() => setFilter(item)} 
                 className={`interactive rounded-2xl px-5 py-2.5 text-sm font-bold uppercase tracking-wider ${filter === item ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
               >
                 {item === 'all' ? 'Historique' : item === 'paid' ? 'Payés' : 'En attente'}
               </button>
            ))}
          </div>
        }
      >
        <div className="space-y-4">
          {filteredConsultations.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-medium border-2 border-dashed border-slate-200 rounded-[24px]">
               Aucun dossier trouvé pour le filtre actuel.
            </div>
          ) : filteredConsultations.map((c) => (
            <div key={c.id} className="interactive flex flex-col gap-4 rounded-[24px] bg-white px-6 py-5 ring-1 ring-slate-200 shadow-sm md:flex-row md:items-center md:justify-between hover:shadow-md transition-all">
              <button type="button" onClick={() => setSelectedConsultation(c)} className="flex-1 text-left">
                <p className="font-bold text-slate-900 text-lg">{c.patients?.prenom} {c.patients?.nom}</p>
                <p className="mt-1 text-sm text-slate-500 font-medium">{formatDateTime(c.created_at)}</p>
              </button>
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-black text-slate-900 text-xl">{c.montant} MAD</span>
                <StatusBadge tone={c.status === 'paid' ? 'success' : 'warning'}>
                  {c.status === 'paid' ? 'Payé' : 'En Attente'}
                </StatusBadge>
                
                {c.status === 'pending' && (
                  <AppButton onClick={() => processPayment(c)} disabled={processing}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Encaisser
                  </AppButton>
                )}
                
                <AppButton variant="secondary" onClick={() => printInvoice(c)}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimer
                </AppButton>
              </div>
            </div>
          ))}
        </div>
      </ContentCard>

      <Modal open={Boolean(selectedConsultation)} onClose={() => setSelectedConsultation(null)} title="Détail du Dossier" width="max-w-xl">
        {selectedConsultation && (
          <div className="space-y-6">
            <div className="rounded-[24px] bg-slate-50 p-6 ring-1 ring-slate-200">
              <p className="text-2xl font-black text-slate-900">{selectedConsultation.patients?.prenom} {selectedConsultation.patients?.nom}</p>
              <p className="mt-1 text-base text-slate-500 font-medium">{formatDateTime(selectedConsultation.created_at)}</p>
              
              <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-6">
                 <div>
                    <span className="text-slate-500 text-sm font-bold uppercase tracking-wider block mb-1">Montant à régler</span>
                    <span className="text-4xl font-black text-slate-900">{selectedConsultation.montant} MAD</span>
                 </div>
                 <StatusBadge tone={selectedConsultation.status === 'paid' ? 'success' : 'warning'}>
                  {selectedConsultation.status === 'paid' ? 'PAYÉ' : 'EN ATTENTE'}
                 </StatusBadge>
              </div>
              
              {selectedConsultation.notes && (
                <div className="mt-6 p-4 bg-teal-50 rounded-xl border border-teal-100">
                   <p className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-2">Observations (Médecin)</p>
                   <p className="text-sm text-teal-900">{selectedConsultation.notes}</p>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3">
              {selectedConsultation.status === 'pending' && (
                <AppButton onClick={() => processPayment(selectedConsultation)} disabled={processing} className="flex-1 justify-center">
                  <BadgeEuro className="mr-2 h-5 w-5" /> Encaisser et Clôturer
                </AppButton>
              )}
              <AppButton variant="secondary" onClick={() => printInvoice(selectedConsultation)}>
                <Printer className="mr-2 h-5 w-5" /> Imprimer le reçu
              </AppButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default BillingPage
