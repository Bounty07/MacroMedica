export const sidebarSections = [
  {
    label: 'PILOTAGE',
    items: [
      { label: 'Tableau de bord', to: '/dashboard', icon: 'layout-dashboard' },
      { label: 'Agenda', to: '/dashboard/appointments', icon: 'calendar-days' },
      { label: "Salle d'attente", to: '/dashboard/waiting-room', icon: 'users-round' },
    ],
  },
  {
    label: 'CŒUR DE MÉTIER',
    items: [
      { label: 'Dossiers Patients', to: '/dashboard/patients', icon: 'folder-heart' },
      { label: 'Consultations', to: '/dashboard/consultations', icon: 'stethoscope' },
      { label: 'Ordonnances', to: '/dashboard/prescriptions', icon: 'file-pen-line' },
    ],
  },
  {
    label: 'GESTION',
    items: [
      { label: 'Facturation', to: '/dashboard/billing', icon: 'credit-card' },
      { label: 'Statistiques', to: '/dashboard/analytics', icon: 'chart-column-big' },
      { label: 'Horaires', to: '/dashboard/schedule', icon: 'clock-3' },
      { label: 'Paramètres', to: '/dashboard/settings', icon: 'settings-2' },
    ],
  },
]

export const dashboardStats = [
  { label: 'Patients actifs', value: '1 284', trend: '+8.4%', detail: 'ce mois' },
  { label: "RDV aujourd'hui", value: '26', trend: '+5', detail: 'vs hier' },
  { label: 'Ordonnances émises', value: '74', trend: '+12%', detail: '7 jours' },
  { label: 'Factures', value: '42 700 MAD', trend: '+18%', detail: 'en attente de remboursement' },
]

export const activityBars = [
  { day: 'Lun', value: 58 },
  { day: 'Mar', value: 74 },
  { day: 'Mer', value: 63 },
  { day: 'Jeu', value: 86 },
  { day: 'Ven', value: 92 },
  { day: 'Sam', value: 48 },
  { day: 'Dim', value: 32 },
]

export const appointments = [
  { id: 1, patient: 'Salma El Idrissi', type: 'Consultation générale', time: '08:30', status: 'Confirmé', doctor: 'Dr. Amrani' },
  { id: 2, patient: 'Youssef Bennis', type: 'Suivi diabète', time: '09:15', status: 'En salle', doctor: 'Dr. Amrani' },
  { id: 3, patient: 'Meryem Alaoui', type: 'Contrôle pédiatrique', time: '10:00', status: 'À venir', doctor: 'Dr. Chraibi' },
  { id: 4, patient: 'Omar Bennani', type: 'Renouvellement ordonnance', time: '11:30', status: 'À venir', doctor: 'Dr. Chraibi' },
  { id: 5, patient: 'Lina Tazi', type: 'Téléconsultation', time: '14:15', status: 'Confirmé', doctor: 'Dr. Amrani' },
]

export const waitingRoom = [
  { patient: 'Youssef Bennis', arrival: '08:58', reason: 'Suivi diabète', priority: 'Moyenne' },
  { patient: 'Nadia Fassi', arrival: '09:11', reason: 'Bilan annuel', priority: 'Haute' },
  { patient: 'Sofiane Kadiri', arrival: '09:22', reason: 'Douleurs thoraciques', priority: 'Urgente' },
]

export const patients = [
  {
    id: 'P-1009',
    name: 'Salma El Idrissi',
    age: 34,
    gender: 'F',
    city: 'Casablanca',
    phone: '+212 661 82 11 54',
    bloodType: 'A+',
    coverage: 'CNOPS',
    lastVisit: '14 mars 2026',
    tags: ['Suivi', 'Chronique'],
    notes: 'Patiente suivie pour hypertension légère. Très bonne observance.',
    history: [
      { date: '14 mars 2026', title: 'Contrôle tensionnel', detail: 'TA stabilisée, adaptation légère du traitement.' },
      { date: '10 février 2026', title: 'Consultation de suivi', detail: 'Bilan lipidique demandé.' },
      { date: '18 décembre 2025', title: 'Première consultation', detail: 'Création du dossier et antécédents familiaux.' },
    ],
  },
  {
    id: 'P-1018',
    name: 'Youssef Bennis',
    age: 57,
    gender: 'M',
    city: 'Rabat',
    phone: '+212 671 33 07 41',
    bloodType: 'O+',
    coverage: 'Assurance',
    lastVisit: '19 mars 2026',
    tags: ['Diabète'],
    notes: 'Suivi glycémique mensuel. Analyse laboratoire intégrée au dossier.',
    history: [
      { date: '19 mars 2026', title: 'Suivi glycémique', detail: 'HbA1c en amélioration, poursuite du plan actuel.' },
      { date: '17 février 2026', title: 'Consultation spécialisée', detail: 'Ajout d’un bilan rénal et conseils alimentaires.' },
    ],
  },
  {
    id: 'P-1055',
    name: 'Meryem Alaoui',
    age: 8,
    gender: 'F',
    city: 'Fès',
    phone: '+212 621 77 90 12',
    bloodType: 'B+',
    coverage: 'Mutuelle privée',
    lastVisit: '5 mars 2026',
    tags: ['Pédiatrie'],
    notes: 'Vaccination à jour. Allergie légère aux acariens.',
    history: [
      { date: '5 mars 2026', title: 'Contrôle pédiatrique', detail: 'Croissance harmonieuse, RAS.' },
    ],
  },
]

