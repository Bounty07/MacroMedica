export type PatientStatus = 'actif' | 'nouveau' | 'suivi'
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled'
export type InvoiceStatus = 'paid' | 'pending' | 'overdue'

export type Patient = { id: string; firstName: string; lastName: string; birthDate: string; phone: string; email: string; address: string; bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'; allergies: string[]; city: string; status: PatientStatus }
export type Appointment = { id: string; patientId: string; date: string; time: string; type: string; doctor: string; notes: string; status: AppointmentStatus }
export type Consultation = { id: string; patientId: string; appointmentId?: string; date: string; motif: string; examenClinique: string; diagnostic: string; traitement: string; notes: string }
export type PrescriptionMedication = { id: string; name: string; dosage: string }
export type Prescription = { id: string; patientId: string; date: string; medications: PrescriptionMedication[]; duration: string; instructions: string; status: 'draft' | 'ready' | 'printed' }
export type InvoiceService = { id: string; label: string; amount: number }
export type Invoice = { id: string; patientId: string; date: string; services: InvoiceService[]; amount: number; notes: string; status: InvoiceStatus }
export type StaffMember = { id: string; name: string; role: string; phone: string; email: string }

export const initialPatients: Patient[] = [
  { id: 'pat_1', firstName: 'Ahmed', lastName: 'Benali', birthDate: '1987-06-14', phone: '+212612345678', email: 'ahmed.benali@gmail.com', address: '12 Rue Hassan II, Casablanca', bloodType: 'O+', allergies: ['Pénicilline'], city: 'Casablanca', status: 'actif' },
  { id: 'pat_2', firstName: 'Fatima', lastName: 'Chraibi', birthDate: '1992-03-09', phone: '+212623456781', email: 'fatima.chraibi@gmail.com', address: 'Avenue Mohammed V, Rabat', bloodType: 'A+', allergies: ['Aucune'], city: 'Rabat', status: 'suivi' },
  { id: 'pat_3', firstName: 'Youssef', lastName: 'Idrissi', birthDate: '1979-11-22', phone: '+212634567812', email: 'y.idrissi@outlook.com', address: 'Hay Riad, Rabat', bloodType: 'B+', allergies: ['Pollen'], city: 'Rabat', status: 'actif' },
  { id: 'pat_4', firstName: 'Salma', lastName: 'Alaoui', birthDate: '2001-01-17', phone: '+212645678123', email: 'salma.alaoui@gmail.com', address: 'Guéliz, Marrakech', bloodType: 'AB+', allergies: ['Aucune'], city: 'Marrakech', status: 'nouveau' },
  { id: 'pat_5', firstName: 'Meryem', lastName: 'Tazi', birthDate: '1984-08-30', phone: '+212656781234', email: 'meryem.tazi@gmail.com', address: 'Quartier Agdal, Fès', bloodType: 'A-', allergies: ['Iode'], city: 'Fès', status: 'actif' },
  { id: 'pat_6', firstName: 'Omar', lastName: 'Bennani', birthDate: '1968-05-02', phone: '+212667812345', email: 'omar.bennani@yahoo.fr', address: 'Centre-ville, Tanger', bloodType: 'O-', allergies: ['Aspirine'], city: 'Tanger', status: 'suivi' },
  { id: 'pat_7', firstName: 'Nadia', lastName: 'Lahlou', birthDate: '1995-12-11', phone: '+212678123456', email: 'nadia.lahlou@gmail.com', address: 'Maarif, Casablanca', bloodType: 'B-', allergies: ['Aucune'], city: 'Casablanca', status: 'actif' },
  { id: 'pat_8', firstName: 'Karim', lastName: 'Amrani', birthDate: '1975-09-18', phone: '+212689234567', email: 'karim.amrani@gmail.com', address: 'Médina, Meknès', bloodType: 'AB-', allergies: ['Latex'], city: 'Meknès', status: 'suivi' },
  { id: 'pat_9', firstName: 'Hind', lastName: 'Boukili', birthDate: '1989-04-04', phone: '+212690345678', email: 'hind.boukili@gmail.com', address: 'La Corniche, Agadir', bloodType: 'A+', allergies: ['Aucune'], city: 'Agadir', status: 'actif' },
  { id: 'pat_10', firstName: 'Soufiane', lastName: 'Kadiri', birthDate: '1998-10-27', phone: '+212601456789', email: 'soufiane.kadiri@gmail.com', address: 'Anfa, Casablanca', bloodType: 'O+', allergies: ['Fruits de mer'], city: 'Casablanca', status: 'nouveau' },
]

export const initialAppointments: Appointment[] = [
  { id: 'apt_1', patientId: 'pat_1', date: '2026-03-19', time: '08:30', type: 'Consultation générale', doctor: 'Dr. Othmane Touggani', notes: 'Contrôle tension artérielle.', status: 'scheduled' },
  { id: 'apt_2', patientId: 'pat_3', date: '2026-03-19', time: '09:00', type: 'Suivi diabète', doctor: 'Dr. Othmane Touggani', notes: 'Analyse HbA1c à revoir.', status: 'completed' },
  { id: 'apt_3', patientId: 'pat_4', date: '2026-03-19', time: '10:15', type: 'Première consultation', doctor: 'Dr. Othmane Touggani', notes: 'Patiente nouvelle, dossier à compléter.', status: 'scheduled' },
  { id: 'apt_4', patientId: 'pat_2', date: '2026-03-18', time: '11:00', type: 'Téléconsultation', doctor: 'Dr. Othmane Touggani', notes: 'Suivi post-traitement.', status: 'completed' },
  { id: 'apt_5', patientId: 'pat_5', date: '2026-03-18', time: '14:30', type: 'Bilan annuel', doctor: 'Dr. Othmane Touggani', notes: 'Bilan sanguin demandé.', status: 'scheduled' },
  { id: 'apt_6', patientId: 'pat_6', date: '2026-03-17', time: '09:45', type: 'Renouvellement ordonnance', doctor: 'Dr. Othmane Touggani', notes: 'Douleurs articulaires persistantes.', status: 'completed' },
  { id: 'apt_7', patientId: 'pat_7', date: '2026-03-17', time: '15:15', type: 'Consultation générale', doctor: 'Dr. Othmane Touggani', notes: 'Fatigue et migraines.', status: 'cancelled' },
  { id: 'apt_8', patientId: 'pat_8', date: '2026-03-16', time: '08:45', type: 'Suivi cardiologie', doctor: 'Dr. Othmane Touggani', notes: 'Surveillance tension et cholestérol.', status: 'completed' },
  { id: 'apt_9', patientId: 'pat_9', date: '2026-03-16', time: '13:30', type: 'Consultation générale', doctor: 'Dr. Othmane Touggani', notes: 'Douleur abdominale légère.', status: 'scheduled' },
  { id: 'apt_10', patientId: 'pat_10', date: '2026-03-15', time: '10:00', type: 'Visite certificat', doctor: 'Dr. Othmane Touggani', notes: 'Dossier sportif.', status: 'completed' },
  { id: 'apt_11', patientId: 'pat_1', date: '2026-03-14', time: '11:30', type: 'Suivi HTA', doctor: 'Dr. Othmane Touggani', notes: 'Réajustement traitement.', status: 'completed' },
  { id: 'apt_12', patientId: 'pat_2', date: '2026-03-14', time: '16:00', type: 'Téléconsultation', doctor: 'Dr. Othmane Touggani', notes: 'Question sur effets secondaires.', status: 'cancelled' },
  { id: 'apt_13', patientId: 'pat_3', date: '2026-03-13', time: '09:15', type: 'Suivi diabète', doctor: 'Dr. Othmane Touggani', notes: 'Discussion régime alimentaire.', status: 'completed' },
  { id: 'apt_14', patientId: 'pat_5', date: '2026-03-13', time: '14:00', type: 'Consultation générale', doctor: 'Dr. Othmane Touggani', notes: 'Troubles digestifs.', status: 'scheduled' },
  { id: 'apt_15', patientId: 'pat_6', date: '2026-03-12', time: '12:00', type: 'Contrôle résultats', doctor: 'Dr. Othmane Touggani', notes: 'Résultats radiologie disponibles.', status: 'completed' },
]

export const initialConsultations: Consultation[] = [
  { id: 'con_1', patientId: 'pat_3', appointmentId: 'apt_2', date: '2026-03-19', motif: 'Suivi diabète', examenClinique: 'TA 13/8, glycémies capillaires globalement correctes.', diagnostic: 'Diabète de type 2 équilibré partiellement.', traitement: 'Poursuite metformine 850 mg x2/j.', notes: 'Conseils diététiques renforcés. Contrôle HbA1c dans 6 semaines.' },
  { id: 'con_2', patientId: 'pat_2', appointmentId: 'apt_4', date: '2026-03-18', motif: 'Téléconsultation post-traitement', examenClinique: 'Pas d’examen direct, patiente stable selon les symptômes rapportés.', diagnostic: 'Bonne évolution clinique.', traitement: 'Poursuite traitement 5 jours supplémentaires.', notes: 'Recontacter en cas de fièvre ou aggravation.' },
  { id: 'con_3', patientId: 'pat_6', appointmentId: 'apt_6', date: '2026-03-17', motif: 'Renouvellement ordonnance', examenClinique: 'Douleur modérée des genoux à la mobilisation.', diagnostic: 'Arthrose chronique.', traitement: 'Paracétamol si douleur, kinésithérapie.', notes: 'Éviter les efforts prolongés.' },
  { id: 'con_4', patientId: 'pat_8', appointmentId: 'apt_8', date: '2026-03-16', motif: 'Suivi cardiologique', examenClinique: 'TA 12/7, auscultation normale.', diagnostic: 'HTA bien contrôlée.', traitement: 'Maintien du traitement actuel.', notes: 'Prochain contrôle dans 3 mois.' },
  { id: 'con_5', patientId: 'pat_10', appointmentId: 'apt_10', date: '2026-03-15', motif: 'Certificat sportif', examenClinique: 'Examen clinique sans anomalie.', diagnostic: 'Aptitude au sport amateur.', traitement: 'Aucun.', notes: 'Certificat remis au patient.' },
  { id: 'con_6', patientId: 'pat_1', appointmentId: 'apt_11', date: '2026-03-14', motif: 'Suivi hypertension', examenClinique: 'TA 14/9, pas de céphalées rapportées.', diagnostic: 'HTA légère persistante.', traitement: 'Amlodipine 5 mg le soir.', notes: 'Réduire le sel et surveiller à domicile.' },
  { id: 'con_7', patientId: 'pat_3', appointmentId: 'apt_13', date: '2026-03-13', motif: 'Suivi diabète', examenClinique: 'Poids stable, examen des pieds normal.', diagnostic: 'Diabète stable.', traitement: 'Poursuite metformine.', notes: 'Rappel sur l’activité physique régulière.' },
  { id: 'con_8', patientId: 'pat_6', appointmentId: 'apt_15', date: '2026-03-12', motif: 'Contrôle résultats', examenClinique: 'État général conservé.', diagnostic: 'Résultats radiologiques rassurants.', traitement: 'Poursuite prise en charge symptomatique.', notes: 'Pas d’indication chirurgicale pour le moment.' },
]

export const initialPrescriptions: Prescription[] = [
  { id: 'pre_1', patientId: 'pat_1', date: '2026-03-14', medications: [{ id: 'm_1', name: 'Amlodipine', dosage: '5 mg' }], duration: '30 jours', instructions: '1 comprimé le soir après le dîner.', status: 'ready' },
  { id: 'pre_2', patientId: 'pat_3', date: '2026-03-19', medications: [{ id: 'm_2', name: 'Metformine', dosage: '850 mg' }, { id: 'm_3', name: 'Bandelettes glycémie', dosage: '1 boîte' }], duration: '60 jours', instructions: 'Metformine matin et soir avec repas.', status: 'printed' },
  { id: 'pre_3', patientId: 'pat_6', date: '2026-03-17', medications: [{ id: 'm_4', name: 'Paracétamol', dosage: '1 g' }], duration: '10 jours', instructions: 'Si douleur, max 3 prises/jour.', status: 'draft' },
  { id: 'pre_4', patientId: 'pat_8', date: '2026-03-16', medications: [{ id: 'm_5', name: 'Bisoprolol', dosage: '2,5 mg' }], duration: '90 jours', instructions: '1 comprimé chaque matin.', status: 'ready' },
]

export const initialInvoices: Invoice[] = [
  { id: 'inv_1', patientId: 'pat_1', date: '2026-03-14', services: [{ id: 's_1', label: 'Consultation générale', amount: 250 }], amount: 250, notes: 'Réglée en espèces.', status: 'paid' },
  { id: 'inv_2', patientId: 'pat_3', date: '2026-03-19', services: [{ id: 's_2', label: 'Suivi diabète', amount: 350 }], amount: 350, notes: 'Transmission en cours.', status: 'pending' },
  { id: 'inv_3', patientId: 'pat_6', date: '2026-03-17', services: [{ id: 's_3', label: 'Renouvellement ordonnance', amount: 180 }], amount: 180, notes: 'Facture non encore réglée.', status: 'overdue' },
  { id: 'inv_4', patientId: 'pat_8', date: '2026-03-16', services: [{ id: 's_4', label: 'Suivi cardiologie', amount: 500 }], amount: 500, notes: 'Payée par carte.', status: 'paid' },
  { id: 'inv_5', patientId: 'pat_10', date: '2026-03-15', services: [{ id: 's_5', label: 'Certificat médical', amount: 150 }], amount: 150, notes: 'À régler lors du retrait.', status: 'pending' },
  { id: 'inv_6', patientId: 'pat_5', date: '2026-03-13', services: [{ id: 's_6', label: 'Bilan annuel', amount: 800 }], amount: 800, notes: 'Relance prévue.', status: 'overdue' },
]

export const initialStaff: StaffMember[] = [
  { id: 'staff_1', name: 'Dr. Othmane Touggani', role: 'Médecin généraliste', phone: '+212611000111', email: 'othmane@macromedica.ma' },
  { id: 'staff_2', name: 'Nadia El Mansouri', role: 'Secrétaire médicale', phone: '+212622000222', email: 'nadia@macromedica.ma' },
  { id: 'staff_3', name: 'Yassine Choukri', role: 'Assistant médical', phone: '+212633000333', email: 'yassine@macromedica.ma' },
]

export const initialNotifications = [
  { id: 'notif_1', title: '2 factures en retard', description: 'Des relances sont recommandées aujourd’hui.' },
  { id: 'notif_2', title: 'Consultation à 10:15', description: 'Salma Alaoui arrive pour sa première visite.' },
  { id: 'notif_3', title: 'Préférences enregistrées', description: 'Les notifications du cabinet sont actives.' },
]

export const defaultCurrentUser = {
  name: 'Dr. Othmane Touggani',
  role: 'Médecin généraliste',
  phone: '+212611000111',
  email: 'othmane@macromedica.ma',
  address: 'Cabinet MacroMedica, Casablanca',
  cabinetName: 'Cabinet MacroMedica',
  cabinetAddress: 'Bd Abdelmoumen, Casablanca',
  specialty: 'Médecine générale',
  logoPreview: '',
}

export function createMockState() {
  return { patients: structuredClone(initialPatients), appointments: structuredClone(initialAppointments), consultations: structuredClone(initialConsultations), prescriptions: structuredClone(initialPrescriptions), invoices: structuredClone(initialInvoices), staff: structuredClone(initialStaff), notifications: structuredClone(initialNotifications), currentUser: structuredClone(defaultCurrentUser) }
}
