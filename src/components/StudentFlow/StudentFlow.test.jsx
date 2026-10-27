import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StudentFlow from './StudentFlow'

const labels = { point: 'Point', example: 'Example', explanation: 'Explanation' }

describe('StudentFlow scan reference', () => {
  it('shows OCR text, the verification disclaimer, and the original uploaded image', () => {
    const data = new TextEncoder().encode('image').buffer
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:scan-reference'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    render(
      <StudentFlow
        session={{
          passage: 'OCR extracted passage',
          originalDocument: { data, name: 'scan.png', type: 'image/png' },
          studentName: 'Alex Student',
          labels,
          numPoints: 1,
        }}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByText('OCR extracted passage')).toBeInTheDocument()
    expect(screen.getByText(/OCR can misread words or punctuation/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Original scanned passage: scan.png' })).toHaveAttribute('src', 'blob:scan-reference')
    expect(screen.getByRole('link', { name: 'Open original file: scan.png' })).toHaveAttribute('href', 'blob:scan-reference')
  })

  it.each(['essay', 'literary_analysis'])('explains blocked submission in %s mode', mode => {
    render(
      <StudentFlow
        session={{ passage: '', studentName: 'Alex Student', labels, mode, numPoints: 3 }}
        onSubmit={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Submit Response' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please complete the required fields marked above before submitting.'
    )
  })

  it('repeats one editable literary-analysis point across all three sections', () => {
    const onSubmit = vi.fn()
    render(
      <StudentFlow
        session={{
          passage: '',
          studentName: 'Alex Student',
          labels: {
            topicSentence: 'Topic Sentence',
            link: 'Link',
            point: 'Point',
            example: 'Evidence',
            explanation: 'Analysis',
            concludingSentence: 'Concluding Sentence',
          },
          mode: 'literary_analysis',
          numPoints: 3,
        }}
        onSubmit={onSubmit}
      />
    )

    fireEvent.change(screen.getByLabelText('Central Point'), {
      target: { value: 'A central claim about the text' },
    })

    expect(screen.getAllByText('A central claim about the text', { selector: 'p' })).toHaveLength(3)
    expect(screen.getAllByText(/Connect this section to the last one/)).toHaveLength(3)
    expect(screen.getByText(/A society shaped by \[factor\]/)).toBeInTheDocument()

    fireEvent.change(document.getElementById('topic-sentence'), { target: { value: 'A topic sentence' } })
    fireEvent.change(document.getElementById('concluding-sentence'), { target: { value: 'A concluding sentence' } })
    for (let index = 0; index < 3; index += 1) {
      fireEvent.change(document.getElementById(`example-${index}`), { target: { value: `Evidence ${index + 1}` } })
      fireEvent.change(document.getElementById(`explanation-${index}`), { target: { value: `Analysis ${index + 1}` } })
    }
    fireEvent.click(screen.getByRole('button', { name: 'Submit Response' }))

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit.mock.calls[0][0].points.map(section => section.point)).toEqual([
      'A central claim about the text',
      'A central claim about the text',
      'A central claim about the text',
    ])
  })
})