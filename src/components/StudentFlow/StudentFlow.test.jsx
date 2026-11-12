import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StudentFlow from './StudentFlow'

const labels = { point: 'Point', example: 'Example', explanation: 'Explanation' }

describe('StudentFlow scan reference', () => {
  it.each([
    ['essay', 'Essay', 'Literary Analysis'],
    ['literary_analysis', 'Literary Analysis', 'Essay'],
  ])('uses only the %s format name in the page title', (mode, expectedTitle, otherTitle) => {
    render(
      <StudentFlow
        session={{ passage: '', studentName: 'Alex Student', labels, mode }}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { level: 1, name: expectedTitle })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: otherTitle })).not.toBeInTheDocument()
  })

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

  it('clarifies the source passage and gives argument, evidence, analysis, and conventions guidance', () => {
    render(
      <StudentFlow
        session={{
          passage: 'Assigned source text',
          studentName: 'Alex Student',
          labels,
          mode: 'literary_analysis',
        }}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: 'Assigned Reading Passage' })).toBeInTheDocument()
    expect(screen.getByText(/not a place to enter your draft/)).toBeInTheDocument()
    expect(screen.getByText(/How does Nia change\?/)).toBeInTheDocument()
    expect(screen.getAllByText(/about 8 words or fewer/)).toHaveLength(3)
    expect(screen.getAllByText(/figurative language works/)).toHaveLength(3)
    expect(screen.getByRole('heading', { name: 'Final Conventions Check' })).toBeInTheDocument()
    expect(document.getElementById('topic-sentence')).toHaveAttribute('spellcheck', 'true')
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

  it('submits a complete five-paragraph essay with 3 evidence slots per body paragraph and assembles fullResponse', () => {
    const onSubmit = vi.fn()
    render(
      <StudentFlow
        session={{
          passage: 'A passage about perseverance and community.',
          studentName: 'Jordan Student',
          labels: {
            topicSentence: 'Topic Sentence',
            link: 'Link',
            point: 'Point',
            example: 'Evidence',
            explanation: 'Commentary',
            concludingSentence: 'Concluding Sentence',
          },
          mode: 'essay',
          numPoints: 3,
          prompt: 'How does perseverance shape the community?',
        }}
        onSubmit={onSubmit}
      />
    )

    // Formulate thesis statement as sentence 1
    fireEvent.change(document.getElementById('topic-sentence'), {
      target: { value: 'In the story, perseverance shapes the community through Shared sacrifice, Active solidarity, and Moral courage.' },
    })

    // Label Main Ideas A, B, C and introduction preview sentences
    const mainIdeas = ['Shared sacrifice', 'Active solidarity', 'Moral courage']
    mainIdeas.forEach((idea, index) => {
      const letter = String.fromCharCode(65 + index)
      fireEvent.change(document.getElementById(`main-idea-${letter}`), { target: { value: idea } })
      fireEvent.change(document.getElementById(`intro-support-${index}`), { target: { value: `This idea of ${idea.toLowerCase()} is fundamental.` } })
    })

    // Complete all 3 body paragraphs (each with assertion, 3 evidence/commentary slots with transitions, concluding sentence)
    for (let i = 0; i < 3; i += 1) {
      fireEvent.change(document.getElementById(`transition-into-${i}`), { target: { value: i === 0 ? 'First' : i === 1 ? 'Furthermore' : 'In addition' } })
      fireEvent.change(document.getElementById(`point-${i}`), { target: { value: `Body ${i + 1} assertion regarding ${mainIdeas[i]}.` } })
      fireEvent.change(document.getElementById(`evidence-1-${i}-transition`), { target: { value: 'For example' } })
      fireEvent.change(document.getElementById(`example-${i}`), { target: { value: `Evidence 1 for paragraph ${i + 1}` } })
      fireEvent.change(document.getElementById(`explanation-${i}`), { target: { value: `Commentary 1 for paragraph ${i + 1}` } })
      fireEvent.change(document.getElementById(`evidence-2-${i}-transition`), { target: { value: 'Furthermore' } })
      fireEvent.change(document.getElementById(`example2-${i}`), { target: { value: `Evidence 2 for paragraph ${i + 1}` } })
      fireEvent.change(document.getElementById(`explanation2-${i}`), { target: { value: `Commentary 2 for paragraph ${i + 1}` } })
      fireEvent.change(document.getElementById(`evidence-3-${i}-transition`), { target: { value: 'In addition' } })
      fireEvent.change(document.getElementById(`example3-${i}`), { target: { value: `Evidence 3 for paragraph ${i + 1}` } })
      fireEvent.change(document.getElementById(`explanation3-${i}`), { target: { value: `Commentary 3 for paragraph ${i + 1}` } })
      fireEvent.change(document.getElementById(`paragraph-conclusion-${i}`), { target: { value: `In conclusion, this wraps up body paragraph ${i + 1}.` } })
    }

    // Complete conclusion
    fireEvent.change(document.getElementById('conclusion-transition'), { target: { value: 'Ultimately' } })
    fireEvent.change(document.getElementById('concluding-sentence'), {
      target: { value: 'Ultimately, perseverance demonstrates that human connection transcends hardship.' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Submit Response' }))

    expect(onSubmit).toHaveBeenCalledOnce()
    const submission = onSubmit.mock.calls[0][0]
    expect(submission.mode).toBe('essay')
    expect(submission.essayPlan.mainIdeas).toEqual(mainIdeas)
    expect(submission.points).toHaveLength(3)
    expect(submission.points[0].example2).toBe('Evidence 2 for paragraph 1')
    expect(submission.points[0].example3).toBe('Evidence 3 for paragraph 1')
    expect(submission.fullResponse.split('\n\n')).toHaveLength(5)
  })

  it('warns student when a body paragraph concluding sentence ends with a quotation', () => {
    render(
      <StudentFlow
        session={{
          passage: '',
          studentName: 'Taylor Student',
          labels: {
            topicSentence: 'Topic Sentence',
            link: 'Link',
            point: 'Point',
            example: 'Evidence',
            explanation: 'Commentary',
            concludingSentence: 'Concluding Sentence',
          },
          mode: 'essay',
          numPoints: 3,
        }}
        onSubmit={vi.fn()}
      />
    )

    const conclInput = document.getElementById('paragraph-conclusion-0')
    fireEvent.change(conclInput, { target: { value: 'This is proven when she says, "never give up."' } })

    expect(screen.getByText(/Reminder: Never end a concluding sentence with a quotation/)).toBeInTheDocument()
  })

  it('requires transition selection or quote attribution for each evidence set before submission', () => {
    const onSubmit = vi.fn()
    render(
      <StudentFlow
        session={{
          passage: '',
          studentName: 'Morgan Student',
          labels: {
            topicSentence: 'Topic Sentence',
            link: 'Link',
            point: 'Point',
            example: 'Evidence',
            explanation: 'Commentary',
            concludingSentence: 'Concluding Sentence',
          },
          mode: 'essay',
          numPoints: 3,
        }}
        onSubmit={onSubmit}
      />
    )

    // Complete mandatory fields except evidence lead-in transitions
    fireEvent.change(document.getElementById('topic-sentence'), { target: { value: 'Thesis sentence.' } })
    for (let i = 0; i < 3; i += 1) {
      fireEvent.change(document.getElementById(`intro-support-${i}`), { target: { value: `Intro support ${i + 1}` } })
      fireEvent.change(document.getElementById(`transition-into-${i}`), { target: { value: 'Furthermore' } })
      fireEvent.change(document.getElementById(`point-${i}`), { target: { value: `Body point ${i + 1}` } })
      fireEvent.change(document.getElementById(`example-${i}`), { target: { value: `Evidence 1` } })
      fireEvent.change(document.getElementById(`explanation-${i}`), { target: { value: `Commentary 1` } })
      fireEvent.change(document.getElementById(`example2-${i}`), { target: { value: `Evidence 2` } })
      fireEvent.change(document.getElementById(`explanation2-${i}`), { target: { value: `Commentary 2` } })
      fireEvent.change(document.getElementById(`example3-${i}`), { target: { value: `Evidence 3` } })
      fireEvent.change(document.getElementById(`explanation3-${i}`), { target: { value: `Commentary 3` } })
      fireEvent.change(document.getElementById(`paragraph-conclusion-${i}`), { target: { value: `Conclusion ${i + 1}` } })
    }
    fireEvent.change(document.getElementById('conclusion-transition'), { target: { value: 'Ultimately' } })
    fireEvent.change(document.getElementById('concluding-sentence'), { target: { value: 'Overall conclusion.' } })

    fireEvent.click(screen.getByRole('button', { name: 'Submit Response' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/Body Paragraph 1, Evidence Set 1: select a transition word or enter a quote attribution/)).toBeInTheDocument()
  })

  it('requires transition into body paragraphs and conclusion before submission', () => {
    const onSubmit = vi.fn()
    render(
      <StudentFlow
        session={{
          passage: '',
          studentName: 'Chris Student',
          labels: {
            topicSentence: 'Topic Sentence',
            link: 'Link',
            point: 'Point',
            example: 'Evidence',
            explanation: 'Commentary',
            concludingSentence: 'Concluding Sentence',
          },
          mode: 'essay',
          numPoints: 3,
        }}
        onSubmit={onSubmit}
      />
    )

    // Complete mandatory fields except paragraph and conclusion transitions
    fireEvent.change(document.getElementById('topic-sentence'), { target: { value: 'Thesis sentence.' } })
    for (let i = 0; i < 3; i += 1) {
      fireEvent.change(document.getElementById(`intro-support-${i}`), { target: { value: `Intro support ${i + 1}` } })
      fireEvent.change(document.getElementById(`point-${i}`), { target: { value: `Body point ${i + 1}` } })
      fireEvent.change(document.getElementById(`evidence-1-${i}-transition`), { target: { value: 'For example' } })
      fireEvent.change(document.getElementById(`example-${i}`), { target: { value: `Evidence 1` } })
      fireEvent.change(document.getElementById(`explanation-${i}`), { target: { value: `Commentary 1` } })
      fireEvent.change(document.getElementById(`evidence-2-${i}-transition`), { target: { value: 'Furthermore' } })
      fireEvent.change(document.getElementById(`example2-${i}`), { target: { value: `Evidence 2` } })
      fireEvent.change(document.getElementById(`explanation2-${i}`), { target: { value: `Commentary 2` } })
      fireEvent.change(document.getElementById(`evidence-3-${i}-transition`), { target: { value: 'In addition' } })
      fireEvent.change(document.getElementById(`example3-${i}`), { target: { value: `Evidence 3` } })
      fireEvent.change(document.getElementById(`explanation3-${i}`), { target: { value: `Commentary 3` } })
      fireEvent.change(document.getElementById(`paragraph-conclusion-${i}`), { target: { value: `Conclusion ${i + 1}` } })
    }
    fireEvent.change(document.getElementById('concluding-sentence'), { target: { value: 'Overall conclusion.' } })

    fireEvent.click(screen.getByRole('button', { name: 'Submit Response' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/Transition into Body Paragraph 1 is required/)).toBeInTheDocument()
    expect(screen.getByText(/Transition into Conclusion is required/)).toBeInTheDocument()
  })

  it('invokes onBack callback to return to setup when clicking edit info button', () => {
    const onBack = vi.fn()
    render(
      <StudentFlow
        session={{
          passage: '',
          studentName: 'Robin Student',
          labels: {
            topicSentence: 'Topic Sentence',
            link: 'Link',
            point: 'Point',
            example: 'Evidence',
            explanation: 'Commentary',
            concludingSentence: 'Concluding Sentence',
          },
          mode: 'essay',
          numPoints: 3,
        }}
        onSubmit={vi.fn()}
        onBack={onBack}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Back/ }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('opens the Edit Info panel and saves updated student name via onSessionUpdate', () => {
    const onSessionUpdate = vi.fn()
    render(
      <StudentFlow
        session={{
          passage: 'Original passage',
          studentName: 'Old Name',
          studentNumber: '999',
          prompt: 'Original prompt',
          labels: {
            topicSentence: 'Topic Sentence',
            link: 'Link',
            point: 'Point',
            example: 'Evidence',
            explanation: 'Commentary',
            concludingSentence: 'Concluding Sentence',
          },
          mode: 'essay',
          numPoints: 3,
        }}
        onSubmit={vi.fn()}
        onSessionUpdate={onSessionUpdate}
      />
    )

    // Open the edit panel
    fireEvent.click(screen.getByRole('button', { name: /Edit Info/ }))
    expect(screen.getByRole('heading', { name: /Edit Session Info/ })).toBeInTheDocument()

    // The name field should be pre-filled with the current student name
    const nameInput = screen.getByLabelText(/Student Name/)
    expect(nameInput).toHaveValue('Old Name')

    // Change the name
    fireEvent.change(nameInput, { target: { value: 'New Name' } })

    // Save changes
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(onSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ studentName: 'New Name' })
    )

    // Panel should close after save
    expect(screen.queryByRole('heading', { name: /Edit Session Info/ })).not.toBeInTheDocument()
  })

  it('shows an error and blocks save when student name is cleared in Edit Info panel', () => {
    const onSessionUpdate = vi.fn()
    render(
      <StudentFlow
        session={{
          passage: '',
          studentName: 'Kim Student',
          labels: {
            topicSentence: 'Topic Sentence',
            link: 'Link',
            point: 'Point',
            example: 'Evidence',
            explanation: 'Commentary',
            concludingSentence: 'Concluding Sentence',
          },
          mode: 'essay',
          numPoints: 3,
        }}
        onSubmit={vi.fn()}
        onSessionUpdate={onSessionUpdate}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Edit Info/ }))
    fireEvent.change(screen.getByLabelText(/Student Name/), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/Student name is required/)
    expect(onSessionUpdate).not.toHaveBeenCalled()
  })
})