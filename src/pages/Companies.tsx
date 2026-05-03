import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { useCompanies } from '../hooks/useCompanies'
import { CompanyDetailPanel } from '../components/CompanyDetailPanel'
import { KanbanView } from '../components/KanbanView'
import { supabase } from '../lib/supabase'
import { DEMO_MODE, MOCK_STAGES } from '../lib/mockData'
import type { Company } from '../types'

const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
  'Nuovo': { bg: 'rgba(124,58,237,.18)', color: '#A78BFA' },
  'Contattato': { bg: 'rgba(245,158,11,.15)', color: '#F59E0B' },
  'In trattativa': { bg: 'rgba(139,92,246,.18)', color: '#A78BFA' },
  'Qualificato': { bg: 'rgba(16,185,129,.15)', color: '#34D399' },
  'Perso': { bg: 'rgba(107,114,128,.15)', color: '#9CA3AF' },
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#F59E0B' : '#6B7A8A'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
      <div style={{ width: '60px', height: '5px', background: 'var(--overlay-md)', borderRadius: '3px', overflow: 'hidden', display: 'inline-block' }}>
        <div style={{ width: `${score}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: '3px' }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color }}>{score}</span>
    </div>
  )
}

function StageBadge({ stage }: { stage?: Company['stage'] }) {
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

function exportCompaniesCSV(data: Company[]) {
  const headers = ['Azienda', 'Settore', 'Dimensioni', 'Dipendenti', 'Fatturato', 'Website', 'HQ', 'Tecnologie', 'Score', 'Stage', 'Data']
  const rows = data.map(c => [
    c.name,
    c.industry ?? '',
    c.size_range ?? '',
    c.employee_count ?? '',
    c.revenue_range ?? '',
    c.website ?? '',
    c.headquarters ?? '',
    (c.technologies ?? []).join('; '),
    c.score,
    c.stage?.name ?? '',
    new Date(c.created_at).toLocaleDateString('it-IT'),
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `aziende_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function SkeletonRow() {
  return (
    <tr>
      {[40, 180, 120, 100, 80, 90, 80, 70].map((w, i) => (
        <td key={i} style={{ padding: '13px 18px' }}>
          <div style={{ height: '14px', width: `${w}px`, background: 'var(--overlay-md)', borderRadius: '6px' }} />
        </td>
      ))}
    </tr>
  )
}

const STAGE_FILTERS = ['Tutti', 'Nuovo', 'Contattato', 'In trattativa', 'Qualificato', 'Perso']

export function Companies() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeStage, setActiveStage] = useState('Tutti')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [localCompanies, setLocalCompanies] = useState<Company[]>([])

  const { companies, loading, error } = useCompanies({
    search: debouncedSearch || undefined,
  })

  useEffect(() => { setLocalCompanies(companies) }, [companies])

  async function handleKanbanStageChange(item: Company, newStageId: string) {
    const stage = MOCK_STAGES.find(s => s.id === newStageId)
    setLocalCompanies(prev => prev.map(c =>
      c.id === item.id ? { ...c, stage_id: newStageId, stage: stage ?? c.stage } : c
    ))
    if (selectedCompany?.id === item.id) {
      setSelectedCompany(prev => prev ? { ...prev, stage_id: newStageId, stage: stage ?? prev.stage } : prev)
    }
    if (DEMO_MODE) return
    await supabase.from('companies').update({ stage_id: newStageId, updated_at: new Date().toISOString() }).eq('id', item.id)
    await supabase.from('activities').insert({
      record_type: 'company', record_id: item.id,
      type: 'stage_change', content: `Stage cambiato in: ${stage?.name ?? newStageId}`,
    })
  }

  const filtered = activeStage === 'Tutti'
    ? localCompanies
    : localCompanies.filter(c => c.stage?.name === activeStage)

  let searchTimeout: ReturnType<typeof setTimeout>
  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => setDebouncedSearch(val), 300)
  }

  const today = companies.filter(c => {
    const d = new Date(c.created_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length

  return (
    <div style={{ flex: 1, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <TopBar
        title="Aziende"
        subtitle={loading ? 'Caricamento...' : `${companies.length} totali · ${today} oggi`}
      />

      {/* Tab switcher */}
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
        <div style={{
          display: 'inline-flex',
          background: 'var(--bg)',
          borderRadius: '12px',
          padding: '4px',
          border: '1px solid var(--border)',
          gap: '2px',
        }}>
          <button
            onClick={() => navigate('/contatti')}
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
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            Contatti LinkedIn
          </button>
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
              background: '#7C3AED',
              color: 'white',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 2px 8px rgba(124,58,237,.4)',
            }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
            Aziende Apollo
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '1px 7px',
              borderRadius: '20px',
              background: 'rgba(255,255,255,.2)',
              color: 'white',
            }}>
              {companies.length}
            </span>
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
            background: 'rgba(124,58,237,.15)',
            border: '1px solid rgba(124,58,237,.25)',
            fontSize: '11.5px',
            fontWeight: 600,
            color: '#A78BFA',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
            Apollo.io API
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--surface)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, background: viewMode === 'list' ? '#7C3AED' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-subtle)', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, background: viewMode === 'kanban' ? '#7C3AED' : 'transparent', color: viewMode === 'kanban' ? 'white' : 'var(--text-subtle)', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: '6px' }}
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
                  border: isActive ? '1px solid rgba(124,58,237,.35)' : '1px solid transparent',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: isActive ? 'rgba(124,58,237,.18)' : 'transparent',
                  color: isActive ? '#A78BFA' : 'var(--text-subtle)',
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
          <div style={{ position: 'relative' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Cerca azienda, settore..."
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

          <button
            onClick={() => exportCompaniesCSV(filtered)}
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
              onItemClick={(item) => setSelectedCompany(item as Company)}
              onStageChange={(item, stageId) => handleKanbanStageChange(item as Company, stageId)}
              type="companies"
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
                {['#', 'Azienda', 'Settore', 'Dimensioni', 'HQ', 'Score', 'Affidabilità', 'Stage', 'Data'].map(h => (
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
                        <rect x="2" y="7" width="20" height="14" rx="2"/>
                        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                      </svg>
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Nessuna azienda trovata</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '4px' }}>
                        {search ? 'Prova con un termine di ricerca diverso' : 'Le aziende arriveranno tramite Apollo.io'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((company, idx) => (
                  <tr
                    key={company.id}
                    onClick={() => setSelectedCompany(company)}
                    style={{
                      background: idx % 2 === 0 ? 'var(--overlay-xs)' : 'transparent',
                      borderBottom: '1px solid var(--border-sm)',
                      borderLeft: '2px solid transparent',
                      transition: 'all .12s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(124,58,237,.06)'
                      ;(e.currentTarget as HTMLTableRowElement).style.borderLeftColor = '#7C3AED'
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
                          borderRadius: '8px',
                          background: 'rgba(124,58,237,.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#A78BFA',
                          flexShrink: 0,
                        }}>
                          {getInitials(company.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>{company.name}</div>
                          {company.website && (
                            <a href={company.website} target="_blank" rel="noreferrer"
                              style={{ fontSize: '11px', color: '#7C3AED', textDecoration: 'none' }}>
                              {company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {company.industry ?? '—'}
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {company.size_range ?? (company.employee_count ? `${company.employee_count} dip.` : '—')}
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {company.headquarters ?? '—'}
                    </td>
                    <td style={{ padding: '13px 18px' }}>
                      <ScoreBadge score={company.score} />
                    </td>
                    <td style={{ padding: '13px 18px' }}>
                      {company.trust_score != null ? (() => {
                        const ts = company.trust_score
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
                      <StageBadge stage={company.stage} />
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: '12px', color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                      {new Date(company.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <CompanyDetailPanel
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
        onUpdate={(updated) => {
          setSelectedCompany(updated)
          setLocalCompanies(prev => prev.map(c => c.id === updated.id ? updated : c))
        }}
      />
    </div>
  )
}
