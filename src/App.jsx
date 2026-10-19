import React, { useState } from 'react'
import TeacherSetup, { saveTeacherConfig } from './components/TeacherSetup/TeacherSetup'
import StudentFlow, { clearActiveDraft } from './components/StudentFlow/StudentFlow'
import Results from './components/Results/Results'
import TeacherDashboard from './components/TeacherDashboard/TeacherDashboard'
import PrintWorksheet from './components/PrintWorksheet/PrintWorksheet'

// Top-level app state machine:
// 'setup' | 'writing' | 'results' | 'dashboard' | 'print_worksheet'
export default function App() {
  const [screen, setScreen] = useState('setup')
  const [session, setSession] = useState(null)       // Active student session
  const [submission, setSubmission] = useState(null) // Completed submission
  const [activePrintConfig, setActivePrintConfig] = useState(null)

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
      labels: sessionData.labels,
      mode: sessionData.mode,
      numPoints: sessionData.numPoints,
    }
    setTeacherConfig(config)
    saveTeacherConfig(config)
    setScreen('writing')
  }

  function handleSubmission(submissionData) {
    setSubmission(submissionData)
    setScreen('results')
  }

  // 4. Shared-device reset: clear previous student from screen, preserve teacher config
  function handleReset() {
    clearActiveDraft()
    setSubmission(null)
    setSession(null)
    setScreen('setup')
  }

  function handleOpenDashboard() {
    setScreen('dashboard')
  }

  function handlePrintBlankWorksheet(config) {
    setActivePrintConfig(config || teacherConfig || { passage: '', labels: null, mode: 'standard' })
    setScreen('print_worksheet')
  }

  function handlePrintStudentResponse(resp) {
    setSubmission(resp)
    setScreen('results')
  }

  return (
    <div className="app-root">
      {screen === 'setup' && (
        <TeacherSetup
          initialConfig={teacherConfig}
          onReady={handleSessionReady}
          onNavigateToDashboard={handleOpenDashboard}
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
          onNavigateToDashboard={handleOpenDashboard}
        />
      )}

      {screen === 'dashboard' && (
        <TeacherDashboard
          onBack={() => setScreen(session ? 'writing' : 'setup')}
          onPrintBlankWorksheet={() => handlePrintBlankWorksheet(teacherConfig)}
          onPrintStudentResponse={handlePrintStudentResponse}
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
