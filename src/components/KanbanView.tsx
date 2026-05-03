import { useState } from 'react'
import type { Contact, Company, PipelineStage } from '../types'

type KanbanRecord = (Contact | Company) & { name: string }

interface Props {
  items: KanbanRecord[]
  stages: PipelineStage[]
  onItemClick: (item: KanbanRecord) => void
  onStageChange: (item: KanbanRecord, newStageId: string) => void
  type: 'contacts' | 'companies'
}

export function KanbanView({ items, stages, onItemClick, onStageChange }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null)

  const gradients = [
    'linear-gradient(135deg,#204CE5,#7C3AED)',
    'linear-gradient(135deg,#0077B5,#204CE5)',
    'linear-gradient(135deg,#7C3AED,#EC4899)',
    'linear-gradient(135deg,#10B981,#0077B5)',
    'linear-gradient(135deg,#F59E0B,#EF4444)',
  ]

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      overflowX: 'auto',
      padding: '4px 0 16px',
      minHeight: '400px',
    }}>
      {stages.map(stage => {
        const stageItems = items.filter(i => i.stage_id === stage.id)
        const isDragOver = dragOverStageId === stage.id
        const draggingItem = items.find(i => i.id === draggingId)
        const canDrop = draggingItem && draggingItem.stage_id !== stage.id

        return (
          <div
            key={stage.id}
            style={{ minWidth: '240px', width: '240px', flexShrink: 0 }}
            onDragOver={(e) => {
              e.preventDefault()
              if (canDrop) setDragOverStageId(stage.id)
            }}
            onDragLeave={(e) => {
              // Only clear if leaving the column entirely (not just a child element)
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverStageId(null)
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (draggingItem && canDrop) {
                onStageChange(draggingItem, stage.id)
              }
              setDraggingId(null)
              setDragOverStageId(null)
            }}
          >
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', marginBottom: '10px',
              background: isDragOver && canDrop ? `${stage.color}30` : `${stage.color}18`,
              borderRadius: '12px',
              border: isDragOver && canDrop ? `2px solid ${stage.color}80` : `1px solid ${stage.color}30`,
              transition: 'all .15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: stage.color }}>{stage.name}</span>
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 700,
                background: `${stage.color}25`, color: stage.color,
                padding: '2px 8px', borderRadius: '20px',
              }}>{stageItems.length}</span>
            </div>

            {/* Drop zone hint */}
            <div style={{
              minHeight: isDragOver && canDrop ? '60px' : 0,
              borderRadius: '12px',
              border: isDragOver && canDrop ? `2px dashed ${stage.color}60` : 'none',
              background: isDragOver && canDrop ? `${stage.color}08` : 'transparent',
              marginBottom: isDragOver && canDrop ? '8px' : 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all .15s',
              overflow: 'hidden',
            }}>
              {isDragOver && canDrop && (
                <span style={{ fontSize: '11px', color: `${stage.color}99`, fontWeight: 600 }}>
                  Rilascia qui
                </span>
              )}
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stageItems.map(item => {
                const initials = item.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                const score = item.score ?? 0
                const grad = gradients[item.id.charCodeAt(item.id.length - 1) % gradients.length]
                const isDragging = draggingId === item.id

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(item.id)
                      e.dataTransfer.effectAllowed = 'move'
                      // Ghost image: transparent 1px
                      const ghost = document.createElement('div')
                      ghost.style.opacity = '0'
                      ghost.style.position = 'absolute'
                      ghost.style.top = '-9999px'
                      document.body.appendChild(ghost)
                      e.dataTransfer.setDragImage(ghost, 0, 0)
                      setTimeout(() => document.body.removeChild(ghost), 0)
                    }}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setDragOverStageId(null)
                    }}
                    onClick={() => !isDragging && onItemClick(item)}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '14px',
                      cursor: 'grab',
                      transition: 'all .15s',
                      opacity: isDragging ? 0.4 : 1,
                      transform: isDragging ? 'scale(.97)' : 'scale(1)',
                      userSelect: 'none',
                    }}
                    onMouseEnter={e => {
                      if (!isDragging) {
                        ;(e.currentTarget as HTMLDivElement).style.borderColor = `${stage.color}50`
                      }
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: grad, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '11px', fontWeight: 800,
                        color: 'white', flexShrink: 0,
                      }}>{initials}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        {'role' in item && (item as Contact).role && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {(item as Contact).role}{('company' in item && (item as Contact).company) ? ` · ${(item as Contact).company}` : ''}
                          </div>
                        )}
                        {'industry' in item && (item as Company).industry && (
                          <div style={{ fontSize: '11px', color: '#5B6B7A' }}>{(item as Company).industry}</div>
                        )}
                      </div>
                    </div>

                    {/* Score bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,.08)', borderRadius: '2px' }}>
                        <div style={{ width: `${score}%`, height: '100%', background: score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#204CE5', borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>{score}</span>
                    </div>
                  </div>
                )
              })}

              {stageItems.length === 0 && !isDragOver && (
                <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '12px' }}>
                  Nessun elemento
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
