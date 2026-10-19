import React, { useState, useEffect, useRef } from 'react'
import { saveResponse } from '../../utils/db'
import { clearActiveDraft } from '../StudentFlow/StudentFlow'

function ScoreBadge({ score }) {
  if (score === null || score === undefined) {
    return (
      <span
        style={{
          display: 'inline-block',
          background: '#607d8b',
          color: '#fff',
          borderRadius: 4,
          padding: '0.15rem 0.55rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          marginLeft: '0.5rem',
        }}
      >
        N/A (Open Prompt)
      </span>
    )
  }
  const pct = Math.round(score * 100)
  let color = 'var(--color-success)'
  if (pct < 40) color = 'var(--color-warning)'
  if (pct < 20) color = '#c62828'
  return (
    <span
      style={{
        display: 'inline-block',
        background: color,
        color: '#fff',
        borderRadius: 4,
        padding: '0.15rem 0.55rem',
        fontSize: '0.8rem',
        fontWeight: 700,
        marginLeft: '0.5rem',
      }}
    >
      {pct}% text engagement
    </span>
  )
}

export default function Results({ submission, session, onReset, onNavigateToDashboard, saveOnMount = true }) {
  const { points, similarityScores, labels, studentName, studentNumber, submittedAt, passage } = submission

  const [saveStatus, setSaveStatus] = useState('saving') // 'saving' | 'saved' | 'error'
  const [saveErrorMessage, setSaveErrorMessage] = useState(null)
  const [copied, setCopied] = useState(false)
  const hasSavedRef = useRef(false)

  // 2. Make saving failures visible and handle StrictMode double-save
  async function performSave() {
    if (hasSavedRef.current) return
    hasSavedRef.current = true
    setSaveStatus('saving')
    setSaveErrorMessage(null)
    try {
      await saveResponse(submission)
      setSaveStatus('saved')
      clearActiveDraft()
    } catch (err) {
      hasSavedRef.current = false
      console.error('IndexedDB saveResponse error:', err)
      setSaveStatus('error')
      setSaveErrorMessage(err?.message || 'Storage quota exceeded or private browsing restriction.')
    }
  }

  useEffect(() => {
    if (saveOnMount && !hasSavedRef.current) {
      performSave()
    }
  }, [saveOnMount])

  const hasPassage = Boolean(passage && passage.trim())

  function handleCopyWork() {
    const textLines = [
      `TruthGrid Student Response`,
      `Student: ${studentName}${studentNumber ? ` (#${studentNumber})` : ''}`,
      `Submitted: ${new Date(submittedAt).toLocaleString()}`,
      ...(hasPassage ? [`\n--- Reading Passage ---\n${passage}\n`] : []),
      `--- Student Response ---`,
      ...points.map(
        (p, i) =>
          `\n${labels.point} ${i + 1}:\n${p.point}\n${labels.example} ${i + 1}:\n${p.example}\n${labels.explanation} ${i + 1}:\n${p.explanation}`
      ),
    ]
    if (!navigator.clipboard?.writeText) {
      setSaveErrorMessage('Clipboard access is unavailable. Select and copy your response from the page, or retry saving.')
      return
    }
    navigator.clipboard.writeText(textLines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }).catch(() => {
      setSaveErrorMessage('Clipboard access was denied. Select and copy your response from the page, or retry saving.')
    })
  }

  const validScores = similarityScores
    .map(s => s.exampleScore)
    .filter(s => s !== null && s !== undefined)

  const avgScore =
    validScores.length > 0
      ? validScores.reduce((sum, s) => sum + s, 0) / validScores.length
      : null

  return (
    <div className="page results-page">
      {/* Printable Header (Visible only when printed) */}
      <div className="print-only" style={{ marginBottom: '1.5rem', borderBottom: '2px solid #000', paddingBottom: '0.75rem' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.2rem' }}>TruthGrid Literary Analysis Response</h1>
        <p style={{ fontSize: '0.95rem' }}>
          <strong>Student:</strong> {studentName} {studentNumber ? `(#${studentNumber})` : ''} &nbsp;|&nbsp;{' '}
          <strong>Date:</strong> {new Date(submittedAt).toLocaleString()}
        </p>
      </div>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <h1>{saveStatus === 'error' ? 'Submission Incomplete' : 'Response Submitted'}</h1>
          <p className="muted">
            {studentName}{studentNumber ? ` · #${studentNumber}` : ''}
            {!hasPassage && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', background: '#eceff1', color: '#455a64', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                Open Prompt
              </span>
            )}
          </p>
          <p className="muted" style={{ fontSize: '0.85rem' }}>{new Date(submittedAt).toLocaleString()}</p>
        </div>

        {/* Action buttons for print / dashboard */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => window.print()} title="Print this student's response">
            🖨️ Print Response
          </button>
          {onNavigateToDashboard && (
            <button className="btn btn-secondary" onClick={onNavigateToDashboard}>
              Teacher Dashboard
            </button>
          )}
        </div>
      </div>

      {/* 2. Visible Save Status Banner */}
      {saveStatus === 'saving' && (
        <div className="card no-print" style={{ background: '#e3f2fd', borderColor: '#90caf9' }}>
          <p style={{ color: '#1565c0', fontWeight: 600 }}>
            ⏳ Saving response to local device storage...
          </p>
        </div>
      )}

      {saveStatus === 'error' && (
        <div
          className="card no-print"
          style={{
            background: '#ffebee',
            borderColor: '#e57373',
            borderLeft: '5px solid #c62828',
            marginBottom: '1.5rem',
          }}
        >
          <h3 style={{ color: '#c62828', marginBottom: '0.3rem' }}>
            ⚠️ Storage Warning: Work Not Saved Locally
          </h3>
          <p style={{ color: '#b71c1c', fontSize: '0.95rem', marginBottom: '0.8rem' }}>
            The app could not write this response to the computer's local IndexedDB database ({saveErrorMessage}).
            <strong> Do not close this window!</strong> Please notify your teacher or copy your work now.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={performSave}>
              🔄 Retry Saving
            </button>
            <button className="btn btn-secondary" onClick={handleCopyWork}>
              {copied ? '✓ Copied to Clipboard!' : '📋 Copy Work to Clipboard'}
            </button>
          </div>
        </div>
      )}

      {saveStatus === 'saved' && (
        <div className="no-print" style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--color-success)', fontWeight: 500 }}>
          ✓ Response saved securely to local device storage.
        </div>
      )}

      {/* Text engagement indicator (or open prompt note) */}
      {hasPassage ? (
        <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
          <h3>Text Engagement Indicator</h3>
          <p className="muted" style={{ marginTop: '0.3rem', fontSize: '0.9rem' }}>
            This score measures how closely the student's examples connect to the reading passage using asymmetric lexical containment.
            It is a flag for teacher review — <strong>not a grade or verdict</strong>.
          </p>
          <p style={{ marginTop: '0.6rem', fontSize: '1.1rem' }}>
            Overall Engagement: <ScoreBadge score={avgScore} />
          </p>
        </div>
      ) : (
        <div className="card" style={{ borderLeft: '4px solid #607d8b' }}>
          <h3>Open Writing Response</h3>
          <p className="muted" style={{ marginTop: '0.3rem', fontSize: '0.9rem' }}>
            No reference passage was assigned for this prompt. Text engagement indicator is not applicable.
          </p>
        </div>
      )}

      {/* Per-point breakdown */}
      {points.map((p, i) => (
        <div className="card" key={i}>
          {/* Fix configurable labels invariant: use labels.point instead of hardcoded 'Point' */}
          <h2 style={{ color: 'var(--color-accent)', marginBottom: '0.75rem' }}>
            {labels.point} {i + 1}
            {hasPassage && <ScoreBadge score={similarityScores[i]?.exampleScore} />}
          </h2>

          <div style={{ marginBottom: '0.75rem' }}>
            <strong>{labels.point}:</strong>
            <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{p.point}</p>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <strong>{labels.example}:</strong>
            <p style={{ marginTop: '0.2rem', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{p.example}</p>
          </div>
          <div>
            <strong>{labels.explanation}:</strong>
            <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{p.explanation}</p>
          </div>
        </div>
      ))}

      {/* Printable Teacher Feedback Box */}
      <div className="print-only" style={{ marginTop: '2rem', border: '1px solid #000', padding: '1rem', minHeight: '120px' }}>
        <strong>Teacher Feedback & Notes:</strong>
      </div>

      <div className="no-print" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem' }} onClick={onReset} disabled={saveStatus === 'error'} title={saveStatus === 'error' ? 'Save or copy the response before starting another student session.' : undefined}>
          Next Student Session (Reset Device)
        </button>
      </div>
    </div>
  )
}
