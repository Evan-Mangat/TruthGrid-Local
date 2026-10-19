import React, { useState } from 'react'
import TeacherSetup, { saveTeacherConfig } from './components/TeacherSetup/TeacherSetup'
import StudentFlow, { clearActiveDraft } from './components/StudentFlow/StudentFlow'
import Results from './components/Results/Results'
import TeacherDashboard from './components/TeacherDashboard/TeacherDashboard'
import PrintWorksheet from './components/PrintWorksheet/PrintWorksheet'
import TeacherAccess from './components/TeacherAccess/TeacherAccess'

// Top-level app state machine:
// 'setup' | 'writing' | 'results' | 'dashboard' | 'print_worksheet'
export default function App() {
  const [screen, setScreen] = useState('setup')
  const [session, setSession] = useState(null)       // Active student session
  const [submission, setSubmission] = useState(null) // Completed submission
  const [submissionIsStored, setSubmissionIsStored] = useState(false)
  const [activePrintConfig, setActivePrintConfig] = useState(null)
  const [dashboardReturnScreen, setDashboardReturnScreen] = useState('setup')

  // 4. Preserved teacher configuration across student sessions
  const [teacherConfig, setTeacherConfig] = useState(() => {
    try {
      const raw = localStorage.getItem('truthgrid_teacher_config')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  function handleSessionReady(sessionData) {
    setSession(sessionData)
    // Update persistent teacher configuration
    const config = {
      passage: sessionData.passage,
      originalDocument: sessionData.originalDocument,
      labels: sessionData.labels,
      mode: sessionData.mode,
      numPoints: sessionData.numPoints,
    }
    setTeacherConfig(config)
    saveTeacherConfig({ ...config, originalDocument: undefined })
    setScreen('writing')
  }

  function handleSubmission(submissionData) {
    setSubmission(submissionData)
    setSubmissionIsStored(false)
    setScreen('results')
  }

  // 4. Shared-device reset: clear previous student from screen, preserve teacher config
  function handleReset() {
    clearActiveDraft()
    setSubmission(null)
    setSubmissionIsStored(false)
    setSession(null)
    setScreen('setup')
  }

  function handleOpenDashboard(returnScreen) {
    setDashboardReturnScreen(returnScreen)
    setScreen('dashboard_access')
  }

  function handlePrintBlankWorksheet(config) {
    setActivePrintConfig(config || teacherConfig || { passage: '', labels: null, mode: 'standard' })
    setScreen('print_worksheet')
  }

  function handlePrintStudentResponse(resp) {
    setSubmission(resp)
    setSubmissionIsStored(true)
    setScreen('results')
  }

  function handleTeacherRecovery() {
    clearActiveDraft()
    setSubmission(null)
    setSubmissionIsStored(false)
    setSession(null)
    setScreen('setup')
  }

  return (
    <div className="app-root">
      {screen === 'setup' && (
        <TeacherSetup
          initialConfig={teacherConfig}
          onReady={handleSessionReady}
          onNavigateToDashboard={() => handleOpenDashboard('setup')}
          onPrintBlankWorksheet={handlePrintBlankWorksheet}
        />
      )}

      {screen === 'writing' && session && (
        <StudentFlow session={session} onSubmit={handleSubmission} />
      )}

      {screen === 'results' && submission && (
        <Results
          submission={submission}
          session={session}
          onReset={handleReset}
          onNavigateToDashboard={() => handleOpenDashboard('results')}
          saveOnMount={!submissionIsStored}
        />
      )}

      {screen === 'dashboard' && (
        <TeacherDashboard
          onBack={() => setScreen(dashboardReturnScreen)}
          onPrintBlankWorksheet={() => handlePrintBlankWorksheet(teacherConfig)}
          onPrintStudentResponse={handlePrintStudentResponse}
        />
      )}

      {screen === 'dashboard_access' && (
        <TeacherAccess
          onUnlock={() => setScreen('dashboard')}
          onCancel={() => setScreen(dashboardReturnScreen)}
          onRecoveryComplete={handleTeacherRecovery}
        />
      )}

      {screen === 'print_worksheet' && (
        <PrintWorksheet
          config={activePrintConfig}
          onBack={() => setScreen(session ? 'writing' : 'setup')}
        />
      )}
    </div>
  )
}
