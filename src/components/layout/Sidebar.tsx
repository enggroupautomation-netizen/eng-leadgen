import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { DEMO_MODE } from '../../lib/mockData'
import { useTheme } from '../../contexts/ThemeContext'
import { useBrand } from '../../contexts/BrandContext'

const navItemStyle = (isActive: boolean, activeColor = '#204CE5', isDark = true): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '9px 12px',
  borderRadius: '10px',
  fontSize: '13.5px',
  fontWeight: isActive ? 600 : 500,
  color: isActive ? '#fff' : (isDark ? '#6B7A8A' : '#5B6B7A'),
  background: isActive
    ? activeColor === '#7C3AED'
      ? 'rgba(124,58,237,.2)'
      : activeColor === '#0077B5'
        ? 'rgba(0,119,181,.2)'
        : activeColor === '#10B981'
          ? 'rgba(16,185,129,.2)'
          : 'rgba(32,76,229,.2)'
    : 'transparent',
  textDecoration: 'none',
  marginBottom: '2px',
  transition: 'all .15s',
  cursor: 'pointer',
})

const navIconStyle: CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  flexShrink: 0,
}

const sectionLabelStyle: CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '.08em',
  color: '#4B5B6E',
  textTransform: 'uppercase',
  padding: '0 8px',
  marginBottom: '8px',
}

const onboardingSteps = [
  { id: 'supabase',       label: 'Supabase configurato' },
  { id: 'webhook',        label: 'Webhook n8n testato' },
  { id: 'first_contact',  label: 'Primo contatto ricevuto' },
  { id: 'team',           label: 'Team invitato' },
]

export function Sidebar() {
  const { theme } = useTheme()
  const { brand } = useBrand()
  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('eng_onboarding') ?? '[]') } catch { return [] }
  })
  const [onboardingHidden, setOnboardingHidden] = useState(() =>
    localStorage.getItem('eng_onboarding_hidden') === 'true'
  )

  useEffect(() => {
    supabase.from('contacts').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if ((count ?? 0) > 0 && !completedSteps.includes('first_contact')) {
        const updated = [...completedSteps, 'first_contact']
        setCompletedSteps(updated)
        localStorage.setItem('eng_onboarding', JSON.stringify(updated))
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doneCount = completedSteps.length
  const allDone = doneCount >= onboardingSteps.length

  useEffect(() => {
    if (allDone && !onboardingHidden) {
      const t = setTimeout(() => {
        setOnboardingHidden(true)
        localStorage.setItem('eng_onboarding_hidden', 'true')
      }, 2000)
      return () => clearTimeout(t)
    }
  }, [allDone, onboardingHidden])

  const isDark = theme === 'dark'
  const sidebarBg = isDark ? '#0F1829' : '#FFFFFF'
  const sidebarBorder = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)'

  return (
    <aside style={{
      width: '252px',
      minHeight: '100vh',
      background: sidebarBg,
      borderRight: `1px solid ${sidebarBorder}`,
      position: 'fixed',
      top: 0,
      left: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 20,
    }}>
      {/* Logo */}
      <div style={{
        padding: '26px 22px 22px',
        borderBottom: `1px solid ${sidebarBorder}`,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{
          background: isDark ? 'rgba(255,255,255,.12)' : 'transparent',
          borderRadius: '8px',
          padding: isDark ? '4px 6px' : '0',
          display: 'flex',
          alignItems: 'center',
          transition: 'background .2s',
          flexShrink: 0,
        }}>
          <img
            src={brand.logoUrl}
            alt={brand.siteName}
            style={{
              height: '28px',
              objectFit: 'contain',
              display: 'block',
              transition: 'filter .2s',
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: isDark ? '#E4EAF2' : '#112337', letterSpacing: '.02em' }}>
          {brand.siteName}
        </span>
      </div>

      {/* Nav */}
      <nav style={{ padding: '20px 16px', flex: 1, overflowY: 'auto' }}>
        <div style={{ ...sectionLabelStyle, marginTop: 0 }}>Gestione</div>

        <NavLink to="/dashboard" style={({ isActive }) => navItemStyle(isActive, '#204CE5', isDark)}>
          <span style={navIconStyle}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </span>
          Dashboard
        </NavLink>

        <NavLink to="/contatti" style={({ isActive }) => navItemStyle(isActive, '#0077B5', isDark)}>
          <span style={navIconStyle}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </span>
          Contatti
        </NavLink>

        <NavLink to="/aziende" style={({ isActive }) => navItemStyle(isActive, '#7C3AED', isDark)}>
          <span style={navIconStyle}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </span>
          Aziende
        </NavLink>

        <div style={{ ...sectionLabelStyle, marginTop: '20px' }}>Abbonamento</div>

        <NavLink to="/abbonamento" style={({ isActive }) => navItemStyle(isActive, '#10B981', isDark)}>
          <span style={navIconStyle}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </span>
          Abbonamento
        </NavLink>

        <div style={{ ...sectionLabelStyle, marginTop: '20px' }}>Sistema</div>

        <NavLink to="/impostazioni" style={({ isActive }) => navItemStyle(isActive, '#204CE5', isDark)}>
          <span style={navIconStyle}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </span>
          Impostazioni
        </NavLink>

        <NavLink to="/tutorial" style={({ isActive }) => navItemStyle(isActive, '#204CE5', isDark)}>
          <span style={navIconStyle}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </span>
          Tutorial
        </NavLink>
      </nav>

      {/* Demo mode banner */}
      {DEMO_MODE && (
        <div style={{
          margin: '0 12px 8px',
          padding: '8px 12px',
          borderRadius: '10px',
          background: 'rgba(255,166,0,.12)',
          border: '1px solid rgba(255,166,0,.25)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ fontSize: '13px' }}>⚡</span>
          <span style={{ fontSize: '11px', color: '#FCD34D', fontWeight: 600 }}>Modalità Demo</span>
        </div>
      )}

      {/* Onboarding checklist */}
      {!onboardingHidden && (
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${sidebarBorder}`,
        }}>
          {allDone ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>✅</span>
              <span style={{ fontSize: '12px', color: '#34D399', fontWeight: 600 }}>Setup completato!</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#4B5B6E', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Onboarding
                </span>
                <span style={{ fontSize: '11px', color: '#204CE5', fontWeight: 700 }}>
                  {doneCount}/{onboardingSteps.length}
                </span>
              </div>
              <div style={{ height: '3px', background: 'rgba(255,255,255,.07)', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{
                  height: '100%',
                  width: `${(doneCount / onboardingSteps.length) * 100}%`,
                  background: 'linear-gradient(90deg, #204CE5, #527EFF)',
                  borderRadius: '2px',
                  transition: 'width .4s ease',
                }} />
              </div>
              {onboardingSteps.map(step => {
                const done = completedSteps.includes(step.id)
                return (
                  <div
                    key={step.id}
                    onClick={() => {
                      if (!done) {
                        const updated = [...completedSteps, step.id]
                        setCompletedSteps(updated)
                        localStorage.setItem('eng_onboarding', JSON.stringify(updated))
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '4px 0',
                      cursor: done ? 'default' : 'pointer',
                    }}
                  >
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                      border: done ? 'none' : '1.5px solid rgba(255,255,255,.15)',
                      background: done ? '#204CE5' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done && (
                        <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: '11.5px', color: done ? '#6B7A8A' : (isDark ? '#C8D4E0' : '#374151'), textDecoration: done ? 'line-through' : 'none' }}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </aside>
  )
}
