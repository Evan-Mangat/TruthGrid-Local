// Pure JavaScript Conventions & Style Checker
// 100% on-device, zero 3rd-party dependencies, works completely offline.
// Formulated specifically for BC secondary English & literary analysis standards.

export const LITERARY_PAST_TENSE_MAP = {
  realized: 'realizes',
  showed: 'shows',
  argued: 'argues',
  wrote: 'writes',
  stated: 'states',
  explained: 'explains',
  described: 'describes',
  believed: 'believes',
  revealed: 'reveals',
  concluded: 'concludes',
  demonstrated: 'demonstrates',
  portrayed: 'portrays',
  suggested: 'suggests',
  observed: 'observes',
  said: 'says',
  felt: 'feels',
  saw: 'sees',
  became: 'becomes',
  thought: 'thinks',
  found: 'finds',
  implied: 'implies',
  illustrated: 'illustrates',
  asserted: 'asserts',
  emphasized: 'emphasizes',
}

export const FIRST_PERSON_PRONOUNS = ['i', 'me', 'my', 'mine', 'myself', 'we', 'us', 'our', 'ours', 'ourselves']
export const SECOND_PERSON_PRONOUNS = ['you', 'your', 'yours', 'yourself', 'yourselves']

export const COMMON_CONTRACTIONS_MAP = {
  "don't": 'do not',
  "don’t": 'do not',
  "doesn't": 'does not',
  "doesn’t": 'does not',
  "didn't": 'did not',
  "didn’t": 'did not',
  "can't": 'cannot',
  "can’t": 'cannot',
  "won't": 'will not',
  "won’t": 'will not',
  "wouldn't": 'would not',
  "wouldn’t": 'would not',
  "couldn't": 'could not',
  "couldn’t": 'could not',
  "shouldn't": 'should not',
  "shouldn’t": 'should not',
  "isn't": 'is not',
  "isn’t": 'is not',
  "aren't": 'are not',
  "aren’t": 'are not',
  "wasn't": 'was not',
  "wasn’t": 'was not',
  "weren't": 'were not',
  "weren’t": 'were not',
  "haven't": 'have not',
  "haven’t": 'have not',
  "hasn't": 'has not',
  "hasn’t": 'has not',
}

export const COMMON_PHRASE_CORRECTIONS = [
  { regex: /\bcould\s+of\b/gi, fix: 'could have', message: 'Use “could have” instead of “could of”.' },
  { regex: /\bshould\s+of\b/gi, fix: 'should have', message: 'Use “should have” instead of “should of”.' },
  { regex: /\bwould\s+of\b/gi, fix: 'would have', message: 'Use “would have” instead of “would of”.' },
  { regex: /\bmight\s+of\b/gi, fix: 'might have', message: 'Use “might have” instead of “might of”.' },
  { regex: /\balot\b/gi, fix: 'a lot', message: '“Alot” is not standard English; use “a lot” or formal academic alternatives like “substantially” or “significantly”.' },
]

export const CONVERSATIONAL_FILLERS = [
  { regex: /\bin\s+my\s+opinion\b/gi, phrase: 'in my opinion', message: 'Avoid conversational filler “in my opinion”. Academic analysis should state assertions directly and objectively.' },
  { regex: /\bi\s+(?:believe|think|feel)\s+(?:that\s+)?/gi, phrase: 'I believe/think', message: 'Avoid conversational self-reference (“I think / I believe”). Express your analytical point directly as a claim.' },
  { regex: /\bas\s+you\s+can\s+see\b/gi, phrase: 'as you can see', message: 'Avoid conversational phrasing “as you can see”. Direct the reader to what the evidence demonstrates.' },
  { regex: /\bbasically\b/gi, phrase: 'basically', message: 'Avoid conversational filler “basically”. Be precise with your analytical argument.' },
  { regex: /\bkind\s+of\b/gi, phrase: 'kind of', message: 'Avoid vague phrasing “kind of”. Use precise, definitive analytical vocabulary.' },
  { regex: /\bsort\s+of\b/gi, phrase: 'sort of', message: 'Avoid vague phrasing “sort of”. Use precise, definitive analytical vocabulary.' },
]

