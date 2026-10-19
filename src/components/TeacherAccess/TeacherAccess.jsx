import React, { useState } from 'react'
import { clearTeacherPasscode, hasTeacherPasscode, verifyTeacherPasscode } from '../../utils/teacherAccess'
import { clearAllResponses } from '../../utils/db'
import { clearActiveDraft } from '../StudentFlow/StudentFlow'

export default function TeacherAccess({ onUnlock, onCancel, onRecoveryComplete }) {
  const [passcode, setPasscode] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [showRecovery, setShowRecovery] = useState(false)
  const [isWorking, setIsWorking] = useState(false)

  async function handleUnlock(event) {
    event.preventDefault()
    setError('')
    setIsWorking(true)
    try {
      if (await verifyTeacherPasscode(passcode)) {
        onUnlock()
      } else {
        setError('That passcode did not match.')
      }
    } catch {
      setError('Could not verify the passcode in this browser.')
    } finally {
      setIsWorking(false)
    }
  }

  async function handleRecovery(event) {
    event.preventDefault()
    setError('')
    if (confirmation !== 'ERASE') {
      setError('Type ERASE exactly to confirm the permanent deletion.')
      return
    }

    setIsWorking(true)
    try {
      await clearAllResponses()
      clearActiveDraft()
      clearTeacherPasscode()
      onRecoveryComplete()
    } catch {
      setError('Could not clear the saved responses. The data and passcode have not been reset.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <main className="page">
      <section className="card" aria-labelledby="teacher-access-heading">
        <h1 id="teacher-access-heading">Teacher Dashboard</h1>
        {showRecovery ? (
          <form onSubmit={handleRecovery}>
            <h2>Forgot the passcode?</h2>
            <p role="alert" style={{ color: '#b71c1c', marginBottom: '1rem' }}>
              Recovery permanently deletes every saved student response and uploaded scan on this device, then removes the dashboard passcode. This cannot be undone.
            </p>
            <label htmlFor="recovery-confirmation">Type ERASE to confirm</label>
            <input
              id="recovery-confirmation"
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              autoComplete="off"
            />
            {error && <p role="alert" className="error-msg">{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={isWorking}>Erase data and reset</button>
              <button className="btn btn-secondary" type="button" onClick={() => { setShowRecovery(false); setError('') }}>Cancel</button>
            </div>
          </form>
        ) : !hasTeacherPasscode() ? (
          <>
            <p role="alert" className="error-msg">No teacher passcode is set on this device. Return to setup and create one before student use.</p>
            <button className="btn btn-secondary" onClick={onCancel}>Back to Setup</button>
          </>
        ) : (
          <form onSubmit={handleUnlock}>
            <p className="muted" style={{ marginBottom: '1rem' }}>
              Teacher access only. This local passcode is a casual privacy barrier, not strong security against someone who can inspect or change this browser app.
            </p>
            <label htmlFor="teacher-passcode">Teacher passcode</label>
            <input
              id="teacher-passcode"
              type="password"
              value={passcode}
              onChange={event => setPasscode(event.target.value)}
              autoComplete="current-password"
              autoFocus
            />
            {error && <p role="alert" className="error-msg">{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={isWorking || !passcode}>Unlock Dashboard</button>
              <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
              <button className="btn btn-secondary" type="button" onClick={() => { setShowRecovery(true); setError('') }}>Forgot passcode?</button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}