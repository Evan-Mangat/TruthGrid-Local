import React, { useState, useEffect } from 'react'
import { getAllResponses, deleteResponse } from '../../utils/db'
import { exportResponsesToCSV } from '../../utils/export'

function ScoreBadge({ score }) {
  if (score === null || score === undefined) {
    return (
      <span
        style={{
          display: 'inline-block',
          background: '#607d8b',
          color: '#fff',
          borderRadius: 4,
          padding: '0.15rem 0.5rem',
          fontSize: '0.8rem',
          fontWeight: 600,
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
        padding: '0.15rem 0.5rem',
        fontSize: '0.8rem',
        fontWeight: 700,
      }}
    >
      {pct}% text engagement
    </span>
  )
}

export default function TeacherDashboard({ onBack, onPrintBlankWorksheet, onPrintStudentResponse }) {
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    loadResponses()
  }, [])

  async function loadResponses() {
    setLoading(true)
    try {
      const data = await getAllResponses()
      // Sort newest first
      data.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      setResponses(data)
      setLoadError(null)
    } catch (err) {
      console.error('Could not load responses from IndexedDB:', err)
      setLoadError('Could not load responses from local storage. Your saved work may still be present; try reloading this page.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id, studentName) {
    if (window.confirm(`Are you sure you want to delete the submission for ${studentName}?`)) {
      try {
        await deleteResponse(id)
        setResponses(prev => prev.filter(r => r.id !== id))
        setStatusMessage(`Deleted response for ${studentName}.`)
        setTimeout(() => setStatusMessage(null), 3000)
      } catch (err) {
        console.error('Error deleting response:', err)
        alert('Could not delete response.')
      }
    }
  }

  const filteredResponses = responses.filter(r => {
    const q = searchQuery.toLowerCase()
    return (
      (r.studentName || '').toLowerCase().includes(q) ||
      (r.studentNumber || '').toLowerCase().includes(q)
    )
  })

  // Give each response one vote, regardless of whether it contains one or three points.
  const totalSubmissions = responses.length
  const submissionAverages = responses.map(r => {
    if (!r.passage?.trim()) return null
    const validScores = (r.similarityScores || [])
      .map(s => s.exampleScore)
      .filter(s => s !== null && s !== undefined)
    return validScores.length ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : null
  }).filter(score => score !== null)
  const avgClassScore =
    submissionAverages.length > 0
      ? Math.round((submissionAverages.reduce((sum, score) => sum + score, 0) / submissionAverages.length) * 100)
      : null

  return (
    <div className="page dashboard-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div>
          <h1>Teacher Dashboard</h1>
          <p className="muted">
            All student responses stored locally on this device ({totalSubmissions} total)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onBack}>
            ← Back to Setup
          </button>
          <button
            className="btn btn-primary"
            onClick={() => exportResponsesToCSV(responses)}
            disabled={responses.length === 0}
            title="Download all stored student submissions as a CSV file"
          >
            📥 Export All to CSV
          </button>
          {onPrintBlankWorksheet && (
            <button className="btn btn-secondary" onClick={onPrintBlankWorksheet}>
              🖨️ Blank Worksheet
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', color: '#2e7d32', padding: '0.6rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
          {statusMessage}
        </div>
      )}
      {loadError && (
        <div role="alert" style={{ background: '#ffebee', border: '1px solid #e57373', borderLeft: '5px solid #c62828', color: '#b71c1c', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          {loadError}
        </div>
      )}

      {/* Metrics Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <p className="muted" style={{ fontSize: '0.85rem' }}>Total Responses</p>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--color-accent)', margin: '0.2rem 0' }}>
            {totalSubmissions}
          </h2>
          <p className="muted" style={{ fontSize: '0.8rem' }}>On this device</p>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <p className="muted" style={{ fontSize: '0.85rem' }}>Avg. Text Engagement</p>
          <h2 style={{ fontSize: '1.8rem', color: avgClassScore === null ? 'var(--color-text-muted)' : (avgClassScore >= 40 ? 'var(--color-success)' : 'var(--color-warning)'), margin: '0.2rem 0' }}>
            {avgClassScore !== null ? `${avgClassScore}%` : 'N/A'}
          </h2>
          <p className="muted" style={{ fontSize: '0.8rem' }}>Example citation overlap</p>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <p className="muted" style={{ fontSize: '0.85rem' }}>Latest Activity</p>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--color-text)', margin: '0.4rem 0' }}>
            {responses.length > 0 ? new Date(responses[0].submittedAt).toLocaleDateString() : 'None'}
          </h2>
          <p className="muted" style={{ fontSize: '0.8rem' }}>
            {responses.length > 0 ? new Date(responses[0].submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search by student name or ID…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.6rem 0.9rem' }}
        />
      </div>

      {/* Responses List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p className="muted">Loading stored responses from IndexedDB…</p>
        </div>
      ) : loadError ? null : filteredResponses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>No responses found</h3>
          <p className="muted">
            {responses.length === 0
              ? 'No student submissions have been recorded on this computer yet.'
              : 'No student matches your search query.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {filteredResponses.map(r => {
            const isExpanded = expandedId === r.id
            const pts = r.points || []
            const scores = r.similarityScores || []
            const validScores = scores
              .map(s => s.exampleScore)
              .filter(s => s !== null && s !== undefined)
            const avgScore =
              validScores.length > 0
                ? validScores.reduce((sum, s) => sum + s, 0) / validScores.length
                : null
            const labels = r.labels || { point: 'Point', example: 'Example', explanation: 'Explanation' }

            return (
              <div className="card" key={r.id || r.submittedAt} style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ marginBottom: '0.15rem' }}>
                      {r.studentName} {r.studentNumber ? <span className="muted" style={{ fontSize: '0.9rem' }}>(#{r.studentNumber})</span> : ''}
                    </h3>
                    <p className="muted" style={{ fontSize: '0.8rem' }}>
                      {new Date(r.submittedAt).toLocaleString()} · {pts.length === 1 ? 'Short-Form' : '3-Point Standard'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <ScoreBadge score={avgScore} />
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    >
                      {isExpanded ? 'Hide Details ▲' : 'View Work ▼'}
                    </button>
                    {onPrintStudentResponse && (
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                        onClick={() => onPrintStudentResponse(r)}
                        title="Print this student's response"
                      >
                        🖨️
                      </button>
                    )}
                    <button
                      className="btn"
                      style={{
                        fontSize: '0.8rem',
                        padding: '0.3rem 0.6rem',
                        color: '#c62828',
                        background: 'transparent',
                        border: '1px solid #ffcdd2',
                      }}
                      onClick={() => handleDelete(r.id, r.studentName)}
                      title="Delete this submission"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Expanded Details View */}
                {isExpanded && (
                  <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                    {r.passage && (
                      <div style={{ marginBottom: '1rem', background: '#fff', padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                        <strong style={{ fontSize: '0.85rem' }}>Reading Passage:</strong>
                        <p style={{ marginTop: '0.3rem', fontSize: '0.9rem', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                          {r.passage}
                        </p>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {pts.map((p, idx) => (
                        <div key={idx} style={{ background: '#fff', padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <strong style={{ color: 'var(--color-accent)' }}>
                              {labels.point} {idx + 1}
                            </strong>
                            <ScoreBadge score={r.passage?.trim() ? scores[idx]?.exampleScore : null} />
                          </div>
                          <p style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                            <strong>{labels.point}:</strong> {p.point}
                          </p>
                          <p style={{ fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '0.3rem' }}>
                            <strong>{labels.example}:</strong> {p.example}
                          </p>
                          <p style={{ fontSize: '0.9rem' }}>
                            <strong>{labels.explanation}:</strong> {p.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
