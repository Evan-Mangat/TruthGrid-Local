import React, { useState, useEffect, useRef, useCallback } from 'react'
import { scoreSimilarity } from '../../utils/similarity'
import { saveDraftVersion } from '../../utils/draftHistory'
import { checkConventions } from '../../utils/conventionsChecker'
import EssayPlanning, {
  createEssayPlan,
  TransitionSelect,
  EvidenceLeadInControl,
  detectTransitions,
  checkEndsWithQuote,
} from './EssayPlanning'

const DRAFT_STORAGE_KEY = 'truthgrid_active_draft'
const SESSION_ID_STORAGE_KEY = 'truthgrid_session_id'

function emptyPoint() {
  return {
    link: '',
    point: '',
    example: '',
    explanation: '',
    transitionIntoParagraph: '',
    evidenceLeadInType1: 'transition',
    evidenceTransition1: '',
    quoteIntro1: '',
    evidenceLeadInType2: 'transition',
    evidenceTransition2: '',
    quoteIntro2: '',
    evidenceLeadInType3: 'transition',
    evidenceTransition3: '',
    quoteIntro3: '',
    example2: '',
    explanation2: '',
    example3: '',
    explanation3: '',
    paragraphConclusion: '',
    transitionAfterParagraph: '',
  }
}

function loadSavedDraft(numPoints) {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY) || localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.points) && parsed.points.length === numPoints) {
      return {
        ...parsed,
        topicSentence: parsed.topicSentence || '',
        sharedPoint: parsed.sharedPoint || '',
        concludingSentence: parsed.concludingSentence || '',
        points: parsed.points.map(p => ({ ...emptyPoint(), ...p })),
        essayPlan: { ...createEssayPlan(), ...(parsed.essayPlan || {}) },
      }
    }
  } catch (err) {
    console.warn('Could not load draft from storage:', err)
  }
  return null
}

export function getActiveDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY) || localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveDraftToStorage(draftData) {
  try {
    const serialized = JSON.stringify(draftData)
    sessionStorage.setItem(DRAFT_STORAGE_KEY, serialized)
    localStorage.setItem(DRAFT_STORAGE_KEY, serialized)
  } catch (err) {
    console.warn('Could not autosave draft to storage:', err)
  }
}

export function clearActiveDraft() {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY)
    localStorage.removeItem(DRAFT_STORAGE_KEY)
    sessionStorage.removeItem(SESSION_ID_STORAGE_KEY)
    localStorage.removeItem(SESSION_ID_STORAGE_KEY)
  } catch (err) {
    console.warn('Could not clear draft:', err)
  }
}

function createSecureSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16)
    globalThis.crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  return `${Date.now()}`
}

function getOrCreateSessionId() {
  try {
    const stored = sessionStorage.getItem(SESSION_ID_STORAGE_KEY) || localStorage.getItem(SESSION_ID_STORAGE_KEY)
    if (stored) return stored
    const id = createSecureSessionId()
    sessionStorage.setItem(SESSION_ID_STORAGE_KEY, id)
    localStorage.setItem(SESSION_ID_STORAGE_KEY, id)
    return id
  } catch {
    return createSecureSessionId()
  }
}

