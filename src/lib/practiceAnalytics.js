const DEFAULT_LOOKBACK_DAYS = 60
const REVIEW_TABLE_CANDIDATES = ['patient_reviews', 'reviews', 'avis_patients', 'clinic_reviews']
const MAX_REASONABLE_WAIT_MINUTES = 240
const MAX_REASONABLE_DURATION_MINUTES = 240
const MAX_REASONABLE_BOOKING_HOURS = 24 * 180
const NO_SHOW_STATUSES = new Set(['annule', 'annulee', 'annulé', 'annulée', 'absent', 'non presente', 'non presentee', 'non présenté', 'non présentée', 'no_show'])
const ARRIVED_STATUSES = new Set(['arrive', 'arrived'])
const IN_CONSULTATION_STATUSES = new Set(['en_consultation', 'in_consultation'])
const COMPLETED_STATUSES = new Set(['termine', 'completed', 'paye', 'paid', 'credit'])
const missingReviewTables = new Set()
let cachedWorkingReviewTable = null

function roundTo(value, digits = 1) {
  if (!Number.isFinite(value)) return null
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function median(values) {
  if (!Array.isArray(values) || values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }
  return sorted[middle]
}

function parseDateValue(value) {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function pickDate(record, keys) {
  for (const key of keys) {
    const parsed = parseDateValue(record?.[key])
    if (parsed) return parsed
  }
  return null
}

function diffMinutes(start, end) {
  if (!start || !end) return null
  return (end.getTime() - start.getTime()) / 60000
}

function diffHours(start, end) {
  if (!start || !end) return null
  return (end.getTime() - start.getTime()) / 3600000
}

function clampPositive(value, maxValue) {
  if (!Number.isFinite(value) || value < 0 || value > maxValue) return null
  return value
}

function parseNumberish(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const match = value.match(/(\d+(?:[.,]\d+)?)/)
  if (!match) return null

  const parsed = Number(match[1].replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function extractReviewScore(review) {
  const scoreKeys = ['rating', 'score', 'stars', 'note', 'review_rating', 'patient_rating']

  for (const key of scoreKeys) {
    const parsed = parseNumberish(review?.[key])
    if (parsed && parsed >= 0 && parsed <= 5) return parsed
  }

  return null
}

function extractReviewComment(review) {
  const commentKeys = ['comment', 'message', 'content', 'review', 'avis', 'feedback', 'notes']

  for (const key of commentKeys) {
    const value = review?.[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function normalizeStatus(appointment) {
  return String(appointment?.status || appointment?.statut || '').toLowerCase()
}

function normalizeVisitReason(value) {
  if (typeof value !== 'string' || !value.trim()) return null

  const compact = value
    .split(/\r?\n|[.;]/)[0]
    .split(',')[0]
    .trim()
    .replace(/\s+/g, ' ')

  if (!compact) return null
  if (compact.length <= 48) return compact
  return `${compact.slice(0, 45).trim()}...`
}

function extractVisitReason(record) {
  const reasonKeys = ['motif', 'visit_reason', 'reason', 'consultation_reason', 'notes']

  for (const key of reasonKeys) {
    const normalized = normalizeVisitReason(record?.[key])
    if (normalized) return normalized
  }

  return 'Motif non precise'
}

function buildConsultationLookup(consultations) {
  const byRdvId = new Map()
  const byPatientId = new Map()

  consultations.forEach((consultation) => {
    if (consultation?.rdv_id) {
      byRdvId.set(consultation.rdv_id, consultation)
    }

    if (!consultation?.patient_id) return

    const list = byPatientId.get(consultation.patient_id) || []
    list.push(consultation)
    list.sort((left, right) => {
      const leftDate = pickDate(left, ['created_at', 'updated_at', 'date_consult'])?.getTime() || 0
      const rightDate = pickDate(right, ['created_at', 'updated_at', 'date_consult'])?.getTime() || 0
      return leftDate - rightDate
    })
    byPatientId.set(consultation.patient_id, list)
  })

  return { byRdvId, byPatientId }
}

function matchConsultationForAppointment(appointment, lookup) {
  if (appointment?.id && lookup.byRdvId.has(appointment.id)) {
    return lookup.byRdvId.get(appointment.id)
  }

  if (!appointment?.patient_id) return null

  const scheduledAt = pickDate(appointment, ['date_rdv'])
  if (!scheduledAt) return null

  const candidates = lookup.byPatientId.get(appointment.patient_id) || []
  let bestMatch = null
  let bestDelta = Number.POSITIVE_INFINITY

  candidates.forEach((consultation) => {
    const consultationAt = pickDate(consultation, ['created_at', 'updated_at'])
    if (!consultationAt) return

    const deltaMinutes = Math.abs(diffMinutes(scheduledAt, consultationAt))
    if (!Number.isFinite(deltaMinutes) || deltaMinutes > 12 * 60) return

    if (deltaMinutes < bestDelta) {
      bestDelta = deltaMinutes
      bestMatch = consultation
    }
  })

  return bestMatch
}

function getWaitObservation(appointment, matchedConsultation) {
  const scheduledAt = pickDate(appointment, ['date_rdv'])
  const status = normalizeStatus(appointment)

  if (!scheduledAt) {
    return { minutes: null, estimated: true }
  }

  const explicitStart = pickDate(appointment, [
    'consultation_started_at',
    'started_at',
    'prise_en_charge_at',
    'start_time',
  ])

  if (explicitStart) {
    return {
      minutes: clampPositive(diffMinutes(scheduledAt, explicitStart), MAX_REASONABLE_WAIT_MINUTES),
      estimated: false,
    }
  }

  const inferredStart = pickDate(matchedConsultation, ['started_at', 'created_at'])
  if (inferredStart) {
    return {
      minutes: clampPositive(diffMinutes(scheduledAt, inferredStart), MAX_REASONABLE_WAIT_MINUTES),
      estimated: true,
    }
  }

  if (ARRIVED_STATUSES.has(status) || IN_CONSULTATION_STATUSES.has(status)) {
    const updatedAt = pickDate(appointment, ['updated_at'])
    return {
      minutes: clampPositive(diffMinutes(scheduledAt, updatedAt), MAX_REASONABLE_WAIT_MINUTES),
      estimated: true,
    }
  }

  return { minutes: null, estimated: true }
}

function getConsultationDurationObservation(appointment, matchedConsultation) {
  const explicitStart = pickDate(appointment, [
    'consultation_started_at',
    'started_at',
    'prise_en_charge_at',
    'start_time',
  ]) || pickDate(matchedConsultation, ['started_at', 'created_at'])

  const explicitEnd = pickDate(appointment, [
    'consultation_completed_at',
    'completed_at',
    'ended_at',
    'end_time',
  ]) || pickDate(matchedConsultation, ['ended_at', 'completed_at', 'updated_at'])

  const explicitDuration = clampPositive(
    diffMinutes(explicitStart, explicitEnd),
    MAX_REASONABLE_DURATION_MINUTES,
  )

  if (explicitDuration !== null) {
    const isEstimated = !pickDate(appointment, [
      'consultation_started_at',
      'started_at',
      'prise_en_charge_at',
      'start_time',
      'consultation_completed_at',
      'completed_at',
      'ended_at',
      'end_time',
    ])

    return { minutes: explicitDuration, estimated: isEstimated }
  }

  const status = normalizeStatus(appointment)
  if (!COMPLETED_STATUSES.has(status)) {
    return { minutes: null, estimated: true }
  }

  const fallbackStart = pickDate(matchedConsultation, ['created_at'])
  const fallbackEnd = pickDate(appointment, ['updated_at'])

  return {
    minutes: clampPositive(diffMinutes(fallbackStart, fallbackEnd), MAX_REASONABLE_DURATION_MINUTES),
    estimated: true,
  }
}

function buildMetricSummary(values, estimatedCount) {
  const filteredValues = values.filter((value) => Number.isFinite(value))

  return {
    sampleCount: filteredValues.length,
    average: roundTo(average(filteredValues)),
    median: roundTo(median(filteredValues)),
    max: roundTo(filteredValues.length ? Math.max(...filteredValues) : null),
    estimated: filteredValues.length > 0 ? estimatedCount >= filteredValues.length : false,
    estimatedSamples: estimatedCount,
  }
}

export async function loadPracticeAnalyticsSourceData({
  client,
  cabinetId,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
}) {
  if (!client || !cabinetId) {
    return {
      lookbackDays,
      appointments: [],
      consultations: [],
      reviews: [],
      reviewSource: null,
    }
  }

  const since = new Date()
  since.setDate(since.getDate() - lookbackDays)

  const sinceIso = since.toISOString()
  const sinceDateValue = sinceIso.slice(0, 10)

  const [appointmentsResult, consultationsResult, reviewResult] = await Promise.all([
    client
      .from('rdv')
      .select('*')
      .eq('cabinet_id', cabinetId)
      .gte('date_rdv', sinceIso)
      .order('date_rdv', { ascending: false })
      .limit(500),
    client
      .from('consultations')
      .select('*')
      .eq('cabinet_id', cabinetId)
      .gte('date_consult', sinceDateValue)
      .order('date_consult', { ascending: false })
      .limit(500),
    loadPracticeReviewData({ client, cabinetId }),
  ])

  if (appointmentsResult.error) throw appointmentsResult.error
  if (consultationsResult.error) throw consultationsResult.error

  return {
    lookbackDays,
    appointments: appointmentsResult.data || [],
    consultations: consultationsResult.data || [],
    reviews: reviewResult.rows,
    reviewSource: reviewResult.table,
  }
}

async function loadPracticeReviewData({ client, cabinetId }) {
  if (cachedWorkingReviewTable && !missingReviewTables.has(cachedWorkingReviewTable)) {
    const preferredResult = await client
      .from(cachedWorkingReviewTable)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!preferredResult.error) {
      const rows = (preferredResult.data || []).filter((row) => !row?.cabinet_id || row.cabinet_id === cabinetId)
      return { table: cachedWorkingReviewTable, rows }
    }

    missingReviewTables.add(cachedWorkingReviewTable)
    cachedWorkingReviewTable = null
  }

  for (const table of REVIEW_TABLE_CANDIDATES) {
    if (missingReviewTables.has(table)) continue

    const result = await client
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (result.error) {
      missingReviewTables.add(table)
      continue
    }

    const rows = (result.data || []).filter((row) => !row?.cabinet_id || row.cabinet_id === cabinetId)
    cachedWorkingReviewTable = table
    return { table, rows }
  }

  return { table: null, rows: [] }
}

export function buildPracticeAnalyticsMetrics({
  appointments = [],
  consultations = [],
  reviews = [],
  reviewSource = null,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
}) {
  const consultationLookup = buildConsultationLookup(consultations)

  const waitTimes = []
  const consultationDurations = []
  const bookingLeadHours = []
  const reasonCounts = new Map()
  const appointmentStatusCounts = new Map()
  let noShowCount = 0
  let estimatedWaitSamples = 0
  let estimatedDurationSamples = 0

  appointments.forEach((appointment) => {
    const matchedConsultation = matchConsultationForAppointment(appointment, consultationLookup)
    const status = normalizeStatus(appointment)
    const reason = extractVisitReason(matchedConsultation || appointment)

    appointmentStatusCounts.set(status || 'inconnu', (appointmentStatusCounts.get(status || 'inconnu') || 0) + 1)
    reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1)
    if (NO_SHOW_STATUSES.has(status)) {
      noShowCount += 1
    }

    const waitObservation = getWaitObservation(appointment, matchedConsultation)
    if (waitObservation.minutes !== null) {
      waitTimes.push(waitObservation.minutes)
      if (waitObservation.estimated) estimatedWaitSamples += 1
    }

    const durationObservation = getConsultationDurationObservation(appointment, matchedConsultation)
    if (durationObservation.minutes !== null) {
      consultationDurations.push(durationObservation.minutes)
      if (durationObservation.estimated) estimatedDurationSamples += 1
    }

    const bookedAt = pickDate(appointment, ['created_at', 'booked_at'])
    const scheduledAt = pickDate(appointment, ['date_rdv'])
    const leadHours = clampPositive(diffHours(bookedAt, scheduledAt), MAX_REASONABLE_BOOKING_HOURS)
    if (leadHours !== null) {
      bookingLeadHours.push(leadHours)
    }
  })

  const reviewScores = reviews
    .map(extractReviewScore)
    .filter((value) => Number.isFinite(value))

  const reviewComments = reviews
    .map(extractReviewComment)
    .filter(Boolean)
    .slice(0, 3)

  const waitTime = buildMetricSummary(waitTimes, estimatedWaitSamples)
  const consultationDuration = buildMetricSummary(consultationDurations, estimatedDurationSamples)
  const bookingAverageHours = average(bookingLeadHours)
  const noShowRate = {
    totalAppointments: appointments.length,
    noShowCount,
    rate: appointments.length ? roundTo((noShowCount / appointments.length) * 100) : null,
  }
  const bookingLeadTime = {
    sampleCount: bookingLeadHours.length,
    averageHours: roundTo(bookingAverageHours),
    averageDays: bookingAverageHours === null ? null : roundTo(bookingAverageHours / 24),
    medianHours: roundTo(median(bookingLeadHours)),
    sameDayRate: bookingLeadHours.length
      ? roundTo((bookingLeadHours.filter((value) => value <= 24).length / bookingLeadHours.length) * 100)
      : null,
  }

  const notes = []
  if (waitTime.sampleCount > 0 && waitTime.estimated) {
    notes.push('Wait times are estimated from scheduling and status timestamps.')
  }
  if (consultationDuration.sampleCount > 0 && consultationDuration.estimated) {
    notes.push('Consultation durations are estimated from appointment and consultation update timestamps.')
  }
  if (!reviewSource) {
    notes.push('No dedicated review table was available in Supabase during this analysis window.')
  }

  const reviewMetrics = {
    sourceTable: reviewSource,
    count: reviewScores.length,
    averageRating: roundTo(average(reviewScores)),
    sampleComments: reviewComments,
  }

  const visitReasonDistribution = [...reasonCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6)

  const appointmentStatusBreakdown = [...appointmentStatusCounts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((left, right) => right.count - left.count)

  const hasSufficientData = [
    noShowRate.totalAppointments,
    waitTime.sampleCount,
    consultationDuration.sampleCount,
    bookingLeadTime.sampleCount,
    reviewMetrics.count,
  ].some((count) => count >= 2)

  return {
    generatedAt: new Date().toISOString(),
    lookbackDays,
    sourceCounts: {
      appointments: appointments.length,
      consultations: consultations.length,
      reviews: reviews.length,
    },
    noShowRate,
    reviews: reviewMetrics,
    waitTime,
    consultationDuration,
    bookingLeadTime,
    visitReasonDistribution,
    appointmentStatusBreakdown,
    notes,
    hasSufficientData,
  }
}
