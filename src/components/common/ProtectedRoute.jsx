import { Navigate, useLocation } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { Loader2 } from 'lucide-react'

function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAppContext()
  const location = useLocation()

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-slate-500">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export default ProtectedRoute
