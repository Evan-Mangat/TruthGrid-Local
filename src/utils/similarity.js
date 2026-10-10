// TF-IDF cosine similarity — runs entirely on-device, no network calls.
// Returns a score in [0, 1] measuring lexical overlap between studentText and passage.

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2)
}

// Very small stopword list — keeps domain words like "the", "and" but drops noise
const STOPWORDS = new Set([
  'the','and','for','that','this','with','from','they','have','been',
  'are','was','were','will','but','not','its','can','had','has','our',
  'you','your','their','there','than','then','what','when','who','which',
  'also','more','about','into','over','just','even','such','each','how',
])

function termFrequency(tokens) {
  const tf = {}
  for (const t of tokens) {
    if (!STOPWORDS.has(t)) tf[t] = (tf[t] || 0) + 1
  }
  // Normalize
  const max = Math.max(1, ...Object.values(tf))
  for (const t in tf) tf[t] /= max
  return tf
}

function cosineSimilarity(vecA, vecB) {
  const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)])
  let dot = 0, magA = 0, magB = 0
  for (const k of keys) {
    const a = vecA[k] || 0
    const b = vecB[k] || 0
    dot += a * b
    magA += a * a
    magB += b * b
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

export function scoreSimilarity(studentText, passage) {
  if (!studentText || !passage) return 0
  const studentTf = termFrequency(tokenize(studentText))
  const passageTf = termFrequency(tokenize(passage))
  return cosineSimilarity(studentTf, passageTf)
}