export const WEAK_ANALYTICAL_WORDS = [
  { regex: /\bgood\b/gi, word: 'good', message: 'Replace vague word “good” with precise analytical diction (e.g. “effective,” “noble,” “beneficial,” “moral,” or “virtuous”).' },
  { regex: /\bbad\b/gi, word: 'bad', message: 'Replace vague word “bad” with precise analytical diction (e.g. “destructive,” “harmful,” “corrupt,” “detrimental,” or “flawed”).' },
  { regex: /\bstuff\b/gi, word: 'stuff', message: 'Avoid informal word “stuff”. Use formal terminology like “elements,” “details,” “motifs,” or “literary devices”.' },
  { regex: /\bthings\b/gi, word: 'things', message: 'Avoid vague word “things”. Use precise terminology like “actions,” “factors,” “qualities,” “events,” or “motifs”.' },
]

// Vague pronoun openers — catches "This shows", "This demonstrates", "It reveals", etc.
// at the start of a sentence when no noun immediately follows the pronoun.
export const VAGUE_PRONOUN_OPENERS = [
  {
    // "This" or "These" immediately followed by a verb (no descriptive noun between them)
    regex: /(^|[.!?]\s+)(This|These)\s+(shows?|demonstrates?|reveals?|proves?|suggests?|indicates?|illustrates?|means?|implies?|highlights?|emphasizes?|supports?|confirms?)\b/gi,
    message: (match) => {
      const word = /\b(This|These)\b/i.exec(match)?.[0] || 'This'
      return `Vague pronoun reference: "${word}" at the start of a sentence does not name what it refers to. Consider replacing with a specific noun phrase (e.g., "This contrast shows…", "This detail reveals…", "These events demonstrate…").`
    },
  },
  {
    // "It" immediately followed by a verb
    regex: /(^|[.!?]\s+)It\s+(shows?|demonstrates?|reveals?|proves?|suggests?|indicates?|illustrates?|means?|implies?|highlights?|emphasizes?|supports?|confirms?)\b/gi,
    message: () => `Vague pronoun reference: "It" at the start of a sentence does not name what it refers to. Replace with a specific subject (e.g., "This symbol shows…", "The author's choice reveals…").`,
  },
]

