import { describe, expect, it } from 'vitest'
import { scoreSimilarity } from './similarity'

describe('scoreSimilarity', () => {
  it('returns null when no reference passage exists', () => {
    expect(scoreSimilarity('A student response', '')).toBeNull()
  })

  it('scores a verbatim quote as full containment', () => {
    expect(scoreSimilarity('green light symbolizes Gatsby dreams', 'The green light symbolizes Gatsby dreams')).toBe(1)
  })

  it('returns zero for unrelated content and empty student text', () => {
    expect(scoreSimilarity('mountains oceans rivers', 'green light Gatsby')).toBe(0)
    expect(scoreSimilarity('', 'green light Gatsby')).toBe(0)
  })

  it('bounds repeated student words to their passage frequency', () => {
    expect(scoreSimilarity('Gatsby Gatsby Gatsby', 'Gatsby dreams')).toBeCloseTo(1 / 3)
  })
})