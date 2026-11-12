import React, { useState } from 'react'

export const ESSAY_TRANSITIONS = [
  {
    label: 'Comparison',
    words: [
      'Although', 'Despite', 'Equally', 'Even so', 'In spite of',
      'In the same way', 'Likewise', 'Otherwise', 'Similar to', 'Similarly',
      'Though', 'Whereas',
    ],
  },
  {
    label: 'Contrast',
    words: [
      'Alternatively', 'Besides that', 'Conversely', 'Different from this',
      'However', 'In contrast', 'In spite of', 'Instead', 'Nevertheless',
      'On the contrary', 'On the other hand', 'Opposing that', 'Unlike',
    ],
  },
  {
    label: 'Examples and evidence',
    words: [
      'For example', 'For instance', 'In this case', 'In particular',
      'One such occurrence', 'To demonstrate', 'To illustrate',
    ],
  },
  {
    label: 'Cause and effect',
    words: [
      'As a result', 'Because of this', 'Consequently', 'For this reason',
      'Hence', 'In response', 'Therefore', 'Thus',
    ],
  },
  {
    label: 'Addition',
    words: ['Also', 'Furthermore', 'In addition', 'Moreover'],
  },
  {
    label: 'Order and time',
    words: ['First', 'Second', 'Next', 'Then', 'In the past', 'Meanwhile', 'Finally'],
  },
  {
    label: 'Summary and conclusion',
    words: [
      'Finally', 'In conclusion', 'In other words', 'In short', 'On the whole',
      'To conclude', 'To sum up', 'Ultimately', 'Altogether', 'Overall',
      'Briefly', 'Obviously', 'Considering', 'Therefore', 'Essentially',
      'Indeed', 'Principally', 'Thus', 'After all', 'By and large',
      'To summarize', 'Overall, it may be said', 'In the end',
      'Considering all this', 'As has been demonstrated', 'As has been shown',
      'In the final analysis', 'To review', 'In closing',
      'Taking everything into account', 'With this in mind',
      'Everything considered', 'As a final observation',
      'Considering all the facts', 'For the most part', 'In light of these facts',
    ],
  },
]

export const CONCLUSION_TRANSITIONS = ESSAY_TRANSITIONS.filter(group => group.label === 'Summary and conclusion')
export const BODY_TRANSITIONS = ESSAY_TRANSITIONS.filter(group => group.label !== 'Summary and conclusion')

export const QUOTE_INTRO_SUGGESTIONS = [
  '[Author] states,',
  '[Author] suggests,',
  '[Author] writes,',
  '[Author] argues,',
  '[Author] observes,',
  '[Author] notes,',
  '[Author] concludes,',
  '[Author] remarks,',
]

export function detectTransitions(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return []
  const matches = []
  const lower = text.toLowerCase()
  const seen = new Set()

  for (const group of ESSAY_TRANSITIONS) {
    for (const phrase of group.words) {
      const cleanPhrase = phrase.replace(/,\s*$/, '').trim().toLowerCase()
      if (cleanPhrase.length < 3 && cleanPhrase !== 'so') continue
      const escaped = cleanPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i')
      if (regex.test(lower)) {
        if (!seen.has(group.label)) {
          matches.push({ phrase, category: group.label })
          seen.add(group.label)
        }
      }
    }
  }
  return matches
}

