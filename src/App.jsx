import React, { useState } from 'react'
import TeacherSetup from './components/TeacherSetup/TeacherSetup'
import StudentFlow from './components/StudentFlow/StudentFlow'
import Results from './components/Results/Results'

// Top-level app state machine: setup → writing → results
export default function App() {
  const [screen, setScreen] = useState('setup') // 'setup' | 'writing' | 'results'
  const [session, setSession] = useState(null)   // TeacherSetup output
  const [submission, setSubmission] = useState(null) // StudentFlow output

  function handleSessionReady(sessionData) {
    setSession(sessionData)
    setScreen('writing')
  }

  function handleSubmission(submissionData) {
    setSubmission(submissionData)
    setScreen('results')
  }

  function handleReset() {
    setScreen('setup')
    setSession(null)
    setSubmission(null)
  }

  return (
    <div className="app-root">
      {screen === 'setup' && (
        <TeacherSetup onReady={handleSessionReady} />
      )}
      {screen === 'writing' && session && (
        <StudentFlow session={session} onSubmit={handleSubmission} />
      )}
      {screen === 'results' && submission && (
        <Results submission={submission} session={session} onReset={handleReset} />
      )}
    </div>
  )
}
