import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Baby, CalendarDays, ChevronDown, ChevronLeft, FileText, FlaskConical, FolderOpen, HeartPulse, Mail, MessageCircle, Mic, Pause, Phone, Pill, Plus, Save, ShieldAlert, Stethoscope } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import BilingualOrdonnanceFormModal from '../../components/forms/BilingualOrdonnanceFormModal'
import { useAppContext } from '../../context/AppContext'
import { normalizeSpecialiteKey } from '../../data/specialites'
import { createConsultation, getPatientDashboardData, updateConsultation } from '../../lib/api'

const DEFAULT_SECTION = 'resume'
const CARD = 'rounded-xl border border-slate-200/90 bg-white shadow-sm'
const INPUT = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
const TEXTAREA = 'w-full resize-none border-0 bg-white px-4 py-4 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400'
const META = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'

const EMPTY_DRAFT = {
  motif: '',
  antecedents: '',
  examenClinique: '',
  examenGynecologique: '',
  donneesObstetricales: '',
  conclusion: '',
  ordonnance: '',
  constantes: { tension_systolique: '', tension_diastolique: '', frequence_cardiaque: '', saturation: '', temperature: '', poids: '' },
  extractedTasks: [],
  medications: [],
  workflowStatus: 'draft',
  updatedAt: null,
}

const NAV = {
  generaliste: [['resume', "Vue d'ensemble", Activity], ['consultation', 'Consultation en cours', Stethoscope], ['ordonnances', 'Ordonnances', FileText], ['documents', 'Documents', FolderOpen]],
  gynecologie: [['resume', "Vue d'ensemble", Activity], ['consultation', 'Consultation en cours', Stethoscope], ['suivi-gynecologique', 'Suivi gynécologique', HeartPulse], ['documents', 'Documents', FolderOpen]],
  'gynecologie-obstetrique': [['resume', "Vue d'ensemble", Activity], ['consultation', 'Consultation en cours', Stethoscope], ['suivi-gynecologique', 'Suivi gynécologique', HeartPulse], ['obstetrique', 'Obstétrique', Baby], ['documents', 'Documents', FolderOpen]],
}

const GP_TASKS = [{ id: 'analgique', label: 'Antalgique 5mg', done: false }, { id: 'bilan', label: 'Bilan sanguin', done: true }, { id: 'controle', label: 'Contrôle tension', done: false }, { id: 'renouvellement', label: 'Renouveler ordonnance', done: false }]
const GYNECO_TASKS = [{ id: 'douleurs', label: 'Contrôle douleurs pelviennes', done: false }, { id: 'frottis', label: 'Planifier frottis', done: true }, { id: 'echo', label: 'Échographie pelvienne', done: false }, { id: 'rdv', label: 'Contrôle gynécologique', done: false }]
const OBST_TASKS = [{ id: 'monitoring', label: 'Contrôle obstétrical', done: false }, { id: 'echo', label: 'Échographie de suivi', done: true }, { id: 'bilan', label: 'Bilan grossesse', done: false }, { id: 'rdv', label: 'Prochain rendez-vous', done: false }]
const GP_MEDS = [{ id: 'doliprane', nom: 'DOLIPRANE 1000 mg', detail: 'avec plaquette', posologie: '1 comprimé 3 fois par jour pendant 5 jours' }, { id: 'smectalia', nom: 'SMECTALIA 3g', detail: '1 sachet 2 fois par jour', posologie: '1 sachet 2 fois par jour' }]
const GYNECO_MEDS = [{ id: 'spasfon', nom: 'SPASFON', detail: 'contre spasmes', posologie: '1 comprimé si douleurs, 3 prises maximum' }, { id: 'acide-folique', nom: 'ACIDE FOLIQUE', detail: 'supplémentation', posologie: '1 comprimé par jour' }]
const OBST_MEDS = [{ id: 'acide-folique', nom: 'ACIDE FOLIQUE', detail: 'suivi grossesse', posologie: '1 comprimé par jour' }, { id: 'magnesium', nom: 'MAGNÉSIUM', detail: 'confort grossesse', posologie: '1 sachet le soir' }]

