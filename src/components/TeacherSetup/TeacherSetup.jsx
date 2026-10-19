import React, { useState, useEffect } from 'react'

const TEACHER_CONFIG_KEY = 'truthgrid_teacher_config'

const DEFAULT_LABELS = {
  point: 'Point',
  example: 'Example',
  explanation: 'Explanation',
}

function loadSavedTeacherConfig() {
  try {
    const raw = localStorage.getItem(TEACHER_CONFIG_KEY)
    if (raw) return JSON.parse(raw)
  } catch (err) {
    console.warn('Could not load teacher config from localStorage:', err)
  }
  return null
}

export function saveTeacherConfig(config) {
  try {
    localStorage.setItem(TEACHER_CONFIG_KEY, JSON.stringify(config))
  } catch (err) {
    console.warn('Could not save teacher config to localStorage:', err)
  }
}

export default function TeacherSetup({
  onReady,
  initialConfig,
  onNavigateToDashboard,
  onPrintBlankWorksheet,
}) {
  const saved = initialConfig || loadSavedTeacherConfig() || {}

  // 4. Preserve teacher's passage, labels, and mode across students
  const [passage, setPassage] = useState(saved.passage || '')
  const [labels, setLabels] = useState(saved.labels || DEFAULT_LABELS)
  // 9. Short-form mode (1 point) vs Standard (3 points)
  const [mode, setMode] = useState(saved.mode || 'standard') // 'standard' | 'short'

  // Student info is ALWAYS cleared for the next student
  const [studentName, setStudentName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')

  const [showLabelEdit, setShowLabelEdit] = useState(false)
  const [errors, setErrors] = useState({})

  // Auto-persist teacher settings (passage, labels, mode) to localStorage
  useEffect(() => {
    saveTeacherConfig({ passage, labels, mode })
  }, [passage, labels, mode])

  function validate() {
    const e = {}
    if (!passage.trim()) e.passage = 'Please paste in the reading passage.'
    if (!studentName.trim()) e.studentName = 'Student name is required.'
    return e
  }

  function handleStart() {
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }

    const numPoints = mode === 'short' ? 1 : 3

    onReady({
      passage: passage.trim(),
      studentName: studentName.trim(),
      studentNumber: studentNumber.trim(),
      labels,
      mode,
      numPoints,
      startedAt: new Date().toISOString(),
    })
  }

  function updateLabel(key, value) {
    setLabels(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <h1>TruthGrid Classroom</h1>
          <p className="muted">
            Literary analysis writing tool · Local-first & offline
          </p>
        </div>

        {/* Teacher Navigation & Paper Print Options */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {onPrintBlankWorksheet && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
              onClick={() => onPrintBlankWorksheet({ passage, labels, mode })}
              title="Print paper worksheet for classroom photocopying"
            >
              🖨️ Blank Worksheet
            </button>
          )}
          {onNavigateToDashboard && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
              onClick={onNavigateToDashboard}
            >
              📊 Teacher Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Reading passage */}
      <div className="card">
        <label htmlFor="passage">Reading Passage</label>
        <p className="muted" style={{ marginBottom: '0.6rem' }}>
          Paste the text students will write about. This stays saved on this computer for all students.
        </p>
        <textarea
          id="passage"
          rows={8}
          value={passage}
          onChange={e => {
            setPassage(e.target.value)
            setErrors(v => ({ ...v, passage: null }))
          }}
          placeholder="Paste your reading passage here…"
        />
        {errors.passage && <p className="error-msg">{errors.passage}</p>}
      </div>

      {/* 9. Response Format Mode (Short-form vs Standard) */}
      <div className="card">
        <label>Response Format</label>
        <p className="muted" style={{ marginBottom: '0.6rem' }}>
          Choose the response length for this writing task.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontWeight: mode === 'standard' ? 700 : 400,
            }}
          >
            <input
              type="radio"
              name="mode"
              value="standard"
              checked={mode === 'standard'}
              onChange={() => setMode('standard')}
            />
            Standard Mode (3 Points: {labels.point} → {labels.example} → {labels.explanation} × 3)
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontWeight: mode === 'short' ? 700 : 400,
            }}
          >
            <input
              type="radio"
              name="mode"
              value="short"
              checked={mode === 'short'}
              onChange={() => setMode('short')}
            />
            Short-Form Mode (1 Point: Single focused response)
          </label>
        </div>
      </div>

      {/* Student info — cleared for each student */}
      <div className="card">
        <label htmlFor="studentName">Student Name</label>
        <input
          id="studentName"
          type="text"
          value={studentName}
          onChange={e => {
            setStudentName(e.target.value)
            setErrors(v => ({ ...v, studentName: null }))
          }}
          placeholder="e.g. Alex Morgan"
          autoComplete="off"
        />
        {errors.studentName && <p className="error-msg">{errors.studentName}</p>}

        <div style={{ marginTop: '1rem' }}>
          <label htmlFor="studentNumber">
            Student Number <span className="muted">(optional)</span>
          </label>
          <input
            id="studentNumber"
            type="text"
            value={studentNumber}
            onChange={e => setStudentNumber(e.target.value)}
            placeholder="e.g. 123456"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Label customization */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Structure Labels</h3>
            <p className="muted">
              Currently: <strong>{labels.point}</strong> · <strong>{labels.example}</strong> ·{' '}
              <strong>{labels.explanation}</strong>
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
                <label htmlFor={`label-${key}`} style={{ textTransform: 'capitalize' }}>
                  {key}
                </label>
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

      <button className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', fontSize: '1.05rem' }} onClick={handleStart}>
        Start Writing Session
      </button>
    </div>
  )
}
