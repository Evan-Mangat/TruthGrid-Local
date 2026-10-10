import React, { useState } from 'react'

const DEFAULT_LABELS = {
  point: 'Point',
  example: 'Example',
  explanation: 'Explanation',
}

export default function TeacherSetup({ onReady }) {
  const [passage, setPassage] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [labels, setLabels] = useState(DEFAULT_LABELS)
  const [showLabelEdit, setShowLabelEdit] = useState(false)
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!passage.trim()) e.passage = 'Please paste in the reading passage.'
    if (!studentName.trim()) e.studentName = 'Student name is required.'
    return e
  }

  function handleStart() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onReady({
      passage: passage.trim(),
      studentName: studentName.trim(),
      studentNumber: studentNumber.trim(),
      labels,
      startedAt: new Date().toISOString(),
    })
  }

  function updateLabel(key, value) {
    setLabels(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="page">
      <h1>TruthGrid Classroom</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Literary analysis — one paragraph, three points
      </p>

      {/* Reading passage */}
      <div className="card">
        <label htmlFor="passage">Reading Passage</label>
        <p className="muted" style={{ marginBottom: '0.6rem' }}>
          Paste the text students will write about.
        </p>
        <textarea
          id="passage"
          rows={10}
          value={passage}
          onChange={e => { setPassage(e.target.value); setErrors(v => ({...v, passage: null})) }}
          placeholder="Paste your reading passage here…"
        />
        {errors.passage && <p className="error-msg">{errors.passage}</p>}
      </div>

      {/* Student info */}
      <div className="card">
        <label htmlFor="studentName">Student Name</label>
        <input
          id="studentName"
          type="text"
          value={studentName}
          onChange={e => { setStudentName(e.target.value); setErrors(v => ({...v, studentName: null})) }}
          placeholder="e.g. Jane Smith"
        />
        {errors.studentName && <p className="error-msg">{errors.studentName}</p>}

        <div style={{ marginTop: '1rem' }}>
          <label htmlFor="studentNumber">Student Number <span className="muted">(optional)</span></label>
          <input
            id="studentNumber"
            type="text"
            value={studentNumber}
            onChange={e => setStudentNumber(e.target.value)}
            placeholder="e.g. 123456"
          />
        </div>
      </div>

      {/* Label customization */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Structure Labels</h3>
            <p className="muted">
              Currently: <strong>{labels.point}</strong> · <strong>{labels.example}</strong> · <strong>{labels.explanation}</strong>
            </p>
          </div>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
            onClick={() => setShowLabelEdit(v => !v)}
          >
            {showLabelEdit ? 'Done' : 'Customize'}
          </button>
        </div>

        {showLabelEdit && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {['point', 'example', 'explanation'].map(key => (
              <div key={key}>
                <label htmlFor={`label-${key}`} style={{ textTransform: 'capitalize' }}>{key}</label>
                <input
                  id={`label-${key}`}
                  type="text"
                  value={labels[key]}
                  onChange={e => updateLabel(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleStart}>
        Start Writing Session
      </button>
    </div>
  )
}
