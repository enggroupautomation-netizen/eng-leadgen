import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { useContacts } from '../hooks/useContacts'
import { ContactDetailPanel } from '../components/ContactDetailPanel'
import { KanbanView } from '../components/KanbanView'
import { supabase } from '../lib/supabase'
import { DEMO_MODE, MOCK_STAGES } from '../lib/mockData'
import type { Contact, PipelineStage } from '../types'

const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
  'Nuovo': { bg: 'rgba(32,76,229,.18)', color: '#7EB3FF' },
  'Contattato': { bg: 'rgba(245,158,11,.15)', color: '#F59E0B' },
  'In trattativa': { bg: 'rgba(139,92,246,.18)', color: '#A78BFA' },
  'Qualificato': { bg: 'rgba(16,185,129,.15)', color: '#34D399' },
  'Perso': { bg: 'rgba(107,114,128,.15)', color: '#9CA3AF' },
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string) {
  const colors = ['#204CE5', '#7C3AED', '#0077B5', '#0891b2', '#059669', '#d97706']
  let hash = 0
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#F59E0B' : '#6B7A8A'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
      <div style={{
        width: '60px',
        height: '5px',
        background: 'var(--overlay-md)',
        borderRadius: '3px',
        overflow: 'hidden',
        display: 'inline-block',
      }}>
        <div style={{ width: `${score}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: '3px' }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color }}>{score}</span>
    </div>
  )
}

function StageBadge({ stage }: { stage?: Contact['stage'] }) {
  if (!stage) return <span style={{ color: 'var(--text-subtle)', fontSize: '12px' }}>—</span>
  const s = STAGE_COLORS[stage.name] ?? { bg: 'var(--overlay-md)', color: '#9CA3AF' }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '11.5px',
      fontWeight: 600,
      background: s.bg,
      color: s.color,
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {stage.name}
    </span>
  )
}

function exportContactsCSV(data: Contact[]) {
  const headers = ['Nome', 'Ruolo', 'Azienda', 'Email', 'Telefono', 'LinkedIn', 'Score', 'Stage', 'Località', 'Data']
  const rows = data.map(c => [
    c.name,
    c.role ?? '',
    c.company ?? '',
    c.email ?? '',
    c.phone ?? '',
    c.linkedin_url ?? '',
    c.score,
    c.stage?.name ?? '',
    c.location ?? '',
    new Date(c.created_at).toLocaleDateString('it-IT'),
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `contatti_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function SkeletonRow() {
  return (
    <tr>
      {[40, 160, 100, 120, 80, 80, 100, 70].map((w, i) => (
        <td key={i} style={{ padding: '13px 18px' }}>
          <div style={{ height: '14px', width: `${w}px`, background: 'var(--overlay-md)', borderRadius: '6px' }} />
        </td>
      ))}
    </tr>
  )
}

const STAGE_FILTERS = ['Tutti', 'Nuovo', 'Contattato', 'In trattativa', 'Qualificato', 'Perso']

export function Contacts() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeStage, setActiveStage] = useState('Tutti')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [localContacts, setLocalContacts] = useState<Contact[]>([])
  const [stages, setStages] = useState<PipelineStage[]>(MOCK_STAGES)

  const { contacts, loading, error } = useContacts({
    search: debouncedSearch || undefined,
  })

  // Keep local copy in sync with hook (realtime updates)
  useEffect(() => { setLocalContacts(contacts) }, [contacts])

  // Load real stages from Supabase
  useEffect(() => {
    if (DEMO_MODE) return
    supabase.from('pipeline_stages').select('*').order('position').then(({ data }) => {
      if (data?.length) setStages(data as PipelineStage[])
    })
  }, [])

  async function handleKanbanStageChange(item: Contact, newStageId: string) {
    const stage = stages.find(s => s.id === newStageId)
    // Optimistic update
    setLocalContacts(prev => prev.map(c =>
      c.id === item.id ? { ...c, stage_id: newStageId, stage: stage ?? c.stage } : c
    ))
    if (selectedContact?.id === item.id) {
      setSelectedContact(prev => prev ? { ...prev, stage_id: newStageId, stage: stage ?? prev.stage } : prev)
    }
    if (DEMO_MODE) return
    await supabase.from('contacts').update({ stage_id: newStageId, updated_at: new Date().toISOString() }).eq('id', item.id)
    await supabase.from('activities').insert({
      record_type: 'contact', record_id: item.id,
      type: 'stage_change', content: `Stage cambiato in: ${stage?.name ?? newStageId}`,
    })
  }

  const filtered = activeStage === 'Tutti'
    ? localContacts
    : localContacts.filter(c => c.stage?.name === activeStage)

  let searchTimeout: ReturnType<typeof setTimeout>
  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => setDebouncedSearch(val), 300)
  }

  const today = contacts.filter(c => {
    const d = new Date(c.created_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length

  return (
    <div style={{ flex: 1, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <TopBar
        title="Contatti"
        subtitle={loading ? 'Caricamento...' : `${contacts.length} totali · ${today} oggi`}
      />

      {/* Tab switcher + source bar */}
      <div style={{
        background: 'var(--surface)',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Segmented tabs */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--bg)',
          borderRadius: '12px',
          padding: '4px',
          border: '1px solid var(--border)',
          gap: '2px',
        }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 16px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: '#0077B5',
              color: 'white',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 2px 8px rgba(0,119,181,.4)',
            }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            Contatti LinkedIn
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '1px 7px',
              borderRadius: '20px',
              background: 'rgba(255,255,255,.2)',
              color: 'white',
            }}>
              {contacts.length}
            </span>
          </button>
          <button
            onClick={() => navigate('/aziende')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 16px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--text-subtle)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
            Aziende Apollo
          </button>
        </div>

        {/* Source indicator + view toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '20px',
            background: 'rgba(0,119,181,.15)',
            border: '1px solid rgba(0,119,181,.25)',
            fontSize: '11.5px',
            fontWeight: 600,
            color: '#5BAFD6',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn via Apify
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--surface)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, background: viewMode === 'list' ? '#204CE5' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-subtle)', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, background: viewMode === 'kanban' ? '#204CE5' : 'transparent', color: viewMode === 'kanban' ? 'white' : 'var(--text-subtle)', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="11" y="3" width="5" height="14" rx="1"/><rect x="19" y="3" width="5" height="10" rx="1"/></svg>
              Kanban
            </button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        background: 'var(--surface)',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        {/* Stage pills */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {STAGE_FILTERS.map(s => {
            const isActive = activeStage === s
            const dotColor = s === 'Tutti' ? undefined : (STAGE_COLORS[s]?.color ?? '#9CA3AF')
            return (
              <button
                key={s}
                onClick={() => setActiveStage(s)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  border: isActive ? '1px solid rgba(32,76,229,.35)' : '1px solid transparent',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: isActive ? 'rgba(32,76,229,.18)' : 'transparent',
                  color: isActive ? '#7EB3FF' : 'var(--text-subtle)',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all .12s',
                }}
              >
                {dotColor && (
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                )}
                {s}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Cerca nome, azienda..."
              style={{
                padding: '7px 12px 7px 32px',
                borderRadius: '9px',
                border: '1px solid var(--border)',
                background: 'var(--input-bg)',
                color: 'var(--text)',
                fontSize: '12px',
                width: '220px',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>

          {/* Export CSV */}
          <button
            onClick={() => exportContactsCSV(filtered)}
            disabled={filtered.length === 0}
            title="Esporta CSV"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '9px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: filtered.length === 0 ? 'var(--text-subtle)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: filtered.length === 0 ? 'default' : 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'all .12s',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            CSV
          </button>
        </div>
      </div>

      {/* Table / Kanban */}
      <div style={{ flex: 1, overflowX: 'auto', background: 'var(--surface-3)' }}>
        {viewMode === 'kanban' ? (
          <div style={{ padding: '20px 24px' }}>
            <KanbanView
              items={filtered}
              stages={stages}
              onItemClick={(item) => setSelectedContact(item as Contact)}
              onStageChange={(item, stageId) => handleKanbanStageChange(item as Contact, stageId)}
              type="contacts"
            />
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#f87171', fontSize: '14px' }}>
            Errore nel caricamento: {error}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                {['#', 'Contatto', 'Ruolo', 'Azienda', 'Email', 'Score', 'Affidabilità', 'Stage', 'Data'].map(h => (
                  <th key={h} style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: 'var(--text-subtle)',
                    padding: '12px 18px',
                    textAlign: 'left',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '60px 0', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-subtle)' }}>
                      <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                        style={{ margin: '0 auto 12px', display: 'block' }}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Nessun contatto trovato</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '4px' }}>
                        {search ? 'Prova con un termine di ricerca diverso' : 'I contatti arriveranno tramite webhook n8n'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((contact, idx) => (
                  <tr
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    style={{
                      background: idx % 2 === 0 ? 'var(--overlay-xs)' : 'transparent',
                      borderBottom: '1px solid var(--border-sm)',
                      borderLeft: '2px solid transparent',
                      transition: 'all .12s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(32,76,229,.06)'
                      ;(e.currentTarget as HTMLTableRowElement).style.borderLeftColor = '#204CE5'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? 'var(--overlay-xs)' : 'transparent'
                      ;(e.currentTarget as HTMLTableRowElement).style.borderLeftColor = 'transparent'
                    }}
                  >
                    <td style={{ padding: '13px 18px', fontSize: '12px', color: 'var(--text-subtle)' }}>{idx + 1}</td>
                    <td style={{ padding: '13px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: getAvatarColor(contact.name),
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 800,
                          color: 'white',
                          flexShrink: 0,
                        }}>
                          {getInitials(contact.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>{contact.name}</div>
                          {contact.linkedin_url && (
                            <a href={contact.linkedin_url} target="_blank" rel="noreferrer"
                              style={{ fontSize: '11px', color: '#0077B5', textDecoration: 'none' }}>
                              LinkedIn
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {contact.role ?? '—'}
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {contact.company ?? '—'}
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {contact.email ?? '—'}
                    </td>
                    <td style={{ padding: '13px 18px' }}>
                      <ScoreBadge score={contact.score} />
                    </td>
                    <td style={{ padding: '13px 18px' }}>
                      {contact.trust_score != null ? (() => {
                        const ts = contact.trust_score
                        const color = ts >= 80 ? '#10B981' : ts >= 60 ? '#F59E0B' : '#EF4444'
                        return (
                          <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                            <svg width="12" height="12" fill={color} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            <span style={{fontSize:'13px',fontWeight:700,color}}>{ts}</span>
                          </div>
                        )
                      })() : <span style={{color:'var(--text-subtle)',fontSize:'12px'}}>—</span>}
                    </td>
                    <td style={{ padding: '13px 18px' }}>
                      <StageBadge stage={contact.stage} />
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: '12px', color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                      {new Date(contact.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <ContactDetailPanel
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
        onUpdate={(updated) => {
          setSelectedContact(updated)
          setLocalContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
        }}
      />
    </div>
  )
}
