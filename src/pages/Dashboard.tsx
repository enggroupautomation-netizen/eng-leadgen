import { TopBar } from '../components/layout/TopBar'
import { useKPI } from '../hooks/useKPI'

interface KPICardProps {
  label: string
  value: number | string
  sublabel: string
  color: string
  icon: React.ReactNode
  delay: number
  loading: boolean
}

function KPICard({ label, value, sublabel, color, icon, delay, loading }: KPICardProps) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      borderRadius: '20px',
      padding: '24px',
      border: '1px solid var(--border)',
      animation: `kpiIn .55s cubic-bezier(.34,1.56,.64,1) ${delay}s both`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: `${color}1A`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
      </div>

      {loading ? (
        <div style={{ height: '40px', background: 'var(--overlay-sm)', borderRadius: '8px', marginBottom: '8px' }} />
      ) : (
        <div style={{ fontSize: '38px', fontWeight: 800, color: 'var(--text)', lineHeight: 1, marginBottom: '8px' }}>
          {value}
        </div>
      )}

      <div style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{sublabel}</div>
    </div>
  )
}

export function Dashboard() {
  const { kpi, loading } = useKPI()

  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div style={{ flex: 1, background: 'var(--bg)' }}>
      <TopBar title="Dashboard" subtitle={today} />

      <div style={{ padding: '32px' }}>
        {/* KPI Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}>
          <KPICard
            label="Contatti oggi"
            value={kpi?.contacts_today ?? 0}
            sublabel="nuovi contatti LinkedIn"
            color="#204CE5"
            delay={0.05}
            loading={loading}
            icon={
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            }
          />
          <KPICard
            label="Aziende oggi"
            value={kpi?.companies_today ?? 0}
            sublabel="nuove aziende Apollo"
            color="#7C3AED"
            delay={0.12}
            loading={loading}
            icon={
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
            }
          />
          <KPICard
            label="Totale contatti"
            value={kpi?.contacts_total ?? 0}
            sublabel="nel database"
            color="#0077B5"
            delay={0.19}
            loading={loading}
            icon={
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
              </svg>
            }
          />
          <KPICard
            label="Qualificati"
            value={kpi?.qualified_total ?? 0}
            sublabel="lead pronti per outreach"
            color="#10b981"
            delay={0.26}
            loading={loading}
            icon={
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            }
          />
        </div>

        {/* Recent activity section */}
        <div style={{
          background: 'var(--surface-2)',
          borderRadius: '20px',
          border: '1px solid var(--border)',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Attività recente</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {kpi?.last_sync
                ? `Ultimo aggiornamento: ${new Date(kpi.last_sync).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
                : 'In attesa di dati...'}
            </span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '52px', background: 'var(--overlay-xs)', borderRadius: '12px' }} />
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 0',
              color: 'var(--text-subtle)',
            }}>
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ marginBottom: '12px' }}>
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                <polyline points="13 2 13 9 20 9"/>
              </svg>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Nessuna attività recente</p>
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '4px' }}>I nuovi lead appariranno qui in tempo reale</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes kpiIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
