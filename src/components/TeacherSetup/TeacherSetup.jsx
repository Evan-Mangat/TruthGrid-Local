import React, { useState, useEffect, useRef } from 'react'

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
  const [originalDocument, setOriginalDocument] = useState(saved.originalDocument || null)
  const [labels, setLabels] = useState(saved.labels || DEFAULT_LABELS)
  // 9. Short-form mode (1 point) vs Standard (3 points)
  const [mode, setMode] = useState(saved.mode || 'standard') // 'standard' | 'short'

  // Student info is ALWAYS cleared for the next student
  const [studentName, setStudentName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')

  const [showLabelEdit, setShowLabelEdit] = useState(false)
  const [errors, setErrors] = useState({})
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [ocrConfirmation, setOcrConfirmation] = useState('')
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const fileInputRef = useRef(null)

  // Auto-persist teacher settings (passage, labels, mode) to localStorage
  useEffect(() => {
    saveTeacherConfig({ passage, labels, mode })
  }, [passage, labels, mode])

  function validate() {
    const e = {}
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
      originalDocument,
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

  async function handlePassageFile(file) {
    if (!file) return
    setUploadError('')
    setOcrConfirmation('')
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension === 'txt' || extension === 'md') {
      try {
        setPassage(await file.text())
        setOriginalDocument(null)
        setOcrConfirmation(`Loaded text from ${file.name}.`)
      } catch {
        setUploadError('Could not read this text file. Try saving it as UTF-8 plain text and uploading it again.')
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      return
    }

    if (!['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif'].includes(extension)) {
      setUploadError('Choose a PDF, image, TXT, or Markdown file.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/ocr', { method: 'POST', body: formData })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Offline OCR could not process this file.')
      }
      setPassage(result.text || '')
      setOriginalDocument({
        data: await file.arrayBuffer(),
        name: file.name,
        type: file.type || (extension === 'pdf' ? 'application/pdf' : `image/${extension}`),
      })
      setOcrConfirmation(
        `Extracted via Offline OCR (${result.word_count} words, ${result.page_count} pages in ${result.elapsed_seconds}s). Review and edit the passage below.`
      )
    } catch (error) {
      setUploadError(
        error instanceof TypeError
          ? 'Could not reach the local OCR service. Start the app with npm run dev and check that Python, Tesseract, and the OCR dependencies are installed.'
          : error.message || 'Offline OCR could not process this file.'
      )
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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
      <div
        className="card"
        onDragOver={event => { event.preventDefault(); setIsDraggingFile(true) }}
        onDragLeave={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsDraggingFile(false)
        }}
        onDrop={event => {
          event.preventDefault()
          setIsDraggingFile(false)
          handlePassageFile(event.dataTransfer.files[0])
        }}
        style={isDraggingFile ? { outline: '2px dashed var(--color-accent)', outlineOffset: 2 } : undefined}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label htmlFor="passage">Reading Passage <span className="muted">(optional)</span></label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,.txt,.md"
              onChange={event => handlePassageFile(event.target.files[0])}
              style={{ display: 'none' }}
            />
            <button className="btn btn-secondary" type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? 'Scanning locally…' : '📄 Upload / Scan Passage'}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => { setPassage(''); setOriginalDocument(null); setOcrConfirmation(''); setUploadError('') }}
              disabled={!passage && !originalDocument && !ocrConfirmation}
            >
              ✕ Clear Passage
            </button>
          </div>
        </div>
        <p className="muted" style={{ marginBottom: '0.6rem' }}>
          Paste a reference text, upload a document, or leave blank for an open prompt. Text files load directly; scanned PDF and image OCR runs locally during development. You can also drag a file here.
        </p>
        <textarea
          id="passage"
          rows={8}
          value={passage}
          onChange={e => {
            setPassage(e.target.value)
            setErrors(v => ({ ...v, passage: null }))
          }}
          placeholder="Paste your reading passage here, or leave blank for an open prompt…"
        />
        {ocrConfirmation && <p role="status" style={{ color: 'var(--color-success)', marginTop: '0.5rem', fontWeight: 600 }}>{ocrConfirmation}</p>}
        {uploadError && (
          <div
            role="alert"
            className="card"
            style={{ marginTop: '0.75rem', marginBottom: 0, background: '#ffebee', borderColor: '#e57373', borderLeft: '5px solid #c62828' }}
          >
            <strong style={{ color: '#b71c1c' }}>Passage upload or scan failed</strong>
            <p style={{ color: '#b71c1c', marginTop: '0.25rem' }}>{uploadError}</p>
            <p className="muted" style={{ marginTop: '0.25rem' }}>
              You can still paste or edit the passage directly in the text box, or choose another supported file.
            </p>
          </div>
        )}
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
