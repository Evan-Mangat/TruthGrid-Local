import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { getAllResponses, saveResponse } from './utils/db'
import { getAllDraftSessions, saveDraftVersion } from './utils/draftHistory'

describe('classroom response workflow', () => {
  it('runs setup → writing → results → reset and persists the response', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Create teacher passcode'), 'teacher-code-42')
    await user.type(screen.getByLabelText('Confirm passcode'), 'teacher-code-42')
    await user.click(screen.getByRole('button', { name: 'Save dashboard passcode' }))
    expect(await screen.findByText('Passcode set on this device')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Student Name/), 'Integration Student')
    await user.click(screen.getByRole('button', { name: 'Start Writing Session' }))
    expect(screen.getByText('Open Prompt Mode')).toBeInTheDocument()

    fireEvent.change(document.getElementById('topic-sentence'), { target: { value: 'The text develops a central idea through its details.' } })
    fireEvent.change(document.getElementById('concluding-sentence'), { target: { value: 'Ultimately, these details reinforce the central idea.' } })

    for (let index = 0; index < 3; index += 1) {
      fireEvent.change(document.getElementById(`point-${index}`), { target: { value: `Claim ${index + 1}` } })
      fireEvent.change(document.getElementById(`example-${index}`), { target: { value: `Example ${index + 1}` } })
      fireEvent.change(document.getElementById(`explanation-${index}`), { target: { value: `Reason ${index + 1}` } })
    }
    await user.click(screen.getByRole('button', { name: 'Submit Response' }))

    expect(await screen.findByRole('heading', { name: 'Open Writing Response' })).toBeInTheDocument()
    expect(document.querySelector('.print-only h1')).toHaveTextContent('TruthGrid Essay Response')
    expect(await screen.findByText(/Saved on local device storage\. You can access your work through the Dashboard after submission\./)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Print and Save Report to Submit to Teacher/ })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Go to Dashboard' })).toBeInTheDocument()
    await waitFor(async () => expect(await getAllResponses()).toHaveLength(1))

    await user.click(screen.getByRole('button', { name: 'Dashboard', exact: true }))
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Teacher passcode'), 'wrong-code')
    await user.click(screen.getByRole('button', { name: 'Unlock Dashboard' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('That passcode did not match')
    await user.clear(screen.getByLabelText('Teacher passcode'))
    await user.type(screen.getByLabelText('Teacher passcode'), 'teacher-code-42')
    await user.click(screen.getByRole('button', { name: 'Unlock Dashboard' }))
    await screen.findByRole('button', { name: '📥 Export All to CSV' })
    await user.click(screen.getByRole('button', { name: '← Back to Setup' }))
    expect(await screen.findByRole('heading', { name: 'Open Writing Response' })).toBeInTheDocument()
    expect(await getAllResponses()).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Start a New Session' }))
    expect(screen.getByRole('heading', { name: 'TruthGrid Classroom' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Student Name/)).toHaveValue('')
  })

  it('changes the Dashboard passcode without deleting essays or draft versions', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Create teacher passcode'), 'teacher-code-42')
    await user.type(screen.getByLabelText('Confirm passcode'), 'teacher-code-42')
    await user.click(screen.getByRole('button', { name: 'Save dashboard passcode' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/Changing it does not delete saved essays/)

    await saveResponse({ id: 'preserve-response', studentName: 'Saved Student', submittedAt: '2026-01-01', points: [] })
    await saveDraftVersion({
      sessionId: 'preserve-draft',
      studentName: 'Saved Student',
      stepName: 'Point',
      trigger: 'manual',
      snapshot: { points: [{ point: 'Draft stays here' }] },
    })

    await user.click(screen.getByRole('button', { name: 'Change Dashboard passcode' }))
    await user.type(screen.getByLabelText('Current passcode'), 'teacher-code-42')
    await user.type(screen.getByLabelText('New passcode'), 'new-teacher-code-43')
    await user.type(screen.getByLabelText('Confirm passcode'), 'new-teacher-code-43')
    await user.click(screen.getByRole('button', { name: 'Save dashboard passcode' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/Changing it does not delete saved essays/)

    expect(await getAllResponses()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'preserve-response', studentName: 'Saved Student' }),
    ]))
    expect(await getAllDraftSessions()).toEqual(expect.arrayContaining([
      expect.objectContaining({ sessionId: 'preserve-draft', studentName: 'Saved Student' }),
    ]))
  })

  it('resets a forgotten passcode while preserving essays, draft history, and the active draft', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Create teacher passcode'), 'teacher-code-42')
    await user.type(screen.getByLabelText('Confirm passcode'), 'teacher-code-42')
    await user.click(screen.getByRole('button', { name: 'Save dashboard passcode' }))
    expect(await screen.findByText('Passcode set on this device')).toBeInTheDocument()

    await saveResponse({ id: 'keep-response-on-reset', studentName: 'Homework Student', submittedAt: '2026-02-01', points: [] })
    await saveDraftVersion({
      sessionId: 'keep-draft-on-reset',
      studentName: 'Homework Student',
      stepName: 'Topic Sentence',
      trigger: 'manual',
      snapshot: { topicSentence: 'Keep this draft', points: [] },
    })
    localStorage.setItem('truthgrid_active_draft', JSON.stringify({ studentName: 'Homework Student', points: [] }))

    await user.click(screen.getByRole('button', { name: '📊 Dashboard' }))
    await user.click(screen.getByRole('button', { name: 'Forgot passcode?' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Saved essays, uploaded scans, draft-history versions, and the active draft will remain')
    await user.type(screen.getByLabelText('Type RESET to confirm'), 'RESET')
    await user.click(screen.getByRole('button', { name: 'Reset passcode and keep my work' }))

    expect(await screen.findByRole('heading', { name: 'TruthGrid Classroom' })).toBeInTheDocument()
    expect(localStorage.getItem('truthgrid_teacher_access_v1')).toBeNull()
    expect(await getAllResponses()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'keep-response-on-reset' }),
    ]))
    expect(await getAllDraftSessions()).toEqual(expect.arrayContaining([
      expect.objectContaining({ sessionId: 'keep-draft-on-reset' }),
    ]))
    expect(localStorage.getItem('truthgrid_active_draft')).toContain('Homework Student')
  })
})