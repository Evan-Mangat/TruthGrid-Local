// TruthGrid Local — CSV Export Utility
// Serializes stored IndexedDB student responses into a classroom-ready CSV file.

export function escapeCsvField(val) {
  if (val === null || val === undefined) return ''
  let str = String(val)
  if (/^[\u0000-\u0020]*[=+@-]/.test(str)) str = `'${str}`
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportResponsesToCSV(responses) {
  if (!responses || responses.length === 0) {
    alert('No student responses available to export.')
    return
  }

  const headers = [
    'ID',
    'Student Name',
    'Student Number',
    'Submission Time',
    'Format Mode',
    'Overall Engagement (%)',
    'Point 1',
    'Example 1',
    'Explanation 1',
    'Example 1 Engagement (%)',
    'Point 2',
    'Example 2',
    'Explanation 2',
    'Example 2 Engagement (%)',
    'Point 3',
    'Example 3',
    'Explanation 3',
    'Example 3 Engagement (%)',
    'Reading Passage',
  ]

  const rows = responses.map(r => {
    const pts = r.points || []
    const scores = r.similarityScores || []
    const hasPassage = Boolean(r.passage && r.passage.trim())

    const validScores = scores
      .map(s => s.exampleScore)
      .filter(s => s !== null && s !== undefined)

    const avgScore =
      hasPassage && validScores.length > 0
        ? Math.round(
            (validScores.reduce((sum, s) => sum + s, 0) / validScores.length) * 100
          )
        : 'N/A (Open Prompt)'

    const p1 = pts[0] || {}
    const p2 = pts[1] || {}
    const p3 = pts[2] || {}

    const s1 = hasPassage && scores[0]?.exampleScore !== undefined && scores[0]?.exampleScore !== null ? Math.round(scores[0].exampleScore * 100) : (hasPassage ? '' : 'N/A (Open Prompt)')
    const s2 = hasPassage && scores[1]?.exampleScore !== undefined && scores[1]?.exampleScore !== null ? Math.round(scores[1].exampleScore * 100) : (hasPassage ? '' : 'N/A (Open Prompt)')
    const s3 = hasPassage && scores[2]?.exampleScore !== undefined && scores[2]?.exampleScore !== null ? Math.round(scores[2].exampleScore * 100) : (hasPassage ? '' : 'N/A (Open Prompt)')

    const mode = r.mode === 'short' || pts.length === 1 ? 'Short-Form (1 Point)' : 'Standard (3 Points)'

    return [
      escapeCsvField(r.id || ''),
      escapeCsvField(r.studentName || ''),
      escapeCsvField(r.studentNumber || ''),
      escapeCsvField(r.submittedAt || ''),
      escapeCsvField(mode),
      escapeCsvField(avgScore),
      escapeCsvField(p1.point || ''),
      escapeCsvField(p1.example || ''),
      escapeCsvField(p1.explanation || ''),
      escapeCsvField(s1),
      escapeCsvField(p2.point || ''),
      escapeCsvField(p2.example || ''),
      escapeCsvField(p2.explanation || ''),
      escapeCsvField(s2),
      escapeCsvField(p3.point || ''),
      escapeCsvField(p3.example || ''),
      escapeCsvField(p3.explanation || ''),
      escapeCsvField(s3),
      escapeCsvField(r.passage || ''),
    ].join(',')
  })

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const dateStr = new Date().toISOString().split('T')[0]
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `truthgrid_responses_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
