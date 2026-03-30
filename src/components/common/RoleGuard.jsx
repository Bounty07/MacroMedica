import { Navigate, Outlet } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { Loader2 } from 'lucide-react'

export default function RoleGuard({ role, children }) {
  const { isAuthenticated, isInitializing, role: userRole } = useAppContext()

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  // If component specifically requires 'docteur' role, and the user is 'secretaire'
  if (role === 'docteur' && userRole === 'secretaire') {
    return <Navigate to="/salle-attente" replace />
  }

  if (role && userRole !== role) {
    if (userRole === 'secretaire') return <Navigate to="/salle-attente" replace />
    if (userRole === 'docteur') return <Navigate to="/dashboard" replace />
    return <Navigate to="/login" replace />
  }

  return children ? children : <Outlet />
}
