import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { Profile, UserRole } from '../types'

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

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; desc: string }> = {
  admin:   { label: 'Amministratore', color: '#F59E0B', bg: 'rgba(245,158,11,.15)',  desc: 'Accesso completo + impostazioni piattaforma e Stripe' },
  manager: { label: 'Utente',         color: '#527EFF', bg: 'rgba(82,126,255,.15)', desc: 'Accesso completo alla piattaforma (contatti, aziende, pipeline)' },
  viewer:  { label: 'Viewer',         color: '#6B7A8A', bg: 'rgba(107,122,138,.15)', desc: 'Solo lettura' },
}

interface UserListItem extends Profile {}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export function Users() {
  const { user } = useAuth()

  const [users, setUsers] = useState<UserListItem[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  // Create form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'admin' | 'manager'>('manager')
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Delete / role change state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoadingList(true)
    setListError(null)
    const token = await getToken()
    if (!token) { setListError('Non autenticato'); setLoadingList(false); return }

    const res = await fetch('/.netlify/functions/manage-users', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json() as { users?: UserListItem[]; error?: string }
    if (res.ok && json.users) {
      setUsers(json.users)
    } else {
      setListError(json.error ?? 'Errore nel caricamento')
    }
    setLoadingList(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function createUser() {
    if (!email.trim() || !password.trim()) return
    setCreating(true)
    setCreateMsg(null)
    const token = await getToken()
    if (!token) { setCreateMsg({ type: 'error', text: 'Non autenticato' }); setCreating(false); return }

    const res = await fetch('/.netlify/functions/manage-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: email.trim(), password: password.trim(), name: name.trim() || undefined, role }),
    })
    const json = await res.json() as { user?: { id: string; email: string; role: string }; error?: string }

    if (res.ok && json.user) {
      setCreateMsg({ type: 'success', text: `Utente ${json.user.email} creato come ${ROLE_CONFIG[json.user.role as UserRole]?.label ?? json.user.role}.` })
      setEmail(''); setPassword(''); setName('')
      await fetchUsers()
    } else {
      setCreateMsg({ type: 'error', text: json.error ?? 'Errore nella creazione' })
    }
    setCreating(false)
  }

  async function changeRole(userId: string, newRole: UserRole) {
    setChangingRoleId(userId)
    const token = await getToken()
    if (!token) { setChangingRoleId(null); return }

    const res = await fetch('/.netlify/functions/manage-users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: userId, role: newRole }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
    setChangingRoleId(null)
  }

  async function deleteUser(userId: string, userEmail: string) {
    if (!confirm(`Eliminare l'utente ${userEmail}? Questa azione è irreversibile.`)) return
    setDeletingId(userId)
    const token = await getToken()
    if (!token) { setDeletingId(null); return }

    const res = await fetch(`/.netlify/functions/manage-users?id=${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== userId))
    } else {
      const json = await res.json() as { error: string }
      alert(json.error)
    }
    setDeletingId(null)
  }

  return (
    <div style={{ flex: 1, background: 'var(--bg)' }}>
      <TopBar title="Gestione Utenti" subtitle="Crea e gestisci gli utenti della piattaforma" />

      <div style={{ padding: '32px', maxWidth: '720px' }}>

        {/* Create user */}
        <div style={CARD_STYLE}>
          <h2 style={SECTION_TITLE}>Crea nuovo utente</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={LABEL_STYLE}>Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="utente@azienda.it"
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nome Cognome"
                  style={INPUT_STYLE}
                />
              </div>
            </div>

            <div>
              <label style={LABEL_STYLE}>Password *</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimo 6 caratteri"
                style={INPUT_STYLE}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>Ruolo</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['admin', 'manager'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: role === r
                        ? `1px solid ${ROLE_CONFIG[r].color}55`
                        : '1px solid var(--border)',
                      background: role === r ? ROLE_CONFIG[r].bg : 'transparent',
                      color: role === r ? ROLE_CONFIG[r].color : 'var(--text-muted)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      transition: 'all .12s',
                      textAlign: 'left',
                    }}
                  >
                    <div>{ROLE_CONFIG[r].label}</div>
                    <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '3px', opacity: .75 }}>
                      {ROLE_CONFIG[r].desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={createUser}
              disabled={!email.trim() || !password.trim() || creating}
              style={{
                padding: '11px 20px',
                borderRadius: '10px',
                border: 'none',
                background: email.trim() && password.trim() ? '#204CE5' : 'var(--overlay-md)',
                color: email.trim() && password.trim() ? 'white' : 'var(--text-subtle)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: email.trim() && password.trim() && !creating ? 'pointer' : 'default',
                fontFamily: 'Inter, sans-serif',
                transition: 'all .15s',
              }}
            >
              {creating ? 'Creazione in corso...' : 'Crea utente'}
            </button>

            {createMsg && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: createMsg.type === 'success' ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
                border: `1px solid ${createMsg.type === 'success' ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)'}`,
                fontSize: '12px',
                color: createMsg.type === 'success' ? '#34D399' : '#f87171',
              }}>
                {createMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* User list */}
        <div style={CARD_STYLE}>
          <h2 style={SECTION_TITLE}>Utenti {!loadingList && `(${users.length})`}</h2>

          {listError && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', fontSize: '12px', color: '#f87171', marginBottom: '16px' }}>
              {listError}
            </div>
          )}

          {loadingList ? (
            <div style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>Caricamento...</div>
          ) : users.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>Nessun utente trovato.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {users.map(u => {
                const rc = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.manager
                const isSelf = u.id === user?.id
                const isDeleting = deletingId === u.id
                const isChangingRole = changingRoleId === u.id

                return (
                  <div key={u.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                    background: 'var(--surface)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #204CE5, #7C3AED)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 800,
                      color: 'white',
                      flexShrink: 0,
                    }}>
                      {(u.name?.[0] ?? u.email?.[0] ?? 'U').toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {u.name || u.email}
                        {isSelf && (
                          <span style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(32,76,229,.2)', color: '#527EFF', padding: '1px 7px', borderRadius: '99px' }}>
                            Tu
                          </span>
                        )}
                      </div>
                      {u.name && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.email}
                        </div>
                      )}
                    </div>

                    {/* Role selector */}
                    {!isSelf ? (
                      <select
                        value={u.role}
                        disabled={isChangingRole}
                        onChange={e => changeRole(u.id, e.target.value as UserRole)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '8px',
                          border: `1px solid ${rc.color}55`,
                          background: rc.bg,
                          color: rc.color,
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'Inter, sans-serif',
                          outline: 'none',
                        }}
                      >
                        <option value="admin">Amministratore</option>
                        <option value="manager">Utente</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span style={{ padding: '5px 10px', borderRadius: '8px', background: rc.bg, color: rc.color, fontSize: '12px', fontWeight: 600 }}>
                        {rc.label}
                      </span>
                    )}

                    {/* Delete */}
                    {!isSelf && (
                      <button
                        onClick={() => deleteUser(u.id, u.email ?? '')}
                        disabled={isDeleting}
                        title="Elimina utente"
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          border: '1px solid rgba(239,68,68,.25)',
                          background: 'rgba(239,68,68,.08)',
                          color: '#f87171',
                          cursor: isDeleting ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        {isDeleting ? (
                          <span style={{ fontSize: '10px' }}>...</span>
                        ) : (
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
