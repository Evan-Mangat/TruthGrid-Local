import { describe, expect, it } from 'vitest'
import { escapeCsvField } from './export'

describe('CSV field escaping', () => {
  it.each(['=1+1', '+SUM(A1:A2)', '-1+2', '@SUM(A1:A2)', ' \t=2+2'])(
    'neutralizes spreadsheet formulas in %j', value => {
      expect(escapeCsvField(value)).toBe(`'${value}`)
    }
  )

  it('still quotes delimiters and doubles embedded quotes', () => {
    expect(escapeCsvField('say "hello", student')).toBe('"say ""hello"", student"')
  })
})