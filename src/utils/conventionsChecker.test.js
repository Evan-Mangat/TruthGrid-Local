import { describe, expect, it } from 'vitest'
import { checkConventions, stripQuotations } from './conventionsChecker'

describe('conventionsChecker algorithm', () => {
  it('strips quotations accurately', () => {
    expect(stripQuotations('He states, "I realized this was true."').trim()).toBe('He states,')
    expect(stripQuotations('When Nia says, “We must fight,” she shows bravery.')).toContain('she shows bravery.')
  })

  it('detects past tense literary verbs and suggests present tense', () => {
    const result = checkConventions('The author showed how Nia realized the truth and argued that freedom mattered.')
    expect(result.tenseIssues).toHaveLength(3)
    expect(result.tenseIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ word: 'showed', suggestion: 'shows' }),
        expect.objectContaining({ word: 'realized', suggestion: 'realizes' }),
        expect.objectContaining({ word: 'argued', suggestion: 'argues' }),
      ])
    )
  })

  it('does not flag past tense verbs when they occur inside quotation marks', () => {
    const result = checkConventions('The author shows courage when Nia says, "I realized everything changed."')
    expect(result.tenseIssues).toHaveLength(0)
  })

  it('detects first and second person pronouns outside quotations', () => {
    const result = checkConventions('In my opinion, you can see that we learn from hardships.')
    expect(result.pronounIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ word: 'my' }),
        expect.objectContaining({ word: 'you' }),
        expect.objectContaining({ word: 'we' }),
      ])
    )
  })

  it('does not flag pronouns when inside quotations', () => {
    const result = checkConventions('Nia remarks, "I will protect our community."')
    expect(result.pronounIssues).toHaveLength(0)
  })

  it('detects repeated duplicate words and missing punctuation', () => {
    const result = checkConventions('The author presents the the evidence without punctuation')
    expect(result.punctuationIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'duplicate', word: 'the' }),
        expect.objectContaining({ type: 'punctuation' }),
      ])
    )
  })

  it('detects contractions and colloquial word traps in formal essay text', () => {
    const result = checkConventions('The protagonist couldn\'t escape because he should of listened alot sooner.')
    expect(result.academicToneIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'contraction', word: "couldn't" }),
        expect.objectContaining({ message: expect.stringContaining('should have') }),
        expect.objectContaining({ message: expect.stringContaining('a lot') }),
      ])
    )
  })

  it('ignores contractions inside dialogue quotations', () => {
    const result = checkConventions('The character proclaims, "I didn\'t do it."')
    expect(result.academicToneIssues).toHaveLength(0)
  })

  it('detects unwanted space before punctuation', () => {
    const result = checkConventions('The protagonist fights for justice , but faces opposition.')
    expect(result.punctuationIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'spacing' }),
      ])
    )
  })

  it('detects conversational fillers outside quotations', () => {
    const result = checkConventions('In my opinion, as you can see, the protagonist basically struggles.')
    expect(result.academicToneIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'filler', message: expect.stringContaining('in my opinion') }),
        expect.objectContaining({ type: 'filler', message: expect.stringContaining('as you can see') }),
        expect.objectContaining({ type: 'filler', message: expect.stringContaining('basically') }),
      ])
    )
  })

  it('detects weak analytical adjectives and vague words outside quotations', () => {
    const result = checkConventions('The author shows good stuff and bad things in society.')
    expect(result.academicToneIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'vague-diction', word: 'good' }),
        expect.objectContaining({ type: 'vague-diction', word: 'bad' }),
        expect.objectContaining({ type: 'vague-diction', word: 'stuff' }),
        expect.objectContaining({ type: 'vague-diction', word: 'things' }),
      ])
    )
  })

  it('ignores weak adjectives when used inside quotations', () => {
    const result = checkConventions('The speaker declares, "This is good stuff."')
    expect(result.academicToneIssues).toHaveLength(0)
  })

  it('detects punctuation placed outside closing quotation marks', () => {
    const badPunctuation = checkConventions('She demonstrates "bravery", and eventually finds "peace".')
    expect(badPunctuation.punctuationIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'quote-punctuation' }),
      ])
    )

    const correctPunctuation = checkConventions('She demonstrates "bravery," and eventually finds "peace."')
    const quoteIssues = correctPunctuation.punctuationIssues.filter(i => i.type === 'quote-punctuation')
    expect(quoteIssues).toHaveLength(0)
  })

  it('detects vague pronoun openers at sentence start', () => {
    // "This shows" at the start of text
    const result1 = checkConventions('This shows that the character has changed.')
    expect(result1.academicToneIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'vague-pronoun', message: expect.stringContaining('specific noun phrase') }),
      ])
    )

    // "It reveals" at the start of a new sentence after a period
    const result2 = checkConventions('The author uses imagery. It reveals the depth of the character.')
    expect(result2.academicToneIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'vague-pronoun' }),
      ])
    )

    // "This contrast shows" (noun following "This") should NOT be flagged
    const result3 = checkConventions('This contrast shows that the author values identity.')
    const vagueIssues3 = result3.academicToneIssues.filter(i => i.type === 'vague-pronoun')
    expect(vagueIssues3).toHaveLength(0)
  })

  it('detects subject-verb agreement mismatches', () => {
    const result1 = checkConventions('The characters show bravery. They was afraid at first.')
    expect(result1.academicToneIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'subject-verb', message: expect.stringContaining('they were') }),
      ])
    )

    const result2 = checkConventions('The narrator describes how he were uncertain of the outcome.')
    expect(result2.academicToneIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'subject-verb', message: expect.stringContaining('he was') }),
      ])
    )

    // "as if it were" is correct subjunctive — should NOT be flagged
    const result3 = checkConventions('The author writes as if it were inevitable.')
    const svaIssues = result3.academicToneIssues.filter(i => i.type === 'subject-verb')
    expect(svaIssues).toHaveLength(0)
  })

  it('does not flag vague pronouns or subject-verb errors when inside quotations', () => {
    // "This shows" inside a quote should not trigger vague pronoun
    const result = checkConventions('The narrator declares, "This shows my weakness."')
    const vagueIssues = result.academicToneIssues.filter(i => i.type === 'vague-pronoun')
    expect(vagueIssues).toHaveLength(0)

    // "they was" inside a quote should not trigger subject-verb
    const result2 = checkConventions('The elder says, "they was always there for us."')
    const svaIssues = result2.academicToneIssues.filter(i => i.type === 'subject-verb')
    expect(svaIssues).toHaveLength(0)
  })
})