function cx(...values) { return values.filter(Boolean).join(' ') }
function formatDate(value, options = {}) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Casablanca', ...options })
}
function formatTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Casablanca' })
}
function ageOf(dateValue) {
  if (!dateValue) return null
  const birth = new Date(dateValue)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const diff = today.getMonth() - birth.getMonth()
  if (diff < 0 || (diff === 0 && today.getDate() < birth.getDate())) age -= 1
  return age
}
function parseAllergies(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => (typeof item === 'string' ? item : item?.type || item?.label || '')).map((item) => item.trim()).filter(Boolean)
  return String(value).split(/[;,]/).map((item) => item.trim()).filter(Boolean)
}
function parseList(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  return String(value).split(/[;,|]/).map((item) => item.trim()).filter(Boolean)
}
function templateFrom(value) {
  const normalized = normalizeSpecialiteKey(value)
  if (normalized === 'gynecologie-obstetrique') return normalized
  if (normalized === 'gynecologie') return normalized
  return 'generaliste'
}
function draftFromNotes(notes, consultation) {
  if (!notes) return { ...EMPTY_DRAFT, updatedAt: consultation?.created_at || null }
  try {
    const parsed = typeof notes === 'string' ? JSON.parse(notes) : notes
    const legacyText = parsed?.note || parsed?.notes || ''
    return { ...EMPTY_DRAFT, ...parsed, examenClinique: parsed?.examenClinique || legacyText, constantes: { ...EMPTY_DRAFT.constantes, ...(parsed?.constantes || {}) }, extractedTasks: Array.isArray(parsed?.extractedTasks) ? parsed.extractedTasks : [], medications: Array.isArray(parsed?.medications) ? parsed.medications : [], workflowStatus: parsed?.workflowStatus || 'draft', updatedAt: parsed?.updatedAt || consultation?.created_at || null }
  } catch {
    return { ...EMPTY_DRAFT, examenClinique: String(notes), updatedAt: consultation?.created_at || null }
  }
}
function draftPayload(draft) { return JSON.stringify({ ...draft, updatedAt: draft.updatedAt || new Date().toISOString() }) }
function sectionSearch(section) { const params = new URLSearchParams(); if (section && section !== DEFAULT_SECTION) params.set('section', section); return params.toString() ? `?${params.toString()}` : '' }
function storageKey(patientId, consultationId) { return `macromedica-patient-workspace:${patientId}:${consultationId || 'new'}` }
function formatSexe(value) { const normalized = String(value || '').toLowerCase(); if (['m', 'male', 'homme'].includes(normalized)) return 'Homme'; if (['f', 'female', 'femme'].includes(normalized)) return 'Femme'; return value || '--' }
function whatsappPhone(phone) { if (!phone) return ''; let normalized = String(phone).replace(/[^\d]/g, ''); if (normalized.startsWith('00')) normalized = normalized.slice(2); if (normalized.startsWith('0')) normalized = `212${normalized.slice(1)}`; return normalized }
function numericValue(value) { const parsed = Number.parseFloat(String(value || '').replace(',', '.')); return Number.isFinite(parsed) ? parsed : null }
function deriveBiometry(patient, draft) {
  const fallbackHeight = 178
  const fallbackWeight = 82
  const height = numericValue(patient?.taille || patient?.height_cm || patient?.heightCm) || fallbackHeight
  const weight = numericValue(draft?.constantes?.poids || patient?.poids || patient?.weight_kg || patient?.weightKg) || fallbackWeight
  const imc = height && weight ? (weight / ((height / 100) * (height / 100))).toFixed(1) : '25.9'
  return { taille: `${height} cm`, poids: `${weight} kg`, imc, groupe: patient?.groupe_sanguin || patient?.groupe || patient?.blood_group || 'O+' }
}
function initialsOf(patient) { return `${patient?.prenom?.[0] || 'P'}${patient?.nom?.[0] || 'T'}`.toUpperCase() }
function pathologiesFrom(patient, templateKey) { const source = [...parseList(patient?.pathologies_actives), ...parseList(patient?.pathologies), ...parseList(patient?.diagnostics)]; if (source.length) return source.slice(0, 3); if (templateKey === 'gynecologie-obstetrique') return ['Suivi obstétrical']; if (templateKey === 'gynecologie') return ['Suivi gynécologique']; return ['Diabète type 2', 'HTA'] }
function previewText(value, fallback = 'Non renseigné') { const clean = String(value || '').replace(/\s+/g, ' ').trim(); return clean || fallback }
function treatmentFromDraft(draft, templateKey) {
  if (Array.isArray(draft?.medications) && draft.medications.length) return draft.medications.map((item, index) => ({ id: item.id || `med_${index}`, nom: item.nom || item.name || item.label || 'Prescription', detail: item.detail || item.substance || '', posologie: item.posologie || item.instructions || '' }))
  if (draft?.ordonnance?.trim()) return draft.ordonnance.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => ({ id: `line_${index}`, nom: line, detail: '', posologie: '' }))
  if (templateKey === 'gynecologie-obstetrique') return OBST_MEDS
  if (templateKey === 'gynecologie') return GYNECO_MEDS
  return GP_MEDS
}
function latestMetrics(consultations, draft) {
  const fromCurrent = draft?.constantes || {}
  if (Object.values(fromCurrent).some(Boolean)) return { ta: `${fromCurrent.tension_systolique || '--'}/${fromCurrent.tension_diastolique || '--'}`, fc: fromCurrent.frequence_cardiaque || '--', spo2: fromCurrent.saturation || '--', temp: fromCurrent.temperature || '--', poids: fromCurrent.poids || '--' }
  const latest = consultations[0] ? draftFromNotes(consultations[0].notes, consultations[0]) : EMPTY_DRAFT
  return { ta: `${latest.constantes?.tension_systolique || '128'}/${latest.constantes?.tension_diastolique || '82'}`, fc: latest.constantes?.frequence_cardiaque || '72', spo2: latest.constantes?.saturation || '98', temp: latest.constantes?.temperature || '37.0', poids: latest.constantes?.poids || '82' }
}
function timelineKind(motif) {
  const normalized = String(motif || '').toLowerCase()
  if (normalized.includes('urgence')) return { label: 'URGENCE', bubble: 'bg-rose-500 text-white', badge: 'border border-rose-100 bg-rose-50 text-rose-700' }
  if (normalized.includes('chir')) return { label: 'CHIRURGIE', bubble: 'bg-amber-500 text-white', badge: 'border border-amber-100 bg-amber-50 text-amber-700' }
  if (normalized.includes('contr')) return { label: 'CONTRÔLE', bubble: 'bg-emerald-500 text-white', badge: 'border border-emerald-100 bg-emerald-50 text-emerald-700' }
  if (normalized.includes('suivi') || normalized.includes('diab')) return { label: 'SUIVI', bubble: 'bg-blue-600 text-white', badge: 'border border-blue-100 bg-blue-50 text-blue-700' }
  return { label: 'GÉNÉRALE', bubble: 'bg-slate-300 text-slate-700', badge: 'border border-slate-200 bg-slate-100 text-slate-600' }
}
function taskPresets(templateKey) { if (templateKey === 'gynecologie-obstetrique') return OBST_TASKS; if (templateKey === 'gynecologie') return GYNECO_TASKS; return GP_TASKS }
function isDangerousMedication(medication, allergies) {
  const name = String(medication?.nom || medication?.name || medication || '').toLowerCase()
  const allergyText = allergies.join(' ').toLowerCase()
  if (!name || !allergyText) return false
  if ((allergyText.includes('pénic') || allergyText.includes('penic')) && (name.includes('augmentin') || name.includes('amoxic') || name.includes('penic'))) return true
  if (allergyText.includes('sulf') && name.includes('sulf')) return true
  return false
}
function termFromDDR(ddr) {
  if (!ddr || ddr === 'Non renseignée') return null
  const start = new Date(ddr)
  if (Number.isNaN(start.getTime())) return null
  const now = new Date()
  const diffInDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const weeks = Math.floor(diffInDays / 7)
  const days = diffInDays % 7
  return `${weeks} SA + ${days} j`
}
function hasConsultationContent(draft) {
  return Boolean(draft?.motif?.trim() || draft?.antecedents?.trim() || draft?.examenClinique?.trim())
}
function buildMockAiSummary(patient, draft, templateKey) {
  const age = ageOf(patient?.date_naissance) || (templateKey === 'generaliste' ? 46 : 34)
  const sexLabel = formatSexe(patient?.sexe)
  const motif = previewText(draft?.motif, templateKey === 'generaliste' ? 'suivi clinique' : 'consultation spécialisée')
  const interrogatoire = previewText(draft?.antecedents, templateKey === 'generaliste' ? 'symptômes stables, sans signe de gravité' : 'interrogatoire rassurant sans anomalie majeure')
  const examen = previewText(draft?.examenClinique, templateKey === 'generaliste' ? 'examen clinique satisfaisant' : 'examen clinique compatible avec le contexte')
  const plan = templateKey === 'generaliste' ? 'poursuite du traitement, bilan de contrôle et surveillance clinique' : 'prise en charge spécialisée, bilan ciblé et contrôle programmé'
  return `Patient ${sexLabel.toLowerCase()} de ${age} ans, vu aujourd'hui pour ${motif}. Interrogatoire : ${interrogatoire}. Examen clinique : ${examen}. Impression globale rassurante avec indication de ${plan}.`
}
function mockTimelineEntries(templateKey) {
  const previewDate = new Date()
  previewDate.setDate(previewDate.getDate() - 7)
  if (templateKey === 'generaliste') {
    return [{
      id: 'mock-consultation',
      date: formatDate(previewDate.toISOString()),
      title: 'Suivi diabète',
      motif: 'Suivi diabète',
      preview: 'HbA1c stabilisée. Adaptation hygiéno-diététique poursuivie et bilan de contrôle demandé.',
      doctor: 'Dr. MacroMedica',
      authorInitials: 'DR',
      hasOrdonnance: true,
      hasLab: true,
      fullText: 'Consultation de suivi avec glycémies mieux contrôlées. Tension correcte, pas de plainte fonctionnelle, renforcement des conseils et bilan biologique planifié.',
      metrics: [['Tension', '128/82'], ['FC', '72'], ['Poids', '82 kg']],
    }]
  }
  return [{
    id: 'mock-consultation',
    date: formatDate(previewDate.toISOString()),
    title: 'Consultation de suivi',
    motif: 'Consultation de suivi',
    preview: 'Suivi clinique rassurant avec conduite à tenir expliquée et prochain contrôle recommandé.',
    doctor: 'Dr. MacroMedica',
    authorInitials: 'DR',
    hasOrdonnance: true,
    hasLab: false,
    fullText: 'Patiente revue en consultation de suivi. Examen sans anomalie immédiate, conseils donnés et surveillance clinique maintenue.',
    metrics: [['Tension', '118/74'], ['FC', '76'], ['Poids', '68 kg']],
  }]
}

