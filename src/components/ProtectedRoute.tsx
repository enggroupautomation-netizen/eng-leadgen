import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DEMO_MODE } from '../lib/mockData'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  // Demo mode: bypass auth entirely
  if (DEMO_MODE) return <>{children}</>

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0B1120',
        color: '#E4EAF2',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(32,76,229,.3)',
          borderTopColor: '#204CE5',
          borderRadius: '50%',
          animation: 'spin .7s linear infinite',
        }} />
        <span style={{ fontSize: '14px', color: '#6B7A8A' }}>Caricamento...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
