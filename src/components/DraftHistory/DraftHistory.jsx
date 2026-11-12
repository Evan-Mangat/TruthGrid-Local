import React, { useState, useEffect } from 'react'
import { getAllDraftSessions, getDraftVersionsBySession } from '../../utils/draftHistory'

function triggerLabel(trigger) {
  if (trigger === 'submit') return 'Final Submission'
  if (trigger === 'manual') return 'Manual Save'
  if (trigger === 'idle') return 'Auto-saved (idle)'
  return trigger
}

function SnapshotView({ version }) {
  const { snapshot, stepName, timestamp, trigger, versionNumber } = version
  if (!snapshot) return <p className="muted">No snapshot data.</p>
  const labels = {
    topicSentence: 'Topic Sentence',
    link: 'Link',
    point: 'Point',
    example: 'Example',
    explanation: 'Explanation',
    concludingSentence: 'Concluding Sentence',
    ...(snapshot.labels || {}),
  }
  const pts = snapshot.points || []

  return (
    <div>
      <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
        <h3 style={{ marginBottom: '0.2rem' }}>
          Version {versionNumber}
          {trigger === 'submit' && (
            <span style={{ marginLeft: '0.5rem', background: 'var(--color-success)', color: '#fff', borderRadius: 4, padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>
              FINAL
            </span>
          )}
        </h3>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          {new Date(timestamp).toLocaleString()} · {stepName} · {triggerLabel(trigger)}
        </p>
      </div>

      {snapshot.topicSentence && (
        <div style={{ marginBottom: '0.75rem' }}>
          <strong style={{ color: 'var(--color-accent)', fontSize: '0.9rem' }}>
            {snapshot.essayPlan ? 'Thesis Statement (Sentence 1):' : `${labels.topicSentence}:`}
          </strong>
          <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{snapshot.topicSentence}</p>
        </div>
      )}

      {snapshot.essayPlan?.mainIdeas && snapshot.essayPlan.mainIdeas.some(Boolean) && (
        <div style={{ marginBottom: '0.75rem', padding: '0.5rem', background: '#f5f5f5', borderRadius: 4 }}>
          <strong style={{ fontSize: '0.85rem' }}>3 Main Ideas:</strong>
          {snapshot.essayPlan.mainIdeas.map((idea, idx) => (
            idea ? <p key={idx} style={{ margin: '0.15rem 0', fontSize: '0.85rem' }}>• Main Idea {String.fromCharCode(65 + idx)}: {idea}</p> : null
          ))}
        </div>
      )}

      {snapshot.sharedPoint && (
        <div style={{ marginBottom: '0.75rem' }}>
          <strong style={{ color: 'var(--color-accent)', fontSize: '0.9rem' }}>Central {labels.point}:</strong>
          <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{snapshot.sharedPoint}</p>
        </div>
      )}

      {pts.map((p, i) => (
        <div key={i} style={{ marginBottom: '0.75rem', paddingLeft: '0.75rem', borderLeft: '3px solid var(--color-border)' }}>
          <strong style={{ color: 'var(--color-accent)', fontSize: '0.9rem' }}>
            {snapshot.essayPlan ? `Body Paragraph ${i + 1} (${['1st', '2nd', '3rd'][i]} Main Point — Group ${String.fromCharCode(65 + i)})` : `${labels.point} ${i + 1}`}
          </strong>
          {p.transitionIntoParagraph && <p style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}><strong>Transition:</strong> {p.transitionIntoParagraph}</p>}
          {p.link && <p style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}><strong>{labels.link}:</strong> {p.link}</p>}
          {p.point && <p style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}><strong>Assertion:</strong> {p.point}</p>}
          {p.example && <p style={{ fontSize: '0.9rem', marginTop: '0.2rem', fontStyle: 'italic' }}><strong>Evidence 1:</strong> {p.example}</p>}
          {p.explanation && <p style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}><strong>Commentary 1:</strong> {p.explanation}</p>}
          {p.example2 && <p style={{ fontSize: '0.9rem', marginTop: '0.2rem', fontStyle: 'italic' }}><strong>Evidence 2:</strong> {p.example2}</p>}
          {p.explanation2 && <p style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}><strong>Commentary 2:</strong> {p.explanation2}</p>}
          {p.example3 && <p style={{ fontSize: '0.9rem', marginTop: '0.2rem', fontStyle: 'italic' }}><strong>Evidence 3:</strong> {p.example3}</p>}
          {p.explanation3 && <p style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}><strong>Commentary 3:</strong> {p.explanation3}</p>}
          {p.paragraphConclusion && <p style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}><strong>Concluding Sentence:</strong> {p.paragraphConclusion}</p>}
        </div>
      ))}

      {snapshot.concludingSentence && (
        <div style={{ marginBottom: '0.75rem' }}>
          <strong style={{ color: 'var(--color-accent)', fontSize: '0.9rem' }}>
            {snapshot.essayPlan ? 'Conclusion (Paragraph 5):' : `${labels.concludingSentence}:`}
          </strong>
          <p style={{ marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{snapshot.concludingSentence}</p>
        </div>
      )}
    </div>
  )
}

