import { useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { DEMO_MODE } from '../lib/mockData'

interface TutorialSection {
  id: string
  title: string
  body: string
  video_url?: string
}

const MOCK_SECTIONS: TutorialSection[] = [
  {
    id: 't1',
    title: '1. Come funziona il flusso',
    body: 'La piattaforma riceve automaticamente contatti e aziende tramite i workflow n8n. Ogni mattina (lun-ven) n8n esegue lo scraping da LinkedIn tramite Apify e da Apollo.io, normalizza i dati e li invia qui via webhook.\n\nI commerciali trovano ogni mattina i nuovi contatti nella sezione **Contatti** e le nuove aziende in **Aziende**.',
    video_url: '',
  },
  {
    id: 't2',
    title: '2. Gestire la pipeline',
    body: 'Ogni contatto/azienda ha uno **stato** (Nuovo, Contattato, In trattativa, Qualificato, Perso). Puoi cambiare lo stato cliccando sul record e selezionando il nuovo stage nel pannello laterale.\n\nUsa la **vista Kanban** (pulsante in alto a destra) per avere una visione d\'insieme della pipeline.',
    video_url: '',
  },
  {
    id: 't3',
    title: '3. Punteggi: Score e Affidabilità',
    body: '**Score**: calcolato da n8n prima dell\'invio. Indica la rilevanza del contatto rispetto ai parametri di ricerca (0-100).\n\n**Affidabilità** 🛡️: indica la qualità e completezza dei dati raccolti. Un\'affidabilità alta significa email verificata, profilo LinkedIn attivo, azienda verificata.',
    video_url: '',
  },
  {
    id: 't4',
    title: '4. Impostazioni e configurazione',
    body: 'Nella sezione **Impostazioni** puoi:\n- Modificare il tuo nome e profilo\n- Invitare altri utenti (manager o viewer)\n- Visualizzare gli endpoint webhook da configurare in n8n\n- Gestire le variabili d\'ambiente necessarie',
    video_url: '',
  },
]

export function Tutorial() {
  const [sections, setSections] = useState<TutorialSection[]>(MOCK_SECTIONS)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdmin] = useState(DEMO_MODE)

  return (
    <div style={{ flex: 1, background: 'var(--bg, #0B1120)', minHeight: '100vh' }}>
      <TopBar title="Tutorial" subtitle="Guida all'utilizzo della piattaforma" />
      <div style={{ padding: '32px', maxWidth: '800px' }}>

        {isAdmin && (
          <div style={{ marginBottom: '24px', padding: '14px 18px', background: 'rgba(32,76,229,.1)', border: '1px solid rgba(32,76,229,.25)', borderRadius: '14px', fontSize: '13px', color: '#527EFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Sei admin — puoi modificare i contenuti cliccando su qualsiasi sezione.
          </div>
        )}

        {sections.map((section) => (
          <div key={section.id} style={{ marginBottom: '28px', background: 'var(--surface, #0F1829)', border: '1px solid var(--border, rgba(255,255,255,.06))', borderRadius: '20px', overflow: 'hidden' }}>
            {editingId === section.id && isAdmin ? (
              /* Edit mode */
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#5B6B7A', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '6px' }}>Titolo</label>
                  <input
                    value={section.title}
                    onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.1)', background: '#0B1120', color: '#E4EAF2', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#5B6B7A', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '6px' }}>Testo</label>
                  <textarea
                    rows={6}
                    value={section.body}
                    onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, body: e.target.value } : s))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.1)', background: '#0B1120', color: '#E4EAF2', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#5B6B7A', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '6px' }}>URL Video YouTube (opzionale)</label>
                  <input
                    placeholder="https://www.youtube.com/embed/..."
                    value={section.video_url ?? ''}
                    onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, video_url: e.target.value } : s))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.1)', background: '#0B1120', color: '#E4EAF2', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: '11px', color: '#4B5B6E', marginTop: '4px' }}>Usa il link /embed/ di YouTube. Es: https://www.youtube.com/embed/dQw4w9WgXcQ</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setEditingId(null)} style={{ padding: '8px 18px', borderRadius: '9px', border: 'none', background: '#204CE5', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Salva
                  </button>
                  <button onClick={() => setEditingId(null)} style={{ padding: '8px 18px', borderRadius: '9px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#6B7A8A', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div style={{ padding: '24px' }} onClick={() => isAdmin && setEditingId(section.id)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text, #E4EAF2)', margin: 0 }}>{section.title}</h2>
                  {isAdmin && (
                    <span style={{ fontSize: '11px', color: '#3D5065', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Modifica
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-muted, #6B7A8A)', whiteSpace: 'pre-wrap' }}>
                  {section.body.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                    i % 2 === 1
                      ? <strong key={i} style={{ color: 'var(--text, #E4EAF2)', fontWeight: 600 }}>{part}</strong>
                      : <span key={i}>{part}</span>
                  )}
                </div>
                {section.video_url && (
                  <div style={{ marginTop: '20px', borderRadius: '14px', overflow: 'hidden', aspectRatio: '16/9' }}>
                    <iframe
                      src={section.video_url}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add section button (admin only) */}
        {isAdmin && (
          <button
            onClick={() => {
              const newId = `t${Date.now()}`
              setSections(prev => [...prev, { id: newId, title: 'Nuova sezione', body: 'Descrizione...', video_url: '' }])
              setEditingId(newId)
            }}
            style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px dashed rgba(32,76,229,.4)', background: 'rgba(32,76,229,.05)', color: '#527EFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Aggiungi sezione
          </button>
        )}
      </div>
    </div>
  )
}
