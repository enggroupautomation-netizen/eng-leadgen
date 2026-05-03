import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { BrandProvider } from './contexts/BrandContext'
import { AuthProvider } from './contexts/AuthContext'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Contacts } from './pages/Contacts'
import { Companies } from './pages/Companies'
import { Settings } from './pages/Settings'
import { Tutorial } from './pages/Tutorial'
import { Billing } from './pages/Billing'
import { Users } from './pages/Users'

export default function App() {
  return (
    <ThemeProvider>
    <BrandProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="contatti" element={<Contacts />} />
            <Route path="aziende" element={<Companies />} />
            <Route path="impostazioni" element={<Settings />} />
            <Route path="tutorial" element={<Tutorial />} />
            <Route path="abbonamento" element={<Billing />} />
            <Route path="utenti" element={<AdminRoute><Users /></AdminRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </BrandProvider>
    </ThemeProvider>
  )
}
