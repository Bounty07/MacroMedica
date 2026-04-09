import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const email = process.env.DEMO_SEED_EMAIL || 'mohmazgouri555@gmail.com'
const password = process.env.DEMO_SEED_PASSWORD || 'hatimad133'

if (!url || !key) {
  throw new Error('Missing Supabase env vars')
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const ordonnancePayload = (medicaments) => JSON.stringify({
  type: 'ordonnance',
  medicaments: medicaments.map((nom) => ({ nom })),
})

async function main() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) throw authError

  const userId = authData.user.id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('cabinet_id')
    .eq('id', userId)
    .single()

  if (profileError) throw profileError

  const cabinetId = profile.cabinet_id

  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('*')
    .eq('cabinet_id', cabinetId)
    .order('created_at', { ascending: false })
    .limit(3)

  if (patientsError) throw patientsError
  if (!patients?.length) throw new Error('No patients found')

  const today = new Date()

  for (const [index, patient] of patients.entries()) {
    const antecedents = patient.antecedents || 'RGO ancien, episodes de fatigue saisonniere'
    const allergies = patient.allergies || 'Aucune allergie medicamenteuse connue'

    await supabase
      .from('patients')
      .update({
        antecedents,
        allergies,
        mutuelle: patient.mutuelle || 'CNOPS',
        numero_cnss: patient.numero_cnss || `CNSS-DEMO-${index + 1}`,
        adresse: patient.adresse || 'Rabat - Quartier Hassan',
      })
      .eq('id', patient.id)

    const consults = [
      {
        cabinet_id: cabinetId,
        patient_id: patient.id,
        montant: 300,
        statut: 'paye',
        date_consult: '2026-04-01',
        notes: 'Suivi recent avec amelioration globale. Transit plus stable, conseils dietetiques maintenus et controle clinique programme.',
      },
      {
        cabinet_id: cabinetId,
        patient_id: patient.id,
        montant: 250,
        statut: 'paye',
        date_consult: '2026-03-28',
        notes: 'Controle clinique satisfaisant. Douleurs abdominales en regression. Poursuite du traitement symptomatique pendant 5 jours.',
      },
      {
        cabinet_id: cabinetId,
        patient_id: patient.id,
        montant: 300,
        statut: 'credit',
        date_consult: '2026-02-16',
        notes: ordonnancePayload(['Paracetamol 1g', 'Spasfon', 'Omeprazole 20 mg']),
      },
      {
        cabinet_id: cabinetId,
        patient_id: patient.id,
        montant: 260,
        statut: 'paye',
        date_consult: '2025-11-26',
        notes: 'Episode febrile avec diarrhee. Bilan biologique demande, prise en charge symptomatique et surveillance rapprochee.',
      },
      {
        cabinet_id: cabinetId,
        patient_id: patient.id,
        montant: 220,
        statut: 'paye',
        date_consult: '2025-08-14',
        notes: 'Douleurs abdominales diffuses sans signe de gravite. Rehydratation orale et reevaluation clinique conseillee.',
      },
      {
        cabinet_id: cabinetId,
        patient_id: patient.id,
        montant: 200,
        statut: 'paye',
        date_consult: '2025-03-05',
        notes: 'Premiere consultation au cabinet pour troubles digestifs recurrents. Dossier initial constitue et plan de suivi etabli.',
      },
    ]

    const { data: insertedConsults, error: consultError } = await supabase
      .from('consultations')
      .insert(consults)
      .select()

    if (consultError) throw consultError

    const ordonnanceConsult = insertedConsults?.find((item) => String(item.notes || '').includes('"type":"ordonnance"'))

    const docs = [
      {
        cabinet_id: cabinetId,
        patient_id: patient.id,
        consultation_id: insertedConsults?.[0]?.id || null,
        type_document: 'fiche_cnss',
        nom_fichier: 'Bilan sanguin.pdf',
        storage_path: `demo/${patient.id}/bilan-sanguin.pdf`,
      },
      {
        cabinet_id: cabinetId,
        patient_id: patient.id,
        consultation_id: ordonnanceConsult?.id || null,
        type_document: 'ordonnance',
        nom_fichier: 'Ordonnance - Mars 2026',
        storage_path: `demo/${patient.id}/ordonnance-mars-2026.pdf`,
      },
      {
        cabinet_id: cabinetId,
        patient_id: patient.id,
        consultation_id: insertedConsults?.[0]?.id || null,
        type_document: 'recu_consultation',
        nom_fichier: 'Scan ordonnance mobile.jpg',
        storage_path: `demo/${patient.id}/scan-ordonnance-mobile.jpg`,
      },
    ]

    const { error: docsError } = await supabase.from('documents').insert(docs)
    if (docsError) throw docsError

    await supabase.from('rdv').insert({
      cabinet_id: cabinetId,
      patient_id: patient.id,
      date_rdv: new Date(today.getFullYear(), today.getMonth(), today.getDate() + index + 1, 10 + index, 0, 0).toISOString(),
      statut: 'confirme',
      notes: 'Rendez-vous de suivi de demonstration',
      rappel_envoye: false,
    })

    const poids = 72 + index * 5
    const taille = 168 + index * 3
    const imc = Number((poids / ((taille / 100) * (taille / 100))).toFixed(1))

    const { error: vitalsError } = await supabase.from('signes_vitaux').insert({
      patient_id: patient.id,
      cabinet_id: cabinetId,
      poids,
      taille,
      imc,
      tension_systolique: 120 + index * 2,
      tension_diastolique: 78 + index,
      frequence_cardiaque: 72 + index,
      temperature: 36.7,
      saturation: 98,
      measured_at: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 9 + index, 30, 0).toISOString(),
    })

    if (vitalsError && !String(vitalsError.message || '').includes('signes_vitaux')) {
      throw vitalsError
    }
  }

  await supabase.auth.signOut()
  console.log('Demo dossier data seeded successfully.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
