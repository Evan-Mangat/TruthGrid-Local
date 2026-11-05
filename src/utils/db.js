// IndexedDB persistence via idb — all data stays local on the device.
import { openDB } from 'idb'

const DB_NAME = 'truthgrid'
const DB_VERSION = 2
const STORE = 'responses'
export const DRAFT_VERSIONS_STORE = 'draftVersions'

export async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        store.createIndex('submittedAt', 'submittedAt')
        store.createIndex('studentName', 'studentName')
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
          store.createIndex('submittedAt', 'submittedAt')
          store.createIndex('studentName', 'studentName')
        }
        const vs = db.createObjectStore(DRAFT_VERSIONS_STORE, { keyPath: 'id', autoIncrement: true })
        vs.createIndex('sessionId', 'sessionId')
        vs.createIndex('studentName', 'studentName')
        vs.createIndex('timestamp', 'timestamp')
      }
    },
  })
}

export async function saveResponse(submission) {
  const db = await getDb()
  const id = submission.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return db.put(STORE, { ...submission, id })
}

export async function getAllResponses() {
  const db = await getDb()
  return db.getAll(STORE)
}

export async function deleteResponse(id) {
  const db = await getDb()
  return db.delete(STORE, id)
}

export async function clearAllResponses() {
  const db = await getDb()
  return db.clear(STORE)
}
