import React from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TeacherDashboard from './TeacherDashboard'

const getAllResponses = vi.fn()
vi.mock('../../utils/db', () => ({
  getAllResponses: () => getAllResponses(),
  deleteResponse: vi.fn(),
}))
vi.mock('../../utils/export', () => ({ exportResponsesToCSV: vi.fn() }))

beforeEach(() => {
  getAllResponses.mockReset()
})

describe('TeacherDashboard', () => {
  it('averages response averages so long formats do not count more heavily', async () => {
    getAllResponses.mockResolvedValue([
      {
        id: 'standard',
        studentName: 'Standard Student',
        submittedAt: '2026-01-02T00:00:00.000Z',
        passage: 'reference text',
        points: [{}, {}, {}],
        similarityScores: [{ exampleScore: 1 }, { exampleScore: 1 }, { exampleScore: 1 }],
      },
      {
        id: 'short',
        studentName: 'Short Student',
        submittedAt: '2026-01-01T00:00:00.000Z',
        passage: 'reference text',
        points: [{}],
        similarityScores: [{ exampleScore: 0 }],
      },
    ])
    render(<TeacherDashboard onBack={vi.fn()} />)

    expect(await screen.findByText('50%')).toBeInTheDocument()
  })

  it('shows a storage error instead of presenting an empty class', async () => {
    getAllResponses.mockRejectedValue(new Error('IndexedDB unavailable'))
    render(<TeacherDashboard onBack={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load responses from local storage')
    expect(screen.queryByText('No student submissions have been recorded on this computer yet.')).not.toBeInTheDocument()
  })
})