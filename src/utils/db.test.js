import { afterEach, describe, expect, it } from 'vitest'
import { deleteResponse, getAllResponses, saveResponse } from './db'

const ids = []

afterEach(async () => {
  for (const id of ids.splice(0)) await deleteResponse(id)
})

describe('response persistence', () => {
  it('saves distinct responses even when submittedAt matches', async () => {
    const submission = { studentName: 'Test Student', submittedAt: 'same-time', points: [] }
    const firstId = await saveResponse(submission)
    const secondId = await saveResponse(submission)
    ids.push(firstId, secondId)

    const records = (await getAllResponses()).filter(record => ids.includes(record.id))
    expect(records).toHaveLength(2)
  })

  it('persists an original uploaded document Blob', async () => {
    const data = new TextEncoder().encode('scan bytes').buffer
    const id = await saveResponse({
      studentName: 'Scan Student',
      submittedAt: 'scan-time',
      originalDocument: { data, name: 'page.png', type: 'image/png' },
    })
    ids.push(id)

    const record = (await getAllResponses()).find(response => response.id === id)
    expect(new TextDecoder().decode(record.originalDocument.data)).toBe('scan bytes')
  })
})