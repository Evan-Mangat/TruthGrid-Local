// IndexedDB persistence via idb — all data stays local on the device.
import { openDB } from 'idb'

const DB_NAME = 'truthgrid'
const DB_VERSION = 1
const STORE = 'responses'

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        store.createIndex('submittedAt', 'submittedAt')
        store.createIndex('studentName', 'studentName')
      }
    },
  })
}

export async function saveResponse(submission) {
  const db = await getDb()
  return db.add(STORE, { ...submission, id: undefined })
}

export async function getAllResponses() {
  const db = await getDb()
  return db.getAll(STORE)
}

export async function deleteResponse(id) {
  const db = await getDb()
  return db.delete(STORE, id)
}
