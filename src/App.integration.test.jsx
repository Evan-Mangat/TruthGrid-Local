import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { getAllResponses } from './utils/db'

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
    await waitFor(async () => expect(await getAllResponses()).toHaveLength(1))

    await user.click(screen.getByRole('button', { name: 'Teacher Dashboard' }))
    expect(await screen.findByRole('heading', { name: 'Teacher Dashboard' })).toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: 'Next Student Session (Reset Device)' }))
    expect(screen.getByRole('heading', { name: 'TruthGrid Classroom' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Student Name/)).toHaveValue('')
  })

  it('requires destructive recovery to reset a forgotten teacher passcode', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Create teacher passcode'), 'teacher-code-42')
    await user.type(screen.getByLabelText('Confirm passcode'), 'teacher-code-42')
    await user.click(screen.getByRole('button', { name: 'Save dashboard passcode' }))
    expect(await screen.findByText('Passcode set on this device')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '📊 Teacher Dashboard' }))
    await user.click(screen.getByRole('button', { name: 'Forgot passcode?' }))

    expect(screen.getByRole('alert')).toHaveTextContent('permanently deletes every saved student response')
    await user.type(screen.getByLabelText('Type ERASE to confirm'), 'ERASE')
    await user.click(screen.getByRole('button', { name: 'Erase data and reset' }))

    expect(await screen.findByRole('heading', { name: 'TruthGrid Classroom' })).toBeInTheDocument()
    expect(localStorage.getItem('truthgrid_teacher_access_v1')).toBeNull()
    expect(await getAllResponses()).toHaveLength(0)
  })
})