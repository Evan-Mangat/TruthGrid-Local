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
  const { points, similarityScores, labels, studentName, studentNumber, submittedAt, passage, topicSentence, concludingSentence } = submission
  const responseType = submission.mode === 'literary_analysis' ? 'Literary Analysis' : 'Essay'

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

  const isEssay = submission.mode === 'essay'
  const essayPlan = submission.essayPlan

  function handleCopyWork() {
    let responseText = ''
    if (isEssay) {
      responseText = submission.fullResponse || [
        `--- Introduction (Paragraph 1) ---`,
        `Thesis Statement: ${topicSentence}`,
        ...(essayPlan?.introSupport || []).map((s, idx) => `Sentence ${idx + 2}: ${s}`),
        ...points.map((p, i) => [
          `\n--- Body Paragraph ${i + 1} (${['1st', '2nd', '3rd'][i]} Main Point${essayPlan?.mainIdeas?.[i] ? `: ${essayPlan.mainIdeas[i]}` : ''}) ---`,
          p.transitionIntoParagraph ? `Transition into Paragraph: ${p.transitionIntoParagraph}` : '',
          `Assertion: ${p.point}`,
          `Evidence 1: ${p.example}`,
          `Commentary 1: ${p.explanation}`,
          p.evidenceTransition2 ? `Transition: ${p.evidenceTransition2}` : '',
          p.example2 ? `Evidence 2: ${p.example2}` : '',
          p.explanation2 ? `Commentary 2: ${p.explanation2}` : '',
          p.evidenceTransition3 ? `Transition: ${p.evidenceTransition3}` : '',
          p.example3 ? `Evidence 3: ${p.example3}` : '',
          p.explanation3 ? `Commentary 3: ${p.explanation3}` : '',
          p.paragraphConclusion ? `Concluding Sentence: ${p.paragraphConclusion}` : '',
          p.transitionAfterParagraph ? `Transition to Next Point: ${p.transitionAfterParagraph}` : '',
        ].filter(Boolean).join('\n')),
        `\n--- Conclusion (Paragraph 5) ---`,
        essayPlan?.conclusionTransition ? `Transition: ${essayPlan.conclusionTransition}` : '',
        concludingSentence,
      ].filter(Boolean).join('\n')
    } else {
      responseText = [
        ...(topicSentence ? [`\n${labels.topicSentence || 'Topic Sentence'}:\n${topicSentence}`] : []),
        ...points.map(
          (p, i) =>
            `\n${labels.point} ${i + 1}:\n${p.link ? `${labels.link || 'Link'}: ${p.link}\n` : ''}${p.point}\n${labels.example} ${i + 1}:\n${p.example}\n${labels.explanation} ${i + 1}:\n${p.explanation}`
        ),
        ...(concludingSentence ? [`\n${labels.concludingSentence || 'Concluding Sentence'}:\n${concludingSentence}`] : []),
      ].join('\n')
    }

    const textLines = [
      `TruthGrid Student Response`,
      `Student: ${studentName}${studentNumber ? ` (#${studentNumber})` : ''}`,
      `Format: ${isEssay ? 'Five-Paragraph Essay' : 'Literary Analysis'}`,
      `Submitted: ${new Date(submittedAt).toLocaleString()}`,
      ...(hasPassage ? [`\n--- Reading Passage ---\n${passage}\n`] : []),
      `--- Student Response ---`,
      responseText,
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
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.2rem' }}>TruthGrid {responseType} Response</h1>
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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => window.print()} title="Print this report or choose Save as PDF">
            🖨️ Print and Save Report to Submit to Teacher
          </button>
          {onNavigateToDashboard && (
            <button className="btn btn-secondary" onClick={onNavigateToDashboard}>
              {/* Previous label: Teacher Dashboard. */}
              Dashboard
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
        <section
          className="card no-print"
          role="status"
          aria-labelledby="submission-saved-heading"
          style={{ background: '#e8f5e9', borderColor: '#a5d6a7', borderLeft: '5px solid var(--color-success)', marginBottom: '1.25rem' }}
        >
          <h2 id="submission-saved-heading" style={{ color: 'var(--color-success)', marginBottom: '0.35rem' }}>
            ✓ Response saved
          </h2>
          <p style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>
            Saved on local device storage. You can access your work through the Dashboard after submission.
          </p>
          <p className="muted">To give your teacher a copy, print the report and choose Print or Save as PDF.</p>
        </section>
      )}

      {/* Text engagement indicator (or open prompt note) */}
      {hasPassage ? (
        <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
          <h3>Text Engagement Indicator</h3>
          <p className="muted" style={{ marginTop: '0.3rem', fontSize: '0.9rem' }}>
            This score measures how closely the student's quoted evidence overlaps with words in the reading passage.
            A higher score means the student is drawing language directly from the text.
            <strong> This is NOT an AI detection tool</strong>: it does not check whether writing is human or AI generated.
            It is a flag for teacher review, <strong>not a grade or verdict</strong>.
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

      {/* Full Preview */}
      <div className="card" style={{ borderLeft: '4px solid #78909c' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>
          {isEssay ? 'Full Five-Paragraph Essay Preview' : 'Full Paragraph Preview'}
        </h3>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          {isEssay
            ? "The student's response assembled as a continuous five-paragraph essay."
            : "The student's response assembled as a continuous paragraph."}
        </p>
        <div style={{ lineHeight: '1.8', fontSize: '0.97rem', whiteSpace: 'pre-wrap' }}>
          {submission.fullResponse || [
            topicSentence,
            ...points.map(p => [p.link, p.point, p.example, p.explanation].filter(Boolean).join(' ')),
            concludingSentence,
          ].filter(Boolean).join(' ')}
        </div>
      </div>

      {isEssay ? (
        <>
          {/* Essay Introduction Breakdown */}
          <div className="card" style={{ borderLeft: '4px solid #287a56' }}>
            <h2 style={{ color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
              Introduction (Paragraph 1)
            </h2>
            <div style={{ marginBottom: '0.75rem' }}>
              <strong>Sentence 1 — Thesis Statement:</strong>
              <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{topicSentence}</p>
            </div>
            {(essayPlan?.introSupport || []).map((sentence, idx) => (
              <div key={idx} style={{ marginBottom: '0.5rem' }}>
                <strong>Sentence {idx + 2} — Mentions Main Idea {String.fromCharCode(65 + idx)}{essayPlan?.mainIdeas?.[idx] ? ` (${essayPlan.mainIdeas[idx]})` : ''}:</strong>
                <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{sentence}</p>
              </div>
            ))}
          </div>

          {/* Essay Body Paragraphs 1-3 Breakdown */}
          {points.map((p, i) => {
            const letter = String.fromCharCode(65 + i)
            return (
              <div className="card" key={i} style={{ borderLeft: `4px solid ${i === 0 ? '#287a56' : i === 1 ? '#bd633d' : '#315e87'}` }}>
                <h2 style={{ color: 'var(--color-accent)', marginBottom: '0.75rem' }}>
                  Body Paragraph {i + 1}: {['1st', '2nd', '3rd'][i]} Main Point (Group {letter})
                  {essayPlan?.mainIdeas?.[i] ? ` — ${essayPlan.mainIdeas[i]}` : ''}
                  {hasPassage && <ScoreBadge score={similarityScores[i]?.exampleScore} />}
                </h2>

                {p.transitionIntoParagraph && (
                  <div style={{ marginBottom: '0.65rem' }}>
                    <strong>Transition into Paragraph:</strong>
                    <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{p.transitionIntoParagraph}</p>
                  </div>
                )}

                <div style={{ marginBottom: '0.75rem' }}>
                  <strong>Assertion (Topic Sentence):</strong>
                  <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{p.point}</p>
                </div>

                <div style={{ background: '#f8f9f8', padding: '0.75rem', borderRadius: 4, marginBottom: '0.75rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Evidence 1:</strong>
                    <p style={{ marginTop: '0.2rem', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{p.example}</p>
                    <strong>Commentary 1:</strong>
                    <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{p.explanation}</p>
                  </div>

                  {p.example2 && (
                    <div style={{ marginBottom: '0.5rem', borderTop: '1px solid #e0e0e0', paddingTop: '0.5rem' }}>
                      {p.evidenceTransition2 && <p style={{ fontSize: '0.85rem', color: '#555' }}><em>Transition: {p.evidenceTransition2}</em></p>}
                      <strong>Evidence 2:</strong>
                      <p style={{ marginTop: '0.2rem', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{p.example2}</p>
                      <strong>Commentary 2:</strong>
                      <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{p.explanation2}</p>
                    </div>
                  )}

                  {p.example3 && (
                    <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '0.5rem' }}>
                      {p.evidenceTransition3 && <p style={{ fontSize: '0.85rem', color: '#555' }}><em>Transition: {p.evidenceTransition3}</em></p>}
                      <strong>Evidence 3:</strong>
                      <p style={{ marginTop: '0.2rem', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{p.example3}</p>
                      <strong>Commentary 3:</strong>
                      <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{p.explanation3}</p>
                    </div>
                  )}
                </div>

                {p.paragraphConclusion && (
                  <div style={{ marginBottom: '0.65rem' }}>
                    <strong>Concluding Sentence:</strong>
                    <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{p.paragraphConclusion}</p>
                  </div>
                )}

                {p.transitionAfterParagraph && (
                  <div>
                    <strong>Transition to Next Point:</strong>
                    <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{p.transitionAfterParagraph}</p>
                  </div>
                )}
              </div>
            )
          })}

          {/* Essay Conclusion Breakdown */}
          {concludingSentence && (
            <div className="card" style={{ borderLeft: '4px solid #287a56' }}>
              <h2 style={{ color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
                Conclusion (Paragraph 5)
              </h2>
              {essayPlan?.conclusionTransition && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Transition into Conclusion:</strong>
                  <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{essayPlan.conclusionTransition}</p>
                </div>
              )}
              <strong>Echo Thesis & Big Idea / So What:</strong>
              <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{concludingSentence}</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Topic Sentence */}
          {topicSentence && (
            <div className="card">
              <h2 style={{ color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
                {labels.topicSentence || 'Topic Sentence'}
              </h2>
              <p style={{ whiteSpace: 'pre-wrap' }}>{topicSentence}</p>
            </div>
          )}

          {/* Per-point breakdown */}
          {points.map((p, i) => (
            <div className="card" key={i}>
              <h2 style={{ color: 'var(--color-accent)', marginBottom: '0.75rem' }}>
                {labels.point} {i + 1}
                {hasPassage && <ScoreBadge score={similarityScores[i]?.exampleScore} />}
              </h2>

              {p.link && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <strong>{labels.link || 'Link'}:</strong>
                  <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{p.link}</p>
                </div>
              )}
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

          {/* Concluding Sentence */}
          {concludingSentence && (
            <div className="card">
              <h2 style={{ color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
                {labels.concludingSentence || 'Concluding Sentence'}
              </h2>
              <p style={{ whiteSpace: 'pre-wrap' }}>{concludingSentence}</p>
            </div>
          )}
        </>
      )}

      {/* Printable Teacher Feedback Box */}
      <div className="print-only" style={{ marginTop: '2rem', border: '1px solid #000', padding: '1rem', minHeight: '120px' }}>
        <strong>Teacher Feedback & Notes:</strong>
      </div>

      <div className="no-print" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p className="muted" style={{ textAlign: 'center' }}>
          Need to hand in a copy? Print the report for your teacher, or open Dashboard to find saved work.
        </p>
        <button className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} onClick={() => window.print()} title="Print this report or choose Save as PDF">
          🖨️ Print and Save Report to Submit to Teacher
        </button>
        {onNavigateToDashboard && (
          <button className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem' }} onClick={onNavigateToDashboard}>
            Go to Dashboard
          </button>
        )}
        <button className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem' }} onClick={onReset} disabled={saveStatus === 'error'} title={saveStatus === 'error' ? 'Save or copy the response before starting another student session.' : undefined}>
          Start a New Session
        </button>
      </div>
    </div>
  )
}