// Subject-verb agreement mismatches — common high-school errors
export const SUBJECT_VERB_MISMATCHES = [
  { regex: /\bthey\s+was\b/gi, message: 'Subject-verb agreement: use "they were" not "they was".' },
  { regex: /\bhe\s+were\b/gi, message: 'Subject-verb agreement: use "he was" not "he were".' },
  { regex: /\bshe\s+were\b/gi, message: 'Subject-verb agreement: use "she was" not "she were".' },
  { regex: /(?<!if\s)\bit\s+were\b(?!\s+not)/gi, message: 'Subject-verb agreement: use "it was" not "it were" (unless using the subjunctive mood, e.g., "as if it were").' },
  { regex: /\bwe\s+was\b/gi, message: 'Subject-verb agreement: use "we were" not "we was".' },
  { regex: /(?<!if\s)\bi\s+were\b(?!\s+not)/gi, message: 'Subject-verb agreement: use "I was" not "I were" (unless using the subjunctive mood).' },
  { regex: /\bhe\s+don'?t\b/gi, message: 'Subject-verb agreement: use "he doesn\'t" not "he don\'t".' },
  { regex: /\bshe\s+don'?t\b/gi, message: 'Subject-verb agreement: use "she doesn\'t" not "she don\'t".' },
  { regex: /\bit\s+don'?t\b/gi, message: 'Subject-verb agreement: use "it doesn\'t" not "it don\'t".' },
  { regex: /\bthey\s+is\b/gi, message: 'Subject-verb agreement: use "they are" not "they is".' },
  { regex: /\bwe\s+is\b/gi, message: 'Subject-verb agreement: use "we are" not "we is".' },
]

/**
 * Strips quoted text so that characters speaking in quotes (e.g. "I will never go")
 * do not falsely trigger 1st-person or past-tense alerts on the student's analysis.
 */
export function stripQuotations(text) {
  if (!text) return ''
  return text
    .replace(/"[^"]*"/g, ' ')
    .replace(/“[^”]*”/g, ' ')
    .replace(/'[^']*'/g, ' ')
    .replace(/‘[^’]*’/g, ' ')
}

/**
 * Analyzes student text for:
 * 1. Literary present tense (flags past tense like "showed" -> suggests "shows")
 * 2. Third person (flags "I", "you", "we" outside quotes)
 * 3. Sentence capitalization, terminal punctuation, repeated duplicate words
 */
export function checkConventions(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      tenseIssues: [],
      pronounIssues: [],
      academicToneIssues: [],
      punctuationIssues: [],
      allIssues: [],
      hasIssues: false,
    }
  }

  const unquotedText = stripQuotations(text)
  const tenseIssues = []
  const pronounIssues = []
  const punctuationIssues = []
  const academicToneIssues = []

  // 1. Literary Present Tense Check
  const pastTenseWords = Object.keys(LITERARY_PAST_TENSE_MAP)
  const pastTenseRegex = new RegExp(`\\b(${pastTenseWords.join('|')})\\b`, 'gi')
  const tenseMatches = unquotedText.match(pastTenseRegex) || []
  const seenTense = new Set()

  for (const match of tenseMatches) {
    const lower = match.toLowerCase()
    if (!seenTense.has(lower) && LITERARY_PAST_TENSE_MAP[lower]) {
      seenTense.add(lower)
      tenseIssues.push({
        type: 'tense',
        word: match,
        suggestion: LITERARY_PAST_TENSE_MAP[lower],
        message: `Use literary present tense: change “${match}” to “${LITERARY_PAST_TENSE_MAP[lower]}”.`,
      })
    }
  }

  // 2. Third Person Check (Avoid 1st & 2nd person)
  const allForbiddenPronouns = [...FIRST_PERSON_PRONOUNS, ...SECOND_PERSON_PRONOUNS]
  const pronounRegex = new RegExp(`\\b(${allForbiddenPronouns.join('|')})\\b`, 'gi')
  const pronounMatches = unquotedText.match(pronounRegex) || []
  const seenPronouns = new Set()

  for (const match of pronounMatches) {
    const lower = match.toLowerCase()
    if (!seenPronouns.has(lower)) {
      seenPronouns.add(lower)
      const isSecondPerson = SECOND_PERSON_PRONOUNS.includes(lower)
      pronounIssues.push({
        type: 'pronoun',
        word: match,
        category: isSecondPerson ? 'second-person' : 'first-person',
        message: isSecondPerson
          ? `Avoid second-person “${match}”. Formal literary analysis uses third-person perspective (e.g. “the reader”, “one”, “society”).`
          : `Avoid first-person “${match}”. Formal literary analysis uses objective third-person analysis without “I” or “we”.`,
      })
    }
  }

  // 3. Academic Tone & Common Word Traps
  // 3a. Common phrase corrections (e.g. could of -> could have, alot -> a lot)
  for (const item of COMMON_PHRASE_CORRECTIONS) {
    if (item.regex.test(unquotedText)) {
      academicToneIssues.push({
        type: 'word-choice',
        message: item.message,
      })
    }
  }

  // 3b. Formal essay contractions check outside quotes
  const contractionKeys = Object.keys(COMMON_CONTRACTIONS_MAP)
  const contractionRegex = new RegExp(`\\b(${contractionKeys.join('|')})\\b`, 'gi')
  const contractionMatches = unquotedText.match(contractionRegex) || []
  const seenContractions = new Set()
  for (const match of contractionMatches) {
    const lower = match.toLowerCase()
    if (!seenContractions.has(lower) && COMMON_CONTRACTIONS_MAP[lower]) {
      seenContractions.add(lower)
      academicToneIssues.push({
        type: 'contraction',
        word: match,
        suggestion: COMMON_CONTRACTIONS_MAP[lower],
        message: `In formal essays, avoid contractions: change “${match}” to “${COMMON_CONTRACTIONS_MAP[lower]}”.`,
      })
    }
  }

  // 3c. Conversational fillers outside quotes (e.g. "in my opinion", "as you can see", "basically")
  for (const item of CONVERSATIONAL_FILLERS) {
    if (item.regex.test(unquotedText)) {
      academicToneIssues.push({
        type: 'filler',
        message: item.message,
      })
    }
  }

  // 3d. Weak adjectives / vague analytical vocabulary outside quotes (good, bad, stuff, things)
  const seenWeak = new Set()
  for (const item of WEAK_ANALYTICAL_WORDS) {
    if (item.regex.test(unquotedText) && !seenWeak.has(item.word)) {
      seenWeak.add(item.word)
      academicToneIssues.push({
        type: 'vague-diction',
        word: item.word,
        message: item.message,
      })
    }
  }

  // 3e. Vague pronoun openers (This shows, It reveals, etc. at sentence start)
  const seenVaguePronoun = new Set()
  for (const item of VAGUE_PRONOUN_OPENERS) {
    // Reset lastIndex because we reuse the regex
    item.regex.lastIndex = 0
    let vpMatch
    while ((vpMatch = item.regex.exec(unquotedText)) !== null) {
      const key = vpMatch[0].trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase()
      if (!seenVaguePronoun.has(key)) {
        seenVaguePronoun.add(key)
        academicToneIssues.push({
          type: 'vague-pronoun',
          message: item.message(vpMatch[0]),
        })
      }
    }
  }

  // 3f. Subject-verb agreement mismatches (they was, he were, etc.) — checked on unquoted text
  const seenSVA = new Set()
  for (const item of SUBJECT_VERB_MISMATCHES) {
    item.regex.lastIndex = 0
    if (item.regex.test(unquotedText) && !seenSVA.has(item.message)) {
      seenSVA.add(item.message)
      academicToneIssues.push({
        type: 'subject-verb',
        message: item.message,
      })
    }
  }

  // 4. Sentence Completeness & Punctuation
  // Check for periods or commas placed outside quotation marks (e.g. "bravery", or "truth".)
  const quotePunctuationRegex = /(?:["”]|'[^'\n]+')\s*([,.])/g
  let qpMatch
  const seenQP = new Set()
  while ((qpMatch = quotePunctuationRegex.exec(text)) !== null) {
    const punct = qpMatch[1]
    if (!seenQP.has(punct)) {
      seenQP.add(punct)
      punctuationIssues.push({
        type: 'quote-punctuation',
        message: `Quotation punctuation placement: in standard academic analysis, place commas and periods inside quotation marks (e.g., “phrase${punct}” instead of “phrase”${punct}).`,
      })
    }
  }

  // Check for repeated duplicate words (e.g. "the the", "in in")
  const duplicateWordRegex = /\b([a-zA-Z]{2,})\s+\1\b/gi
  let dupMatch
  const seenDups = new Set()
  while ((dupMatch = duplicateWordRegex.exec(text)) !== null) {
    const word = dupMatch[1]
    if (!seenDups.has(word.toLowerCase())) {
      seenDups.add(word.toLowerCase())
      punctuationIssues.push({
        type: 'duplicate',
        word,
        message: `Repeated word detected: “${word} ${word}”.`,
      })
    }
  }

  // Check for space before punctuation (e.g. "word ,")
  if (/\s+[,;:!?]/.test(unquotedText)) {
    punctuationIssues.push({
      type: 'spacing',
      message: 'Unwanted space before punctuation detected (e.g. remove spaces before commas, periods, or semicolons).',
    })
  }

  // Check for lowercase sentence starter after terminal punctuation (. a -> . A)
  const lowercaseAfterPeriodRegex = /[.!?]\s+([a-z])/g
  let sentenceCapMatch
  while ((sentenceCapMatch = lowercaseAfterPeriodRegex.exec(unquotedText)) !== null) {
    punctuationIssues.push({
      type: 'capitalization',
      message: `Possible missing sentence capitalization: sentence begins with lowercase “${sentenceCapMatch[1]}”.`,
    })
    break // only flag once per text to avoid clutter
  }

  // Check for lowercase isolated "i"
  if (/\b[i]\b/.test(text)) {
    punctuationIssues.push({
      type: 'capitalization',
      message: `Found uncapitalized pronoun “i”. Always capitalize “I” (or rephrase in third person).`,
    })
  }

  // Check if trimmed text has terminal punctuation
  const trimmed = text.trim()
  if (trimmed.length > 20 && !/[.!?]["'”’]?$/.test(trimmed)) {
    punctuationIssues.push({
      type: 'punctuation',
      message: `Paragraph or sentence is missing ending punctuation (. or ! or ?).`,
    })
  }

  const allIssues = [...tenseIssues, ...pronounIssues, ...academicToneIssues, ...punctuationIssues]

  return {
    tenseIssues,
    pronounIssues,
    academicToneIssues,
    punctuationIssues,
    allIssues,
    hasIssues: allIssues.length > 0,
  }
}

