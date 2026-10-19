import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TeacherSetup from './TeacherSetup'

describe('TeacherSetup', () => {
  it('starts an open prompt when passage is blank', async () => {
    const user = userEvent.setup()
    const onReady = vi.fn()
    render(<TeacherSetup onReady={onReady} />)

    await user.type(screen.getByLabelText(/Student Name/), 'Alex Student')
    await user.click(screen.getByRole('button', { name: 'Start Writing Session' }))

    expect(onReady).toHaveBeenCalledWith(expect.objectContaining({ passage: '', studentName: 'Alex Student' }))
  })

  it('loads text files directly and keeps the passage editable', async () => {
    const file = new File(['The green light symbolizes hope.'], 'passage.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'text', { value: async () => 'The green light symbolizes hope.' })
    render(<TeacherSetup onReady={vi.fn()} />)

    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } })

    expect(await screen.findByRole('status')).toHaveTextContent('Loaded text from passage.txt')
    expect(screen.getByLabelText(/Reading Passage/)).toHaveValue('The green light symbolizes hope.')
  })

  it('shows an actionable error when the local scan service is unavailable', async () => {
    const file = new File(['image bytes'], 'scan.png', { type: 'image/png' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network unavailable')))
    render(<TeacherSetup onReady={vi.fn()} />)

    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Passage upload or scan failed')
    expect(screen.getByRole('alert')).toHaveTextContent('Start the app with npm run dev')
  })

  it('passes original scan bytes and extracted text into the student session', async () => {
    const user = userEvent.setup()
    const file = new File(['scan bytes'], 'passage.png', { type: 'image/png' })
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new TextEncoder().encode('scan bytes').buffer,
    })
    const onReady = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, text: 'Extracted passage', word_count: 2, page_count: 1, elapsed_seconds: 0.2 }),
    }))
    render(<TeacherSetup onReady={onReady} />)

    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } })
    expect(await screen.findByRole('status')).toHaveTextContent('Extracted via Offline OCR')
    await user.type(screen.getByLabelText(/Student Name/), 'Scan Student')
    await user.click(screen.getByRole('button', { name: 'Start Writing Session' }))

    expect(onReady).toHaveBeenCalledWith(expect.objectContaining({
      passage: 'Extracted passage',
      originalDocument: expect.objectContaining({ name: 'passage.png', type: 'image/png' }),
    }))
    const submittedFile = onReady.mock.calls[0][0].originalDocument
    expect(new TextDecoder().decode(submittedFile.data)).toBe('scan bytes')
  })
})