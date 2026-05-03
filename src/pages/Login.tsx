import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email o password non corretti.'
        : error.message)
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B1120',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '400px',
        background: 'radial-gradient(ellipse, rgba(32,76,229,.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#0F1829',
        border: '1px solid rgba(255,255,255,.07)',
        borderRadius: '24px',
        padding: '40px',
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="https://www.enggroup.it/wp-content/uploads/2026/02/logo-eng.jpg"
            alt="ENG"
            style={{ height: '40px', objectFit: 'contain', marginBottom: '16px' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#E4EAF2', marginBottom: '6px' }}>
            ENG Lead Platform
          </h1>
          <p style={{ fontSize: '13px', color: '#5B6B7A' }}>
            Accedi al tuo account per continuare
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8A9BAA', marginBottom: '8px', letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="nome@enggroup.it"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1.5px solid rgba(255,255,255,.1)',
                background: '#0B1120',
                color: '#E4EAF2',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
                transition: 'border-color .15s',
              }}
              onFocus={e => (e.target.style.borderColor = '#204CE5')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8A9BAA', marginBottom: '8px', letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1.5px solid rgba(255,255,255,.1)',
                background: '#0B1120',
                color: '#E4EAF2',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
                transition: 'border-color .15s',
              }}
              onFocus={e => (e.target.style.borderColor = '#204CE5')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
            />
          </div>

          {error && (
            <div style={{
              marginBottom: '16px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(239,68,68,.1)',
              border: '1px solid rgba(239,68,68,.25)',
              color: '#f87171',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: loading ? 'rgba(32,76,229,.5)' : '#204CE5',
              color: 'white',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'background .15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin .7s linear infinite',
                }} />
                Accesso in corso...
              </>
            ) : 'Accedi'}
          </button>
        </form>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
