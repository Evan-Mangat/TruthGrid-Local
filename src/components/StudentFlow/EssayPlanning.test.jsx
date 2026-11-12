import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EssayPlanning, {
  detectTransitions,
  checkEndsWithQuote,
  createEssayPlan,
  TransitionSelect,
  EvidenceLeadInControl,
  ESSAY_TRANSITIONS,
} from './EssayPlanning'

describe('EssayPlanning and Transition detection utilities', () => {
  it('does not include quote options inside the transition words dropdown', () => {
    const hasQuoteCategory = ESSAY_TRANSITIONS.some(group =>
      group.label.toLowerCase().includes('quote')
    )
    expect(hasQuoteCategory).toBe(false)
  })

  it('detects transitional phrases from Ms. Kwan’s handouts across categories', () => {
    // Contrast
    expect(detectTransitions('However, the author reveals the truth.')).toEqual(
      expect.arrayContaining([expect.objectContaining({ phrase: 'However', category: 'Contrast' })])
    )
    // Comparison
    expect(detectTransitions('Similarly, the protagonist experiences isolation.')).toEqual(
      expect.arrayContaining([expect.objectContaining({ phrase: 'Similarly', category: 'Comparison' })])
    )
    // Example
    expect(detectTransitions('For instance, in chapter three…')).toEqual(
      expect.arrayContaining([expect.objectContaining({ phrase: 'For instance', category: 'Examples and evidence' })])
    )
    // Cause and effect
    expect(detectTransitions('Consequently, the town falls into chaos.')).toEqual(
      expect.arrayContaining([expect.objectContaining({ phrase: 'Consequently', category: 'Cause and effect' })])
    )
    // Summary and conclusion
    expect(detectTransitions('Ultimately, freedom requires personal sacrifice.')).toEqual(
      expect.arrayContaining([expect.objectContaining({ phrase: 'Ultimately', category: 'Summary and conclusion' })])
    )
    // Empty or non-matching text
    expect(detectTransitions('')).toEqual([])
    expect(detectTransitions('The dog ran down the hill.')).toEqual([])
  })

  it('detects when a concluding sentence improperly ends with a quotation', () => {
    expect(checkEndsWithQuote('This is demonstrated when she says, "never again."')).toBe(true)
    expect(checkEndsWithQuote('She concluded by crying out, \'Help!\'')).toBe(true)
    expect(checkEndsWithQuote('The author ends with: “goodbye”')).toBe(true)
    expect(checkEndsWithQuote('The author explains that true courage comes from within.')).toBe(false)
  })

  it('renders the sleek brainstorm board and allows toggling visibility', () => {
    const plan = createEssayPlan()
    const onChange = vi.fn()
    const onThesisChange = vi.fn()

    render(
      <EssayPlanning
        plan={plan}
        onChange={onChange}
        thesis=""
        onThesisChange={onThesisChange}
        prompt="How does adversity shape identity in the story?"
      />
    )

    expect(screen.getByText(/5-Paragraph In-Class Essay Exam Scaffold/)).toBeInTheDocument()
    expect(screen.getByText(/Brainstorm Pool \/ Unassigned/)).toBeInTheDocument()
    expect(screen.getByText(/Group A \(Body 1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Group B \(Body 2\)/)).toBeInTheDocument()
    expect(screen.getByText(/Group C \(Body 3\)/)).toBeInTheDocument()
    expect(screen.getByText(/Set Aside \/ Disregarded/)).toBeInTheDocument()

    // Toggle board collapse/expand hides both Step 1 and Step 2
    const toggleBtn = screen.getByRole('button', { name: /Hide Brainstorm Board/ })
    fireEvent.click(toggleBtn)
    expect(screen.queryByText(/Brainstorm Pool \/ Unassigned/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Step 2: See patterns/)).not.toBeInTheDocument()
    expect(screen.getByText(/Step 3: Formulate your Thesis Statement/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Show Brainstorm Board/ })).toBeInTheDocument()
  })

  it('allows adding cards to brainstorm pool and moving them between lanes with quick buttons', () => {
    const initialPlan = {
      ...createEssayPlan(),
      ideas: [
        { id: 'idea-1', text: 'Loss of family stability', group: 'unassigned' },
      ],
    }
    const onChange = vi.fn()

    render(
      <EssayPlanning
        plan={initialPlan}
        onChange={onChange}
        thesis=""
        onThesisChange={vi.fn()}
        prompt="Test Prompt"
      />
    )

    // Add new card
    const input = screen.getByPlaceholderText(/Type a brainstorm idea/)
    fireEvent.change(input, { target: { value: 'Developing internal resilience' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Add Card' }))

    expect(onChange).toHaveBeenCalledWith(expect.any(Function))
    const updater = onChange.mock.calls[0][0]
    const updated = updater(initialPlan)
    expect(updated.ideas).toHaveLength(2)
    expect(updated.ideas[1].text).toBe('Developing internal resilience')
    expect(updated.ideas[1].group).toBe('unassigned')

    // Click quick move button -> A
    fireEvent.click(screen.getByRole('button', { name: 'Move to Group A' }))
    const moveUpdater = onChange.mock.calls[1][0]
    const moved = moveUpdater(initialPlan)
    expect(moved.ideas[0].group).toBe('A')
  })

  it('does not render the removed Thesis Alignment Checklist in Step 3', () => {
    render(
      <EssayPlanning
        plan={createEssayPlan()}
        onChange={vi.fn()}
        thesis="In the novel, adversity transforms character."
        onThesisChange={vi.fn()}
        prompt="How does adversity transform character?"
      />
    )

    expect(screen.queryByText('Thesis Alignment Checklist:')).not.toBeInTheDocument()
    expect(screen.queryByText(/Positioned as Sentence 1/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Echoes prompt key words/)).not.toBeInTheDocument()
  })

  it('handles EvidenceLeadInControl: toggling between transition and quote, graying out transition and using suggestions', () => {
    const onTypeChange = vi.fn()
    const onTransitionChange = vi.fn()
    const onQuoteIntroChange = vi.fn()

    const { rerender } = render(
      <EvidenceLeadInControl
        idPrefix="test-evidence-1"
        leadInType="transition"
        transitionValue="For example"
        quoteIntroValue=""
        onTypeChange={onTypeChange}
        onTransitionChange={onTransitionChange}
        onQuoteIntroChange={onQuoteIntroChange}
      />
    )

    // Initially in transition mode
    expect(screen.getByRole('button', { name: 'Transition Word' })).toHaveClass('active')
    const transitionSelect = screen.getByLabelText('Transition Word')
    expect(transitionSelect).not.toBeDisabled()

    // Switch to quote mode
    fireEvent.click(screen.getByRole('button', { name: 'Introduce Quote (Attribution)' }))
    expect(onTypeChange).toHaveBeenCalledWith('quote')

    // Rerender in quote mode
    rerender(
      <EvidenceLeadInControl
        idPrefix="test-evidence-1"
        leadInType="quote"
        transitionValue=""
        quoteIntroValue=""
        onTypeChange={onTypeChange}
        onTransitionChange={onTransitionChange}
        onQuoteIntroChange={onQuoteIntroChange}
      />
    )

    // In quote mode: transition select is grayed out / disabled
    expect(screen.getByText('(Disabled — Quote introduction selected)')).toBeInTheDocument()
    const disabledSelect = screen.getByLabelText('Transition Word')
    expect(disabledSelect).toBeDisabled()

    // Quote suggestions are visible and clickable
    expect(screen.getByText(/Author Attribution \/ Quote Lead-in:/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '[Author] states,' }))
    expect(onQuoteIntroChange).toHaveBeenCalledWith('[Author] states,')
  })

  it('separates conclusion transitions from body transitions in TransitionSelect', () => {
    // Body transition select (isConclusion = false)
    const { unmount } = render(
      <TransitionSelect
        id="body-test"
        label="Body Transition"
        value=""
        onChange={vi.fn()}
        isConclusion={false}
      />
    )
    expect(screen.queryByRole('group', { name: 'Summary and conclusion' })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Contrast' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Comparison' })).toBeInTheDocument()
    unmount()

    // Conclusion transition select (isConclusion = true)
    render(
      <TransitionSelect
        id="concl-test"
        label="Conclusion Transition"
        value=""
        onChange={vi.fn()}
        isConclusion={true}
      />
    )
    expect(screen.getByRole('group', { name: 'Summary and conclusion' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Contrast' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Comparison' })).not.toBeInTheDocument()
  })
})
