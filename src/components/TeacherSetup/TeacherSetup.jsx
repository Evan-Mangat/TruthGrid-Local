import React, { useState, useEffect, useRef } from 'react'
import { hasTeacherPasscode, setTeacherPasscode, verifyTeacherPasscode } from '../../utils/teacherAccess'
import { getActiveDraft, clearActiveDraft, saveDraftToStorage } from '../StudentFlow/StudentFlow'
import { getAllDraftSessions, getDraftVersionsBySession } from '../../utils/draftHistory'

const TEACHER_CONFIG_KEY = 'truthgrid_teacher_config'

function hasDraftContent(draft) {
  if (!draft) return false
  if (draft.topicSentence?.trim()) return true
  if (draft.sharedPoint?.trim()) return true
  if (draft.concludingSentence?.trim()) return true
  if (draft.points?.some(p => p.point?.trim() || p.example?.trim() || p.explanation?.trim() || p.paragraphConclusion?.trim())) return true
  if (draft.essayPlan?.ideas?.some(i => i.text?.trim()) || draft.essayPlan?.mainIdeas?.some(i => i.trim())) return true
  return false
}

const DEFAULT_LABELS = {
  topicSentence: 'Topic Sentence',
  link: 'Link',
  point: 'Point',
  example: 'Example',
  explanation: 'Explanation',
  concludingSentence: 'Concluding Sentence',
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
  const [prompt, setPrompt] = useState(saved.prompt || '')
  const [labels, setLabels] = useState({ ...DEFAULT_LABELS, ...(saved.labels || {}) })
  // Essay uses three distinct points; literary analysis repeats one point.
  const [mode, setMode] = useState(saved.mode === 'literary_analysis' ? 'literary_analysis' : 'essay')

  // Student info preserves returning student session if available
  const [studentName, setStudentName] = useState(saved.studentName || '')
  const [studentNumber, setStudentNumber] = useState(saved.studentNumber || '')

  const [activeDraft, setActiveDraft] = useState(() => getActiveDraft())
  const [savedDraftSessions, setSavedDraftSessions] = useState([])
  const [showDraftsDrawer, setShowDraftsDrawer] = useState(false)

  const [showLabelEdit, setShowLabelEdit] = useState(false)
  const [errors, setErrors] = useState({})
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [ocrConfirmation, setOcrConfirmation] = useState('')
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [accessConfigured, setAccessConfigured] = useState(hasTeacherPasscode())
  const [showAccessSetup, setShowAccessSetup] = useState(!hasTeacherPasscode())
  const [currentTeacherPasscode, setCurrentTeacherPasscode] = useState('')
  const [newTeacherPasscode, setNewTeacherPasscode] = useState('')
  const [confirmTeacherPasscode, setConfirmTeacherPasscode] = useState('')
  const [accessError, setAccessError] = useState('')
  const [accessMessage, setAccessMessage] = useState('')
  const [isSavingPasscode, setIsSavingPasscode] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    async function loadSessions() {
      try {
        const sessions = await getAllDraftSessions()
        setSavedDraftSessions(sessions)
      } catch (err) {
        console.warn('Could not load draft sessions:', err)
      }
    }
    loadSessions()
  }, [])

  function handleResumeActiveDraft() {
    if (!activeDraft) return
    onReady({
      passage: activeDraft.passage || passage,
      originalDocument: activeDraft.originalDocument || originalDocument,
      prompt: activeDraft.prompt || prompt,
      labels: activeDraft.labels || labels,
      mode: activeDraft.mode || mode,
      numPoints: activeDraft.numPoints || 3,
      studentName: activeDraft.studentName || 'Student',
      studentNumber: activeDraft.studentNumber || '',
      startedAt: activeDraft.savedAt || new Date().toISOString(),
    })
  }

  function handleDismissActiveDraft() {
    clearActiveDraft()
    setActiveDraft(null)
  }

  async function handleResumeSessionDraft(s) {
    try {
      const versions = await getDraftVersionsBySession(s.sessionId)
      const latest = versions[versions.length - 1]
      if (latest && latest.snapshot) {
        saveDraftToStorage({
          ...latest.snapshot,
          studentName: s.studentName,
          studentNumber: s.studentNumber,
          numPoints: 3,
          savedAt: latest.timestamp,
        })
        onReady({
          passage: passage,
          originalDocument: originalDocument,
          prompt: prompt,
          labels: labels,
          mode: mode,
          numPoints: 3,
          studentName: s.studentName,
          studentNumber: s.studentNumber || '',
          startedAt: s.firstTimestamp || new Date().toISOString(),
        })
      }
    } catch (err) {
      console.warn('Could not resume session draft:', err)
    }
  }

  // Auto-persist teacher settings (passage, labels, mode, prompt) to localStorage
  useEffect(() => {
    saveTeacherConfig({ passage, labels, mode, prompt })
  }, [passage, labels, mode, prompt])

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

    const numPoints = 3

    onReady({
      passage: passage.trim(),
      originalDocument,
      prompt: prompt.trim(),
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

  async function handleSaveTeacherPasscode(event) {
    event.preventDefault()
    setAccessError('')
    setAccessMessage('')
    if (newTeacherPasscode.length < 6) {
      setAccessError('Use at least 6 characters for the dashboard passcode.')
      return
    }
    if (newTeacherPasscode !== confirmTeacherPasscode) {
      setAccessError('The new passcodes do not match.')
      return
    }

    setIsSavingPasscode(true)
    try {
      if (accessConfigured && !(await verifyTeacherPasscode(currentTeacherPasscode))) {
        setAccessError('The current teacher passcode did not match.')
        return
      }
      await setTeacherPasscode(newTeacherPasscode)
      setAccessConfigured(true)
      setShowAccessSetup(false)
      setCurrentTeacherPasscode('')
      setNewTeacherPasscode('')
      setConfirmTeacherPasscode('')
      setAccessMessage('Dashboard passcode saved. Changing it does not delete saved essays or draft versions.')
    } catch (error) {
      setAccessError(error.message || 'Could not save the teacher passcode.')
    } finally {
      setIsSavingPasscode(false)
    }
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

  const isStaticDeploy = !window.location.hostname.match(/^(localhost|127\.0\.0\.1|\[::1\])$/)

  return (
    <div className="page">
      {isStaticDeploy && (
        <div
          role="note"
          className="card"
          style={{ marginBottom: '1rem', background: '#fff8e1', borderColor: '#ffe082', borderLeft: '5px solid #f9a825' }}
        >
          <strong style={{ color: '#5d4037' }}>PDF/image OCR is not available on this hosted version.</strong>
          <p style={{ color: '#5d4037', marginTop: '0.25rem', marginBottom: 0 }}>
            To scan a PDF or image passage, run the app locally with <code>npm run dev</code>.
            On this site you can still paste passage text directly or upload a plain <code>.txt</code> file.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <h1>TruthGrid Classroom</h1>
          <p className="muted">
            Literary analysis writing tool
          </p>
        </div>

        {/* Teacher Navigation & Paper Print Options */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {savedDraftSessions.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
              onClick={() => setShowDraftsDrawer(prev => !prev)}
            >
              📁 Saved Drafts ({savedDraftSessions.length})
            </button>
          )}
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
              {/* Previous label: Teacher Dashboard. */}
              📊 Dashboard
            </button>
          )}
        </div>
      </div>

      {/* 📁 Saved Drafts Drawer */}
      {showDraftsDrawer && (
        <section className="card" style={{ marginBottom: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e3a8a' }}>📁 Saved Draft Sessions</h3>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem' }}
              onClick={() => setShowDraftsDrawer(false)}
            >
              Close ✕
            </button>
          </div>
          <p className="muted" style={{ fontSize: '0.84rem', marginBottom: '0.75rem' }}>
            Click on any draft below to load and continue that student&apos;s writing session:
          </p>
          <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '16rem', overflowY: 'auto' }}>
            {savedDraftSessions.map(s => (
              <div
                key={s.sessionId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '0.6rem 0.85rem',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.92rem' }}>{s.studentName || 'Unnamed Student'}</strong>
                  {s.studentNumber && <span className="muted" style={{ fontSize: '0.8rem', marginLeft: '0.4rem' }}>#{s.studentNumber}</span>}
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                    {new Date(s.lastTimestamp).toLocaleString()} · {s.versionCount} {s.versionCount === 1 ? 'version' : 'versions'}
                    {s.isFinal && <span style={{ marginLeft: '0.5rem', color: '#16a34a', fontWeight: 600 }}>✓ Submitted</span>}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => handleResumeSessionDraft(s)}
                >
                  ▶ Open Draft
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 📝 In-Progress Draft Recovery Banner */}
      {activeDraft && hasDraftContent(activeDraft) && (
        <div
          className="card"
          style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderLeft: '5px solid #22c55e',
            marginBottom: '1.25rem',
            padding: '0.85rem 1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <strong style={{ color: '#15803d', fontSize: '0.98rem' }}>
                📝 Resume In-Progress Draft: {activeDraft.studentName || 'Student'} {activeDraft.studentNumber ? `(#${activeDraft.studentNumber})` : ''}
              </strong>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.83rem', color: '#166534' }}>
                Autosaved {activeDraft.savedAt ? new Date(activeDraft.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'} · {activeDraft.mode === 'literary_analysis' ? 'Literary Analysis' : '5-Paragraph Essay'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '0.88rem', padding: '0.4rem 0.9rem', background: '#16a34a', borderColor: '#15803d' }}
                onClick={handleResumeActiveDraft}
              >
                ▶ Resume Draft
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.7rem' }}
                onClick={handleDismissActiveDraft}
                title="Dismiss and start fresh"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="card" aria-labelledby="teacher-access-setup-heading">
        {/* Previous heading: Teacher Dashboard Access. */}
        <h2 id="teacher-access-setup-heading">Dashboard passcode</h2>
        <p className="muted" style={{ marginBottom: '0.75rem' }}>
          To open Dashboard later and review saved essays or draft versions, set a passcode before students begin. Student work and drafts are saved locally whether or not a passcode is set; the passcode only gates Dashboard access. Changing or resetting the passcode does not delete saved essays or drafts. This is a casual privacy barrier, not strong security against someone who can inspect or change the browser app. After a forgotten-passcode reset, set a new code to protect Dashboard access again.
        </p>
        {accessConfigured && !showAccessSetup ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <strong style={{ color: 'var(--color-success)' }}>Passcode set on this device</strong>
            {accessMessage && <p role="status" style={{ color: 'var(--color-success)', width: '100%' }}>{accessMessage}</p>}
              {/* Changing the verifier leaves response and draft stores untouched. */}
              <button className="btn btn-secondary" type="button" onClick={() => { setShowAccessSetup(true); setAccessMessage(''); setAccessError('') }}>Change Dashboard passcode</button>
          </div>
        ) : (
          <form onSubmit={handleSaveTeacherPasscode} style={{ display: 'grid', gap: '0.75rem' }}>
            {accessConfigured && (
              <div>
                <label htmlFor="current-teacher-passcode">Current passcode</label>
                <input id="current-teacher-passcode" type="password" autoComplete="current-password" value={currentTeacherPasscode} onChange={event => setCurrentTeacherPasscode(event.target.value)} />
              </div>
            )}
            <div>
              <label htmlFor="new-teacher-passcode">{accessConfigured ? 'New passcode' : 'Create teacher passcode'}</label>
              <input id="new-teacher-passcode" type="password" autoComplete="new-password" minLength={6} value={newTeacherPasscode} onChange={event => setNewTeacherPasscode(event.target.value)} />
            </div>
            <div>
              <label htmlFor="confirm-teacher-passcode">Confirm passcode</label>
              <input id="confirm-teacher-passcode" type="password" autoComplete="new-password" value={confirmTeacherPasscode} onChange={event => setConfirmTeacherPasscode(event.target.value)} />
            </div>
            {accessError && <p className="error-msg" role="alert">{accessError}</p>}
            {accessMessage && <p role="status" style={{ color: 'var(--color-success)' }}>{accessMessage}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" type="submit" disabled={isSavingPasscode}>{isSavingPasscode ? 'Saving…' : 'Save dashboard passcode'}</button>
              {accessConfigured && <button className="btn btn-secondary" type="button" onClick={() => { setShowAccessSetup(false); setAccessError('') }}>Cancel</button>}
            </div>
          </form>
        )}
      </section>

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <label htmlFor="passage">Reading Passage for Students to Analyze <span className="muted">(optional)</span></label>
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
          This is the source reading students will compare with their own writing and use to select evidence; it is not a field for student drafts. Paste a text, upload a document, or leave blank for an open prompt. Text files load directly; scanned PDF and image OCR runs locally during development. You can also drag a file here.
        </p>
        <textarea
          id="passage"
          rows={8}
          value={passage}
          onChange={e => {
            setPassage(e.target.value)
            setErrors(v => ({ ...v, passage: null }))
          }}
          placeholder="Paste the source text students will analyze, or leave blank for an open prompt…"
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

      {/* Writing Prompt */}
      <div className="card">
        <label htmlFor="writing-prompt">
          Writing Prompt / Task <span className="muted">(optional)</span>
        </label>
        <p className="muted" style={{ marginBottom: '0.6rem' }}>
          The question or task students are responding to. Shown during writing to help students echo key words in their topic sentence.
        </p>
        <textarea
          id="writing-prompt"
          rows={3}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. Explain how the author uses [technique] to develop the idea that [central point]."
        />
      </div>

      {/* Response format */}
      <div className="card">
        <label>Response Format</label>
        <p className="muted" style={{ marginBottom: '0.6rem' }}>
          Choose how students will organize the three evidence sections.
        </p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <label
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              alignItems: 'start',
              gap: '0.5rem',
              cursor: 'pointer',
              fontWeight: mode === 'essay' ? 700 : 400,
            }}
          >
            <input
              type="radio"
              name="mode"
              value="essay"
              checked={mode === 'essay'}
              onChange={() => setMode('essay')}
            />
            <span>
              Essay: three different {labels.point.toLowerCase()}s, each supported by its own evidence and explanation.
            </span>
          </label>
          <label
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              alignItems: 'start',
              gap: '0.5rem',
              cursor: 'pointer',
              fontWeight: mode === 'literary_analysis' ? 700 : 400,
            }}
          >
            <input
              type="radio"
              name="mode"
              value="literary_analysis"
              checked={mode === 'literary_analysis'}
              onChange={() => setMode('literary_analysis')}
            />
            <span>
              Literary Analysis: one central {labels.point.toLowerCase()} repeated across three sections, with different evidence and explanations.
            </span>
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
        <div className="structure-labels-header">
          <div className="structure-labels-copy">
            <h3>Structure Labels</h3>
            <p className="muted">
              Currently: <strong>{labels.topicSentence}</strong> → <strong>{labels.link}</strong> + <strong>{labels.point}</strong> → <strong>{labels.example}</strong> → <strong>{labels.explanation}</strong> → <strong>{labels.concludingSentence}</strong>
            </p>
          </div>
          <button
            className="btn btn-secondary structure-labels-toggle"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
            onClick={() => setShowLabelEdit(v => !v)}
          >
            {showLabelEdit ? 'Done' : 'Customize'}
          </button>
        </div>

        {showLabelEdit && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { key: 'topicSentence', label: 'Topic Sentence' },
              { key: 'link', label: 'Link (transition word/phrase)' },
              { key: 'point', label: 'Point (claim)' },
              { key: 'example', label: 'Example (evidence/quote)' },
              { key: 'explanation', label: 'Explanation (analysis)' },
              { key: 'concludingSentence', label: 'Concluding Sentence' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label htmlFor={`label-${key}`}>{label}</label>
                <input
                  id={`label-${key}`}
                  type="text"
                  value={labels[key] || ''}
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