export const consultations = [
  {
    patient: 'Salma El Idrissi',
    date: '19 mars 2026',
    summary: 'Contrôle tensionnel et adaptation du traitement.',
    plan: 'Réduire le sel, poursuivre Amlodipine 5 mg, contrôle dans 6 semaines.',
  },
  {
    patient: 'Youssef Bennis',
    date: '19 mars 2026',
    summary: 'Suivi diabète type 2 avec revue des analyses.',
    plan: 'Maintenir Metformine, renouveler bilan HbA1c et créatinine.',
  },
  {
    patient: 'Lina Tazi',
    date: '18 mars 2026',
    summary: 'Téléconsultation post-opératoire.',
    plan: 'Surveillance douleur, contrôle cicatrice, point dans 3 jours.',
  },
]

export const prescriptions = [
  {
    patient: 'Salma El Idrissi',
    medications: ['Amlodipine 5 mg', 'Oméga 3'],
    duration: '30 jours',
    status: 'Envoyée',
  },
  {
    patient: 'Youssef Bennis',
    medications: ['Metformine 850 mg', 'Bandelettes glycémie'],
    duration: '90 jours',
    status: 'À signer',
  },
  {
    patient: 'Omar Bennani',
    medications: ['Ibuprofène 400 mg', 'Gel anti-inflammatoire'],
    duration: '7 jours',
    status: 'Brouillon',
  },
]

export const invoices = [
  { patient: 'Salma El Idrissi', amount: '350 MAD', mode: 'Carte', status: 'Payée' },
  { patient: 'Youssef Bennis', amount: '420 MAD', mode: 'Chèque', status: 'En attente' },
  { patient: 'Meryem Alaoui', amount: '280 MAD', mode: 'Espèces', status: 'Payée' },
  { patient: 'Lina Tazi', amount: '500 MAD', mode: 'Chèque', status: 'À relancer' },
]

export const pricingPlans = [
  {
    name: 'Solo',
    price: '499 MAD',
    description: 'Pour un cabinet individuel qui veut tout centraliser.',
    features: ['Agenda intelligent', 'Dossiers patients', 'Ordonnances illimitées', 'Facturation simple'],
  },
  {
    name: 'Cabinet',
    price: '899 MAD',
    description: 'Pour une équipe médicale avec coordination secrétariat + praticiens.',
    features: ['Utilisateurs multiples', "Salle d'attente en direct", 'Facturation complète', 'Statistiques d’activité'],
    highlighted: true,
  },
  {
    name: 'Réseau',
    price: 'Sur devis',
    description: 'Pour groupes médicaux et cliniques multisites.',
    features: ['Multi-sites', 'Rôles avancés', 'Exports métier', 'Accompagnement dédié'],
  },
]

export const testimonials = [
  {
    name: 'Dr. Sanae Lahlou',
    role: 'Médecin généraliste, Casablanca',
    quote: 'MacroMedica a réduit le temps administratif de mon cabinet et clarifié toute la facturation.',
  },
  {
    name: 'Dr. Mehdi Chraibi',
    role: 'Pédiatre, Rabat',
    quote: 'La navigation est fluide, les dossiers patients sont enfin lisibles, et l’équipe adore la salle d’attente en direct.',
  },
  {
    name: 'Nadia Benkirane',
    role: 'Secrétaire médicale, Marrakech',
    quote: 'On gagne du temps à chaque rendez-vous. Les relances et les statuts sont visibles en un coup d’œil.',
  },
]

export const weeklySchedule = [
  { day: 'Lundi', slots: ['08:00 - 12:00', '14:00 - 18:00'] },
  { day: 'Mardi', slots: ['08:30 - 12:30', '14:00 - 18:30'] },
  { day: 'Mercredi', slots: ['09:00 - 13:00'] },
  { day: 'Jeudi', slots: ['08:00 - 12:00', '15:00 - 19:00'] },
  { day: 'Vendredi', slots: ['08:30 - 13:00', '14:30 - 17:30'] },
]
