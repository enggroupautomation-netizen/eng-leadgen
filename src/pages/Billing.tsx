import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { useSubscription } from '../hooks/useSubscription'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    trialing:      { label: 'Trial attivo',    bg: 'rgba(32,76,229,.15)',   color: '#7EB3FF' },
    active:        { label: 'Attivo',          bg: 'rgba(16,185,129,.15)',  color: '#34D399' },
    past_due:      { label: 'Pagamento in ritardo', bg: 'rgba(239,68,68,.15)', color: '#f87171' },
    canceled:      { label: 'Annullato',       bg: 'rgba(107,114,128,.15)', color: '#9CA3AF' },
    trial_expired: { label: 'Trial scaduto',   bg: 'rgba(245,158,11,.15)',  color: '#F59E0B' },
  }
  const s = map[status] ?? map['canceled']
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 700,
      background: s.bg,
      color: s.color,
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color }} />
      {s.label}
    </span>
  )
}

const CARD: React.CSSProperties = {
  background: 'var(--surface-2)',
  borderRadius: '20px',
  border: '1px solid var(--border)',
  padding: '28px',
  marginBottom: '20px',
}

export function Billing() {
  const [searchParams] = useSearchParams()
  const success = searchParams.get('success') === 'true'
  const canceled = searchParams.get('canceled') === 'true'

  const {
    subscription,
    loading,
    trialDaysLeft,
    isTrialing,
    isPremium,
    isExpired,
    isPastDue,
    createCheckout,
    openPortal,
  } = useSubscription()

  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (success) setToast({ type: 'success', text: 'Abbonamento attivato con successo! Grazie.' })
    if (canceled) setToast({ type: 'error', text: 'Pagamento annullato. Puoi riprovare in qualsiasi momento.' })
  }, [success, canceled])

  async function handleUpgrade() {
    setCheckoutLoading(true)
    const url = await createCheckout()
    if (url) {
      window.location.href = url
    } else {
      setToast({ type: 'error', text: 'Errore nel creare la sessione di pagamento. Contatta il supporto.' })
      setCheckoutLoading(false)
    }
  }

  async function handlePortal() {
    setPortalLoading(true)
    const url = await openPortal()
    if (url) {
      window.location.href = url
    } else {
      setToast({ type: 'error', text: 'Errore nel aprire il portale di fatturazione.' })
      setPortalLoading(false)
    }
  }

  const searchPct = subscription
    ? Math.min(100, Math.round((subscription.searches_used / subscription.searches_limit) * 100))
    : 0

  return (
    <div style={{ flex: 1, background: 'var(--bg)' }}>
      <TopBar title="Abbonamento" subtitle="Gestione piano e fatturazione" />

      <div style={{ padding: '32px', maxWidth: '680px' }}>

        {/* Toast notification */}
        {toast && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '12px',
            background: toast.type === 'success' ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}`,
            color: toast.type === 'success' ? '#34D399' : '#f87171',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            {toast.type === 'success' ? '✓' : '✗'} {toast.text}
            <button
              onClick={() => setToast(null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
            >×</button>
          </div>
        )}

        {/* Plan card */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>
                {isPremium ? 'Piano Premium' : 'Piano Free'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {isPremium
                  ? 'Accesso illimitato a tutte le funzionalità'
                  : 'Accesso completo durante il periodo di prova'}
              </p>
            </div>
            {!loading && subscription && <StatusBadge status={subscription.status} />}
          </div>

          {/* Trial countdown */}
          {isTrialing && (
            <div style={{
              padding: '16px 20px',
              background: 'rgba(32,76,229,.1)',
              borderRadius: '14px',
              border: '1px solid rgba(32,76,229,.2)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(32,76,229,.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 900,
                color: '#7EB3FF',
                flexShrink: 0,
              }}>
                {trialDaysLeft}
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
                  Giorni rimasti nel periodo di prova
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {subscription?.trial_ends_at
                    ? `Scade il ${new Date(subscription.trial_ends_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : ''}
                </div>
              </div>
            </div>
          )}

          {/* Expired / past due warning */}
          {(isExpired || isPastDue) && (
            <div style={{
              padding: '14px 18px',
              background: 'rgba(239,68,68,.1)',
              borderRadius: '12px',
              border: '1px solid rgba(239,68,68,.25)',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#f87171',
            }}>
              {isExpired
                ? 'Il periodo di prova è scaduto. Attiva un abbonamento per continuare ad usare la piattaforma.'
                : 'Il pagamento dell\'ultimo rinnovo è fallito. Aggiorna il metodo di pagamento per evitare interruzioni.'}
            </div>
          )}

          {/* Premium active info */}
          {isPremium && subscription?.current_period_end && (
            <div style={{
              padding: '14px 18px',
              background: 'rgba(16,185,129,.08)',
              borderRadius: '12px',
              border: '1px solid rgba(16,185,129,.2)',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#34D399',
            }}>
              Prossimo rinnovo: {new Date(subscription.current_period_end).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {!isPremium && (
              <button
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: checkoutLoading ? 'rgba(32,76,229,.5)' : 'linear-gradient(135deg, #204CE5, #7C3AED)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: checkoutLoading ? 'wait' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 4px 16px rgba(32,76,229,.4)',
                  transition: 'all .2s',
                }}
              >
                {checkoutLoading ? (
                  <>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
                    Apertura pagamento...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                      <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    Attiva Premium
                  </>
                )}
              </button>
            )}

            {isPremium && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: portalLoading ? 'wait' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all .15s',
                }}
              >
                {portalLoading ? 'Apertura...' : 'Gestisci abbonamento'}
              </button>
            )}

            {isPastDue && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                style={{
                  padding: '12px 22px',
                  borderRadius: '12px',
                  border: '1px solid rgba(239,68,68,.3)',
                  background: 'rgba(239,68,68,.1)',
                  color: '#f87171',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: portalLoading ? 'wait' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Aggiorna metodo di pagamento
              </button>
            )}
          </div>
        </div>

        {/* Usage card */}
        <div style={CARD}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '20px' }}>Utilizzo ricerche</h2>

          {loading ? (
            <div style={{ height: '60px', background: 'var(--overlay-sm)', borderRadius: '10px' }} />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {subscription?.searches_used ?? 0} ricerche usate
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: searchPct >= 90 ? '#f87171' : 'var(--text)' }}>
                  {subscription?.searches_limit ?? 0} limite
                </span>
              </div>
              <div style={{ height: '8px', background: 'var(--overlay-md)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${searchPct}%`,
                  background: searchPct >= 90
                    ? 'linear-gradient(90deg, #EF4444, #f87171)'
                    : 'linear-gradient(90deg, #204CE5, #7C3AED)',
                  borderRadius: '4px',
                  transition: 'width .5s ease',
                }} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '8px' }}>
                Periodo corrente · si azzera al rinnovo mensile
              </div>
            </>
          )}
        </div>

        {/* Plan comparison */}
        {!isPremium && (
          <div style={CARD}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '20px' }}>Piano Premium include</h2>
            {[
              ['5.000 ricerche al mese', 'vs 500 nel piano free'],
              ['KPI realtime aggiornati in tempo reale', ''],
              ['Export CSV illimitato', ''],
              ['Supporto prioritario via email', ''],
              ['Tutti i workflow n8n illimitati', ''],
            ].map(([feat, sub]) => (
              <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(16,185,129,.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#34D399" strokeWidth={3}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{feat}</span>
                  {sub && <span style={{ fontSize: '11.5px', color: 'var(--text-subtle)', marginLeft: '6px' }}>{sub}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
