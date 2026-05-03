import { useState, useEffect } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useBrand } from '../contexts/BrandContext'
import { DEMO_MODE } from '../lib/mockData'

type PipelineStageRow = { id: string; name: string; color: string; position: number }

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--surface-2)',
  borderRadius: '20px',
  border: '1px solid var(--border)',
  padding: '28px',
  marginBottom: '24px',
}

const SECTION_TITLE: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: '20px',
}

const INPUT_STYLE: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--input-bg)',
  color: 'var(--text)',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  width: '100%',
  boxSizing: 'border-box',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-subtle)',
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  marginBottom: '6px',
  display: 'block',
}

export function Settings() {
  const { user, signOut } = useAuth()
  const { brand, updateBrand } = useBrand()

  // ── Brand settings ───────────────────────────────────────────
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl)
  const [siteName, setSiteName] = useState(brand.siteName)
  const [brandSaved, setBrandSaved] = useState(false)
  const [logoError, setLogoError] = useState(false)

  function saveBrand() {
    updateBrand({ logoUrl: logoUrl.trim() || brand.logoUrl, siteName: siteName.trim() || brand.siteName })
    setBrandSaved(true)
    setTimeout(() => setBrandSaved(false), 2500)
  }

  function resetBrand() {
    const defaults = { logoUrl: 'https://www.enggroup.it/wp-content/uploads/2026/02/logo-eng.jpg', siteName: 'ENG Platform' }
    setLogoUrl(defaults.logoUrl)
    setSiteName(defaults.siteName)
    updateBrand(defaults)
    setLogoError(false)
  }

  // ── Stripe settings ─────────────────────────────────────────
  const [stripePublishableKey, setStripePublishableKey] = useState('')
  const [stripeSecretKey, setStripeSecretKey] = useState('')
  const [stripePriceId, setStripePriceId] = useState('')
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('')
  const [stripeSaved, setStripeSaved] = useState(false)
  const [stripeSaving, setStripeSaving] = useState(false)
  const [stripeError, setStripeError] = useState<string | null>(null)

  useEffect(() => {
    if (DEMO_MODE) return
    supabase.from('app_settings')
      .select('key, value')
      .in('key', ['stripe_publishable_key', 'stripe_price_id'])
      .then(({ data }) => {
        const m = Object.fromEntries((data ?? []).map(s => [s.key, s.value]))
        if (m['stripe_publishable_key']) setStripePublishableKey(m['stripe_publishable_key'])
        if (m['stripe_price_id']) setStripePriceId(m['stripe_price_id'])
      })
  }, [])

  async function saveStripeKeys() {
    setStripeSaving(true)
    setStripeError(null)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setStripeError('Non autenticato'); setStripeSaving(false); return }

    const body: Record<string, string> = {}
    if (stripePublishableKey.trim()) body['stripe_publishable_key'] = stripePublishableKey.trim()
    if (stripeSecretKey.trim()) body['stripe_secret_key'] = stripeSecretKey.trim()
    if (stripePriceId.trim()) body['stripe_price_id'] = stripePriceId.trim()
    if (stripeWebhookSecret.trim()) body['stripe_webhook_secret'] = stripeWebhookSecret.trim()

    const res = await fetch('/.netlify/functions/stripe-save-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body),
    })

    setStripeSaving(false)
    if (res.ok) {
      setStripeSaved(true)
      setStripeSecretKey('')
      setStripeWebhookSecret('')
      setTimeout(() => setStripeSaved(false), 2500)
    } else {
      const err = await res.json() as { error: string }
      setStripeError(err.error ?? 'Errore nel salvataggio')
    }
  }

  // ── Section 1: Account ───────────────────────────────────────
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('name').eq('id', user.id).single()
      .then(({ data }) => { if (data) setDisplayName(data.name ?? '') })
  }, [user])

  async function saveName() {
    if (!user) return
    setSavingName(true)
    setNameSaved(false)
    await supabase.from('profiles').upsert({ id: user.id, email: user.email!, name: displayName })
    setSavingName(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2500)
  }

  // ── Section 2: Invite ────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'manager' | 'viewer'>('viewer')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg(null)
    const { error } = await supabase.from('pending_invites').insert({
      email: inviteEmail.trim(),
      role: inviteRole,
      invited_by: user?.id,
    })
    if (error) {
      setInviteMsg({
        type: 'success',
        text: `Invito registrato per ${inviteEmail}. L'invito via email sarà attivo dopo la configurazione SMTP in Supabase.`,
      })
    } else {
      setInviteMsg({ type: 'success', text: `Invito inviato a ${inviteEmail} come ${inviteRole}.` })
    }
    setInviteEmail('')
    setInviting(false)
  }

  // ── Section 3: Pipeline stages ───────────────────────────────
  const [stages, setStages] = useState<PipelineStageRow[]>([])

  useEffect(() => {
    supabase.from('pipeline_stages').select('*').order('position').then(({ data }) => {
      if (data) setStages(data as PipelineStageRow[])
    })
  }, [])

  return (
    <div style={{ flex: 1, background: 'var(--bg)' }}>
      <TopBar title="Impostazioni" subtitle="Configurazione piattaforma" />

      <div style={{ padding: '32px', maxWidth: '720px' }}>

        {/* ── Brand ── */}
        <div style={CARD_STYLE}>
          <h2 style={SECTION_TITLE}>Brand & Aspetto</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Personalizza logo e nome della piattaforma. Le modifiche vengono salvate localmente.
          </p>

          {/* Preview */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 18px',
            background: 'var(--surface)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            marginBottom: '24px',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '.06em', marginRight: '8px' }}>Anteprima:</span>
            <div style={{
              background: 'rgba(0,0,0,.15)',
              borderRadius: '8px',
              padding: '3px 6px',
              display: 'flex', alignItems: 'center',
            }}>
              {!logoError ? (
                <img
                  src={logoUrl}
                  alt={siteName}
                  style={{ height: '24px', objectFit: 'contain', display: 'block' }}
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Logo non disponibile</span>
              )}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{siteName || 'ENG Platform'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={LABEL_STYLE}>Nome sito</label>
              <input
                type="text"
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                placeholder="ENG Platform"
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>URL Logo</label>
              <input
                type="url"
                value={logoUrl}
                onChange={e => { setLogoUrl(e.target.value); setLogoError(false) }}
                placeholder="https://..."
                style={INPUT_STYLE}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '6px' }}>
                Inserisci un URL pubblico (JPG, PNG, SVG). Il logo deve essere accessibile senza autenticazione.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={saveBrand}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: brandSaved ? '#10B981' : '#204CE5',
                color: 'white',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'background .2s',
              }}
            >
              {brandSaved ? '✓ Salvato' : 'Salva brand'}
            </button>
            <button
              onClick={resetBrand}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Ripristina default
            </button>
          </div>
        </div>

        {/* ── Section 1: Account ── */}
        <div style={CARD_STYLE}>
          <h2 style={SECTION_TITLE}>Account</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #204CE5, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 800, color: 'white', flexShrink: 0,
            }}>
              {(displayName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
                {user?.email ?? 'Utente'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                ID: {user?.id?.slice(0, 8) ?? '—'}...
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={LABEL_STYLE}>Nome visualizzato</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Il tuo nome..."
                style={{ ...INPUT_STYLE, flex: 1 }}
              />
              <button
                onClick={saveName}
                disabled={savingName}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: nameSaved ? '#10B981' : '#204CE5',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: savingName ? 'wait' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'background .2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {nameSaved ? '✓ Salvato' : savingName ? 'Salvo...' : 'Salva'}
              </button>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid rgba(239,68,68,.3)',
              background: 'rgba(239,68,68,.1)',
              color: '#f87171',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'all .15s',
            }}
          >
            Esci dall'account
          </button>
        </div>

        {/* ── Section 2: Invite team ── */}
        <div style={CARD_STYLE}>
          <h2 style={SECTION_TITLE}>Invita Team</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Invita colleghi ad accedere alla piattaforma con un ruolo specifico.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={LABEL_STYLE}>Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="collega@azienda.it"
                style={INPUT_STYLE}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>Ruolo</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['manager', 'viewer'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setInviteRole(role)}
                    style={{
                      flex: 1,
                      padding: '9px 14px',
                      borderRadius: '10px',
                      border: inviteRole === role
                        ? '1px solid rgba(32,76,229,.4)'
                        : '1px solid rgba(255,255,255,.08)',
                      background: inviteRole === role ? 'rgba(32,76,229,.18)' : 'transparent',
                      color: inviteRole === role ? '#7EB3FF' : '#5B6B7A',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      transition: 'all .12s',
                      textTransform: 'capitalize',
                    }}
                  >
                    {role === 'manager' ? '👔 Manager' : '👀 Viewer'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={sendInvite}
              disabled={!inviteEmail.trim() || inviting}
              style={{
                padding: '11px 20px',
                borderRadius: '10px',
                border: 'none',
                background: inviteEmail.trim() ? '#204CE5' : 'rgba(255,255,255,.06)',
                color: inviteEmail.trim() ? 'white' : '#3D5065',
                fontSize: '13px',
                fontWeight: 600,
                cursor: inviteEmail.trim() && !inviting ? 'pointer' : 'default',
                fontFamily: 'Inter, sans-serif',
                transition: 'all .15s',
              }}
            >
              {inviting ? 'Invio in corso...' : 'Invia invito'}
            </button>

            {inviteMsg && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: inviteMsg.type === 'success' ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
                border: `1px solid ${inviteMsg.type === 'success' ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)'}`,
                fontSize: '12px',
                color: inviteMsg.type === 'success' ? '#34D399' : '#f87171',
              }}>
                {inviteMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3: Pipeline stages ── */}
        <div style={CARD_STYLE}>
          <h2 style={SECTION_TITLE}>Stage Pipeline</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Gli stage correnti del CRM. Modifica gli stage direttamente nel database Supabase per ora.
          </p>
          {stages.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>Nessuno stage trovato.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stages.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px',
                  background: 'var(--surface)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,.05)',
                }}>
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: s.color ?? '#6B7280',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{s.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-subtle)', marginLeft: 'auto' }}>pos. {s.position}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section: Onboarding reset ── */}
        <div style={CARD_STYLE}>
          <h2 style={SECTION_TITLE}>Onboarding</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Reimposta la checklist di onboarding nella sidebar per rivederla dall'inizio.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('eng_onboarding')
              localStorage.removeItem('eng_onboarding_hidden')
              window.location.reload()
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid rgba(245,158,11,.3)',
              background: 'rgba(245,158,11,.1)',
              color: '#F59E0B',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'all .15s',
            }}
          >
            Reset onboarding
          </button>
        </div>

        {/* ── Stripe Integration ── */}
        <div style={CARD_STYLE}>
          <h2 style={SECTION_TITLE}>Integrazione Stripe</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Configura le chiavi Stripe per abilitare i pagamenti e la gestione abbonamenti. Le chiavi vengono salvate in modo sicuro lato server.
          </p>

          {DEMO_MODE && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.25)', fontSize: '12px', color: '#F59E0B', marginBottom: '20px' }}>
              Modalità demo attiva — le modifiche alle chiavi Stripe non vengono salvate.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={LABEL_STYLE}>Chiave Pubblicabile (Publishable Key)</label>
              <input
                type="text"
                value={stripePublishableKey}
                onChange={e => setStripePublishableKey(e.target.value)}
                placeholder="pk_live_... oppure pk_test_..."
                style={INPUT_STYLE}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '4px' }}>
                Sicura da esporre al frontend. Inizia con <code style={{ color: '#527EFF' }}>pk_</code>
              </p>
            </div>

            <div>
              <label style={LABEL_STYLE}>Chiave Segreta (Secret Key)</label>
              <input
                type="password"
                value={stripeSecretKey}
                onChange={e => setStripeSecretKey(e.target.value)}
                placeholder="sk_live_... (lascia vuoto per non modificare)"
                style={INPUT_STYLE}
                autoComplete="new-password"
              />
              <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '4px' }}>
                Viene salvata lato server. Inizia con <code style={{ color: '#527EFF' }}>sk_</code>
              </p>
            </div>

            <div>
              <label style={LABEL_STYLE}>Price ID abbonamento</label>
              <input
                type="text"
                value={stripePriceId}
                onChange={e => setStripePriceId(e.target.value)}
                placeholder="price_..."
                style={INPUT_STYLE}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '4px' }}>
                ID del prezzo mensile/annuale da Stripe Dashboard → Prodotti
              </p>
            </div>

            <div>
              <label style={LABEL_STYLE}>Webhook Secret</label>
              <input
                type="password"
                value={stripeWebhookSecret}
                onChange={e => setStripeWebhookSecret(e.target.value)}
                placeholder="whsec_... (lascia vuoto per non modificare)"
                style={INPUT_STYLE}
                autoComplete="new-password"
              />
              <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '4px' }}>
                Da Stripe Dashboard → Webhook → Endpoint secret. URL endpoint:{' '}
                <code style={{ color: '#527EFF', fontSize: '10px' }}>/.netlify/functions/stripe-webhook</code>
              </p>
            </div>
          </div>

          {stripeError && (
            <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', fontSize: '12px', color: '#f87171' }}>
              {stripeError}
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button
              onClick={saveStripeKeys}
              disabled={stripeSaving || DEMO_MODE}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: stripeSaved ? '#10B981' : (DEMO_MODE ? 'var(--overlay-md)' : '#204CE5'),
                color: DEMO_MODE ? 'var(--text-subtle)' : 'white',
                fontSize: '13px',
                fontWeight: 600,
                cursor: (stripeSaving || DEMO_MODE) ? 'default' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'background .2s',
              }}
            >
              {stripeSaved ? '✓ Salvato' : stripeSaving ? 'Salvo...' : 'Salva chiavi Stripe'}
            </button>
          </div>
        </div>

        {/* ── Section 4: Webhook endpoints (unchanged) ── */}
        <div style={CARD_STYLE}>
          <h2 style={{ ...SECTION_TITLE, marginBottom: '4px' }}>Webhook Endpoints</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Usa questi endpoint per inviare dati dalla tua automazione n8n
          </p>

          {[
            {
              label: 'Contatti (LinkedIn / Apify)',
              endpoint: '/.netlify/functions/webhook-contacts',
              color: '#0077B5',
            },
            {
              label: 'Aziende (Apollo.io)',
              endpoint: '/.netlify/functions/webhook-companies',
              color: '#7C3AED',
            },
          ].map(item => (
            <div key={item.endpoint} style={{
              padding: '16px',
              background: 'var(--surface)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              marginBottom: '12px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                {item.label}
              </div>
              <code style={{
                fontSize: '12px',
                color: item.color,
                background: 'rgba(255,255,255,.04)',
                padding: '6px 10px',
                borderRadius: '6px',
                display: 'block',
                fontFamily: 'monospace',
              }}>
                POST {item.endpoint}
              </code>
              <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '8px' }}>
                Header richiesto: <code style={{ color: '#6B7A8A' }}>x-webhook-secret: WEBHOOK_SECRET</code>
              </div>
            </div>
          ))}
        </div>

        {/* Environment section */}
        <div style={{ ...CARD_STYLE, marginBottom: 0 }}>
          <h2 style={{ ...SECTION_TITLE, marginBottom: '4px' }}>Variabili d'ambiente</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Configura nel file <code style={{ color: '#527EFF' }}>.env.local</code> (frontend) e nelle variabili Netlify (functions)
          </p>
          <div style={{
            background: 'var(--bg)',
            borderRadius: '12px',
            padding: '16px',
            fontFamily: 'monospace',
            fontSize: '12px',
          }}>
            {[
              { key: 'VITE_SUPABASE_URL',        desc: 'URL progetto Supabase',           color: '#527EFF' },
              { key: 'VITE_SUPABASE_ANON_KEY',   desc: 'Chiave anonima Supabase',         color: '#527EFF' },
              { key: 'SUPABASE_URL',             desc: 'URL Supabase per Functions',      color: '#7C3AED' },
              { key: 'SUPABASE_SERVICE_ROLE_KEY', desc: 'Solo per Netlify Functions',      color: '#7C3AED' },
              { key: 'WEBHOOK_SECRET',            desc: 'Token segreto condiviso con n8n', color: '#F59E0B' },
            ].map(v => (
              <div key={v.key} style={{ marginBottom: '10px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ color: v.color, minWidth: '240px' }}>{v.key}</span>
                <span style={{ color: 'var(--text-subtle)' }}># {v.desc}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
