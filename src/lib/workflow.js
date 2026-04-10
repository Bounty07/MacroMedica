export const RDV_STATUSES = {
  SCHEDULED: 'confirme',
  ARRIVED: 'arrive',
  IN_CONSULTATION: 'en_consultation',
  COMPLETED: 'termine',
  PAID: 'paye',
  CREDIT: 'credit',
  CANCELLED: 'annule',
  ABSENT: 'absent'
}

// Strict UI transition enforcement
// Format: current_status: [allowed_next_statuses]
const TRANSITIONS = {
  [RDV_STATUSES.SCHEDULED]: [RDV_STATUSES.ARRIVED, RDV_STATUSES.ABSENT, RDV_STATUSES.CANCELLED],
  [RDV_STATUSES.ARRIVED]: [RDV_STATUSES.IN_CONSULTATION, RDV_STATUSES.CANCELLED],
  [RDV_STATUSES.IN_CONSULTATION]: [RDV_STATUSES.COMPLETED],
  [RDV_STATUSES.COMPLETED]: [RDV_STATUSES.PAID, RDV_STATUSES.CREDIT],
  [RDV_STATUSES.PAID]: [],
  [RDV_STATUSES.CREDIT]: [],
  [RDV_STATUSES.CANCELLED]: [],
  [RDV_STATUSES.ABSENT]: []
}

/**
 * Validates if the workflow can transition from the current status to the new status.
 * @param {string} currentStatus - The existing status
 * @param {string} targetStatus - The intended new status
 * @returns {boolean} True if transition is valid
 * @throws {Error} if the transition is invalid
 */
export function isValidTransition(currentStatus, targetStatus) {
  const current = currentStatus || RDV_STATUSES.SCHEDULED
  const validTargets = TRANSITIONS[current] || []
  
  if (!validTargets.includes(targetStatus)) {
    throw new Error(`Transition invalide de '${current}' vers '${targetStatus}'`)
  }
  
  return true
}
