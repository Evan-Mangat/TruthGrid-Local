import React, { useState, useEffect, useRef } from 'react'
import { scoreSimilarity } from '../../utils/similarity'

const DRAFT_STORAGE_KEY = 'truthgrid_active_draft'

function emptyPoint() {
  return { point: '', example: '', explanation: '' }
}

function loadSavedDraft(numPoints) {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY) || localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.points) && parsed.points.length === numPoints) {
      return parsed
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
  const numPoints = session.numPoints || (session.mode === 'short' ? 1 : 3)

  // Initialize from saved draft if available, or empty points
  const [points, setPoints] = useState(() => {
    const saved = loadSavedDraft(numPoints)
    if (saved && saved.studentName === studentName) {
      return saved.points
    }
    return Array.from({ length: numPoints }, () => emptyPoint())
  })

  const [errors, setErrors] = useState({})
  const [passageExpanded, setPassageExpanded] = useState(true)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const isSubmittingRef = useRef(false)

  // Check if student has written anything
  const hasUnsavedContent = points.some(
    p => p.point.trim() || p.example.trim() || p.explanation.trim()
  )

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

  // 2. Autosave draft locally whenever points change
  useEffect(() => {
    if (hasUnsavedContent) {
      saveDraftToStorage({
        studentName,
        studentNumber,
        numPoints,
        points,
        savedAt: new Date().toISOString(),
      })
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
  }, [points, studentName, studentNumber, numPoints, hasUnsavedContent])

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
    points.forEach((p, i) => {
      if (!p.point.trim()) e[`${i}-point`] = `${labels.point} ${i + 1} is required.`
      if (!p.example.trim()) e[`${i}-example`] = `${labels.example} ${i + 1} is required.`
      if (!p.explanation.trim()) e[`${i}-explanation`] = `${labels.explanation} ${i + 1} is required.`
    })
    return e
  }

  function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }

    isSubmittingRef.current = true

    const fullResponse = points
      .map(p => `${p.point} ${p.example} ${p.explanation}`)
      .join(' ')

    const similarityScores = points.map(p => ({
      pointScore: scoreSimilarity(p.point, passage),
      exampleScore: scoreSimilarity(p.example, passage),
      explanationScore: scoreSimilarity(p.explanation, passage),
    }))

    // Clear saved draft since work is successfully submitted
    clearActiveDraft()

    onSubmit({
      studentName,
      studentNumber: session.studentNumber,
      passage,
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
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setPassageExpanded(v => !v)}
          >
            <h3>Reading Passage</h3>
            <span className="muted" style={{ fontSize: '0.85rem' }}>{passageExpanded ? 'Hide ▲' : 'Show ▼'}</span>
          </div>
          {passageExpanded && (
            <p style={{ marginTop: '0.75rem', whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>{passage}</p>
          )}
        </div>
      ) : null}

      {/* Structured points */}
      {points.map((p, i) => (
        <div className="card" key={i}>
          {/* Fix configurable labels invariant: use labels.point instead of hardcoded 'Point' */}
          <h2 style={{ marginBottom: '1rem', color: 'var(--color-accent)' }}>
            {labels.point} {i + 1} of {numPoints}
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor={`point-${i}`}>{labels.point}</label>
            <p className="muted" style={{ marginBottom: '0.4rem' }}>What is your argument or claim?</p>
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
              How does this support your {labels.point.toLowerCase()}? What does it show about the text?
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

      <button className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', fontSize: '1.05rem' }} onClick={handleSubmit}>
        Submit Response
      </button>
    </div>
  )
}
