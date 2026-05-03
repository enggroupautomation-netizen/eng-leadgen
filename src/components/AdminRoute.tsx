import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DEMO_MODE } from '../lib/mockData'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth()

  if (DEMO_MODE) return <>{children}</>

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#6B7A8A',
        fontSize: '14px',
      }}>
        Caricamento...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
