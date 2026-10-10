import React from 'react'
import { saveResponse } from '../../utils/db'

function ScoreBadge({ score }) {
  const pct = Math.round(score * 100)
  let color = 'var(--color-success)'
  if (pct < 40) color = 'var(--color-warning)'
  if (pct < 20) color = '#c62828'
  return (
    <span style={{
      display: 'inline-block',
      background: color,
      color: '#fff',
      borderRadius: 4,
      padding: '0.1rem 0.5rem',
      fontSize: '0.8rem',
      fontWeight: 700,
      marginLeft: '0.5rem',
    }}>
      {pct}% text engagement
    </span>
  )
}

export default function Results({ submission, session, onReset }) {
  const { points, similarityScores, labels, studentName, studentNumber, submittedAt } = submission

  React.useEffect(() => {
    saveResponse(submission).catch(console.error)
  }, [])

  const avgScore = similarityScores.reduce((sum, s) => sum + s.exampleScore, 0) / similarityScores.length

  return (
    <div className="page">
      <h1>Response Submitted</h1>
      <p className="muted" style={{ marginBottom: '0.25rem' }}>{studentName}{studentNumber ? ` · #${studentNumber}` : ''}</p>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>{new Date(submittedAt).toLocaleString()}</p>

      {/* Similarity notice — always framed as a flag for the teacher, never a grade */}
      <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
        <h3>Text Engagement Indicator</h3>
        <p className="muted" style={{ marginTop: '0.3rem' }}>
          This score measures how closely the student's examples connect to the reading passage.
          It is a flag for teacher review — not a grade or verdict.
        </p>
        <p style={{ marginTop: '0.6rem', fontSize: '1.1rem' }}>
          Overall: <ScoreBadge score={avgScore} />
        </p>
      </div>

      {/* Per-point breakdown */}
      {points.map((p, i) => (
        <div className="card" key={i}>
          <h2 style={{ color: 'var(--color-accent)', marginBottom: '0.75rem' }}>
            Point {i + 1}
            <ScoreBadge score={similarityScores[i].exampleScore} />
          </h2>

          <div style={{ marginBottom: '0.75rem' }}>
            <strong>{labels.point}:</strong>
            <p style={{ marginTop: '0.2rem' }}>{p.point}</p>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <strong>{labels.example}:</strong>
            <p style={{ marginTop: '0.2rem', fontStyle: 'italic' }}>{p.example}</p>
          </div>
          <div>
            <strong>{labels.explanation}:</strong>
            <p style={{ marginTop: '0.2rem' }}>{p.explanation}</p>
          </div>
        </div>
      ))}

      <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onReset}>
        New Student Session
      </button>
    </div>
  )
}
