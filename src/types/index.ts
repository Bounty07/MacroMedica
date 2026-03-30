export type Role = 'medecin' | 'secretaire'
export type StatutConsultation = 'paye' | 'credit' | 'annule'
export type StatutAttente = 'en_attente' | 'en_consultation' | 'termine' | 'annule'
export type TypeDocument = 'recu_consultation' | 'fiche_cnss' | 'ordonnance' | 'recu_paiement'
export type TypeMessage = 'rappel_rdv' | 'confirmation_paiement' | 'envoi_recu'

export interface Cabinet {
  id: string
  tenant_id: string
  nom: string
  adresse?: string
  ville?: string
  telephone?: string
  created_at: string
}

export interface Profile {
  id: string
  cabinet_id: string
  role: Role
  nom_complet?: string
  created_at: string
}

export interface Patient {
  id: string
  cabinet_id: string
  nom: string
  prenom: string
  telephone?: string
  date_naissance?: string
  email?: string
  adresse?: string
  ville?: string
  sexe?: 'homme' | 'femme'
  groupe_sanguin?: string
  allergies?: string
  antecedents?: string
  mutuelle?: string
  medecin_referent?: string
  created_at: string
}

export interface Consultation {
  id: string
  cabinet_id: string
  patient_id: string
  montant: number
  statut: StatutConsultation
  date_consult: string
  notes?: string
  created_at: string
}

export interface SalleAttente {
  id: string
  cabinet_id: string
  statut: StatutAttente
  position: number
  heure_arrivee: string
  date_rdv: string
  notes?: string
  nom: string
  prenom: string
  telephone?: string
}

export interface Rdv {
  id: string
  cabinet_id: string
  patient_id: string
  date_rdv: string
  status: 'confirme' | 'arrive' | 'en_consultation' | 'termine' | 'paye' | 'credit' | 'absent' | 'annule'
  notes?: string
  rappel_envoye: boolean
  created_at: string
}

export interface Document {
  id: string
  cabinet_id: string
  patient_id?: string
  consultation_id?: string
  type_document: TypeDocument
  storage_path: string
  nom_fichier: string
  created_at: string
}

export interface MessageWhatsapp {
  id: string
  cabinet_id: string
  patient_id: string
  telephone: string
  type_message: TypeMessage
  contenu: string
  statut: 'en_attente' | 'envoye' | 'echec'
  whatsapp_id?: string
  created_at: string
  sent_at?: string
}

export interface VueCaMensuel {
  mois: string
  ca_paye: number
  ca_credit: number
  nb_consultations: number
}

export interface VueMetriquesJour {
  patients_aujourd_hui: number
  ca_aujourd_hui: number
  credits_aujourd_hui: number
}
