import React, { useState, useEffect, useRef } from 'react'
import { scoreSimilarity } from '../../utils/similarity'

const DRAFT_STORAGE_KEY = 'truthgrid_active_draft'

function emptyPoint() {
  return { link: '', point: '', example: '', explanation: '' }
}

function loadSavedDraft(numPoints) {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY) || localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.points) && parsed.points.length === numPoints) {
      return {
        ...parsed,
        topicSentence: parsed.topicSentence || '',
        concludingSentence: parsed.concludingSentence || '',
        points: parsed.points.map(p => ({ link: '', ...p })),
      }
    }
  } catch (err) {
    console.warn('Could not load draft from storage:', err)
  }
  return null
}

function saveDraftToStorage(draftData) {
  try {
    const serialized = JSON.stringify(draftData)
    sessionStorage.setItem(DRAFT_STORAGE_KEY, serialized)
    localStorage.setItem(DRAFT_STORAGE_KEY, serialized)
  } catch (err) {
    console.warn('Could not autosave draft to storage:', err)
  }
}

export function clearActiveDraft() {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY)
    localStorage.removeItem(DRAFT_STORAGE_KEY)
  } catch (err) {
    console.warn('Could not clear draft:', err)
  }
}

export default function StudentFlow({ session, onSubmit }) {
  const { passage, studentName, studentNumber, labels, startedAt } = session
  const originalDocument = session.originalDocument
  const prompt = session.prompt || ''
  const numPoints = session.numPoints || (session.mode === 'short' ? 1 : 3)

  // Initialize from saved draft if available, or empty points
  const savedDraft = loadSavedDraft(numPoints)
  const useDraft = savedDraft && savedDraft.studentName === studentName

  const [topicSentence, setTopicSentence] = useState(useDraft ? savedDraft.topicSentence : '')
  const [concludingSentence, setConcludingSentence] = useState(useDraft ? savedDraft.concludingSentence : '')
  const [points, setPoints] = useState(() =>
    useDraft ? savedDraft.points : Array.from({ length: numPoints }, () => emptyPoint())
  )

  const [errors, setErrors] = useState({})
  const [passageExpanded, setPassageExpanded] = useState(true)
  const [documentUrl, setDocumentUrl] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    if (!originalDocument?.data) {
      setDocumentUrl('')
      return undefined
    }
    const url = URL.createObjectURL(new Blob([originalDocument.data], { type: originalDocument.type }))
    setDocumentUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [originalDocument])

  // Check if student has written anything
  const hasUnsavedContent =
    topicSentence.trim() ||
    concludingSentence.trim() ||
    points.some(p => p.link.trim() || p.point.trim() || p.example.trim() || p.explanation.trim())

  // 1. Protect against accidental page reload / navigation
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (!isSubmittingRef.current && hasUnsavedContent) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes in your writing. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedContent])

  // 2. Autosave draft locally whenever content changes
  useEffect(() => {
    if (hasUnsavedContent) {
      saveDraftToStorage({
        studentName,
        studentNumber,
        numPoints,
        topicSentence,
        concludingSentence,
        points,
        savedAt: new Date().toISOString(),
      })
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
  }, [points, topicSentence, concludingSentence, studentName, studentNumber, numPoints, hasUnsavedContent])

  function updateField(index, field, value) {
    setPoints(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
    setErrors(prev => {
      const e = { ...prev }
      delete e[`${index}-${field}`]
      return e
    })
  }

  function validate() {
    const e = {}
    if (!topicSentence.trim()) e.topicSentence = `${labels.topicSentence || 'Topic Sentence'} is required.`
    points.forEach((p, i) => {
      if (!p.point.trim()) e[`${i}-point`] = `${labels.point} ${i + 1} is required.`
      if (!p.example.trim()) e[`${i}-example`] = `${labels.example} ${i + 1} is required.`
      if (!p.explanation.trim()) e[`${i}-explanation`] = `${labels.explanation} ${i + 1} is required.`
    })
    if (!concludingSentence.trim()) e.concludingSentence = `${labels.concludingSentence || 'Concluding Sentence'} is required.`
    return e
  }

  function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }

    isSubmittingRef.current = true

    const fullResponse = [
      topicSentence,
      ...points.map(p => [p.link, p.point, p.example, p.explanation].filter(Boolean).join(' ')),
      concludingSentence,
    ].filter(Boolean).join(' ')

    const similarityScores = points.map(p => ({
      pointScore: scoreSimilarity(p.point, passage),
      exampleScore: scoreSimilarity(p.example, passage),
      explanationScore: scoreSimilarity(p.explanation, passage),
    }))
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`

    onSubmit({
      id,
      studentName,
      studentNumber: session.studentNumber,
      passage,
      prompt,
      originalDocument,
      topicSentence,
      concludingSentence,
      points,
      fullResponse,
      numPoints,
      mode: session.mode || (numPoints === 1 ? 'short' : 'standard'),
      similarityScores,
      startedAt: startedAt || new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      labels: session.labels,
    })
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1>Literary Analysis</h1>
          <p className="muted">
            {studentName} {studentNumber ? `(#${studentNumber})` : ''} · {numPoints === 1 ? 'Short-Form Response' : '3-Point Response'}
            {!(passage && passage.trim()) && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', background: '#eceff1', color: '#455a64', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                Open Prompt Mode
              </span>
            )}
          </p>
        </div>

        {lastSavedAt && (
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--color-success)',
            background: 'rgba(46, 125, 50, 0.1)',
            padding: '0.25rem 0.6rem',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontWeight: 500,
          }}>
            <span>●</span> Draft autosaved locally at {lastSavedAt}
          </div>
        )}
      </div>

      {/* Reading passage (only if reference passage was assigned) */}
      {passage && passage.trim() ? (
        <div className="card">
          <button
            type="button"
            aria-expanded={passageExpanded}
            aria-controls="student-reading-passage"
            onClick={() => setPassageExpanded(value => !value)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
          >
            <h3>Reading Passage</h3>
            <span className="muted" style={{ fontSize: '0.85rem' }}>{passageExpanded ? 'Hide ▲' : 'Show ▼'}</span>
          </button>
          <p id="student-reading-passage" hidden={!passageExpanded} style={{ marginTop: '0.75rem', whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>{passage}</p>
        </div>
      ) : null}

      {originalDocument && documentUrl && (
        <section className="card" aria-labelledby="scan-reference-heading">
          <h3 id="scan-reference-heading">Original Scan Reference</h3>
          <p className="muted" style={{ marginBottom: '0.75rem' }}>
            OCR can misread words or punctuation. Double-check the extracted passage against this original scan before using it as evidence.
          </p>
          <a href={documentUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginBottom: '0.75rem' }}>
            Open original file: {originalDocument.name}
          </a>
          {originalDocument.type === 'application/pdf' ? (
            <iframe
              title={`Original scan: ${originalDocument.name}`}
              src={documentUrl}
              style={{ display: 'block', width: '100%', height: 'min(70vh, 720px)', border: '1px solid var(--color-border)' }}
            />
          ) : (
            <img
              src={documentUrl}
              alt={`Original scanned passage: ${originalDocument.name}`}
              style={{ display: 'block', maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', border: '1px solid var(--color-border)' }}
            />
          )}
        </section>
      )}

      {/* Topic Sentence */}
      <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--color-accent)' }}>
          {labels.topicSentence || 'Topic Sentence'}
        </h2>
        {prompt && (
          <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.6rem 0.8rem', marginBottom: '0.75rem' }}>
            <p className="muted" style={{ fontSize: '0.8rem', marginBottom: '0.2rem', fontWeight: 600 }}>Writing Prompt:</p>
            <p style={{ fontSize: '0.95rem', fontStyle: 'italic' }}>{prompt}</p>
          </div>
        )}
        <p className="muted" style={{ marginBottom: '0.5rem' }}>
          Use <strong>TAG</strong>: refer to the <strong>T</strong>itle, <strong>A</strong>uthor, and <strong>G</strong>enre of the text, then introduce your central point. Echo the key words of the writing prompt above.
        </p>
        <textarea
          id="topic-sentence"
          rows={2}
          value={topicSentence}
          onChange={e => {
            setTopicSentence(e.target.value)
            setErrors(prev => { const ne = { ...prev }; delete ne.topicSentence; return ne })
          }}
          placeholder={`e.g. In the short story "The Pedestrian", Bradbury uses powerful symbols to demonstrate that…`}
        />
        {errors.topicSentence && <p className="error-msg">{errors.topicSentence}</p>}
      </div>

      {/* Structured points (PEEL) */}
      {points.map((p, i) => (
        <div className="card" key={i}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--color-accent)' }}>
            {labels.point} {i + 1} of {numPoints}
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor={`link-${i}`}>{labels.link || 'Link'}</label>
            <p className="muted" style={{ marginBottom: '0.4rem' }}>
              Transition word or phrase that opens this section (e.g. <em>For instance, Furthermore, In addition</em>).
            </p>
            <textarea
              id={`link-${i}`}
              rows={1}
              value={p.link}
              onChange={e => updateField(i, 'link', e.target.value)}
              placeholder="e.g. For instance, …"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor={`point-${i}`}>{labels.point}</label>
            <p className="muted" style={{ marginBottom: '0.4rem' }}>State your argument or claim. (This should echo your central point from the topic sentence.)</p>
            <textarea
              id={`point-${i}`}
              rows={2}
              value={p.point}
              onChange={e => updateField(i, 'point', e.target.value)}
              placeholder={`Write your ${labels.point.toLowerCase()} here…`}
            />
            {errors[`${i}-point`] && <p className="error-msg">{errors[`${i}-point`]}</p>}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor={`example-${i}`}>{labels.example}</label>
            <p className="muted" style={{ marginBottom: '0.4rem' }}>Quote or detail from the text that supports your {labels.point.toLowerCase()}.</p>
            <textarea
              id={`example-${i}`}
              rows={2}
              value={p.example}
              onChange={e => updateField(i, 'example', e.target.value)}
              placeholder={`Write your ${labels.example.toLowerCase()} here…`}
            />
            {errors[`${i}-example`] && <p className="error-msg">{errors[`${i}-example`]}</p>}
          </div>

          <div>
            <label htmlFor={`explanation-${i}`}>{labels.explanation}</label>
            <p className="muted" style={{ marginBottom: '0.4rem' }}>
              How does this evidence support your {labels.point.toLowerCase()}? What does it show about the text? (Echo the central point from your topic sentence.)
            </p>
            <textarea
              id={`explanation-${i}`}
              rows={3}
              value={p.explanation}
              onChange={e => updateField(i, 'explanation', e.target.value)}
              placeholder={`Write your ${labels.explanation.toLowerCase()} here…`}
            />
            {errors[`${i}-explanation`] && <p className="error-msg">{errors[`${i}-explanation`]}</p>}
          </div>
        </div>
      ))}

      {/* Concluding Sentence */}
      <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--color-accent)' }}>
          {labels.concludingSentence || 'Concluding Sentence'}
        </h2>
        <p className="muted" style={{ marginBottom: '0.5rem' }}>
          Restate your central idea in a fresh way. Focus on what was lost, or the broader lesson of the text.
          <span style={{ display: 'block', marginTop: '0.25rem', fontStyle: 'italic' }}>
            e.g. <em>Ultimately, through these symbols, [Author] warns that when society relies too heavily on technology, it sacrifices _____ and loses _____.</em>
          </span>
        </p>
        <textarea
          id="concluding-sentence"
          rows={2}
          value={concludingSentence}
          onChange={e => {
            setConcludingSentence(e.target.value)
            setErrors(prev => { const ne = { ...prev }; delete ne.concludingSentence; return ne })
          }}
          placeholder="Write your concluding sentence here…"
        />
        {errors.concludingSentence && <p className="error-msg">{errors.concludingSentence}</p>}
      </div>

      <button className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', fontSize: '1.05rem' }} onClick={handleSubmit}>
        Submit Response
      </button>
    </div>
  )
}
