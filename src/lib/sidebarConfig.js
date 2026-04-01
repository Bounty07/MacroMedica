export function getSidebarForRole(role) {
  switch (role) {
    case 'docteur':
      return [
        {
          label: 'PILOTAGE',
          items: [
            { label: 'Tableau de bord', to: '/dashboard', icon: 'layout-dashboard' },
            { label: "Salle d'attente", to: '/salle-attente', icon: 'users-round' },
            { label: 'Secrétaire', to: '/secretaire', icon: 'layout-dashboard' },
          ],
        },
        {
          label: 'CŒUR DE MÉTIER',
          items: [
            { label: 'Agenda (RDV)', to: '/agenda', icon: 'calendar-days' },
            { label: 'Dossiers Patients', to: '/patients', icon: 'folder-heart' },
            { label: 'Ordonnances', to: '/ordonnances', icon: 'file-pen-line' },
            { label: 'Assistant IA', to: '/ai-scribe', icon: 'bot' },
          ],
        },
        {
          label: 'SECRÉTAIRES',
          items: [
            { label: 'Facturation', to: '/facturation', icon: 'credit-card' },
            { label: 'Équipe', to: '/equipe', icon: 'users-round' },
          ],
        },
        {
          label: 'GESTION',
          items: [
            { label: 'Paramètres', to: '/parametres', icon: 'settings-2' },
          ],
        },
      ]

    case 'secretaire':
      return [
        {
          label: 'ACCUEIL',
          items: [
            { label: 'Secrétaire (Dashboard)', to: '/secretaire', icon: 'layout-dashboard' },
            { label: 'Agenda (RDV)', to: '/agenda', icon: 'calendar-days' },
            { label: "Salle d'attente", to: '/salle-attente', icon: 'users-round' },
          ],
        },
        {
          label: 'CŒUR DE MÉTIER',
          items: [
            { label: 'Patients', to: '/patients', icon: 'folder-heart' },
            { label: 'Facturation', to: '/facturation', icon: 'credit-card' },
          ],
        },
      ]

    default:
      return getSidebarForRole('docteur')
  }
}