function buildTextReport(studentName, studentNumber, versions) {
  const lines = []
  lines.push('TruthGrid — Draft History Report')
  lines.push(`Student: ${studentName}${studentNumber ? ` (#${studentNumber})` : ''}`)
  lines.push(`Generated: ${new Date().toLocaleString()}`)
  lines.push(`Total versions: ${versions.length}`)
  lines.push('')

  // Final version first (per spec)
  const finalVersion = versions.find(v => v.trigger === 'submit')
  const drafts = versions.filter(v => v.trigger !== 'submit')

  if (finalVersion) {
    lines.push('════════════════════════════════')
    lines.push('FINAL SUBMITTED VERSION')
    lines.push(`Submitted: ${new Date(finalVersion.timestamp).toLocaleString()}`)
    lines.push('════════════════════════════════')
    lines.push(formatSnapshotAsText(finalVersion.snapshot))
    lines.push('')
  }

  if (drafts.length > 0) {
    lines.push('════════════════════════════════')
    lines.push('EARLIER DRAFTS (oldest to newest)')
    lines.push('════════════════════════════════')
    for (const v of drafts) {
      lines.push('')
      lines.push(`--- Draft ${v.versionNumber} | ${new Date(v.timestamp).toLocaleString()} | ${v.stepName} | ${triggerLabel(v.trigger)} ---`)
      lines.push(formatSnapshotAsText(v.snapshot))
    }
  }

  return lines.join('\n')
}

function formatSnapshotAsText(snapshot) {
  if (!snapshot) return '(no content)'
  const labels = {
    topicSentence: 'Topic Sentence',
    link: 'Link',
    point: 'Point',
    example: 'Example',
    explanation: 'Explanation',
    concludingSentence: 'Concluding Sentence',
    ...(snapshot.labels || {}),
  }
  const parts = []
  if (snapshot.topicSentence) {
    parts.push(`${snapshot.essayPlan ? 'Thesis Statement (Sentence 1)' : labels.topicSentence}:\n${snapshot.topicSentence}`)
  }
  if (snapshot.essayPlan?.mainIdeas && snapshot.essayPlan.mainIdeas.some(Boolean)) {
    const mi = snapshot.essayPlan.mainIdeas.map((idea, idx) => `• Main Idea ${String.fromCharCode(65 + idx)}: ${idea}`).join('\n')
    parts.push(`Main Ideas:\n${mi}`)
  }
  if (snapshot.sharedPoint) parts.push(`Central ${labels.point}:\n${snapshot.sharedPoint}`)
  for (const [i, p] of (snapshot.points || []).entries()) {
    const section = []
    if (p.transitionIntoParagraph) section.push(`Transition into Paragraph: ${p.transitionIntoParagraph}`)
    if (p.link) section.push(`${labels.link}: ${p.link}`)
    if (p.point) section.push(`Assertion: ${p.point}`)
    if (p.example) section.push(`Evidence 1: ${p.example}`)
    if (p.explanation) section.push(`Commentary 1: ${p.explanation}`)
    if (p.evidenceTransition2) section.push(`Transition: ${p.evidenceTransition2}`)
    if (p.example2) section.push(`Evidence 2: ${p.example2}`)
    if (p.explanation2) section.push(`Commentary 2: ${p.explanation2}`)
    if (p.evidenceTransition3) section.push(`Transition: ${p.evidenceTransition3}`)
    if (p.example3) section.push(`Evidence 3: ${p.example3}`)
    if (p.explanation3) section.push(`Commentary 3: ${p.explanation3}`)
    if (p.paragraphConclusion) section.push(`Concluding Sentence: ${p.paragraphConclusion}`)
    if (p.transitionAfterParagraph) section.push(`Transition to Next Point: ${p.transitionAfterParagraph}`)
    if (section.length) parts.push(`${snapshot.essayPlan ? `Body Paragraph ${i + 1}` : `${labels.point} ${i + 1}`}:\n${section.join('\n')}`)
  }
  if (snapshot.concludingSentence) {
    parts.push(`${snapshot.essayPlan ? 'Conclusion (Paragraph 5)' : labels.concludingSentence}:\n${snapshot.concludingSentence}`)
  }
  return parts.join('\n\n')
}

function downloadTextReport(studentName, studentNumber, versions) {
  const content = buildTextReport(studentName, studentNumber, versions)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const safeName = (studentName || 'student').replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const dateStr = new Date().toISOString().split('T')[0]
  const a = document.createElement('a')
  a.href = url
  a.download = `truthgrid_drafts_${safeName}_${dateStr}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function DraftHistory({ onBack }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSession, setSelectedSession] = useState(null)
  const [versions, setVersions] = useState([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(null)

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    setLoading(true)
    try {
      const data = await getAllDraftSessions()
      setSessions(data)
      setLoadError(null)
    } catch (err) {
      console.error('Could not load draft sessions:', err)
      setLoadError('Could not load draft history from local storage. Try reloading the page.')
    } finally {
      setLoading(false)
    }
  }

  async function selectSession(session) {
    setSelectedSession(session)
    setSelectedVersion(null)
    setVersionsLoading(true)
    try {
      const data = await getDraftVersionsBySession(session.sessionId)
      setVersions(data)
    } catch (err) {
      console.error('Could not load versions:', err)
    } finally {
      setVersionsLoading(false)
    }
  }

  const filtered = sessions.filter(s => {
    const q = searchQuery.toLowerCase()
    return (s.studentName || '').toLowerCase().includes(q) || (s.studentNumber || '').toLowerCase().includes(q)
  })

  return (
    <div className="page">
      {/* Print layout: injects all versions when printing */}
      {selectedSession && versions.length > 0 && (
        <div className="print-only" style={{ fontFamily: 'serif' }}>
          <h1 style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>TruthGrid — Draft History Report</h1>
          <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            <strong>Student:</strong> {selectedSession.studentName}
            {selectedSession.studentNumber ? ` (#${selectedSession.studentNumber})` : ''} &nbsp;|&nbsp;
            <strong>Printed:</strong> {new Date().toLocaleString()}
          </p>
          {/* Final version first */}
          {versions.filter(v => v.trigger === 'submit').map(v => (
            <div key={v.id} style={{ marginBottom: '2rem', pageBreakInside: 'avoid' }}>
              <h2 style={{ fontSize: '1.1rem', borderBottom: '2px solid #000', paddingBottom: '0.3rem', marginBottom: '0.75rem' }}>
                FINAL SUBMITTED VERSION — {new Date(v.timestamp).toLocaleString()}
              </h2>
              <SnapshotView version={v} />
            </div>
          ))}
          {/* Then earlier drafts chronologically */}
          {versions.filter(v => v.trigger !== 'submit').map(v => (
            <div key={v.id} style={{ marginBottom: '2rem', pageBreakInside: 'avoid' }}>
              <h2 style={{ fontSize: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '0.3rem', marginBottom: '0.75rem' }}>
                Draft {v.versionNumber} — {new Date(v.timestamp).toLocaleString()} — {v.stepName}
              </h2>
              <SnapshotView version={v} />
            </div>
          ))}
        </div>
      )}

      <div className="no-print">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <h1>Draft History</h1>
            <p className="muted">Student writing process — version timeline for each session</p>
          </div>
          <button className="btn btn-secondary" onClick={onBack}>← Back to Dashboard</button>
        </div>

        {/* LOCAL ONLY notice */}
        <div className="card" style={{ borderLeft: '4px solid #1565c0', background: '#e3f2fd', marginBottom: '1.5rem' }}>
          <p style={{ color: '#0d47a1', fontWeight: 600, marginBottom: '0.2rem' }}>LOCAL ONLY — This feature is local only in this version.</p>
          <p style={{ color: '#1565c0', fontSize: '0.9rem' }}>
            All draft versions are stored on this device only. Nothing is sent to any server or external service.
            This is not AI detection. It records how a student's own writing changed over time, so teachers can mark the process, not just the final paragraph.
          </p>
        </div>

        {loadError && (
          <div role="alert" style={{ background: '#ffebee', border: '1px solid #e57373', borderLeft: '5px solid #c62828', color: '#b71c1c', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
            {loadError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: selectedSession ? '1fr 1.4fr' : '1fr', gap: '1.25rem' }}>
          {/* Session list */}
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <input
                type="text"
                placeholder="Search by student name or ID…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.9rem' }}
              />
            </div>

            {loading ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <p className="muted">Loading draft sessions…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>No draft history yet</h3>
                <p className="muted" style={{ fontSize: '0.9rem' }}>
                  Draft versions are saved when students click "Save Draft", pause for 30 seconds, or submit their response.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filtered.map(s => (
                  <button
                    key={s.sessionId}
                    type="button"
                    onClick={() => selectSession(s)}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      display: 'block',
                      border: `2px solid ${selectedSession?.sessionId === s.sessionId ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius)',
                      padding: '0.75rem 1rem',
                      background: selectedSession?.sessionId === s.sessionId ? 'rgba(var(--color-accent-rgb, 25,118,210), 0.06)' : 'var(--color-surface)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong>{s.studentName}</strong>
                        {s.studentNumber && <span className="muted" style={{ marginLeft: '0.4rem', fontSize: '0.85rem' }}>(#{s.studentNumber})</span>}
                        {s.isFinal && (
                          <span style={{ marginLeft: '0.5rem', background: 'var(--color-success)', color: '#fff', borderRadius: 3, padding: '0.05rem 0.4rem', fontSize: '0.7rem', fontWeight: 700 }}>
                            SUBMITTED
                          </span>
                        )}
                      </div>
                      <span className="muted" style={{ fontSize: '0.8rem' }}>{s.versionCount} version{s.versionCount !== 1 ? 's' : ''}</span>
                    </div>
                    <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      {new Date(s.lastTimestamp).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Version timeline + viewer */}
          {selectedSession && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>
                  {selectedSession.studentName}
                  {selectedSession.studentNumber ? ` (#${selectedSession.studentNumber})` : ''} — Timeline
                </h2>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                    onClick={() => downloadTextReport(selectedSession.studentName, selectedSession.studentNumber, versions)}
                    disabled={versions.length === 0}
                    title="Download all drafts as a .txt report"
                  >
                    ⬇ Download .txt
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                    onClick={() => window.print()}
                    disabled={versions.length === 0}
                    title="Print the full draft history report"
                  >
                    🖨️ Print Report
                  </button>
                </div>
              </div>

              {versionsLoading ? (
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <p className="muted">Loading versions…</p>
                </div>
              ) : (
                <>
                  {/* Version list */}
                  <div className="card" style={{ padding: '0.5rem 0', marginBottom: '1rem' }}>
                    {versions.map((v, i) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVersion(selectedVersion?.id === v.id ? null : v)}
                        style={{
                          all: 'unset',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.5rem 0.9rem',
                          borderBottom: i < versions.length - 1 ? '1px solid var(--color-border)' : 'none',
                          background: selectedVersion?.id === v.id ? 'rgba(var(--color-accent-rgb, 25,118,210), 0.07)' : 'transparent',
                          width: '100%',
                        }}
                      >
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', minWidth: '1.8rem' }}>v{v.versionNumber}</span>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: v.trigger === 'submit' ? 700 : 400 }}>
                            {v.stepName}
                            {v.trigger === 'submit' && (
                              <span style={{ marginLeft: '0.4rem', background: 'var(--color-success)', color: '#fff', borderRadius: 3, padding: '0.05rem 0.35rem', fontSize: '0.7rem', fontWeight: 700 }}>
                                FINAL
                              </span>
                            )}
                          </div>
                          <div className="muted" style={{ fontSize: '0.75rem' }}>{triggerLabel(v.trigger)}</div>
                        </div>
                        <span className="muted" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Snapshot viewer */}
                  {selectedVersion && (
                    <div className="card">
                      <SnapshotView version={selectedVersion} />
                    </div>
                  )}
                  {!selectedVersion && (
                    <p className="muted" style={{ fontSize: '0.9rem', textAlign: 'center' }}>Select a version above to read it.</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