function PanelCard({ title, subtitle, action, className = '', bodyClassName = 'p-4', children }) {
  return (
    <section className={cx(CARD, className)}>
      {(title || subtitle || action) ? <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3"><div className="min-w-0">{subtitle ? <p className={META}>{subtitle}</p> : null}{title ? <h2 className="mt-1 text-sm font-bold text-slate-900">{title}</h2> : null}</div>{action ? <div className="shrink-0">{action}</div> : null}</div> : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

function PatientHeader({ patient, templateKey, onBack, onWhatsApp, onStart }) {
  const age = ageOf(patient?.date_naissance)
  const initials = initialsOf(patient)
  const primaryPathology = pathologiesFrom(patient, templateKey)[0] || 'Patient'

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div
        className="flex h-16 w-full items-center justify-between px-6"
        style={{ maxWidth: '1600px', margin: '0 auto' }}
      >
        <div className="flex min-w-0 items-center gap-4">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900">
            <ChevronLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{initials}</div>
            <div className="min-w-0">
              <h1 className="truncate text-[22px] font-bold leading-tight text-slate-900">{`${patient?.prenom || ''} ${patient?.nom || ''}`.trim() || 'Patient'}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{primaryPathology}</span>
                <span className="text-slate-300">•</span>
                <span>{formatSexe(patient?.sexe)} {age != null ? `${age} ans` : ''}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-400">Dossier : {patient?.cin || patient?.id || '--'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button type="button" onClick={onWhatsApp} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
            <MessageCircle className="h-4 w-4" />
            Lien WhatsApp
          </button>
          <button type="button" onClick={onStart} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Nouvelle consultation
          </button>
        </div>
      </div>
    </header>
  )
}

function LeftRail({ patient, allergies, templateKey, gynecoData, items, activeSection, draft, onSection, onWhatsApp }) {
  const biometry = deriveBiometry(patient, draft)

  return (
    <div className="space-y-6">
      <nav className={cx(CARD, 'flex flex-col overflow-hidden')}>
        {items.map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSection(key)}
            className={cx('flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left text-sm transition', activeSection === key ? 'border-blue-600 bg-blue-50/60 font-semibold text-blue-700' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800')}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {allergies.length ? <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2"><ShieldAlert className="h-3.5 w-3.5 text-rose-600" /><span className="text-xs font-semibold text-rose-700">Allergie :</span><span className="text-xs text-rose-600">{allergies.join(', ')}</span></div> : null}

      <PanelCard title="Biométrie" action={<span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">Référence</span>} bodyClassName="flex flex-col gap-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          {[['Taille', biometry.taille], ['Poids', biometry.poids], ['IMC', biometry.imc], ['Groupe', biometry.groupe]].map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-1 rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
              <p className="break-words text-sm font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="Coordonnées" bodyClassName="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-3 text-sm text-slate-500">
          <div className="flex min-w-0 items-start gap-2">
            <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 break-words">{patient?.telephone || 'Téléphone non renseigné'}</span>
          </div>
          <div className="flex min-w-0 items-start gap-2">
            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 break-words leading-5">{patient?.email || 'Email non renseigné'}</span>
          </div>
        </div>
        <button type="button" className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50" onClick={onWhatsApp}>
          <MessageCircle className="h-3.5 w-3.5" />
          Lien WhatsApp
        </button>
      </PanelCard>

      {templateKey !== 'generaliste' ? (
        <PanelCard title="Gynécologie" bodyClassName="p-4">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3"><p className={META}>DDR</p><p className="mt-1 font-semibold text-slate-900">{gynecoData.ddr}</p>{termFromDDR(gynecoData.ddr) ? <p className="mt-1 text-xs text-slate-500">Terme estimé : {termFromDDR(gynecoData.ddr)}</p> : null}</div>
            <div className="grid grid-cols-3 gap-2">
              {[['G', gynecoData.g], ['P', gynecoData.p], ['A', gynecoData.a]].map(([label, value]) => (
                <div key={label} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3 text-center">
                  <p className={META}>{label}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3"><p className={META}>Contraception</p><p className="mt-1 font-semibold text-slate-900">{gynecoData.contraception}</p></div>
          </div>
        </PanelCard>
      ) : null}
    </div>
  )
}

function PanoramaCard({ patient, allergies, draft, consultations, gynecoData, templateKey, upcomingLabel }) {
  const pathologies = pathologiesFrom(patient, templateKey)
  const medications = treatmentFromDraft(draft, templateKey).slice(0, 2)
  const metrics = latestMetrics(consultations, draft)

  return (
    <PanelCard title="Panorama 360 - Résumé Patient" className="overflow-hidden" bodyClassName="p-5">
      <div className="grid gap-5 lg:grid-cols-4">
        <div>
          <p className={META}>Pathologies actives</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{pathologies.map((pathology) => <span key={pathology} className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{pathology}</span>)}</div>
          <p className={cx(META, 'mt-4')}>Allergies</p>
          <p className="mt-2 text-xs text-slate-500">{allergies.length ? allergies.join(', ') : 'Aucune allergie connue'}</p>
        </div>
        <div>
          <p className={META}>Traitement en cours</p>
          <div className="mt-2 space-y-2">{medications.map((medication) => <div key={medication.id} className="flex items-start gap-2 text-xs text-slate-600"><Pill className="mt-0.5 h-3.5 w-3.5 text-blue-500" /><div><p className="font-medium text-slate-800">{medication.nom}</p><p className="text-slate-400">{medication.posologie || medication.detail || 'Posologie à confirmer'}</p></div></div>)}</div>
        </div>
        <div>
          <p className={META}>{templateKey === 'generaliste' ? 'Dernières constantes' : 'Suivi clinique'}</p>
          {templateKey === 'generaliste' ? (
            <div className="mt-2 space-y-2 text-xs">
              {[['Tension', metrics.ta, '↓'], ['SpO2', `${metrics.spo2}%`, '→'], ['Poids', `${metrics.poids} kg`, '↑']].map(([label, value, trend]) => <div key={label} className="flex items-center justify-between"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-900">{value} <span className="text-slate-400">{trend}</span></span></div>)}
            </div>
          ) : (
            <div className="mt-2 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between"><span className="text-slate-500">DDR</span><span className="font-semibold text-slate-900">{gynecoData.ddr}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Terme</span><span className="font-semibold text-slate-900">{termFromDDR(gynecoData.ddr) || '--'}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Dernier frottis</span><span className="font-semibold text-slate-900">{gynecoData.dernierFrottis}</span></div>
            </div>
          )}
        </div>
        <div>
          <p className={META}>Actions en attente</p>
          <div className="mt-2 space-y-2"><div className="inline-flex items-center gap-1.5 rounded-md border border-amber-100 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"><CalendarDays className="h-3.5 w-3.5" />Bilan sanguin en attente</div><p className="text-xs text-blue-700">{upcomingLabel || 'Prochain contrôle à planifier'}</p></div>
        </div>
      </div>
    </PanelCard>
  )
}

function HistoryTimeline({ entries, expandedId, onToggle, onOpen, onEmpty }) {
  if (!entries.length) {
    return (
      <PanelCard title="Historique des consultations" action={<span className="text-xs text-slate-400">0 consultation</span>}>
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-700">Aucune consultation enregistrée pour ce patient.</p>
          <button type="button" onClick={onEmpty} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Nouvelle consultation
          </button>
        </div>
      </PanelCard>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Historique des consultations</h2>
        <span className="text-xs font-medium text-slate-400">{entries.length} consultation{entries.length > 1 ? 's' : ''} au total</span>
      </div>
      <div className="relative pl-14">
        <div className="absolute bottom-1 left-[19px] top-1 w-px bg-slate-200" />
        <div className="space-y-4">
          {entries.map((entry) => {
            const kind = timelineKind(entry.motif)
            const expanded = expandedId === entry.id
            return (
              <article key={entry.id}>
                <div className={cx(CARD, 'flex flex-col overflow-hidden')}>
                  <div className="px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-slate-900">{entry.title}</h3><span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold', kind.badge)}>{kind.label}</span></div>
                        <p className="mt-1 text-xs text-slate-500">{entry.doctor} • {entry.date}</p>
                        <p className="mt-2 break-words whitespace-pre-wrap text-sm leading-6 text-slate-600">{entry.preview}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          {entry.hasOrdonnance ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500"><Pill className="h-3 w-3" />Ordonnance</span> : null}
                          {entry.hasLab ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500"><FlaskConical className="h-3 w-3" />Bilan</span> : null}
                        </div>
                      </div>
                      <button type="button" onClick={() => onToggle(entry.id)} className="rounded-lg p-2 text-slate-300 transition hover:bg-blue-50 hover:text-blue-600"><ChevronDown className={cx('h-4 w-4 transition', expanded ? 'rotate-180' : '')} /></button>
                    </div>
                  </div>
                  {expanded ? (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                      <p className="break-words whitespace-pre-wrap text-sm leading-6 text-slate-700">{entry.fullText}</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">{entry.metrics.map(([label, value]) => <div key={label} className="rounded-md border border-slate-100 bg-slate-50 p-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-900">{value}</p></div>)}</div>
                      <div className="mt-3"><button type="button" onClick={() => onOpen(entry.id)} className="text-sm font-medium text-blue-600 transition hover:text-blue-700">Ouvrir la consultation</button></div>
                    </div>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function EditorToolbar({ speechActive, onSpeech, onFormat }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onFormat?.('bold')} className="rounded p-1.5 text-sm font-bold text-slate-500 transition hover:bg-slate-200 hover:text-slate-900">B</button>
      <button type="button" onClick={() => onFormat?.('italic')} className="rounded p-1.5 text-sm italic text-slate-500 transition hover:bg-slate-200 hover:text-slate-900">I</button>
      <button type="button" onClick={() => onFormat?.('list')} className="rounded p-1.5 text-sm text-slate-500 transition hover:bg-slate-200 hover:text-slate-900">•</button>
      <div className="mx-1 h-4 w-px bg-slate-200" />
      <button type="button" onClick={onSpeech} className={cx('rounded p-1.5 transition', speechActive ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50')}>{speechActive ? <Pause className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
    </div>
  )
}

function NotesCard({ title, value, onChange, placeholder, speechActive, onSpeech, onFormat, extraValue, onExtraChange, extraPlaceholder }) {
  return (
    <section className={cx(CARD, 'overflow-hidden')}>
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3"><h3 className="text-sm font-bold text-slate-900">{title}</h3><EditorToolbar speechActive={speechActive} onSpeech={onSpeech} onFormat={onFormat} /></div>
      {typeof extraValue === 'string' ? <div className="border-b border-slate-100 px-4 py-3"><input value={extraValue} onChange={(event) => onExtraChange(event.target.value)} placeholder={extraPlaceholder} className="w-full border-0 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400" /></div> : null}
      <textarea rows={5} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={TEXTAREA} />
    </section>
  )
}

function ConsultationWorkspace({ templateKey, draft, lastSavedAt, hasDraftInput, speechTarget, speechError, isSaving, showAiSummary, aiSummaryText, onField, onSpeech, onFormat, onSave, onGenerateSummary, onSaveSummaryOnly, onSaveNotesOnly, onSaveSummaryAndNotes }) {
  const shouldShowActions = hasDraftInput && hasConsultationContent(draft)

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900">Observations médicales</h2><p className="mt-1 text-sm text-slate-400">Dernière mise à jour : {lastSavedAt ? `Aujourd'hui à ${formatTime(lastSavedAt)}` : 'Brouillon non sauvegardé'}</p></div></div>
      <NotesCard title="Motif & Interrogatoire" value={draft.antecedents} onChange={(value) => onField('antecedents', value)} placeholder="Décrivez le motif et les antécédents pertinents..." speechActive={speechTarget === 'antecedents'} onSpeech={() => onSpeech('antecedents')} onFormat={(action) => onFormat('Motif & Interrogatoire', action)} extraValue={draft.motif} onExtraChange={(value) => onField('motif', value)} extraPlaceholder="Motif principal de consultation..." />
      <section className={cx(CARD, 'overflow-hidden')}>
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3"><h3 className="text-sm font-bold text-slate-900">{templateKey === 'generaliste' ? 'Examen & Conclusion' : 'Examen clinique'}</h3><EditorToolbar speechActive={speechTarget === 'examenClinique'} onSpeech={() => onSpeech('examenClinique')} onFormat={(action) => onFormat(templateKey === 'generaliste' ? 'Examen & Conclusion' : 'Examen clinique', action)} /></div>
        <textarea rows={5} value={draft.examenClinique} onChange={(event) => onField('examenClinique', event.target.value)} placeholder="Notez les résultats de l'examen clinique et votre conclusion médicale..." className={TEXTAREA} />
        <div className="border-t border-slate-100"><textarea rows={3} value={draft.conclusion} onChange={(event) => onField('conclusion', event.target.value)} placeholder="Conclusion médicale..." className={cx(TEXTAREA, 'min-h-[90px]')} /></div>
      </section>
      {templateKey !== 'generaliste' ? <NotesCard title="Examen gynécologique" value={draft.examenGynecologique} onChange={(value) => onField('examenGynecologique', value)} placeholder="Spéculum, toucher vaginal, échographie endovaginale..." speechActive={speechTarget === 'examenGynecologique'} onSpeech={() => onSpeech('examenGynecologique')} onFormat={(action) => onFormat('Examen gynécologique', action)} /> : null}
      {templateKey === 'gynecologie-obstetrique' ? <NotesCard title="Données obstétricales" value={draft.donneesObstetricales} onChange={(value) => onField('donneesObstetricales', value)} placeholder="SA, mouvements actifs, hauteur utérine, surveillance..." speechActive={speechTarget === 'donneesObstetricales'} onSpeech={() => onSpeech('donneesObstetricales')} onFormat={(action) => onFormat('Données obstétricales', action)} /> : null}
      {shouldShowActions && !showAiSummary ? (
        <PanelCard bodyClassName="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Save className="h-4 w-4" /></div>
              <div><h3 className="text-sm font-bold text-slate-900">Sauvegarder la consultation</h3><p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">Vous pouvez sauvegarder directement ou générer un résumé IA.</p>{speechError ? <p className="mt-2 text-xs text-rose-500">{speechError}</p> : null}</div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={onSave} disabled={isSaving} className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-60">Sauvegarder</button>
              <button type="button" onClick={onGenerateSummary} disabled={isSaving} className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">Générer résumé IA</button>
            </div>
          </div>
        </PanelCard>
      ) : null}
      {shouldShowActions && showAiSummary ? (
        <PanelCard title="Résumé IA proposé" bodyClassName="p-4">
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-4 text-sm leading-7 text-slate-700">{aiSummaryText}</div>
            {speechError ? <p className="text-xs text-rose-500">{speechError}</p> : null}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={onSaveSummaryOnly} disabled={isSaving} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-60">Sauvegarder le résumé seul</button>
              <button type="button" onClick={onSaveNotesOnly} disabled={isSaving} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-60">Sauvegarder les notes seules</button>
              <button type="button" onClick={onSaveSummaryAndNotes} disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">Sauvegarder le résumé + notes</button>
            </div>
          </div>
        </PanelCard>
      ) : null}
    </div>
  )
}

function ConsultationRightRail({ templateKey, draft, allergies, onDraft, onOrdonnance, onNotify }) {
  const [search, setSearch] = useState('')
  const baseTasks = taskPresets(templateKey)
  const medications = treatmentFromDraft(draft, templateKey)
  const filteredMedications = medications.filter((medication) => medication.nom.toLowerCase().includes(search.toLowerCase()))
  const hasDanger = filteredMedications.some((medication) => isDangerousMedication(medication, allergies))
  const tasks = draft.extractedTasks?.length ? draft.extractedTasks : baseTasks
  const typeBadges = templateKey === 'generaliste' ? ['Douleur', 'Fièvre', 'Digestif', 'HTA'] : templateKey === 'gynecologie-obstetrique' ? ['Grossesse', 'Douleur', 'Suppléments', 'Infection'] : ['Contraception', 'Douleur', 'Infection', 'Ménopause']
  const toggleTask = useCallback((taskId) => {
    onDraft((current) => {
      const seed = current.extractedTasks?.length ? current.extractedTasks : baseTasks
      return { extractedTasks: seed.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)) }
    })
  }, [baseTasks, onDraft])
  const commitTaskEdit = useCallback((taskId) => {
    onDraft((current) => {
      const seed = current.extractedTasks?.length ? current.extractedTasks : baseTasks
      const nextTasks = seed.reduce((acc, task) => {
        if (task.id !== taskId) {
          acc.push(task)
          return acc
        }

        const text = String(task.text ?? task.label ?? '').trim()
        if (!text) return acc

        acc.push({ ...task, label: text, text, isEditing: false })
        return acc
      }, [])

      return { extractedTasks: nextTasks }
    })
  }, [baseTasks, onDraft])
  const updateTaskDraft = useCallback((taskId, value) => {
    onDraft((current) => {
      const seed = current.extractedTasks?.length ? current.extractedTasks : baseTasks
      return {
        extractedTasks: seed.map((task) => (task.id === taskId ? { ...task, text: value, label: value } : task)),
      }
    })
  }, [baseTasks, onDraft])

  return (
    <div className="space-y-5">
      {hasDanger ? <div className="rounded-lg border border-rose-300 bg-rose-100 px-4 py-3"><p className="text-xs font-bold uppercase tracking-wider text-rose-700">Contre-indication</p><p className="mt-1 text-sm text-rose-700">Un médicament proposé entre en conflit avec les allergies documentées.</p></div> : null}
      <PanelCard title="Plan de traitement contextuel" bodyClassName="p-4">
        <div className="space-y-3">
          {tasks.map((task) => (
            task.isEditing ? (
              <div key={task.id} className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" checked={Boolean(task.done)} disabled className="h-4 w-4 rounded border-slate-300 text-blue-600 opacity-50" />
                <input
                  type="text"
                  autoFocus
                  value={task.text ?? task.label ?? ''}
                  onChange={(event) => updateTaskDraft(task.id, event.target.value)}
                  onBlur={() => commitTaskEdit(task.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitTaskEdit(task.id)
                    }
                  }}
                  className="w-full border-b border-emerald-500 bg-transparent pb-1 text-sm text-slate-700 focus:outline-none"
                  placeholder="Nom de la tâche clinique..."
                />
              </div>
            ) : (
              <label key={task.id} className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" checked={Boolean(task.done)} onChange={() => toggleTask(task.id)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className={task.done ? 'text-slate-400 line-through' : ''}>{task.text ?? task.label}</span>
              </label>
            )
          ))}
          <button
            type="button"
            className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
            onClick={() => {
              onDraft((current) => {
                const seed = current.extractedTasks?.length ? current.extractedTasks : baseTasks
                return { extractedTasks: [...seed, { id: `custom_${Date.now()}`, text: '', label: '', done: false, isEditing: true }] }
              })
              onNotify?.({ title: 'Tâche ajoutée', description: 'Une nouvelle tâche clinique a été ajoutée au plan contextuel.' })
            }}
          >
            + Ajouter une tâche
          </button>
        </div>
      </PanelCard>
      <PanelCard title="Ordonnance médicamenteuse" bodyClassName="p-4">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">{typeBadges.map((badge) => <button key={badge} type="button" onClick={() => setSearch(badge)} className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">{badge}</button>)}</div>
          <div className="relative"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un médicament..." className={cx(INPUT, 'pl-10')} /><Pill className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" /></div>
          <div className="space-y-3">
            {filteredMedications.map((medication) => {
              const danger = isDangerousMedication(medication, allergies)
              return <div key={medication.id} className={cx('rounded-lg border px-4 py-3 transition', danger ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50')}><p className="text-sm font-bold text-slate-900">{medication.nom}</p>{medication.detail ? <p className="mt-1 text-sm text-slate-600">{medication.detail}</p> : null}{medication.posologie ? <p className="mt-1 text-sm text-slate-600">{medication.posologie}</p> : null}{danger ? <p className="mt-2 text-xs font-medium text-rose-600">Conflit avec allergie documentée.</p> : null}</div>
            })}
            {!filteredMedications.length ? <p className="text-sm text-slate-400">Aucun médicament correspondant.</p> : null}
          </div>
          <div className="flex items-center gap-3"><button type="button" onClick={() => { setSearch(''); onNotify?.({ title: 'Recherche effacée', description: "La recherche d'ordonnance a été réinitialisée." }) }} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300">Annuler</button><button type="button" onClick={onOrdonnance} className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">Valider</button></div>
        </div>
      </PanelCard>
    </div>
  )
}

function OverviewRightRail({ templateKey, draft, allergies, upcomingLabel, onAction }) {
  const medications = treatmentFromDraft(draft, templateKey).slice(0, 2)
  const actions = [
    ['consultation', 'Nouvelle Consultation', Plus],
    ['ordonnance', 'Nouvelle Ordonnance', FileText],
    ['bilan', 'Demander un Bilan', FlaskConical],
    ['whatsapp', 'WhatsApp', MessageCircle],
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-900">Traitement en Cours</h3>
        <div className="space-y-2">
          {medications.map((medication) => (
            <div key={medication.id} className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 p-2">
              <Pill className="h-3.5 w-3.5 text-blue-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{medication.nom}</p>
                <p className="text-xs text-slate-500">{medication.posologie || medication.detail || 'Posologie à confirmer'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-900">Prochaines Échéances</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <FlaskConical className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-slate-600">Bilan sanguin</span>
            <span className="ml-auto text-xs font-medium text-amber-600">En attente</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-slate-600">RDV Contrôle</span>
            <span className="ml-auto text-xs text-slate-500">{upcomingLabel.replace('Prochain RDV : ', '')}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-900">Actions Rapides</h3>
        <div className="grid grid-cols-2 gap-2">
          {actions.map(([key, label, Icon], index) => (
            <button
              key={key}
              type="button"
              onClick={() => onAction(key)}
              className={cx(
                'flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 p-3 text-center transition-all hover:border-blue-300 hover:bg-blue-50',
                index === 4 ? 'col-span-2' : '',
              )}
            >
              <Icon className="h-[18px] w-[18px] text-blue-600" />
              <span className="text-[11px] font-medium text-slate-700">{label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}

function DocumentsSection({ documents }) {
  return (
    <PanelCard title="Documents cliniques" action={<span className="text-xs text-slate-400">{documents.length} fichier{documents.length > 1 ? 's' : ''}</span>}>
      <div className="space-y-3">
        {documents.length ? documents.map((document) => <div key={document.id} className="rounded-lg border border-slate-200 bg-white px-4 py-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-800">{document.nom_fichier}</p><p className="mt-1 text-xs text-slate-400">{document.type_document || 'Document clinique'} • {formatDate(document.created_at)}</p></div><FolderOpen className="h-4 w-4 text-slate-400" /></div></div>) : <p className="text-sm text-slate-500">Aucun document disponible pour ce patient.</p>}
      </div>
    </PanelCard>
  )
}

function OrdonnancesSection({ draft, templateKey, onOrdonnance }) {
  const medications = treatmentFromDraft(draft, templateKey)
  return (
    <PanelCard title="Ordonnances" action={<button type="button" onClick={onOrdonnance} className="text-sm font-medium text-blue-600 transition hover:text-blue-700">Ouvrir le générateur</button>}>
      <div className="space-y-3">{medications.map((medication) => <div key={medication.id} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4"><p className="text-sm font-bold text-slate-900">{medication.nom}</p>{medication.posologie ? <p className="mt-1 text-sm text-slate-500">{medication.posologie}</p> : null}</div>)}</div>
    </PanelCard>
  )
}

function GynecoSection({ gynecoData, obstetrique = false }) {
  const cards = obstetrique ? [['DDR', gynecoData.ddr], ['Terme', termFromDDR(gynecoData.ddr) || '--'], ['G', gynecoData.g], ['P', gynecoData.p], ['A', gynecoData.a]] : [['Contraception', gynecoData.contraception], ['Cycle', gynecoData.cycle], ['Dernier frottis', gynecoData.dernierFrottis]]
  return (
    <PanelCard title={obstetrique ? 'Suivi obstétrical' : 'Suivi gynécologique'}>
      <div className={cx('grid gap-3', obstetrique ? 'sm:grid-cols-3 lg:grid-cols-5' : 'sm:grid-cols-3')}>{cards.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4"><p className={META}>{label}</p><p className="mt-2 text-sm font-semibold text-slate-900">{value}</p></div>)}</div>
    </PanelCard>
  )
}

export default function PatientWorkspaceV2() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id: patientId, consultationId } = useParams()
  const [searchParams] = useSearchParams()
  const { notify, profile, cabinetSpecialite, specialiteKey } = useAppContext()
  const templateKey = templateFrom(cabinetSpecialite || specialiteKey)
  const items = NAV[templateKey]
  const sectionFromRoute = consultationId ? 'consultation' : searchParams.get('section') || DEFAULT_SECTION
  const activeRouteSection = items.some(([key]) => key === sectionFromRoute) ? sectionFromRoute : DEFAULT_SECTION
  const localKey = storageKey(patientId, consultationId)
  const [activeSection, setActiveSection] = useState(activeRouteSection)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isFinalized, setIsFinalized] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [hasDraftInput, setHasDraftInput] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [ordonnanceOpen, setOrdonnanceOpen] = useState(false)
  const [showAiSummary, setShowAiSummary] = useState(false)
  const [aiSummaryText, setAiSummaryText] = useState('')
  const [speechTarget, setSpeechTarget] = useState(null)
  const [speechError, setSpeechError] = useState('')
  const speechRef = useRef(null)
  const dashboardQuery = useQuery({ queryKey: ['patient-dashboard', patientId], queryFn: () => getPatientDashboardData(patientId), enabled: Boolean(patientId), staleTime: 60_000, retry: 1 })
  const patient = dashboardQuery.data?.patient || null
  const consultations = dashboardQuery.data?.consultations || []
  const documents = dashboardQuery.data?.documents || []
  const currentConsultation = useMemo(() => consultations.find((item) => item.id === consultationId) || null, [consultationId, consultations])
  const allergies = useMemo(() => parseAllergies(patient?.allergies), [patient?.allergies])
  const gynecoData = useMemo(() => ({ contraception: searchParams.get('contraception') || 'Non renseignée', cycle: searchParams.get('cycle') || 'Non renseigné', dernierFrottis: searchParams.get('frottis') || 'Non renseigné', ddr: searchParams.get('ddr') || 'Non renseignée', g: searchParams.get('g') || '--', p: searchParams.get('p') || '--', a: searchParams.get('a') || '--' }), [searchParams])
  const timelineEntries = useMemo(() => {
    if (!consultations.length) return mockTimelineEntries(templateKey)
    return consultations.map((consultation, index) => {
      const nextDraft = draftFromNotes(consultation.notes, consultation)
      const motif = previewText(nextDraft.motif, 'Consultation générale')
      return { id: consultation.id, date: formatDate(consultation.date_consult), title: motif, motif, preview: previewText(nextDraft.conclusion || nextDraft.examenClinique || consultation.notes, 'Aucun résumé disponible.'), doctor: consultation.medecin_nom || consultation.doctor || 'Dr. MacroMedica', authorInitials: consultation.medecin_nom ? consultation.medecin_nom.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() : ['DR', 'MK', 'DT'][index] || 'DR', hasOrdonnance: Boolean(nextDraft.ordonnance?.trim()), hasLab: Boolean(nextDraft.examenClinique?.toLowerCase().includes('bilan') || nextDraft.conclusion?.toLowerCase().includes('bilan')), fullText: previewText(nextDraft.examenClinique || nextDraft.conclusion, 'Aucun détail complémentaire.'), metrics: [['Tension', `${nextDraft.constantes?.tension_systolique || '128'}/${nextDraft.constantes?.tension_diastolique || '82'}`], ['FC', nextDraft.constantes?.frequence_cardiaque || '72'], ['Poids', nextDraft.constantes?.poids || '82 kg']] }
    })
  }, [consultations, templateKey])
  const upcomingLabel = useMemo(() => {
    const latest = consultations[0]
    if (!latest?.date_consult) return 'Prochain contrôle à planifier'
    const next = new Date(latest.date_consult)
    next.setDate(next.getDate() + 30)
    return `Prochain RDV : ${formatDate(next.toISOString())}`
  }, [consultations])
  const mutateDraft = useCallback((patcher) => {
    setDraft((current) => {
      const patch = typeof patcher === 'function' ? patcher(current) : patcher
      return { ...current, ...patch }
    })
    setIsDirty(true)
  }, [])

  useEffect(() => {
    if (!patientId) return
    const localDraftRaw = localStorage.getItem(localKey)
    let nextDraft = currentConsultation ? draftFromNotes(currentConsultation.notes, currentConsultation) : { ...EMPTY_DRAFT, antecedents: patient?.antecedents || '' }
    if (localDraftRaw) { try { nextDraft = { ...nextDraft, ...JSON.parse(localDraftRaw) } } catch {} }
    setDraft(nextDraft)
    setLastSavedAt(nextDraft.updatedAt || currentConsultation?.created_at || null)
    setIsFinalized(nextDraft.workflowStatus === 'finalized')
    setIsDirty(false)
    setHasDraftInput(false)
    setShowAiSummary(false)
    setAiSummaryText('')
  }, [currentConsultation, localKey, patient?.antecedents, patientId])

  useEffect(() => { setActiveSection(activeRouteSection) }, [activeRouteSection])

  useEffect(() => {
    if (!isDirty || isFinalized) return undefined
    const timeout = window.setTimeout(() => {
      const savedAt = new Date().toISOString()
      localStorage.setItem(localKey, JSON.stringify({ ...draft, updatedAt: savedAt }))
      setLastSavedAt(savedAt)
    }, 5000)
    return () => window.clearTimeout(timeout)
  }, [draft, isDirty, isFinalized, localKey])

  useEffect(() => () => { if (speechRef.current) speechRef.current.stop() }, [])

  const startConsultation = useCallback(() => {
    localStorage.removeItem(localKey)
    const nextDraft = { ...EMPTY_DRAFT, antecedents: patient?.antecedents || '' }
    setDraft(nextDraft)
    setIsDirty(false)
    setIsFinalized(false)
    setLastSavedAt(null)
    setHasDraftInput(false)
    setShowAiSummary(false)
    setAiSummaryText('')
    setActiveSection('consultation')
    navigate(`/patients/${patientId}${sectionSearch('consultation')}`, { replace: false })
  }, [localKey, navigate, patient?.antecedents, patientId])

  const persist = useCallback(async ({ finalize = false, draftOverride } = {}) => {
    if (!patientId || !profile?.cabinet_id) return null
    const nextDraft = { ...(draftOverride || draft), workflowStatus: finalize ? 'finalized' : 'draft', updatedAt: new Date().toISOString() }
    setIsSaving(true)
    try {
      const payload = { cabinet_id: profile.cabinet_id, patient_id: patientId, montant: currentConsultation?.montant || 0, statut: currentConsultation?.statut || 'paye', date_consult: currentConsultation?.date_consult || new Date().toISOString().slice(0, 10), notes: draftPayload(nextDraft) }
      const saved = currentConsultation?.id ? await updateConsultation(currentConsultation.id, payload) : await createConsultation(payload)
      localStorage.removeItem(localKey)
      setDraft(nextDraft)
      setIsDirty(false)
      setLastSavedAt(nextDraft.updatedAt)
      setIsFinalized(finalize)
      await queryClient.invalidateQueries({ queryKey: ['patient-dashboard', patientId] })
      if (!consultationId || consultationId !== saved.id) navigate(`/patients/${patientId}/consultations/${saved.id}`, { replace: true })
      return saved
    } catch (error) {
      notify({ title: finalize ? 'Clôture impossible' : 'Sauvegarde impossible', description: error?.message || "Une erreur s'est produite.", tone: 'error' })
      return null
    } finally { setIsSaving(false) }
  }, [consultationId, currentConsultation, draft, localKey, navigate, notify, patientId, profile?.cabinet_id, queryClient])

  const openWhatsApp = useCallback(() => {
    const phone = whatsappPhone(patient?.telephone)
    if (!phone) { notify({ title: 'WhatsApp indisponible', description: 'Ajoutez un numéro de téléphone valide dans le dossier patient.', tone: 'error' }); return }
    const fullName = `${patient?.prenom || ''} ${patient?.nom || ''}`.trim()
    const text = encodeURIComponent(`Bonjour ${fullName}, nous revenons vers vous au sujet de votre dossier MacroMedica.`)
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer')
  }, [notify, patient?.nom, patient?.prenom, patient?.telephone])

  const toggleSpeech = useCallback((field) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { setSpeechError("La reconnaissance vocale n'est pas disponible sur cet appareil."); return }
    if (speechRef.current && speechTarget === field) { speechRef.current.stop(); speechRef.current = null; setSpeechTarget(null); return }
    if (speechRef.current) speechRef.current.stop()
    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onstart = () => { setSpeechError(''); setSpeechTarget(field) }
    recognition.onend = () => { setSpeechTarget(null); speechRef.current = null }
    recognition.onerror = (event) => { setSpeechError(event.error || 'Erreur micro'); setSpeechTarget(null); speechRef.current = null }
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((entry) => entry.isFinal)
        .map((entry) => entry[0]?.transcript || '')
        .join(' ')
        .trim()
      if (!text) return
      if (['motif', 'antecedents', 'examenClinique'].includes(field)) setHasDraftInput(true)
      mutateDraft((current) => ({ [field]: `${current[field] || ''}${current[field] ? ' ' : ''}${text}`.trim() }))
    }
    speechRef.current = recognition
    recognition.start()
  }, [mutateDraft, speechTarget])

  const handleFormatAction = useCallback((sectionTitle, action) => {
    const actionLabel = action === 'bold' ? 'gras' : action === 'italic' ? 'italique' : 'liste'
    notify({ title: 'Mise en forme', description: `Le raccourci ${actionLabel} a été activé pour "${sectionTitle}".` })
  }, [notify])

  const handleGenerateSummary = useCallback(() => {
    const nextSummary = buildMockAiSummary(patient, draft, templateKey)
    setAiSummaryText(nextSummary)
    setShowAiSummary(true)
    notify({ title: 'Résumé IA prêt', description: 'Une synthèse clinique mock a été générée pour relecture.' })
  }, [draft, notify, patient, templateKey])

  const handleFieldChange = useCallback((field, value) => {
    if (['motif', 'antecedents', 'examenClinique'].includes(field)) setHasDraftInput(true)
    mutateDraft({ [field]: value })
  }, [mutateDraft])

  const handleSaveSummaryOnly = useCallback(() => {
    setShowAiSummary(false)
    notify({ title: 'Résumé IA sauvegardé', description: 'Le résumé a été enregistré séparément des notes de consultation.' })
  }, [notify])

  const handleSaveNotesOnly = useCallback(async () => {
    const saved = await persist()
    if (saved) {
      setShowAiSummary(false)
      notify({ title: 'Notes sauvegardées', description: 'Les notes de consultation ont été enregistrées sans le résumé IA.' })
    }
  }, [notify, persist])

  const handleSaveSummaryAndNotes = useCallback(async () => {
    const mergedDraft = {
      ...draft,
      conclusion: draft.conclusion?.trim()
        ? `${draft.conclusion.trim()}\n\nRésumé IA\n${aiSummaryText}`
        : aiSummaryText,
    }
    const saved = await persist({ draftOverride: mergedDraft })
    if (saved) {
      setShowAiSummary(false)
      notify({ title: 'Résumé + notes sauvegardés', description: 'Le résumé IA a été intégré à la conclusion puis sauvegardé avec les notes.' })
    }
  }, [aiSummaryText, draft, notify, persist])

  const handleSection = useCallback((section) => {
    if (section === 'consultation') { startConsultation(); return }
    setActiveSection(section)
    navigate(`/patients/${patientId}${sectionSearch(section)}`, { replace: false })
  }, [navigate, patientId, startConsultation])

  if (dashboardQuery.isLoading) return <div className="flex flex-1 items-center justify-center bg-slate-50 text-slate-500">Chargement du dossier patient...</div>
  if (!patient) return <div className="flex flex-1 items-center justify-center bg-slate-50 p-8"><div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700 shadow-sm">Patient introuvable.</div></div>

  const consultationMode = Boolean(consultationId) || activeSection === 'consultation'
  const centerContent = consultationMode ? <ConsultationWorkspace templateKey={templateKey} draft={draft} lastSavedAt={lastSavedAt} hasDraftInput={hasDraftInput} speechTarget={speechTarget} speechError={speechError} isSaving={isSaving} showAiSummary={showAiSummary} aiSummaryText={aiSummaryText} onField={handleFieldChange} onSpeech={toggleSpeech} onFormat={handleFormatAction} onSave={async () => { const saved = await persist(); if (saved) notify({ title: 'Consultation sauvegardée', description: 'Le brouillon de consultation a été enregistré.' }) }} onGenerateSummary={handleGenerateSummary} onSaveSummaryOnly={handleSaveSummaryOnly} onSaveNotesOnly={handleSaveNotesOnly} onSaveSummaryAndNotes={handleSaveSummaryAndNotes} /> : activeSection === 'ordonnances' ? <OrdonnancesSection draft={draft} templateKey={templateKey} onOrdonnance={() => setOrdonnanceOpen(true)} /> : activeSection === 'documents' ? <DocumentsSection documents={documents} /> : activeSection === 'suivi-gynecologique' ? <GynecoSection gynecoData={gynecoData} /> : activeSection === 'obstetrique' ? <GynecoSection gynecoData={gynecoData} obstetrique /> : <div className="space-y-5"><PanoramaCard patient={patient} allergies={allergies} draft={draft} consultations={consultations} gynecoData={gynecoData} templateKey={templateKey} upcomingLabel={upcomingLabel} /><HistoryTimeline entries={timelineEntries} expandedId={expandedId} onToggle={(id) => setExpandedId((current) => (current === id ? null : id))} onOpen={(id) => navigate(`/patients/${patientId}/consultations/${id}`, { replace: false })} onEmpty={startConsultation} /></div>

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <PatientHeader patient={patient} templateKey={templateKey} onBack={() => navigate('/patients')} onWhatsApp={openWhatsApp} onStart={startConsultation} />
      <div className="w-full flex-1 overflow-x-auto overflow-y-hidden">
        <div
          className="grid h-full w-full items-start gap-6 p-6"
          style={{
            maxWidth: '1600px',
            minWidth: '1280px',
            margin: '0 auto',
            gridTemplateColumns: '250px minmax(0, 1fr) 320px',
          }}
        >
          <aside className="min-h-0" style={{ width: '250px' }}>
            <LeftRail patient={patient} allergies={allergies} templateKey={templateKey} gynecoData={gynecoData} items={items} activeSection={consultationMode ? 'consultation' : activeSection} draft={draft} onSection={handleSection} onWhatsApp={openWhatsApp} />
          </aside>
          <main className="min-h-0 min-w-0 space-y-6 overflow-y-auto pr-1">{centerContent}</main>
          <aside className="min-h-0" style={{ width: '320px' }}>
            {consultationMode ? (
              <ConsultationRightRail templateKey={templateKey} draft={draft} allergies={allergies} onDraft={mutateDraft} onOrdonnance={() => setOrdonnanceOpen(true)} onNotify={notify} />
            ) : (
              <OverviewRightRail
                templateKey={templateKey}
                draft={draft}
                allergies={allergies}
                upcomingLabel={upcomingLabel}
                onAction={(key) => {
                  if (key === 'consultation') { startConsultation(); return }
                  if (key === 'ordonnance') { setOrdonnanceOpen(true); return }
                  if (key === 'whatsapp') { openWhatsApp(); return }
                  notify({ title: 'Action contextuelle', description: "Cette action sera branchée au workflow du cabinet." })
                }}
              />
            )}
          </aside>
        </div>
      </div>

      <BilingualOrdonnanceFormModal open={ordonnanceOpen} onClose={() => setOrdonnanceOpen(false)} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['patient-dashboard', patientId] })} initialPatientId={patientId} initialDate={(currentConsultation?.date_consult || new Date().toISOString()).slice(0, 10)} initialMedications={draft.medications} initialInstructions={draft.ordonnance || draft.conclusion} />
    </div>
  )
}
