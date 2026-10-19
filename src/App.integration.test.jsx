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

    await user.type(screen.getByLabelText(/Student Name/), 'Integration Student')
    await user.click(screen.getByRole('button', { name: 'Start Writing Session' }))
    expect(screen.getByText('Open Prompt Mode')).toBeInTheDocument()

    for (let index = 0; index < 3; index += 1) {
      fireEvent.change(document.getElementById(`point-${index}`), { target: { value: `Claim ${index + 1}` } })
      fireEvent.change(document.getElementById(`example-${index}`), { target: { value: `Example ${index + 1}` } })
      fireEvent.change(document.getElementById(`explanation-${index}`), { target: { value: `Reason ${index + 1}` } })
    }
    await user.click(screen.getByRole('button', { name: 'Submit Response' }))

    expect(await screen.findByRole('heading', { name: 'Open Writing Response' })).toBeInTheDocument()
    await waitFor(async () => expect(await getAllResponses()).toHaveLength(1))

    await user.click(screen.getByRole('button', { name: 'Teacher Dashboard' }))
    await screen.findByRole('heading', { name: 'Teacher Dashboard' })
    await user.click(screen.getByRole('button', { name: '← Back to Setup' }))
    expect(await screen.findByRole('heading', { name: 'Open Writing Response' })).toBeInTheDocument()
    expect(await getAllResponses()).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Next Student Session (Reset Device)' }))
    expect(screen.getByRole('heading', { name: 'TruthGrid Classroom' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Student Name/)).toHaveValue('')
  })
})