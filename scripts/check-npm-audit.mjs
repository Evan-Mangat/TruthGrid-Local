import { spawnSync } from 'node:child_process'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const [baselineArgument, candidateArgument, reportArgument] = process.argv.slice(2)

if (!baselineArgument || !candidateArgument || !reportArgument) {
  throw new Error('Usage: node check-npm-audit.mjs <baseline-json> <candidate-dir> <report-path>')
}

function auditDirectory(directory) {
  const result = spawnSync('npm', ['audit', '--json'], {
    cwd: directory,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })

  if (result.error || ![0, 1].includes(result.status)) {
    throw new Error(`npm audit could not complete in ${directory}: ${result.stderr || result.error?.message}`)
  }

  let audit
  try {
    audit = JSON.parse(result.stdout)
  } catch {
    throw new Error(`npm audit returned invalid JSON in ${directory}: ${result.stderr}`)
  }
  if (audit.error || !audit.vulnerabilities) {
    throw new Error(`npm audit failed in ${directory}: ${JSON.stringify(audit.error || audit)}`)
  }

  const findingsByKey = new Map()
  const affectedPackages = []
  for (const [name, vulnerability] of Object.entries(audit.vulnerabilities)) {
    const advisories = vulnerability.via.filter(entry => typeof entry === 'object')
    const nodes = vulnerability.nodes?.length ? vulnerability.nodes : ['(node path unavailable)']
    if (!advisories.length) {
      affectedPackages.push({
        package: name,
        severity: vulnerability.severity,
        via: vulnerability.via,
        nodes,
      })
      continue
    }

    for (const advisory of advisories) {
      const id = advisory.url?.split('/').at(-1) || advisory.title
      const key = `${name}:${id}`
      const finding = findingsByKey.get(key) || {
        key,
        package: name,
        advisory: id,
        severity: advisory.severity || vulnerability.severity,
        title: advisory.title || id,
        url: advisory.url || null,
        range: advisory.range || vulnerability.range,
        nodes: [],
      }
      finding.nodes.push(...nodes)
      findingsByKey.set(key, finding)
    }
  }

  return {
    counts: audit.metadata.vulnerabilities,
    findings: [...findingsByKey.values()].map(finding => ({
      ...finding,
      nodes: [...new Set(finding.nodes)].sort(),
    })),
    affectedPackages,
  }
}

const baseline = JSON.parse(readFileSync(path.resolve(baselineArgument), 'utf8'))
if (!Array.isArray(baseline.findings)) {
  throw new Error('npm audit baseline must contain a findings array.')
}

const candidateDirectory = path.resolve(candidateArgument)
const candidate = auditDirectory(candidateDirectory)
const baselineFindings = new Map(baseline.findings.map(finding => [`${finding.package}:${finding.advisory}`, finding]))
const severityRank = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 }
const newFindings = candidate.findings.filter(finding => {
  const previous = baselineFindings.get(finding.key)
  return !previous || severityRank[finding.severity] > severityRank[previous.severity]
})

const report = {
  baselineDate: baseline.date,
  baselineCounts: baseline.counts,
  candidateCounts: candidate.counts,
  newFindings,
  existingFindings: candidate.findings.filter(finding => !newFindings.includes(finding)),
  affectedPackages: candidate.affectedPackages,
}
const reportPath = path.resolve(reportArgument)
mkdirSync(path.dirname(reportPath), { recursive: true })
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)

console.log(`Candidate npm audit totals: ${JSON.stringify(candidate.counts)}`)
console.log(`Recorded baseline npm audit totals: ${JSON.stringify(baseline.counts)} (created ${baseline.date})`)
console.warn(baseline.note)

if (newFindings.length) {
  console.error(`Found ${newFindings.length} new or more-severe npm advisories:`)
  for (const finding of newFindings) {
    console.error(`- ${finding.severity}: ${finding.package} ${finding.advisory} (${finding.nodes.join(', ')}) ${finding.url || ''}`)
  }
  process.exitCode = 1
} else {
  console.log('No npm advisories were introduced or increased in severity.')
}