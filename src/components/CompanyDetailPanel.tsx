import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { DEMO_MODE, MOCK_STAGES } from '../lib/mockData'
import type { Company } from '../types'

const STAGES = [
  { name: 'Nuovo',         color: '#204CE5', bg: 'rgba(32,76,229,.18)' },
  { name: 'Contattato',    color: '#F59E0B', bg: 'rgba(245,158,11,.15)' },
  { name: 'In trattativa', color: '#8B5CF6', bg: 'rgba(139,92,246,.18)' },
  { name: 'Qualificato',   color: '#10B981', bg: 'rgba(16,185,129,.15)' },
  { name: 'Perso',         color: '#6B7280', bg: 'rgba(107,114,128,.15)' },
]

interface Props {
  company: Company | null
  onClose: () => void
  onUpdate: (updated: Company) => void
}

export function CompanyDetailPanel({ company, onClose, onUpdate }: Props) {
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [pendingStage, setPendingStage] = useState<string | null>(null)

  useEffect(() => { setPendingStage(null) }, [company?.id])

  if (!company) return null

  const displayedStage = pendingStage ?? company.stage?.name
  const hasUnsavedStage = pendingStage !== null && pendingStage !== company.stage?.name

  async function changeStage(stageName: string) {
    if (!company) return
    setSaving(true)

    if (DEMO_MODE) {
      const stage = MOCK_STAGES.find(s => s.name === stageName)
      if (stage) {
        onUpdate({ ...company, stage_id: stage.id, stage })
      }
      await new Promise(r => setTimeout(r, 300))
      setPendingStage(null)
      setSaving(false)
      return
    }

    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id,name')
      .eq('name', stageName)
      .single()
    if (stages) {
      const { data } = await supabase
        .from('companies')
        .update({ stage_id: stages.id, updated_at: new Date().toISOString() })
        .eq('id', company.id)
        .select('*, stage:pipeline_stages(*)')
        .single()
      if (data) onUpdate(data as Company)
      await supabase.from('activities').insert({
        record_type: 'company',
        record_id: company.id,
        type: 'stage_change',
        content: `Stage cambiato in: ${stageName}`,
      })
    }
    setPendingStage(null)
    setSaving(false)
  }

  async function saveNote() {
    if (!note.trim() || !company) return
    setAddingNote(true)
    await supabase.from('activities').insert({
      record_type: 'company',
      record_id: company.id,
      type: 'note',
      content: note.trim(),
    })
    setNote('')
    setAddingNote(false)
  }

  const initials = company.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,.5)',
          zIndex: 40,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        right: 0, top: 0, bottom: 0,
        width: '480px',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        boxShadow: '-20px 0 60px rgba(0,0,0,.4)',
        animation: 'slideInCompany .25s cubic-bezier(.4,0,.2,1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: 800, color: 'white', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>
              {company.name}
            </div>
            <div style={{ fontSize: '12px', color: '#5B6B7A' }}>
              {[company.industry, company.size_range ?? (company.employee_count ? `${company.employee_count} dip.` : null)].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontFamily: 'Inter, sans-serif',
            }}
          >✕</button>
        </div>

        {/* Pipeline stage selector */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '12px' }}>
            Stato Pipeline
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: hasUnsavedStage ? '12px' : 0 }}>
            {STAGES.map(s => {
              const isActive = displayedStage === s.name
              const isSaved = company.stage?.name === s.name
              return (
                <button
                  key={s.name}
                  onClick={() => setPendingStage(s.name)}
                  disabled={saving}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '20px',
                    border: isActive ? `1px solid ${s.color}55` : '1px solid rgba(255,255,255,.08)',
                    background: isActive ? s.bg : 'transparent',
                    color: isActive ? s.color : '#4B5B6E',
                    fontSize: '12px', fontWeight: 600,
                    cursor: saving ? 'wait' : 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all .12s',
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    outline: isActive && !isSaved ? `2px dashed ${s.color}88` : 'none',
                    outlineOffset: '2px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? s.color : '#4B5B6E', flexShrink: 0 }} />
                  {s.name}
                </button>
              )
            })}
          </div>
          {hasUnsavedStage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => changeStage(pendingStage!)}
                disabled={saving}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#7C3AED',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: saving ? 'wait' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all .15s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {saving ? (
                  <>
                    <span style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin .6s linear infinite' }} />
                    Salvataggio...
                  </>
                ) : 'Salva modifiche'}
              </button>
              <button
                onClick={() => setPendingStage(null)}
                disabled={saving}
                style={{
                  padding: '8px 14px',
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
                Annulla
              </button>
            </div>
          )}
        </div>

        {/* Company info */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '12px' }}>
            Informazioni Azienda
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {([
              { icon: '🏭', label: 'Settore', value: company.industry },
              { icon: '🌐', label: 'Sito web', value: company.website, isLink: true },
              { icon: '📍', label: 'Sede', value: company.headquarters },
              { icon: '👥', label: 'Dipendenti', value: company.size_range ?? (company.employee_count != null ? `${company.employee_count}` : null) },
              { icon: '💰', label: 'Fatturato', value: company.revenue_range },
            ] as const).map(row => row.value && (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>{row.icon}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '70px' }}>{row.label}</span>
                {(row as { isLink?: boolean }).isLink ? (
                  <a href={row.value} target="_blank" rel="noreferrer"
                    style={{ fontSize: '13px', color: '#7C3AED', textDecoration: 'none' }}>
                    {row.value.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                ) : (
                  <span style={{ fontSize: '13px', color: '#C8D4E0' }}>{row.value}</span>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>⭐</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '70px' }}>Score</span>
              <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 700 }}>{company.score}/100</span>
            </div>
            {company.trust_score != null && (() => {
              const ts = company.trust_score
              const color = ts >= 80 ? '#10B981' : ts >= 60 ? '#F59E0B' : '#EF4444'
              return (
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>🛡️</span>
                  <span style={{fontSize:'12px',color:'#5B6B7A',minWidth:'70px'}}>Affidabilità</span>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <div style={{width:'80px',height:'6px',background:'rgba(255,255,255,.1)',borderRadius:'3px'}}>
                      <div style={{width:`${ts}%`,height:'100%',background:color,borderRadius:'3px'}}/>
                    </div>
                    <span style={{fontSize:'13px',fontWeight:700,color}}>{ts}/100</span>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Technologies */}
        {company.technologies && company.technologies.length > 0 && (
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '12px' }}>
              Tecnologie
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {company.technologies.map(tech => (
                <span key={tech} style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(124,58,237,.15)',
                  border: '1px solid rgba(124,58,237,.25)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#A78BFA',
                }}>
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Key contacts */}
        {company.key_contacts && company.key_contacts.length > 0 && (
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '12px' }}>
              Contatti Chiave
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {company.key_contacts.map((kc, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px',
                  background: 'var(--bg)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-sm)',
                }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: 'rgba(124,58,237,.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 800, color: '#A78BFA', flexShrink: 0,
                  }}>
                    {kc.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#C8D4E0' }}>{kc.name}</div>
                    <div style={{ fontSize: '11px', color: '#5B6B7A' }}>{kc.role}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {kc.email && (
                      <a href={`mailto:${kc.email}`} style={{ fontSize: '12px', color: '#5B7A90', textDecoration: 'none' }}>📧</a>
                    )}
                    {kc.linkedin_url && (
                      <a href={kc.linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#0077B5', textDecoration: 'none' }}>🔗</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add note */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '12px' }}>
            Aggiungi Nota
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Scrivi una nota su questa azienda..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'Inter, sans-serif',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={saveNote}
            disabled={!note.trim() || addingNote}
            style={{
              marginTop: '10px',
              padding: '9px 18px',
              borderRadius: '10px',
              border: 'none',
              background: note.trim() ? '#7C3AED' : 'rgba(255,255,255,.06)',
              color: note.trim() ? 'white' : '#3D5065',
              fontSize: '13px',
              fontWeight: 600,
              cursor: note.trim() ? 'pointer' : 'default',
              fontFamily: 'Inter, sans-serif',
              transition: 'all .15s',
            }}
          >
            {addingNote ? 'Salvataggio...' : 'Salva nota'}
          </button>
        </div>

        <style>{`
          @keyframes slideInCompany { from { transform: translateX(100%); } to { transform: translateX(0); } }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </>
  )
}
