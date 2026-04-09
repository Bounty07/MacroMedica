const DEFAULT_TIMEZONE = 'Africa/Casablanca'
const DEFAULT_SLOT_MINUTES = 30

function getDateKey(value, timeZone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

export function formatScheduleTime(value, timeZone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function analyzeScheduleOptimization(
  rdvs,
  targetDateKey,
  {
    slotMinutes = DEFAULT_SLOT_MINUTES,
    timeZone = DEFAULT_TIMEZONE,
  } = {}
) {
  const slotDurationMs = slotMinutes * 60 * 1000
  const dayAppointments = (rdvs || [])
    .filter((rdv) => rdv?.date_rdv && getDateKey(rdv.date_rdv, timeZone) === targetDateKey)
    .slice()
    .sort((left, right) => new Date(left.date_rdv).getTime() - new Date(right.date_rdv).getTime())

  if (dayAppointments.length < 2) {
    return {
      possible: false,
      issues: [],
      suggestions: [],
      recoveredMinutes: 0,
    }
  }

  const anchoredStartMs = new Date(dayAppointments[0].date_rdv).getTime()
  const issues = []
  const suggestions = []
  let previousEndMs = anchoredStartMs + slotDurationMs
  let recoveredMinutes = 0

  dayAppointments.forEach((rdv, index) => {
    const originalStartMs = new Date(rdv.date_rdv).getTime()
    const suggestedStartMs = anchoredStartMs + (index * slotDurationMs)

    if (index > 0) {
      const deltaMinutes = Math.round((originalStartMs - previousEndMs) / 60000)

      if (deltaMinutes > 0) {
        issues.push({
          type: 'gap',
          minutes: deltaMinutes,
          appointmentId: rdv.id,
        })
        recoveredMinutes += deltaMinutes
      } else if (deltaMinutes < 0) {
        issues.push({
          type: 'overlap',
          minutes: Math.abs(deltaMinutes),
          appointmentId: rdv.id,
        })
      }
    }

    if (suggestedStartMs !== originalStartMs) {
      suggestions.push({
        id: rdv.id,
        patientLabel: rdv.patients
          ? [rdv.patients.prenom, rdv.patients.nom].filter(Boolean).join(' ').trim()
          : 'Patient',
        originalIso: new Date(originalStartMs).toISOString(),
        suggestedIso: new Date(suggestedStartMs).toISOString(),
        notes: rdv.notes || '',
      })
    }

    previousEndMs = originalStartMs + slotDurationMs
  })

  return {
    possible: issues.length > 0 && suggestions.length > 0,
    issues,
    suggestions,
    recoveredMinutes,
  }
}
