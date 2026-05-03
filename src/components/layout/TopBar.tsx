import { useTheme } from '../../contexts/ThemeContext'

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const { theme, toggle } = useTheme()

  return (
    <div style={{
      height: '64px',
      background: 'var(--surface, #0F1829)',
      borderBottom: '1px solid var(--border, rgba(255,255,255,.06))',
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text, #E4EAF2)', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: '12px', color: '#5B6B7A', margin: 0 }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {actions}
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Passa a modalità chiara' : 'Passa a modalità scura'}
          style={{ width:'36px',height:'36px',borderRadius:'10px',border:'1px solid var(--border, rgba(255,255,255,.08))',background:'transparent',color:'#6B7A8A',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}
        >
          {theme === 'dark'
            ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          }
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#34d399',
            animation: 'livePulse 1.8s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '12px', color: '#5B6B7A', fontWeight: 600, letterSpacing: '.06em' }}>LIVE</span>
        </div>
      </div>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .55; transform: scale(.85); }
        }
      `}</style>
    </div>
  )
}
