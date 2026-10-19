// TruthGrid Local — Asymmetric Lexical Containment Scorer
// Runs 100% on-device, zero network calls, zero external dependencies.
//
// DESIGN INVARIANT:
// Scores are flags for teacher review only, NEVER grades or verdicts.
// A low score indicates the student's quote or detail may not directly match
// the passage text, prompting the teacher to double-check their citation.

function tokenize(text) {
  if (!text || typeof text !== 'string') return []
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2)
}

// Common functional words that do not carry topical literary evidence
const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'they', 'have', 'been',
  'are', 'was', 'were', 'will', 'but', 'not', 'its', 'can', 'had', 'has', 'our',
  'you', 'your', 'their', 'there', 'than', 'then', 'what', 'when', 'who', 'which',
  'also', 'more', 'about', 'into', 'over', 'just', 'even', 'such', 'each', 'how',
])

function countFrequencies(tokens, filterStopwords = true) {
  const counts = new Map()
  for (const t of tokens) {
    if (filterStopwords && STOPWORDS.has(t)) continue
    counts.set(t, (counts.get(t) || 0) + 1)
  }
  return counts
}

/**
 * Calculates asymmetric containment overlap between student text and the passage.
 *
 * Formula:
 *   Overlap = sum(min(count_student(w), count_passage(w))) / total_student_tokens
 *
 * Why containment over symmetric cosine similarity:
 * Student text is typically a concise 10–25 word quote or paraphrase, whereas the
 * reading passage is 300–800 words. Symmetric cosine similarity divides by sqrt(|Passage|),
 * causing verbatim 15-word quotes to score < 18% (false red flags).
 * Asymmetric containment correctly evaluates how much of the student's citation
 * is contained within the reference passage.
 *
 * @param {string} studentText - The student's written response or quote.
 * @param {string} passage - The source reading passage.
 * @returns {number} Float in range [0, 1].
 */
export function scoreSimilarity(studentText, passage) {
  if (!studentText || !passage) return 0

  const studentTokens = tokenize(studentText)
  if (studentTokens.length === 0) return 0

  const passageTokens = tokenize(passage)
  if (passageTokens.length === 0) return 0

  // First try filtering stopwords to focus on content words
  let studentCounts = countFrequencies(studentTokens, true)
  let passageCounts = countFrequencies(passageTokens, true)

  // If filtering stopwords leaves fewer than 2 tokens (e.g. very short quote),
  // fall back to including all tokens so we never unfairly penalize concise quotes.
  let totalStudentTokens = 0
  for (const count of studentCounts.values()) {
    totalStudentTokens += count
  }

  if (totalStudentTokens < 2) {
    studentCounts = countFrequencies(studentTokens, false)
    passageCounts = countFrequencies(passageTokens, false)
    totalStudentTokens = studentTokens.length
  }

  if (totalStudentTokens === 0) return 0

  // Count matches (with multiplicity bounded by occurrences in passage)
  let matchedTokens = 0
  for (const [token, studentFreq] of studentCounts.entries()) {
    const passageFreq = passageCounts.get(token) || 0
    matchedTokens += Math.min(studentFreq, passageFreq)
  }

  const containmentScore = matchedTokens / totalStudentTokens
  return Math.min(1, Math.max(0, containmentScore))
}
