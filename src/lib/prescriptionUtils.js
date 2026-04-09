export function normalizePrescriptionText(value) {
  return String(value || '').trim()
}

export function buildBilingualText(frenchValue, englishValue, { fallbackToFrench = true } = {}) {
  const french = normalizePrescriptionText(frenchValue)
  const english = normalizePrescriptionText(englishValue) || (fallbackToFrench ? french : '')

  return {
    french,
    english,
  }
}

export function formatBilingualInlineText(frenchValue, englishValue) {
  const { french, english } = buildBilingualText(frenchValue, englishValue)

  if (!french) return english
  if (!english) return french
  if (french.toLowerCase() === english.toLowerCase()) return french

  return `${french} / ${english}`
}

export function createEmptyPrescriptionMedication() {
  return {
    id: Date.now().toString(),
    nom: '',
    nom_en: '',
    posologie: '',
    posologie_en: '',
    duree: '',
    duree_en: '',
  }
}
