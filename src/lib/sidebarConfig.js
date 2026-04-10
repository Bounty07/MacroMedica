export function getSidebarForRole(role, specialiteKey = 'medecine-generale') {
  const isPediatric = specialiteKey === 'pediatrie'

  switch (role) {
    case 'docteur':
      return [
        {
          label: 'PILOTAGE',
          items: [
            { label: 'Tableau de bord', to: '/dashboard', icon: 'layout-dashboard' },
            { label: 'Tableau analytique', to: '/analytics', icon: 'chart-column-big' },
            { label: "Salle d'attente", to: '/salle-attente', icon: 'users-round' },
            { label: 'Secretaire', to: '/secretaire', icon: 'layout-dashboard' },
          ],
        },
        {
          label: 'COEUR DE METIER',
          items: [
            { label: 'Agenda (RDV)', to: '/agenda', icon: 'calendar-days' },
            { label: 'Dossiers Patients', to: '/patients', icon: 'folder-heart' },
            { label: 'Ordonnances / Prescriptions', to: '/ordonnances', icon: 'file-pen-line' },
          ],
        },
        ...(isPediatric ? [{
          label: 'PEDIATRIE',
          items: [
            { label: 'Courbes de croissance', to: '/patients?view=growth', icon: 'chart-column-big' },
            { label: 'Parents & Tuteurs', to: '/patients?view=guardians', icon: 'users-round' },
            { label: 'Vaccination & Suivi', to: '/patients?view=vaccination', icon: 'stethoscope' },
          ],
        }] : []),
        {
          label: 'SECRETAIRES',
          items: [
            { label: 'Facturation', to: '/facturation', icon: 'credit-card' },
            { label: 'Equipe', to: '/equipe', icon: 'users-round' },
          ],
        },
        {
          label: 'GESTION',
          items: [
            { label: 'Parametres', to: '/parametres', icon: 'settings-2' },
          ],
        },
      ]

    case 'secretaire':
      return [
        {
          label: 'ACCUEIL',
          items: [
            { label: 'Secretaire (Dashboard)', to: '/secretaire', icon: 'layout-dashboard' },
            { label: 'Agenda (RDV)', to: '/agenda', icon: 'calendar-days' },
            { label: "Salle d'attente", to: '/salle-attente', icon: 'users-round' },
          ],
        },
        {
          label: 'COEUR DE METIER',
          items: [
            { label: 'Patients', to: '/patients', icon: 'folder-heart' },
            { label: 'Facturation', to: '/facturation', icon: 'credit-card' },
          ],
        },
      ]

    default:
      return getSidebarForRole('docteur', specialiteKey)
  }
}