export default function StudentFlow({ session, onSubmit, onBack, onSessionUpdate }) {
  const { passage, studentName, studentNumber, labels, startedAt } = session
  const originalDocument = session.originalDocument
  const prompt = session.prompt || ''
  const numPoints = 3
  const isLiteraryAnalysis = session.mode === 'literary_analysis'
  const isEssay = !isLiteraryAnalysis

  // Initialize from saved draft if available, or empty points
  const savedDraft = loadSavedDraft(numPoints)
  const useDraft = savedDraft && savedDraft.studentName === studentName

  const [topicSentence, setTopicSentence] = useState(useDraft ? savedDraft.topicSentence : '')
  const [sharedPoint, setSharedPoint] = useState(useDraft ? savedDraft.sharedPoint || savedDraft.points[0]?.point || '' : '')
  const [concludingSentence, setConcludingSentence] = useState(useDraft ? savedDraft.concludingSentence : '')
  const [points, setPoints] = useState(() =>
    useDraft ? savedDraft.points : Array.from({ length: numPoints }, () => emptyPoint())
  )
  const [essayPlan, setEssayPlan] = useState(() => useDraft ? savedDraft.essayPlan : createEssayPlan())

  const [errors, setErrors] = useState({})
  const [passageExpanded, setPassageExpanded] = useState(true)

  // ── Edit Info panel state ──────────────────────────────────────────────────
  const [showEditInfo, setShowEditInfo] = useState(false)
  const [editName, setEditName] = useState('')
  const [editNumber, setEditNumber] = useState('')
  const [editPassage, setEditPassage] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [editInfoError, setEditInfoError] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [draftVersionCount, setDraftVersionCount] = useState(0)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [lastEditedStep, setLastEditedStep] = useState(isEssay ? 'Thesis Statement' : 'Topic Sentence')
  const [conventionsReport, setConventionsReport] = useState(null)
  const isSubmittingRef = useRef(false)
  const sessionIdRef = useRef(getOrCreateSessionId())
  const idleTimerRef = useRef(null)
  const lastVersionSnapshotRef = useRef(null)

  useEffect(() => {
    if (!originalDocument?.data) {
      setDocumentUrl('')
      return undefined
    }
    const url = URL.createObjectURL(new Blob([originalDocument.data], { type: originalDocument.type }))
    setDocumentUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [originalDocument])

  function buildSnapshot() {
    return { topicSentence, sharedPoint, concludingSentence, points, essayPlan, labels: session.labels }
  }

  const saveVersionSnapshot = useCallback(async (trigger, stepName) => {
    const snapshot = buildSnapshot()
    const snapshotKey = JSON.stringify(snapshot)
    if (snapshotKey === lastVersionSnapshotRef.current) return
    if (!topicSentence.trim() && !sharedPoint.trim() && !concludingSentence.trim() &&
      !points.some(p => p.link || p.point || p.example || p.explanation || p.example2 || p.explanation2 || p.example3 || p.explanation3) &&
      !essayPlan.ideas.some(idea => idea.text.trim()) && !essayPlan.mainIdeas.some(idea => idea.trim())) return
    setIsSavingDraft(true)
    try {
      await saveDraftVersion({
        sessionId: sessionIdRef.current,
        studentName,
        studentNumber: session.studentNumber,
        stepName: stepName || lastEditedStep,
        trigger,
        snapshot,
      })
      lastVersionSnapshotRef.current = snapshotKey
      setDraftVersionCount(c => c + 1)
    } catch (err) {
      console.warn('Could not save draft version:', err)
    } finally {
      setIsSavingDraft(false)
    }
  }, [topicSentence, sharedPoint, concludingSentence, points, essayPlan, session.labels, studentName, session.studentNumber, lastEditedStep])

  // Check if student has written anything
  const hasUnsavedContent =
    topicSentence.trim() ||
    sharedPoint.trim() ||
    concludingSentence.trim() ||
    points.some(p => p.link.trim() || p.point.trim() || p.example.trim() || p.explanation.trim() || p.example2.trim() || p.explanation2.trim() || p.example3.trim() || p.explanation3.trim() || p.paragraphConclusion.trim()) ||
    (isEssay && (essayPlan.ideas.some(idea => idea.text.trim()) || essayPlan.mainIdeas.some(idea => idea.trim()) || essayPlan.introSupport.some(sentence => sentence.trim())))

  // Reset idle-save timer on any content change
  useEffect(() => {
    if (!hasUnsavedContent) return
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      saveVersionSnapshot('idle')
    }, 30000)
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [topicSentence, sharedPoint, concludingSentence, points, essayPlan, hasUnsavedContent, saveVersionSnapshot])

  // 1. Protect against accidental page reload / navigation
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (!isSubmittingRef.current && hasUnsavedContent) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes in your writing. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedContent])

  // 2. Autosave draft locally whenever content changes
  useEffect(() => {
    if (hasUnsavedContent) {
      saveDraftToStorage({
        studentName,
        studentNumber,
        numPoints,
        topicSentence,
        sharedPoint,
        concludingSentence,
        points,
        essayPlan,
        mode: session.mode,
        passage: session.passage,
        prompt: session.prompt,
        labels: session.labels,
        savedAt: new Date().toISOString(),
      })
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
  }, [points, topicSentence, sharedPoint, concludingSentence, essayPlan, studentName, studentNumber, numPoints, hasUnsavedContent, session])

  function openEditInfo() {
    setEditName(studentName)
    setEditNumber(studentNumber || '')
    setEditPassage(passage)
    setEditPrompt(prompt)
    setEditInfoError('')
    setShowEditInfo(true)
  }

  function handleSaveEditInfo() {
    if (!editName.trim()) {
      setEditInfoError('Student name is required.')
      return
    }
    if (onSessionUpdate) {
      onSessionUpdate({
        studentName: editName.trim(),
        studentNumber: editNumber.trim(),
        passage: editPassage,
        prompt: editPrompt,
      })
    }
    setShowEditInfo(false)
    setEditInfoError('')
  }

  const handleBackToSetup = useCallback(() => {
    saveDraftToStorage({
      studentName,
      studentNumber,
      numPoints,
      topicSentence,
      sharedPoint,
      concludingSentence,
      points,
      essayPlan,
      mode: session.mode,
      passage: session.passage,
      prompt: session.prompt,
      labels: session.labels,
      savedAt: new Date().toISOString(),
    })
    if (onBack) onBack()
  }, [studentName, studentNumber, numPoints, topicSentence, sharedPoint, concludingSentence, points, essayPlan, session, onBack])

  function updateField(index, field, value) {
    setPoints(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
    setErrors(prev => {
      const e = { ...prev }
      delete e[`${index}-${field}`]
      return e
    })
    setLastEditedStep(`${labels[field] || field} — Section ${index + 1}`)
  }

  function validate() {
    const e = {}
    if (!topicSentence.trim()) {
      e.topicSentence = isEssay ? 'Thesis Statement (Sentence 1) is required.' : `${labels.topicSentence || 'Topic Sentence'} is required.`
    }

    if (isLiteraryAnalysis) {
      if (!sharedPoint.trim()) e.sharedPoint = `${labels.point} is required.`
      points.forEach((p, i) => {
        if (!p.example.trim()) e[`${i}-example`] = `${labels.example} ${i + 1} is required.`
        if (!p.explanation.trim()) e[`${i}-explanation`] = `${labels.explanation} ${i + 1} is required.`
      })
    } else {
      // Essay mode validations (Steps 1 & 2 brainstorm and main idea cards are optional)
      points.forEach((p, i) => {
        if (!p.transitionIntoParagraph?.trim()) {
          e[`transition-into-${i}`] = `Transition into Body Paragraph ${i + 1} is required.`
        }
        if (!p.point.trim()) e[`${i}-point`] = `Body Paragraph ${i + 1} assertion is required.`
        if (!p.example.trim()) e[`${i}-example`] = `Body Paragraph ${i + 1}, Evidence 1 is required.`
        if (!p.explanation.trim()) e[`${i}-explanation`] = `Body Paragraph ${i + 1}, Commentary 1 is required.`
        if (!p.example2.trim()) e[`${i}-example2`] = `Body Paragraph ${i + 1}, Evidence 2 is required.`
        if (!p.explanation2.trim()) e[`${i}-explanation2`] = `Body Paragraph ${i + 1}, Commentary 2 is required.`
        if (!p.example3.trim()) e[`${i}-example3`] = `Body Paragraph ${i + 1}, Evidence 3 is required.`
        if (!p.explanation3.trim()) e[`${i}-explanation3`] = `Body Paragraph ${i + 1}, Commentary 3 is required.`
        if (!p.paragraphConclusion.trim()) e[`${i}-paragraph-conclusion`] = `Body Paragraph ${i + 1} concluding sentence is required.`

        // Evidence lead-in validation: each set needs a transition word OR a quote attribution
        const needsLeadIn = (setNum, transitionVal, quoteVal, typeVal) => {
          const isQuoteMode = (typeVal || 'transition') === 'quote'
          return isQuoteMode ? !quoteVal?.trim() : !transitionVal?.trim()
        }
        if (needsLeadIn(1, p.evidenceTransition1, p.quoteIntro1, p.evidenceLeadInType1))
          e[`${i}-lead-in-1`] = `Body Paragraph ${i + 1}, Evidence Set 1: select a transition word or enter a quote attribution.`
        if (needsLeadIn(2, p.evidenceTransition2, p.quoteIntro2, p.evidenceLeadInType2))
          e[`${i}-lead-in-2`] = `Body Paragraph ${i + 1}, Evidence Set 2: select a transition word or enter a quote attribution.`
        if (needsLeadIn(3, p.evidenceTransition3, p.quoteIntro3, p.evidenceLeadInType3))
          e[`${i}-lead-in-3`] = `Body Paragraph ${i + 1}, Evidence Set 3: select a transition word or enter a quote attribution.`
      })
      if (!essayPlan.conclusionTransition?.trim()) {
        e.conclusionTransition = 'Transition into Conclusion is required.'
      }
      if (essayPlan.introSupport.some(sentence => !sentence.trim())) {
        e.introSupport = 'Complete introduction sentences 2, 3, and 4 to preview Main Ideas A, B, and C.'
      }
    }

    if (!concludingSentence.trim()) {
      e.concludingSentence = isEssay ? 'Conclusion paragraph is required.' : `${labels.concludingSentence || 'Concluding Sentence'} is required.`
    }
    return e
  }

  function runConventionsCheck() {
    const fullText = [
      topicSentence,
      ...points.map(p => [
        p.point,
        p.example,
        p.explanation,
        p.example2,
        p.explanation2,
        p.example3,
        p.explanation3,
        p.paragraphConclusion,
      ].filter(Boolean).join(' ')),
      concludingSentence,
    ].filter(Boolean).join('\n\n')

    const report = checkConventions(fullText)
    setConventionsReport(report)
  }

  function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }

    isSubmittingRef.current = true
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    saveVersionSnapshot('submit', 'Final Submission')

    const submittedPoints = isLiteraryAnalysis
      ? points.map(point => ({ ...point, point: sharedPoint }))
      : points

    const essayParagraphs = isEssay ? [
      // Paragraph 1: Introduction
      [
        topicSentence,
        essayPlan.introSupport[0],
        essayPlan.introSupport[1],
        essayPlan.introSupport[2],
      ].filter(Boolean).join(' '),

      // Paragraph 2: Body Paragraph 1 (Main Idea A)
      [
        submittedPoints[0].transitionIntoParagraph,
        submittedPoints[0].point,
        submittedPoints[0].evidenceLeadInType1 === 'quote' ? (submittedPoints[0].quoteIntro1 || submittedPoints[0].evidenceTransition1) : submittedPoints[0].evidenceTransition1,
        submittedPoints[0].example,
        submittedPoints[0].explanation,
        submittedPoints[0].evidenceLeadInType2 === 'quote' ? (submittedPoints[0].quoteIntro2 || submittedPoints[0].evidenceTransition2) : submittedPoints[0].evidenceTransition2,
        submittedPoints[0].example2,
        submittedPoints[0].explanation2,
        submittedPoints[0].evidenceLeadInType3 === 'quote' ? (submittedPoints[0].quoteIntro3 || submittedPoints[0].evidenceTransition3) : submittedPoints[0].evidenceTransition3,
        submittedPoints[0].example3,
        submittedPoints[0].explanation3,
        submittedPoints[0].paragraphConclusion,
        submittedPoints[0].transitionAfterParagraph,
      ].filter(Boolean).join(' '),

      // Paragraph 3: Body Paragraph 2 (Main Idea B)
      [
        submittedPoints[1].transitionIntoParagraph,
        submittedPoints[1].point,
        submittedPoints[1].evidenceLeadInType1 === 'quote' ? (submittedPoints[1].quoteIntro1 || submittedPoints[1].evidenceTransition1) : submittedPoints[1].evidenceTransition1,
        submittedPoints[1].example,
        submittedPoints[1].explanation,
        submittedPoints[1].evidenceLeadInType2 === 'quote' ? (submittedPoints[1].quoteIntro2 || submittedPoints[1].evidenceTransition2) : submittedPoints[1].evidenceTransition2,
        submittedPoints[1].example2,
        submittedPoints[1].explanation2,
        submittedPoints[1].evidenceLeadInType3 === 'quote' ? (submittedPoints[1].quoteIntro3 || submittedPoints[1].evidenceTransition3) : submittedPoints[1].evidenceTransition3,
        submittedPoints[1].example3,
        submittedPoints[1].explanation3,
        submittedPoints[1].paragraphConclusion,
        submittedPoints[1].transitionAfterParagraph,
      ].filter(Boolean).join(' '),

      // Paragraph 4: Body Paragraph 3 (Main Idea C)
      [
        submittedPoints[2].transitionIntoParagraph,
        submittedPoints[2].point,
        submittedPoints[2].evidenceLeadInType1 === 'quote' ? (submittedPoints[2].quoteIntro1 || submittedPoints[2].evidenceTransition1) : submittedPoints[2].evidenceTransition1,
        submittedPoints[2].example,
        submittedPoints[2].explanation,
        submittedPoints[2].evidenceLeadInType2 === 'quote' ? (submittedPoints[2].quoteIntro2 || submittedPoints[2].evidenceTransition2) : submittedPoints[2].evidenceTransition2,
        submittedPoints[2].example2,
        submittedPoints[2].explanation2,
        submittedPoints[2].evidenceLeadInType3 === 'quote' ? (submittedPoints[2].quoteIntro3 || submittedPoints[2].evidenceTransition3) : submittedPoints[2].evidenceTransition3,
        submittedPoints[2].example3,
        submittedPoints[2].explanation3,
        submittedPoints[2].paragraphConclusion,
        submittedPoints[2].transitionAfterParagraph,
      ].filter(Boolean).join(' '),

      // Paragraph 5: Conclusion
      [
        essayPlan.conclusionTransition,
        concludingSentence,
      ].filter(Boolean).join(' '),
    ] : null

    const fullResponse = essayParagraphs
      ? essayParagraphs.join('\n\n')
      : [topicSentence, ...submittedPoints.map(p => [p.link, p.point, p.example, p.explanation].filter(Boolean).join(' ')), concludingSentence].filter(Boolean).join(' ')

    const similarityScores = submittedPoints.map(p => ({
      pointScore: scoreSimilarity(p.point, passage),
      exampleScore: scoreSimilarity([p.example, p.example2, p.example3].filter(Boolean).join(' '), passage),
      explanationScore: scoreSimilarity([p.explanation, p.explanation2, p.explanation3].filter(Boolean).join(' '), passage),
    }))
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`

    onSubmit({
      id,
      studentName,
      studentNumber: session.studentNumber,
      passage,
      prompt,
      originalDocument,
      topicSentence,
      essayPlan: isEssay ? essayPlan : null,
      sharedPoint: isLiteraryAnalysis ? sharedPoint : '',
      concludingSentence,
      points: submittedPoints,
      fullResponse,
      numPoints,
      mode: session.mode || 'essay',
      similarityScores,
      startedAt: startedAt || new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      labels: session.labels,
    })
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
              onClick={handleBackToSetup}
              title="Return to setup"
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
            onClick={openEditInfo}
            title="Edit student name, number, reading passage, or writing prompt"
          >
            ✏️ Edit Info
          </button>
          <div>
            <h1 style={{ margin: 0 }}>{isLiteraryAnalysis ? 'Literary Analysis' : 'Essay'}</h1>
            <p className="muted" style={{ margin: '0.15rem 0 0' }}>
              {studentName} {studentNumber ? `(#${studentNumber})` : ''}
              {!(passage && passage.trim()) && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', background: '#eceff1', color: '#455a64', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                  Open Prompt Mode
                </span>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {lastSavedAt && (
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--color-success)',
              background: 'rgba(46, 125, 50, 0.1)',
              padding: '0.25rem 0.6rem',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 500,
            }}>
              <span>●</span> Autosaved at {lastSavedAt}
            </div>
          )}
          {draftVersionCount > 0 && (
            <p className="muted" role="status" style={{ fontSize: '0.8rem' }}>
              Saved draft versions are available in Dashboard → Draft History.
            </p>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}
            disabled={isSavingDraft || !hasUnsavedContent}
            onClick={() => saveVersionSnapshot('manual')}
            title="Save a version of your current draft for the teacher to review"
          >
            {isSavingDraft ? 'Saving…' : draftVersionCount > 0 ? `Save Draft (${draftVersionCount} saved)` : 'Save Draft'}
          </button>
        </div>
      </div>

      {/* ── Edit Info Panel ────────────────────────────────────────────────── */}
      {showEditInfo && (
        <div
          className="card"
          aria-labelledby="edit-info-heading"
          style={{
            borderLeft: '4px solid #0284c7',
            marginBottom: '1rem',
            background: '#f0f9ff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 id="edit-info-heading" style={{ margin: 0, color: '#0369a1' }}>✏️ Edit Session Info</h3>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
              onClick={() => setShowEditInfo(false)}
            >
              Cancel ✕
            </button>
          </div>

          <p className="muted" style={{ marginBottom: '1rem', fontSize: '0.88rem' }}>
            Changes apply immediately to this writing session. Your essay content is not affected.
          </p>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {/* Student Name */}
            <div>
              <label htmlFor="sf-edit-name" style={{ fontWeight: 600 }}>
                Student Name <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>*</span>
              </label>
              <input
                id="sf-edit-name"
                type="text"
                value={editName}
                onChange={e => { setEditName(e.target.value); setEditInfoError('') }}
                placeholder="e.g. Alex Morgan"
                autoComplete="off"
                style={{ marginTop: '0.3rem', display: 'block', width: '100%' }}
              />
            </div>

            {/* Student Number */}
            <div>
              <label htmlFor="sf-edit-number" style={{ fontWeight: 600 }}>
                Student Number <span className="muted">(optional)</span>
              </label>
              <input
                id="sf-edit-number"
                type="text"
                value={editNumber}
                onChange={e => setEditNumber(e.target.value)}
                placeholder="e.g. 123456"
                autoComplete="off"
                style={{ marginTop: '0.3rem', display: 'block', width: '100%' }}
              />
            </div>

            {/* Reading Passage */}
            <div>
              <label htmlFor="sf-edit-passage" style={{ fontWeight: 600 }}>
                Reading Passage <span className="muted">(optional — leave blank for open prompt)</span>
              </label>
              <textarea
                id="sf-edit-passage"
                rows={6}
                value={editPassage}
                onChange={e => setEditPassage(e.target.value)}
                placeholder="Paste the source text students will analyze, or leave blank for an open prompt…"
                style={{ marginTop: '0.3rem', display: 'block', width: '100%' }}
              />
            </div>

            {/* Writing Prompt */}
            <div>
              <label htmlFor="sf-edit-prompt" style={{ fontWeight: 600 }}>
                Writing Prompt / Task <span className="muted">(optional)</span>
              </label>
              <textarea
                id="sf-edit-prompt"
                rows={2}
                value={editPrompt}
                onChange={e => setEditPrompt(e.target.value)}
                placeholder="e.g. Explain how the author uses [technique] to develop the idea that [central point]."
                style={{ marginTop: '0.3rem', display: 'block', width: '100%' }}
              />
            </div>
          </div>

          {editInfoError && (
            <p className="error-msg" role="alert" style={{ marginTop: '0.75rem' }}>
              {editInfoError}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '0.5rem 1.1rem' }}
              onClick={handleSaveEditInfo}
            >
              Save Changes
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowEditInfo(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reading passage (only if reference passage was assigned) */}
      {passage && passage.trim() ? (
        <div className="card">
          <button
            type="button"
            aria-expanded={passageExpanded}
            aria-controls="student-reading-passage"
            onClick={() => setPassageExpanded(value => !value)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
          >
            <h3>Assigned Reading Passage</h3>
            <span className="muted" style={{ fontSize: '0.85rem' }}>{passageExpanded ? 'Hide ▲' : 'Show ▼'}</span>
          </button>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            This is the source text to analyze and compare with your own writing. It is not a place to enter your draft; use it to choose brief evidence that supports your argument.
          </p>
          <p id="student-reading-passage" hidden={!passageExpanded} style={{ marginTop: '0.75rem', whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>{passage}</p>
        </div>
      ) : null}

      {originalDocument && documentUrl && (
        <section className="card" aria-labelledby="scan-reference-heading">
          <h3 id="scan-reference-heading">Original Scan Reference</h3>
          <p className="muted" style={{ marginBottom: '0.75rem' }}>
            OCR can misread words or punctuation. Double-check the extracted passage against this original scan before using it as evidence.
          </p>
          <a href={documentUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginBottom: '0.75rem' }}>
            Open original file: {originalDocument.name}
          </a>
          {originalDocument.type === 'application/pdf' ? (
            <iframe
              title={`Original scan: ${originalDocument.name}`}
              src={documentUrl}
              style={{ display: 'block', width: '100%', height: 'min(70vh, 720px)', border: '1px solid var(--color-border)' }}
            />
          ) : (
            <img
              src={documentUrl}
              alt={`Original scanned passage: ${originalDocument.name}`}
              style={{ display: 'block', maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', border: '1px solid var(--color-border)' }}
            />
          )}
        </section>
      )}

      {/* =========================================================================
          ESSAY MODE: Renders Ms. Kwan's Essay Planner & 5-Paragraph Outline
          ========================================================================= */}
      {isEssay && (
        <>
          <EssayPlanning
            plan={essayPlan}
            onChange={setEssayPlan}
            thesis={topicSentence}
            onThesisChange={val => {
              setTopicSentence(val)
              setLastEditedStep('Thesis Statement')
              setErrors(prev => { const n = { ...prev }; delete n.topicSentence; return n })
            }}
            prompt={prompt}
            errors={errors}
          />

          {/* Body Paragraphs 1, 2, and 3 */}
          {points.map((p, i) => {
            const letter = String.fromCharCode(65 + i)
            const mainIdeaName = essayPlan.mainIdeas[i] || ''
            const groupCards = (essayPlan.ideas || []).filter(idea => idea.group === letter)
            const pointDetected = detectTransitions(p.point)
            const conclusionDetected = detectTransitions(p.paragraphConclusion)
            const endsWithQuote = checkEndsWithQuote(p.paragraphConclusion)
            const borderColor = i === 0 ? '#16a34a' : i === 1 ? '#d97706' : '#0284c7'

            return (
              <div
                className="card"
                key={i}
                style={{
                  borderLeft: `5px solid ${borderColor}`,
                  borderRadius: 8,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <h2 style={{ color: 'var(--color-accent)', margin: 0 }}>
                    Body Paragraph {i + 1}: {i === 0 ? '1st' : i === 1 ? '2nd' : '3rd'} Main Point (Group {letter})
                  </h2>
                  <span className="badge" style={{ fontSize: '0.85rem', fontWeight: 600, background: '#f1f5f9', color: '#1e293b', padding: '0.2rem 0.6rem', borderRadius: 6 }}>
                    Main Idea {letter}: {mainIdeaName || '(Unlabeled in Step 2)'}
                  </span>
                </div>

                {groupCards.length > 0 && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: '0.85rem', fontSize: '0.82rem' }}>
                    <strong>Brainstormed details for Group {letter}:</strong> {groupCards.map(c => c.text).join(' · ')}
                  </div>
                )}

                {/* Transition into paragraph */}
                <TransitionSelect
                  id={`transition-into-${i}`}
                  label={`Transition into Body Paragraph ${i + 1}`}
                  value={p.transitionIntoParagraph}
                  onChange={val => {
                    updateField(i, 'transitionIntoParagraph', val)
                    setErrors(prev => { const n = { ...prev }; delete n[`transition-into-${i}`]; return n })
                  }}
                  placeholder="Choose an introductory/linking transition (e.g. Furthermore, In contrast, To illustrate)"
                />
                {errors[`transition-into-${i}`] && <p className="error-msg">{errors[`transition-into-${i}`]}</p>}

                {/* Assertion / Topic Sentence */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                    <label htmlFor={`point-${i}`} style={{ fontWeight: 700 }}>
                      Assertion: Topic Sentence (Topic + Opinion)
                    </label>
                    {pointDetected.length > 0 && (
                      <span className="essay-transition-badge">
                        ✓ {pointDetected[0].phrase} ({pointDetected[0].category})
                      </span>
                    )}
                  </div>
                  <p className="muted" style={{ marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                    Must contain the topic of the paragraph and the opinion being supported (develops Main Idea {letter}).
                  </p>
                  <textarea
                    id={`point-${i}`}
                    rows={2}
                    spellCheck={true}
                    value={p.point}
                    onChange={e => updateField(i, 'point', e.target.value)}
                    placeholder={`e.g. State the assertion for ${mainIdeaName ? `"${mainIdeaName}"` : `Group ${letter}`} with the topic and opinion…`}
                  />
                  {errors[`${i}-point`] && <p className="error-msg">{errors[`${i}-point`]}</p>}
                </div>

                {/* Evidence & Commentary Slots (3 Sets per Ms. Kwan's Handout) */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.02rem', marginBottom: '0.25rem', color: '#1e293b' }}>
                    Evidence & Commentary (3 Required Evidence Sets)
                  </h3>
                  <p className="muted" style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
                    Choose either a transition word or an author attribution quote lead-in for each piece of evidence. Explain each with commentary relating back to your thesis.
                  </p>

                  {/* SET 1 */}
                  <div className="essay-evidence-unit" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.85rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      <span className="essay-step-number" style={{ width: '1.6rem', height: '1.6rem', fontSize: '0.85rem' }}>1</span>
                      <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>Evidence Set 1</strong>
                    </div>

                    <EvidenceLeadInControl
                      idPrefix={`evidence-1-${i}`}
                      label="Evidence 1 Lead-In"
                      leadInType={p.evidenceLeadInType1 || 'transition'}
                      transitionValue={p.evidenceTransition1}
                      quoteIntroValue={p.quoteIntro1}
                      onTypeChange={type => updateField(i, 'evidenceLeadInType1', type)}
                      onTransitionChange={val => updateField(i, 'evidenceTransition1', val)}
                      onQuoteIntroChange={val => updateField(i, 'quoteIntro1', val)}
                    />
                    {errors[`${i}-lead-in-1`] && <p className="error-msg">{errors[`${i}-lead-in-1`]}</p>}

                    <div className="essay-evidence-grid">
                      <div>
                        <label htmlFor={`example-${i}`} style={{ fontWeight: 600 }}>
                          Evidence 1: Quote or Paraphrase
                        </label>
                        <p className="muted" style={{ fontSize: '0.78rem', margin: '0.2rem 0 0.35rem' }}>
                          Provide relevant and specific evidence from the text.
                        </p>
                        <textarea
                          id={`example-${i}`}
                          rows={2}
                          spellCheck={true}
                          value={p.example}
                          onChange={e => updateField(i, 'example', e.target.value)}
                          placeholder="e.g. “This moment in the story reveals…”"
                        />
                        {errors[`${i}-example`] && <p className="error-msg">{errors[`${i}-example`]}</p>}
                      </div>
                      <div>
                        <label htmlFor={`explanation-${i}`} style={{ fontWeight: 600 }}>
                          Commentary 1: Relates Back to Thesis
                        </label>
                        <p className="muted" style={{ fontSize: '0.78rem', margin: '0.2rem 0 0.35rem' }}>
                          Show how this evidence relates back to your thesis or overall view.
                        </p>
                        <textarea
                          id={`explanation-${i}`}
                          rows={2}
                          spellCheck={true}
                          value={p.explanation}
                          onChange={e => updateField(i, 'explanation', e.target.value)}
                          placeholder="e.g. This indicates [meaning], reinforcing the central thesis because [reason]…"
                        />
                        {errors[`${i}-explanation`] && <p className="error-msg">{errors[`${i}-explanation`]}</p>}
                      </div>
                    </div>
                  </div>

                  {/* SET 2 */}
                  <div className="essay-evidence-unit" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.85rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      <span className="essay-step-number" style={{ width: '1.6rem', height: '1.6rem', fontSize: '0.85rem' }}>2</span>
                      <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>Evidence Set 2</strong>
                    </div>

                    <EvidenceLeadInControl
                      idPrefix={`evidence-2-${i}`}
                      label="Evidence 2 Lead-In"
                      leadInType={p.evidenceLeadInType2 || 'transition'}
                      transitionValue={p.evidenceTransition2}
                      quoteIntroValue={p.quoteIntro2}
                      onTypeChange={type => updateField(i, 'evidenceLeadInType2', type)}
                      onTransitionChange={val => updateField(i, 'evidenceTransition2', val)}
                      onQuoteIntroChange={val => updateField(i, 'quoteIntro2', val)}
                    />
                    {errors[`${i}-lead-in-2`] && <p className="error-msg">{errors[`${i}-lead-in-2`]}</p>}

                    <div className="essay-evidence-grid">
                      <div>
                        <label htmlFor={`example2-${i}`} style={{ fontWeight: 600 }}>
                          Evidence 2: Quote or Paraphrase
                        </label>
                        <textarea
                          id={`example2-${i}`}
                          rows={2}
                          spellCheck={true}
                          value={p.example2}
                          onChange={e => updateField(i, 'example2', e.target.value)}
                          placeholder="e.g. Later, the text demonstrates that “…”"
                        />
                        {errors[`${i}-example2`] && <p className="error-msg">{errors[`${i}-example2`]}</p>}
                      </div>
                      <div>
                        <label htmlFor={`explanation2-${i}`} style={{ fontWeight: 600 }}>
                          Commentary 2: Relates Back to Thesis
                        </label>
                        <textarea
                          id={`explanation2-${i}`}
                          rows={2}
                          spellCheck={true}
                          value={p.explanation2}
                          onChange={e => updateField(i, 'explanation2', e.target.value)}
                          placeholder="e.g. This detail furthers the argument by showing [insight]…"
                        />
                        {errors[`${i}-explanation2`] && <p className="error-msg">{errors[`${i}-explanation2`]}</p>}
                      </div>
                    </div>
                  </div>

                  {/* SET 3 */}
                  <div className="essay-evidence-unit" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      <span className="essay-step-number" style={{ width: '1.6rem', height: '1.6rem', fontSize: '0.85rem' }}>3</span>
                      <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>Evidence Set 3</strong>
                    </div>

                    <EvidenceLeadInControl
                      idPrefix={`evidence-3-${i}`}
                      label="Evidence 3 Lead-In"
                      leadInType={p.evidenceLeadInType3 || 'transition'}
                      transitionValue={p.evidenceTransition3}
                      quoteIntroValue={p.quoteIntro3}
                      onTypeChange={type => updateField(i, 'evidenceLeadInType3', type)}
                      onTransitionChange={val => updateField(i, 'evidenceTransition3', val)}
                      onQuoteIntroChange={val => updateField(i, 'quoteIntro3', val)}
                    />
                    {errors[`${i}-lead-in-3`] && <p className="error-msg">{errors[`${i}-lead-in-3`]}</p>}

                    <div className="essay-evidence-grid">
                      <div>
                        <label htmlFor={`example3-${i}`} style={{ fontWeight: 600 }}>
                          Evidence 3: Quote or Paraphrase
                        </label>
                        <textarea
                          id={`example3-${i}`}
                          rows={2}
                          spellCheck={true}
                          value={p.example3}
                          onChange={e => updateField(i, 'example3', e.target.value)}
                          placeholder="e.g. In the final scene, “…”"
                        />
                        {errors[`${i}-example3`] && <p className="error-msg">{errors[`${i}-example3`]}</p>}
                      </div>
                      <div>
                        <label htmlFor={`explanation3-${i}`} style={{ fontWeight: 600 }}>
                          Commentary 3: Relates Back to Thesis
                        </label>
                        <textarea
                          id={`explanation3-${i}`}
                          rows={2}
                          spellCheck={true}
                          value={p.explanation3}
                          onChange={e => updateField(i, 'explanation3', e.target.value)}
                          placeholder="e.g. This conclusively proves [connection back to overall thesis]…"
                        />
                        {errors[`${i}-explanation3`] && <p className="error-msg">{errors[`${i}-explanation3`]}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paragraph Concluding Sentence */}
                <div className="essay-body-conclusion">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                    <label htmlFor={`paragraph-conclusion-${i}`} style={{ fontWeight: 700 }}>
                      Concluding Sentence for Body Paragraph {i + 1}
                    </label>
                    {conclusionDetected.length > 0 && (
                      <span className="essay-transition-badge">
                        ✓ {conclusionDetected[0].phrase} ({conclusionDetected[0].category})
                      </span>
                    )}
                  </div>
                  <p className="muted" style={{ fontSize: '0.84rem', margin: '0.2rem 0 0.4rem' }}>
                    Should summarize the thesis of your topic sentence while incorporating the supporting evidence and wrap things up. <strong>Never end with a quotation.</strong> Explain the evidence you have presented; echo the claim made in the beginning of the paragraph.
                  </p>
                  <textarea
                    id={`paragraph-conclusion-${i}`}
                    rows={2}
                    spellCheck={true}
                    value={p.paragraphConclusion}
                    onChange={e => updateField(i, 'paragraphConclusion', e.target.value)}
                    placeholder="e.g. Ultimately, through these instances [echo the claim and wrap up evidence without a quote]…"
                  />
                  {endsWithQuote && (
                    <p className="error-msg" role="alert" style={{ fontWeight: 600 }}>
                      ⚠️ Reminder: Never end a concluding sentence with a quotation. Wrap things up by explaining the evidence in your own words.
                    </p>
                  )}
                  {errors[`${i}-paragraph-conclusion`] && <p className="error-msg">{errors[`${i}-paragraph-conclusion`]}</p>}
                </div>
              </div>
            )
          })}

          {/* Conclusion Paragraph (Paragraph 5) */}
          <div className="card" style={{ borderLeft: '5px solid #287a56' }}>
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--color-accent)' }}>
              Conclusion (Paragraph 5)
            </h2>
            <TransitionSelect
              id="conclusion-transition"
              label="Transition into Conclusion"
              value={essayPlan.conclusionTransition}
              onChange={val => {
                setEssayPlan(prev => ({ ...prev, conclusionTransition: val }))
                setErrors(prev => { const n = { ...prev }; delete n.conclusionTransition; return n })
              }}
              placeholder="Choose a conclusion transition (e.g. Ultimately, In conclusion, In the final analysis)"
              isConclusion={true}
            />
            {errors.conclusionTransition && <p className="error-msg">{errors.conclusionTransition}</p>}

            <label htmlFor="concluding-sentence" style={{ fontWeight: 700, marginTop: '0.5rem', display: 'block' }}>
              Conclusion: Echo Thesis & Big Idea / So What?
            </label>
            <p className="muted" style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              Try to wrap up the essay by echoing the thesis; by commenting in general about what you learned or the big idea that the author was conveying. What was relevant about the topic? What was the message? Call to action? <strong>SO WHAT? What is the relevance of the theme to our lives?</strong>
            </p>
            <textarea
              id="concluding-sentence"
              rows={4}
              spellCheck={true}
              value={concludingSentence}
              onChange={e => {
                setConcludingSentence(e.target.value)
                setLastEditedStep('Conclusion')
                setErrors(prev => { const ne = { ...prev }; delete ne.concludingSentence; return ne })
              }}
              placeholder="Echo the thesis without repeating it word-for-word, revisit your 3 main ideas, and address: So what? Why does this theme matter to humanity?"
            />
            {errors.concludingSentence && <p className="error-msg">{errors.concludingSentence}</p>}
          </div>
        </>
      )}

      {/* =========================================================================
          LITERARY ANALYSIS MODE: Keeps original single-paragraph PEEL structure
          ========================================================================= */}
      {isLiteraryAnalysis && (
        <>
          <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
            <label htmlFor="shared-point">Central {labels.point}</label>
            <p className="muted" style={{ marginBottom: '0.5rem' }}>
              Write your main {labels.point.toLowerCase()} once. It will appear in all three sections; each section should use different evidence and explanation.
            </p>
            <textarea
              id="shared-point"
              rows={2}
              value={sharedPoint}
              onChange={event => {
                setSharedPoint(event.target.value)
                setLastEditedStep(`Central ${labels.point}`)
                setErrors(previous => { const next = { ...previous }; delete next.sharedPoint; return next })
              }}
              placeholder={`e.g. [Topic or technique] reveals [your central idea].`}
            />
            {errors.sharedPoint && <p className="error-msg">{errors.sharedPoint}</p>}
          </div>

          {/* Topic Sentence */}
          <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--color-accent)' }}>
              {labels.topicSentence || 'Topic Sentence'}
            </h2>
            {prompt && (
              <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.6rem 0.8rem', marginBottom: '0.75rem' }}>
                <p className="muted" style={{ fontSize: '0.8rem', marginBottom: '0.2rem', fontWeight: 600 }}>Writing Prompt:</p>
                <p style={{ fontSize: '0.95rem', fontStyle: 'italic' }}>{prompt}</p>
              </div>
            )}
            <p className="muted" style={{ marginBottom: '0.5rem' }}>
              Use <strong>TAG</strong>: refer to the <strong>T</strong>itle, <strong>A</strong>uthor, and <strong>G</strong>enre of the text, then introduce your central point. Echo the key words of the writing prompt above.
            </p>
            <p className="muted" style={{ marginBottom: '0.5rem' }}>
              Your topic sentence should answer the writing prompt with an arguable idea, not just announce the subject. For example, for “How does Nia change?”: <em>In the short story “The Last Lantern,” A. Rivera shows Nia changing from avoiding responsibility to protecting her community, suggesting that courage grows when people act for others.</em>
            </p>
            <textarea
              id="topic-sentence"
              rows={2}
              spellCheck={true}
              value={topicSentence}
              onChange={e => {
                setTopicSentence(e.target.value)
                setLastEditedStep(labels.topicSentence || 'Topic Sentence')
                setErrors(prev => { const ne = { ...prev }; delete ne.topicSentence; return ne })
              }}
              placeholder="e.g. In [title], [author] uses [technique] to develop the idea that [central point]."
            />
            {errors.topicSentence && <p className="error-msg">{errors.topicSentence}</p>}
          </div>

          {/* Structured points (PEEL) */}
          {points.map((p, i) => (
            <div className="card" key={i}>
              <h2 style={{ marginBottom: '1rem', color: 'var(--color-accent)' }}>
                {labels.point} {i + 1} of {numPoints}
              </h2>

              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor={`link-${i}`}>{labels.link || 'Link'}</label>
                <p className="muted" style={{ marginBottom: '0.4rem' }}>
                  Connect this section to the last one. You can use a transition (<em>For example, Furthermore</em>), weave context or a short quote into your sentence, or link ideas through a logical shift from [earlier detail] to [next detail].
                </p>
                <textarea
                  id={`link-${i}`}
                  rows={2}
                  spellCheck={true}
                  value={p.link}
                  onChange={e => updateField(i, 'link', e.target.value)}
                  placeholder="e.g. For instance, [introduce the next related idea]…"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor={`point-${i}`}>{labels.point}</label>
                <p style={{ padding: '0.6rem 0.8rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', whiteSpace: 'pre-wrap' }}>
                  {sharedPoint || `Your central ${labels.point.toLowerCase()} will appear here.`}
                </p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor={`example-${i}`}>{labels.example}</label>
                <p className="muted" style={{ marginBottom: '0.4rem' }}>
                  Set the moment in the text and connect it to your point: what is happening, and why does this moment support your argument? Choose only the most useful words; aim for a quote of about 8 words or fewer. Blend it into your sentence: <em>When [brief event], [character] says, “[short quote],” revealing [connection to your point].</em>
                </p>
                <textarea
                  id={`example-${i}`}
                  rows={2}
                  spellCheck={true}
                  value={p.example}
                  onChange={e => updateField(i, 'example', e.target.value)}
                  placeholder="e.g. When [text context], [character] says, ‘[brief, relevant quote]’…"
                />
                {errors[`${i}-example`] && <p className="error-msg">{errors[`${i}-example`]}</p>}
              </div>

              <div>
                <label htmlFor={`explanation-${i}`}>{labels.explanation}</label>
                <p className="muted" style={{ marginBottom: '0.4rem' }}>
                  Zoom in on a specific word or phrase. Explain what it suggests, how the figurative language works (if present), and how that exact detail supports your {labels.point.toLowerCase()}. Do more than repeat the quote: <em>The word “[word]” suggests [meaning], which supports my point because [reason].</em>
                </p>
                <textarea
                  id={`explanation-${i}`}
                  rows={3}
                  spellCheck={true}
                  value={p.explanation}
                  onChange={e => updateField(i, 'explanation', e.target.value)}
                  placeholder="e.g. This detail suggests [what it reveals], supporting the idea that [restate your point]."
                />
                {errors[`${i}-explanation`] && <p className="error-msg">{errors[`${i}-explanation`]}</p>}
              </div>
            </div>
          ))}

          {/* Concluding Sentence */}
          <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--color-accent)' }}>
              {labels.concludingSentence || 'Concluding Sentence'}
            </h2>
            <p className="muted" style={{ marginBottom: '0.5rem' }}>
              Restate your central idea in a fresh way and explain why it matters beyond the evidence.
              <span style={{ display: 'block', marginTop: '0.25rem', fontStyle: 'italic' }}>
                Example finish: <em>A society shaped by [factor] may sacrifice genuine human connection and lose the empathy that makes a society truly human.</em>
              </span>
            </p>
            <textarea
              id="concluding-sentence"
              rows={2}
              spellCheck={true}
              value={concludingSentence}
              onChange={e => {
                setConcludingSentence(e.target.value)
                setLastEditedStep(labels.concludingSentence || 'Concluding Sentence')
                setErrors(prev => { const ne = { ...prev }; delete ne.concludingSentence; return ne })
              }}
              placeholder="Write your concluding sentence here…"
            />
            {errors.concludingSentence && <p className="error-msg">{errors.concludingSentence}</p>}
          </div>
        </>
      )}

      {/* =========================================================================
          Final Conventions Check & On-Device Style Assistant
          ========================================================================= */}
      <section className="card" aria-labelledby="conventions-check-heading">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <h2 id="conventions-check-heading" style={{ margin: 0 }}>Final Conventions Check</h2>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', fontWeight: 600 }}
            onClick={runConventionsCheck}
            title="Scan your draft for literary present tense, 3rd person, and sentence completeness"
          >
            🔍 Run Conventions Check (On-Device)
          </button>
        </div>

        <p className="muted" style={{ marginBottom: '0.65rem' }}>
          Before submitting, reread your response and check standard conventions:
        </p>
        <ul style={{ fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          <li><strong>Use literary present tense:</strong> When writing about the text, use present tense: “Nia realizes,” not “Nia realized.”</li>
          <li><strong>Use third person:</strong> Avoid “I,” “you,” and “we” in your analysis.</li>
          <li><strong>Sentence completeness:</strong> Check that sentences are complete, words agree, and punctuation is clear. Read your work aloud if it helps.</li>
          <li><strong>Spelling:</strong> Use your browser’s spelling suggestions where available.</li>
        </ul>

        {/* Live On-Device Conventions Feedback */}
        {conventionsReport && (
          <div className="conventions-feedback-box" style={{ background: conventionsReport.hasIssues ? '#fffbeb' : '#f0fdf4', border: `1px solid ${conventionsReport.hasIssues ? '#fde68a' : '#bbf7d0'}`, borderRadius: 8, padding: '0.85rem', marginTop: '0.75rem' }}>
            <h4 style={{ margin: '0 0 0.4rem', color: conventionsReport.hasIssues ? '#92400e' : '#166534', fontSize: '0.95rem' }}>
              {conventionsReport.hasIssues ? '💡 Conventions & Style Suggestions:' : '✓ Excellent Work! No conventions issues detected.'}
            </h4>

            {conventionsReport.hasIssues ? (
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.86rem', lineHeight: 1.55 }}>
                {conventionsReport.tenseIssues.map((issue, idx) => (
                  <li key={`tense-${idx}`} style={{ color: '#78350f', marginBottom: '0.2rem' }}>
                    <strong>Literary Present Tense:</strong> {issue.message}
                  </li>
                ))}
                {conventionsReport.pronounIssues.map((issue, idx) => (
                  <li key={`pronoun-${idx}`} style={{ color: '#78350f', marginBottom: '0.2rem' }}>
                    <strong>Third-Person Perspective:</strong> {issue.message}
                  </li>
                ))}
                {conventionsReport.academicToneIssues?.map((issue, idx) => (
                  <li key={`tone-${idx}`} style={{ color: '#78350f', marginBottom: '0.2rem' }}>
                    <strong>
                      {issue.type === 'vague-pronoun' ? 'Vague Pronoun Reference:'
                        : issue.type === 'subject-verb' ? 'Subject-Verb Agreement:'
                        : 'Academic Tone & Style:'}
                    </strong>{' '}
                    {issue.message}
                  </li>
                ))}
                {conventionsReport.punctuationIssues.map((issue, idx) => (
                  <li key={`punct-${idx}`} style={{ color: '#78350f', marginBottom: '0.2rem' }}>
                    <strong>Punctuation / Completeness:</strong> {issue.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534' }}>
                Your response correctly uses third-person perspective and literary present tense, with clear punctuation.
              </p>
            )}
          </div>
        )}
      </section>

      <button className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', fontSize: '1.05rem' }} onClick={handleSubmit}>
        Submit Response
      </button>
      {Object.keys(errors).length > 0 && (
        <p className="error-msg" role="alert" style={{ marginTop: '0.5rem' }}>
          Please complete the required fields marked above before submitting.
        </p>
      )}
    </div>
  )
}