export function checkEndsWithQuote(text) {
  if (!text || typeof text !== 'string') return false
  const trimmed = text.trim()
  return /["'”’»]$/.test(trimmed)
}

export function createEssayPlan() {
  return {
    ideas: [],
    mainIdeas: ['', '', ''],
    introSupport: ['', '', ''],
    introTransition: '',
    conclusionTransition: '',
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function TransitionSelect({ id, label, value, onChange, placeholder = 'Choose a transition (optional)', disabled = false, isConclusion = false }) {
  const groupsToDisplay = isConclusion ? CONCLUSION_TRANSITIONS : BODY_TRANSITIONS
  const detected = detectTransitions(value)
  return (
    <div className={`essay-transition-field ${disabled ? 'essay-field-disabled' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.25rem' }}>
        <label htmlFor={id} style={{ fontWeight: 600, color: disabled ? '#888' : 'inherit' }}>{label}</label>
        {!disabled && detected.length > 0 && (
          <span className="essay-transition-badge" title={`Detected: ${detected.map(d => `${d.phrase} (${d.category})`).join(', ')}`}>
            ✓ {detected[0].phrase} ({detected[0].category})
          </span>
        )}
        {disabled && (
          <span style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic' }}>
            (Disabled — Quote introduction selected)
          </span>
        )}
      </div>
      <select
        id={id}
        value={value || ''}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
        style={{
          opacity: disabled ? 0.55 : 1,
          backgroundColor: disabled ? '#f5f5f5' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <option value="">{placeholder}</option>
        {groupsToDisplay.map(group => (
          <optgroup key={group.label} label={group.label}>
            {group.words.map(word => <option key={word} value={word}>{word}</option>)}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

export function EvidenceLeadInControl({
  idPrefix,
  label = 'Evidence Lead-In',
  leadInType = 'transition',
  transitionValue = '',
  quoteIntroValue = '',
  onTypeChange,
  onTransitionChange,
  onQuoteIntroChange,
}) {
  const isQuote = leadInType === 'quote'

  return (
    <div className="essay-lead-in-container" style={{ background: '#fdfdfd', border: '1px solid #e2e8e5', borderRadius: 8, padding: '0.75rem', marginBottom: '0.85rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>{label}</span>
        {/* Toggle between Transition Word and Quote Introduction */}
        <div className="essay-lead-in-toggle" role="radiogroup" aria-label={`${label} mode`}>
          <button
            type="button"
            className={`btn-lead-in-toggle ${!isQuote ? 'active' : ''}`}
            onClick={() => onTypeChange('transition')}
            aria-pressed={!isQuote}
          >
            Transition Word
          </button>
          <button
            type="button"
            className={`btn-lead-in-toggle ${isQuote ? 'active' : ''}`}
            onClick={() => onTypeChange('quote')}
            aria-pressed={isQuote}
          >
            Introduce Quote (Attribution)
          </button>
        </div>
      </div>

      {/* Transition Word field (active when !isQuote, grayed out/disabled when isQuote) */}
      <TransitionSelect
        id={`${idPrefix}-transition`}
        label="Transition Word"
        value={isQuote ? '' : transitionValue}
        onChange={onTransitionChange}
        placeholder={isQuote ? 'Transition word is disabled' : 'e.g. For example, Furthermore, In addition…'}
        disabled={isQuote}
      />

      {/* When Quote Introduction is selected */}
      {isQuote && (
        <div className="essay-quote-intro-section" style={{ marginTop: '0.65rem' }}>
          <label htmlFor={`${idPrefix}-quote-intro`} style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '0.25rem' }}>
            Author Attribution / Quote Lead-in:
          </label>
          <input
            id={`${idPrefix}-quote-intro`}
            type="text"
            value={quoteIntroValue || ''}
            onChange={e => onQuoteIntroChange(e.target.value)}
            placeholder="e.g. Smith states, / As the author argues, / The text reveals,"
            style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #cbd5e1', marginBottom: '0.4rem', font: 'inherit' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem', fontSize: '0.78rem', color: '#64748b' }}>
            <span>Quick Suggestions:</span>
            {QUOTE_INTRO_SUGGESTIONS.map(suggestion => (
              <button
                key={suggestion}
                type="button"
                className="btn-chip"
                style={{ fontSize: '0.74rem', padding: '0.15rem 0.4rem' }}
                onClick={() => onQuoteIntroChange(suggestion)}
                title={`Use "${suggestion}"`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function EssayPlanning({ plan, onChange, thesis, onThesisChange, prompt, errors = {} }) {
  const [newIdea, setNewIdea] = useState('')
  const [isBoardOpen, setIsBoardOpen] = useState(true)
  const ideas = plan.ideas || []
  const mainIdeas = plan.mainIdeas || ['', '', '']

  function updatePlan(changes) {
    onChange(previous => ({ ...previous, ...changes }))
  }

  function addIdea(event) {
    event.preventDefault()
    const text = newIdea.trim()
    if (!text) return
    updatePlan({ ideas: [...ideas, { id: makeId(), text, group: 'unassigned' }] })
    setNewIdea('')
  }

  function moveIdea(id, group) {
    updatePlan({ ideas: ideas.map(idea => idea.id === id ? { ...idea, group } : idea) })
  }

  function removeIdea(id) {
    updatePlan({ ideas: ideas.filter(idea => idea.id !== id) })
  }

  function dropIdea(event, group) {
    event.preventDefault()
    const id = event.dataTransfer.getData('text/plain')
    if (id) moveIdea(id, group)
  }

  function updateMainIdea(index, value) {
    updatePlan({ mainIdeas: mainIdeas.map((idea, ideaIndex) => ideaIndex === index ? value : idea) })
  }

  const poolIdeas = ideas.filter(i => i.group === 'unassigned')
  const groupAIdeas = ideas.filter(i => i.group === 'A')
  const groupBIdeas = ideas.filter(i => i.group === 'B')
  const groupCIdeas = ideas.filter(i => i.group === 'C')
  const discardedIdeas = ideas.filter(i => i.group === 'discarded')

  return (
    <section className="essay-planner" aria-labelledby="essay-planner-heading">
      <div className="essay-planner-heading" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 id="essay-planner-heading" style={{ margin: '0.2rem 0' }}>5-Paragraph In-Class Essay Exam Scaffold</h2>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          onClick={() => setIsBoardOpen(prev => !prev)}
          aria-expanded={isBoardOpen}
        >
          {isBoardOpen ? 'Hide Brainstorm Board (Steps 1 & 2) ▲' : 'Show Brainstorm Board (Steps 1 & 2) ▼'}
        </button>
      </div>

      {prompt && (
        <div className="essay-prompt" style={{ borderRadius: 6, margin: '0 0 1.25rem' }}>
          <strong>Essay Prompt / Task:</strong> {prompt}
        </div>
      )}

      {/* =========================================================================
          STEPS 1 & 2: Brainstorming Canvas & Main Ideas (Optional)
          ========================================================================= */}
      {isBoardOpen && (
        <>
          <section className="essay-planning-step" aria-labelledby="brainstorm-heading" style={{ paddingTop: 0 }}>
            <div className="essay-step-title" style={{ marginBottom: '0.75rem' }}>
              <span className="essay-step-number">1</span>
              <div>
                <h3 id="brainstorm-heading" style={{ margin: 0 }}>
                  Step 1: Brainstorm ideas (Whiteboard / Webbing Method) <span style={{ fontSize: '0.82rem', fontWeight: 'normal', color: '#64748b' }}>(Optional)</span>
                </h3>
                <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.86rem' }}>
                  Brainstorm on paper, whiteboard, or directly below. Add ideas, then drag or click to group similar points under <strong>A, B, and C</strong>. Disregard leftover points into <strong>Set Aside</strong>.
                </p>
              </div>
            </div>

          {/* Quick Idea Add Bar */}
          <form className="essay-idea-entry-modern" onSubmit={addIdea} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <label className="sr-only" htmlFor="new-essay-idea">Add a brainstorm idea card</label>
            <input
              id="new-essay-idea"
              value={newIdea}
              onChange={event => setNewIdea(event.target.value)}
              placeholder="💡 Type a brainstorm idea, key detail, quote, or reason…"
              style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
            <button type="submit" className="btn btn-secondary" disabled={!newIdea.trim()} style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
              + Add Card
            </button>
          </form>

          {/* Top Row: Brainstorm Pool & Set Aside */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {/* Brainstorm Pool */}
            <div
              className="essay-lane-card essay-lane-pool"
              onDragOver={event => event.preventDefault()}
              onDrop={event => dropIdea(event, 'unassigned')}
              style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '0.75rem', minHeight: '6.5rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>💡 Brainstorm Pool / Unassigned</span>
                <span className="badge" style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#475569', padding: '0.1rem 0.45rem', borderRadius: 10 }}>{poolIdeas.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {poolIdeas.map(idea => (
                  <div
                    key={idea.id}
                    className="essay-idea-tile-modern"
                    draggable
                    onDragStart={event => event.dataTransfer.setData('text/plain', idea.id)}
                  >
                    <span style={{ marginRight: '0.35rem' }}>{idea.text}</span>
                    <div style={{ display: 'inline-flex', gap: '0.2rem', alignItems: 'center' }}>
                      <button type="button" className="btn-chip" onClick={() => moveIdea(idea.id, 'A')} title="Move to Group A" aria-label="Move to Group A">→ A</button>
                      <button type="button" className="btn-chip" onClick={() => moveIdea(idea.id, 'B')} title="Move to Group B" aria-label="Move to Group B">→ B</button>
                      <button type="button" className="btn-chip" onClick={() => moveIdea(idea.id, 'C')} title="Move to Group C" aria-label="Move to Group C">→ C</button>
                      <button type="button" className="btn-chip btn-chip-discard" onClick={() => moveIdea(idea.id, 'discarded')} title="Set aside" aria-label="Set aside">✕</button>
                    </div>
                  </div>
                ))}
                {poolIdeas.length === 0 && (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.4rem 0' }}>
                    Type ideas above to add cards to the pool.
                  </p>
                )}
              </div>
            </div>

            {/* Set Aside / Disregarded */}
            <div
              className="essay-lane-card essay-lane-discarded"
              onDragOver={event => event.preventDefault()}
              onDrop={event => dropIdea(event, 'discarded')}
              style={{ background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '0.75rem', minHeight: '6.5rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#64748b' }}>🗑️ Set Aside / Disregarded</span>
                <span className="badge" style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#64748b', padding: '0.1rem 0.45rem', borderRadius: 10 }}>{discardedIdeas.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {discardedIdeas.map(idea => (
                  <div key={idea.id} className="essay-idea-tile-muted">
                    <span style={{ textDecoration: 'line-through', opacity: 0.75, marginRight: '0.35rem' }}>{idea.text}</span>
                    <button type="button" className="btn-chip" onClick={() => moveIdea(idea.id, 'unassigned')} title="Restore to pool" aria-label="Return to brainstorm pool">↩</button>
                    <button type="button" className="btn-chip" onClick={() => removeIdea(idea.id)} title="Delete permanently" aria-label={`Delete idea: ${idea.text}`}>✕</button>
                  </div>
                ))}
                {discardedIdeas.length === 0 && (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    Leftover ideas dropped here are set aside.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: 3 Main Idea Pattern Columns (A, B, C) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
            {/* Group A */}
            <div
              className="essay-lane-card"
              onDragOver={event => event.preventDefault()}
              onDrop={event => dropIdea(event, 'A')}
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderTop: '4px solid #16a34a', borderRadius: 8, padding: '0.75rem', minHeight: '8rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.86rem', color: '#166534' }}>🅰️ Group A (Body 1)</strong>
                <span className="badge" style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '0.1rem 0.45rem', borderRadius: 10 }}>{groupAIdeas.length}</span>
              </div>
              <div style={{ display: 'grid', gap: '0.35rem' }}>
                {groupAIdeas.map(idea => (
                  <div key={idea.id} className="essay-idea-tile-modern">
                    <p style={{ margin: 0 }}>{idea.text}</p>
                    <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.3rem' }}>
                      <button type="button" className="btn-chip" onClick={() => moveIdea(idea.id, 'B')} title="Move to Group B" aria-label="Move to Group B">→ B</button>
                      <button type="button" className="btn-chip" onClick={() => moveIdea(idea.id, 'C')} title="Move to Group C" aria-label="Move to Group C">→ C</button>
                      <button type="button" className="btn-chip btn-chip-discard" onClick={() => moveIdea(idea.id, 'discarded')} title="Set aside" aria-label="Set aside">Set aside</button>
                      <button type="button" className="btn-chip" onClick={() => moveIdea(idea.id, 'unassigned')} title="Return to pool" aria-label="Return to brainstorm pool">↩</button>
                    </div>
                  </div>
                ))}
                {groupAIdeas.length === 0 && <p className="essay-lane-empty">Drag or click → A to group here</p>}
              </div>
            </div>

            {/* Group B */}
            <div
              className="essay-lane-card"
              onDragOver={event => event.preventDefault()}
              onDrop={event => dropIdea(event, 'B')}
              style={{ background: '#fffbeb', border: '1px solid #fde68a', borderTop: '4px solid #d97706', borderRadius: 8, padding: '0.75rem', minHeight: '8rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.86rem', color: '#92400e' }}>🅱️ Group B (Body 2)</strong>
                <span className="badge" style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '0.1rem 0.45rem', borderRadius: 10 }}>{groupBIdeas.length}</span>
              </div>
              <div style={{ display: 'grid', gap: '0.35rem' }}>
                {groupBIdeas.map(idea => (
                  <div key={idea.id} className="essay-idea-tile-modern">
                    <p style={{ margin: 0 }}>{idea.text}</p>
                    <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.3rem' }}>
                      <button type="button" className="btn-chip" onClick={() => moveIdea(idea.id, 'A')} title="Move to Group A" aria-label="Move to Group A">→ A</button>
                      <button type="button" className="btn-chip" onClick={() => moveIdea(idea.id, 'C')} title="Move to Group C" aria-label="Move to Group C">→ C</button>
                      <button type="button" className="btn-chip btn-chip-discard" onClick={() => moveIdea(idea.id, 'discarded')} title="Set aside" aria-label="Set aside">Set aside</button>
                      <button type="button" className="btn-chip" onClick={() => moveIdea(idea.id, 'unassigned')} title="Return to pool" aria-label="Return to brainstorm pool">↩</button>
                    </div>
                  </div>
                ))}
                {groupBIdeas.length === 0 && <p className="essay-lane-empty">Drag or click → B to group here</p>}
              </div>
            </div>

            {/* Group C */}
            <div
              className="essay-lane-card"
              onDragOver={event => event.preventDefault()}
              onDrop={event => dropIdea(event, 'C')}
              style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderTop: '4px solid #0284c7', borderRadius: 8, padding: '0.75rem', minHeight: '8rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.86rem', color: '#0369a1' }}>🅲 Group C (Body 3)</strong>
                <span className="badge" style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0284c7', padding: '0.1rem 0.45rem', borderRadius: 10 }}>{groupCIdeas.length}</span>
              </div>
              <div style={{ display: 'grid', gap: '0.35rem' }}>
                {groupCIdeas.map(idea => (
                  <div key={idea.id} className="essay-idea-tile-modern">
                    <p style={{ margin: 0 }}>{idea.text}</p>
                    <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.3rem' }}>
                      <button type="button" className="btn-chip" onClick={() => moveIdea(idea.id, 'A')} title="Move to Group A" aria-label="Move to Group A">→ A</button>
                      <button type="button" className="btn-chip" onClick={() => moveIdea(idea.id, 'B')} title="Move to Group B" aria-label="Move to Group B">→ B</button>
                      <button type="button" className="btn-chip btn-chip-discard" onClick={() => moveIdea(idea.id, 'discarded')} title="Set aside" aria-label="Set aside">Set aside</button>
                      <button type="button" className="btn-chip" onClick={() => moveIdea(idea.id, 'unassigned')} title="Return to pool" aria-label="Return to brainstorm pool">↩</button>
                    </div>
                  </div>
                ))}
                {groupCIdeas.length === 0 && <p className="essay-lane-empty">Drag or click → C to group here</p>}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            STEP 2: Redesigned Sleek Main Ideas Cards (Optional)
            ========================================================================= */}
        <section className="essay-planning-step" aria-labelledby="main-ideas-heading">
          <div className="essay-step-title" style={{ marginBottom: '0.75rem' }}>
            <span className="essay-step-number">2</span>
            <div>
              <h3 id="main-ideas-heading" style={{ margin: 0 }}>
                Step 2: See patterns & label your 3 Main Ideas <span style={{ fontSize: '0.82rem', fontWeight: 'normal', color: '#64748b' }}>(Optional)</span>
              </h3>
              <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.86rem' }}>
                Label each group with a concise phrase. These 3 phrases will become the 3 Main Ideas for the body paragraphs of your essay.
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
            {mainIdeas.map((idea, index) => {
              const letter = String.fromCharCode(65 + index)
              const ideaCount = ideas.filter(item => item.group === letter).length
              const borderColor = index === 0 ? '#16a34a' : index === 1 ? '#d97706' : '#0284c7'
              const bgHeader = index === 0 ? '#f0fdf4' : index === 1 ? '#fffbeb' : '#f0f9ff'

              return (
                <div
                  className="essay-main-idea-card"
                  key={letter}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderTop: `4px solid ${borderColor}`,
                    borderRadius: 8,
                    padding: '0.85rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', background: bgHeader, padding: '0.35rem 0.5rem', borderRadius: 6 }}>
                    <label htmlFor={`main-idea-${letter}`} style={{ fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>
                      Main Idea {letter}
                    </label>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {ideaCount} {ideaCount === 1 ? 'card' : 'cards'}
                    </span>
                  </div>
                  <p className="muted" style={{ fontSize: '0.78rem', margin: '0 0 0.4rem' }}>
                    Shared pattern for Body Paragraph {index + 1}:
                  </p>
                  <input
                    id={`main-idea-${letter}`}
                    value={idea}
                    onChange={event => updateMainIdea(index, event.target.value)}
                    placeholder={`e.g. ${index === 0 ? 'Sacrifice of personal freedom' : index === 1 ? 'Emotional isolation' : 'Reclaiming identity'}…`}
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                  {errors[`main-idea-${index}`] && <p className="error-msg">{errors[`main-idea-${index}`]}</p>}
                </div>
              )
            })}
          </div>
        </section>
      </>
    )}

      {/* =========================================================================
          STEP 3: Formulate Thesis Statement as Sentence 1 (Checklist Removed)
          ========================================================================= */}
      <section className="essay-planning-step" aria-labelledby="thesis-heading">
        <div className="essay-step-title">
          <span className="essay-step-number">3</span>
          <div>
            <h3 id="thesis-heading">Step 3: Formulate your Thesis Statement (Sentence 1)</h3>
            <p className="muted">
              <strong>In-Class Essay Exam Rule:</strong> In take-home essays, thesis statements are often placed at the end of the introduction. <em>However, in in-class essay exams they are placed as the first sentence.</em>
            </p>
          </div>
        </div>

        {/* Exact steps from Ms. Kwan's handout */}
        <div className="card" style={{ background: '#fdfbf7', borderLeft: '4px solid #bd633d', margin: '0.75rem 0', padding: '0.85rem', borderRadius: 6 }}>
          <strong style={{ color: '#8d3b1b' }}>Exact Steps to Formulate Your Thesis Statement:</strong>
          <ul style={{ margin: '0.4rem 0 0 1.2rem', padding: 0, fontSize: '0.88rem', lineHeight: 1.55 }}>
            <li><strong>1. Echo the Question:</strong> Pick up key words from the essay prompt.</li>
            <li><strong>2. Make an Arguable Claim:</strong> Give your answer to the prompt with a clear opinion/stance.</li>
            <li><strong>3. Include the 3 Main Ideas in Order:</strong> Preview Main Ideas A, B, and C in the exact order you will develop them in the body.</li>
            <li><strong>4. Indicate Organization:</strong> Signpost to the reader how your 5-paragraph essay will unfold.</li>
          </ul>
          <p className="essay-thesis-model" style={{ marginTop: '0.6rem', marginBottom: 0 }}>
            <strong>Planning Formula:</strong> “In [Title of text], [Author] argues [your claim/answer] through [Main Idea A], [Main Idea B], and [Main Idea C].”
          </p>
        </div>

        <label htmlFor="topic-sentence" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
          Thesis Statement — Introduction Sentence 1
        </label>
        <textarea
          id="topic-sentence"
          rows={3}
          spellCheck={true}
          value={thesis}
          onChange={event => onThesisChange(event.target.value)}
          placeholder="e.g. In [title], [author] shows [arguable claim] through [Main Idea A], [Main Idea B], and [Main Idea C]…"
        />
        {errors.topicSentence && <p className="error-msg">{errors.topicSentence}</p>}
      </section>

      {/* =========================================================================
          STEP 4: Complete Introduction Outline (Kept As Is)
          ========================================================================= */}
      <section className="essay-planning-step" aria-labelledby="intro-outline-heading">
        <div className="essay-step-title">
          <span className="essay-step-number">4</span>
          <div>
            <h3 id="intro-outline-heading">Step 4: Complete the Introduction Outline (4–5 Sentences)</h3>
            <p className="muted">
              Sentence 1 is your Thesis Statement. Sentences 2–4 briefly mention your 3 Main Ideas (define terms & relevance). Sentence 5 transitions from the introduction into the body.
            </p>
          </div>
        </div>

        <div className="essay-intro-outline">
          <div style={{ gridColumn: '1 / -1', padding: '0.65rem 0.8rem', background: '#f8fafc', borderRadius: 6, borderLeft: '3px solid #287a56' }}>
            <strong>Sentence 1 (Thesis Statement):</strong>
            <p style={{ margin: '0.2rem 0 0', fontStyle: thesis ? 'normal' : 'italic', color: thesis ? '#111' : '#777' }}>
              {thesis || 'Enter your thesis statement in Step 3 above.'}
            </p>
          </div>

          {mainIdeas.map((idea, index) => {
            const letter = String.fromCharCode(65 + index)
            return (
              <div key={index} className="essay-intro-sentence-slot">
                <label htmlFor={`intro-support-${index}`} style={{ fontWeight: 600 }}>
                  Sentence {index + 2}: Mentions {letter} ({idea || `Main Idea ${letter}`})
                </label>
                <p className="muted" style={{ fontSize: '0.78rem', margin: '0.15rem 0 0.35rem' }}>
                  Define your terms and explain relevance for this idea.
                </p>
                <textarea
                  id={`intro-support-${index}`}
                  rows={2}
                  value={(plan.introSupport || ['', '', ''])[index] || ''}
                  onChange={event => updatePlan({
                    introSupport: (plan.introSupport || ['', '', '']).map((sentence, sentenceIndex) => sentenceIndex === index ? event.target.value : sentence),
                  })}
                  placeholder={idea ? `Briefly define and explain the relevance of ${idea}…` : `Introduce Main Idea ${letter}…`}
                />
              </div>
            )
          })}

          <div style={{ gridColumn: '1 / -1' }}>
            <TransitionSelect
              id="intro-transition"
              label="Sentence 5: Concluding / Transition Sentence into Body Paragraph 1"
              value={plan.introTransition}
              onChange={introTransition => updatePlan({ introTransition })}
              placeholder="Choose a transition into the body (e.g. First, In the same way, To illustrate)"
            />
            <p className="muted" style={{ fontSize: '0.78rem', marginTop: '-0.4rem', marginBottom: '0.4rem' }}>
              Transitions from your introduction into the body of the essay and can link the last idea with the first Main idea structurally.
            </p>
          </div>
        </div>
        {errors.introSupport && <p className="error-msg">{errors.introSupport}</p>}
      </section>
    </section>
  )
}
