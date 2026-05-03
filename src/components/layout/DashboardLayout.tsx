import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function DashboardLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: '252px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  )
}
