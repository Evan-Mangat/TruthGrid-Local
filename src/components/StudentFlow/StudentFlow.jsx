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
        sharedPoint: parsed.sharedPoint || '',
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
  const numPoints = 3
  const isLiteraryAnalysis = session.mode === 'literary_analysis'

  // Initialize from saved draft if available, or empty points
  const savedDraft = loadSavedDraft(numPoints)
  const useDraft = savedDraft && savedDraft.studentName === studentName

  const [topicSentence, setTopicSentence] = useState(useDraft ? savedDraft.topicSentence : '')
  const [sharedPoint, setSharedPoint] = useState(useDraft ? savedDraft.sharedPoint || savedDraft.points[0]?.point || '' : '')
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
    sharedPoint.trim() ||
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
        sharedPoint,
        concludingSentence,
        points,
        savedAt: new Date().toISOString(),
      })
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
  }, [points, topicSentence, sharedPoint, concludingSentence, studentName, studentNumber, numPoints, hasUnsavedContent])

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
    if (isLiteraryAnalysis && !sharedPoint.trim()) e.sharedPoint = `${labels.point} is required.`
    points.forEach((p, i) => {
      if (!isLiteraryAnalysis && !p.point.trim()) e[`${i}-point`] = `${labels.point} ${i + 1} is required.`
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
    const submittedPoints = isLiteraryAnalysis
      ? points.map(point => ({ ...point, point: sharedPoint }))
      : points

    const fullResponse = [
      topicSentence,
      ...submittedPoints.map(p => [p.link, p.point, p.example, p.explanation].filter(Boolean).join(' ')),
      concludingSentence,
    ].filter(Boolean).join(' ')

    const similarityScores = submittedPoints.map(p => ({
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
      sharedPoint: isLiteraryAnalysis ? sharedPoint : '',
      concludingSentence,
      points: submittedPoints,
      fullResponse,
      numPoints,
      mode: session.mode || 'essay',
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
            {studentName} {studentNumber ? `(#${studentNumber})` : ''} · {isLiteraryAnalysis ? 'Literary Analysis' : 'Essay'}
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

      {isLiteraryAnalysis && (
        <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
          <label htmlFor="shared-point">Central {labels.point}</label>
          <p className="muted" style={{ marginBottom: '0.5rem' }}>
            Write your main {labels.point.toLowerCase()} once. It will appear in all three sections; each section should use different evidence and explanation.
          </p>
          <textarea
            id="shared-point"
            rows={2}
            value={sharedPoint}
            onChange={event => {
              setSharedPoint(event.target.value)
              setErrors(previous => { const next = { ...previous }; delete next.sharedPoint; return next })
            }}
            placeholder={`e.g. [Topic or technique] reveals [your central idea].`}
          />
          {errors.sharedPoint && <p className="error-msg">{errors.sharedPoint}</p>}
        </div>
      )}

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
            <h3>Assigned Reading Passage</h3>
            <span className="muted" style={{ fontSize: '0.85rem' }}>{passageExpanded ? 'Hide ▲' : 'Show ▼'}</span>
          </button>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            This is the source text to analyze and compare with your own writing. It is not a place to enter your draft; use it to choose brief evidence that supports your argument.
          </p>
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
        <p className="muted" style={{ marginBottom: '0.5rem' }}>
          Your topic sentence should answer the writing prompt with an arguable idea, not just announce the subject. For example, for “How does Nia change?”: <em>In the short story “The Last Lantern,” A. Rivera shows Nia changing from avoiding responsibility to protecting her community, suggesting that courage grows when people act for others.</em>
        </p>
        <textarea
          id="topic-sentence"
          rows={2}
          spellCheck={true}
          value={topicSentence}
          onChange={e => {
            setTopicSentence(e.target.value)
            setErrors(prev => { const ne = { ...prev }; delete ne.topicSentence; return ne })
          }}
          placeholder="e.g. In [title], [author] uses [technique] to develop the idea that [central point]."
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
              Connect this section to the last one. You can use a transition (<em>For example, Furthermore</em>), weave context or a short quote into your sentence, or link ideas through a logical shift from [earlier detail] to [next detail].
            </p>
            <textarea
              id={`link-${i}`}
              rows={1}
              spellCheck={true}
              value={p.link}
              onChange={e => updateField(i, 'link', e.target.value)}
              placeholder="e.g. For instance, [introduce the next related idea]…"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor={isLiteraryAnalysis ? 'shared-point' : `point-${i}`}>{labels.point}</label>
            {isLiteraryAnalysis ? (
              <p style={{ padding: '0.6rem 0.8rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', whiteSpace: 'pre-wrap' }}>
                {sharedPoint || `Your central ${labels.point.toLowerCase()} will appear here.`}
              </p>
            ) : (
              <>
                <p className="muted" style={{ marginBottom: '0.4rem' }}>State this section’s argument. For an essay, each section should develop a different {labels.point.toLowerCase()}.</p>
                <textarea
                  id={`point-${i}`}
                  rows={2}
                  spellCheck={true}
                  value={p.point}
                  onChange={e => updateField(i, 'point', e.target.value)}
                  placeholder={`e.g. [A different claim that supports your overall argument]`}
                />
                {errors[`${i}-point`] && <p className="error-msg">{errors[`${i}-point`]}</p>}
              </>
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor={`example-${i}`}>{labels.example}</label>
            <p className="muted" style={{ marginBottom: '0.4rem' }}>
              Set the moment in the text and connect it to your point: what is happening, and why does this moment support your argument? Choose only the most useful words; aim for a quote of about 8 words or fewer. Blend it into your sentence: <em>When [brief event], [character] says, “[short quote],” revealing [connection to your point].</em>
            </p>
            <textarea
              id={`example-${i}`}
              rows={2}
              spellCheck={true}
              value={p.example}
              onChange={e => updateField(i, 'example', e.target.value)}
              placeholder="e.g. When [text context], [character] says, ‘[brief, relevant quote]’…"
            />
            {errors[`${i}-example`] && <p className="error-msg">{errors[`${i}-example`]}</p>}
          </div>

          <div>
            <label htmlFor={`explanation-${i}`}>{labels.explanation}</label>
            <p className="muted" style={{ marginBottom: '0.4rem' }}>
              Zoom in on a specific word or phrase. Explain what it suggests, how the figurative language works (if present), and how that exact detail supports your {labels.point.toLowerCase()}. Do more than repeat the quote: <em>The word “[word]” suggests [meaning], which supports my point because [reason].</em>
            </p>
            <textarea
              id={`explanation-${i}`}
              rows={3}
              spellCheck={true}
              value={p.explanation}
              onChange={e => updateField(i, 'explanation', e.target.value)}
              placeholder="e.g. This detail suggests [what it reveals], supporting the idea that [restate your point]."
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
          Restate your central idea in a fresh way and explain why it matters beyond the evidence.
          <span style={{ display: 'block', marginTop: '0.25rem', fontStyle: 'italic' }}>
            Example finish: <em>A society shaped by [factor] may sacrifice genuine human connection and lose the empathy that makes a society truly human.</em>
          </span>
        </p>
        <textarea
          id="concluding-sentence"
          rows={2}
          spellCheck={true}
          value={concludingSentence}
          onChange={e => {
            setConcludingSentence(e.target.value)
            setErrors(prev => { const ne = { ...prev }; delete ne.concludingSentence; return ne })
          }}
          placeholder="Write your concluding sentence here…"
        />
        {errors.concludingSentence && <p className="error-msg">{errors.concludingSentence}</p>}
      </div>

      <section className="card" aria-labelledby="conventions-check-heading">
        <h2 id="conventions-check-heading">Final Conventions Check</h2>
        <p className="muted">Before submitting, reread your response and check:</p>
        <ul>
          <li>Use literary present tense when writing about the text: “Nia realizes,” not “Nia realized.”</li>
          <li>Use third person; avoid “I,” “you,” and “we” in your analysis.</li>
          <li>Check that sentences are complete, words agree, and punctuation is clear. Read your work aloud if it helps.</li>
          <li>Use your browser’s spelling suggestions where available. Spellcheck and grammar tools vary by browser and do not catch every issue.</li>
        </ul>
      </section>

      <button className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', fontSize: '1.05rem' }} onClick={handleSubmit}>
        Submit Response
      </button>
      {Object.keys(errors).length > 0 && (
        <p className="error-msg" role="alert" style={{ marginTop: '0.5rem' }}>
          Please complete the required fields marked above before submitting.
        </p>
      )}
    </div>
  )
}
