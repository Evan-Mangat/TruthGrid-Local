import React from 'react'
import { render, screen } from '@testing-library/react'
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
})