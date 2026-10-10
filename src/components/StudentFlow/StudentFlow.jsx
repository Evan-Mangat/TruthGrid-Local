import React, { useState } from 'react'
import { scoreSimilarity } from '../../utils/similarity'

const NUM_POINTS = 3

function emptyPoint() {
  return { point: '', example: '', explanation: '' }
}

export default function StudentFlow({ session, onSubmit }) {
  const { passage, studentName, labels } = session
  const [points, setPoints] = useState([emptyPoint(), emptyPoint(), emptyPoint()])
  const [errors, setErrors] = useState({})
  const [passageExpanded, setPassageExpanded] = useState(true)

  function updateField(index, field, value) {
    setPoints(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
    setErrors(prev => { const e = {...prev}; delete e[`${index}-${field}`]; return e })
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
    if (Object.keys(e).length) { setErrors(e); return }

    const fullResponse = points
      .map(p => `${p.point} ${p.example} ${p.explanation}`)
      .join(' ')

    const similarityScores = points.map(p => ({
      pointScore: scoreSimilarity(p.point, passage),
      exampleScore: scoreSimilarity(p.example, passage),
      explanationScore: scoreSimilarity(p.explanation, passage),
    }))

    onSubmit({
      studentName,
      studentNumber: session.studentNumber,
      passage,
      points,
      similarityScores,
      submittedAt: new Date().toISOString(),
      labels: session.labels,
    })
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <h1>Literary Analysis</h1>
          <p className="muted">{studentName}</p>
        </div>
      </div>

      {/* Reading passage */}
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

      {/* Three points */}
      {points.map((p, i) => (
        <div className="card" key={i}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--color-accent)' }}>
            Point {i + 1} of {NUM_POINTS}
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
            <p className="muted" style={{ marginBottom: '0.4rem' }}>Quote or detail from the text that supports your point.</p>
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
            <p className="muted" style={{ marginBottom: '0.4rem' }}>How does this support your point? What does it show about the text?</p>
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

      <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmit}>
        Submit Response
      </button>
    </div>
  )
}
