const MOROCCO_TIMEZONE = 'Africa/Casablanca'

export function normalizeDoctorNotes(notes) {
  return (notes || '').replace(/\r\n/g, '\n').trim()
}

export function getMoroccoDateValue(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MOROCCO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function buildPatientConsultationPayload({
  cabinetId,
  patientId,
  notes,
  now = new Date(),
  montant = 0,
  statut = 'paye',
}) {
  const normalizedNotes = normalizeDoctorNotes(notes)

  if (!cabinetId) {
    throw new Error('Cabinet introuvable pour cette consultation.')
  }

  if (!patientId) {
    throw new Error('Patient introuvable pour cette consultation.')
  }

  if (!normalizedNotes) {
    throw new Error('Ajoutez une note clinique avant de sauvegarder.')
  }

  return {
    cabinet_id: cabinetId,
    patient_id: patientId,
    montant: Number(montant) || 0,
    statut,
    date_consult: getMoroccoDateValue(now),
    notes: normalizedNotes,
  }
}

export async function savePatientConsultation({
  supabaseClient,
  cabinetId,
  patientId,
  notes,
  now,
  montant,
  statut,
}) {
  const payload = buildPatientConsultationPayload({
    cabinetId,
    patientId,
    notes,
    now,
    montant,
    statut,
  })

  const { data, error } = await supabaseClient
    .from('consultations')
    .insert([payload])
    .select()
    .single()

  if (error) {
    throw error
  }

  return {
    consultation: data || payload,
    payload,
  }
}
