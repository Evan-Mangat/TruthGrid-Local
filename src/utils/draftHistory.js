// Draft version history — append-only snapshots stored in IndexedDB.
// All data stays on the local device. This is LOCAL ONLY in v1.
import { getDb, DRAFT_VERSIONS_STORE } from './db'

export async function saveDraftVersion({ sessionId, studentName, studentNumber, stepName, trigger, snapshot }) {
  const db = await getDb()
  const tx = db.transaction(DRAFT_VERSIONS_STORE, 'readwrite')
  const store = tx.objectStore(DRAFT_VERSIONS_STORE)

  const existing = await store.index('sessionId').getAll(sessionId)
  const versionNumber = existing.length + 1
  const previousVersionId = existing.length > 0 ? existing[existing.length - 1].id : null

  const record = {
    sessionId,
    studentName,
    studentNumber: studentNumber || '',
    stepName: stepName || 'Draft',
    trigger,
    versionNumber,
    previousVersionId,
    timestamp: new Date().toISOString(),
    snapshot,
  }
  await store.add(record)
  await tx.done
}

export async function getDraftVersionsBySession(sessionId) {
  const db = await getDb()
  const all = await db.getAllFromIndex(DRAFT_VERSIONS_STORE, 'sessionId', sessionId)
  all.sort((a, b) => a.versionNumber - b.versionNumber)
  return all
}

export async function getAllDraftSessions() {
  const db = await getDb()
  const all = await db.getAll(DRAFT_VERSIONS_STORE)
  if (!all.length) return []

  const bySession = {}
  for (const v of all) {
    if (!bySession[v.sessionId]) {
      bySession[v.sessionId] = {
        sessionId: v.sessionId,
        studentName: v.studentName,
        studentNumber: v.studentNumber,
        versions: [],
        isFinal: false,
      }
    }
    bySession[v.sessionId].versions.push(v)
    if (v.trigger === 'submit') bySession[v.sessionId].isFinal = true
  }

  return Object.values(bySession)
    .map(s => ({
      ...s,
      versionCount: s.versions.length,
      firstTimestamp: s.versions[0]?.timestamp,
      lastTimestamp: s.versions[s.versions.length - 1]?.timestamp,
    }))
    .sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp))
}
