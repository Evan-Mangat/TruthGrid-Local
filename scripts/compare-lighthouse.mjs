import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const [baselineArgument, reportsArgument = 'reports/lighthouse'] = process.argv.slice(2)
const candidateDirectory = process.cwd()
const baselineDirectory = baselineArgument ? path.resolve(baselineArgument) : ''
const hasBaseline = Boolean(baselineDirectory && existsSync(path.join(baselineDirectory, 'dist', 'index.html')))
const candidateDist = path.join(candidateDirectory, 'dist', 'index.html')
const reportsDirectory = path.resolve(reportsArgument)
const budgetPath = fileURLToPath(new URL('./performance-budget.json', import.meta.url))
const budget = JSON.parse(readFileSync(budgetPath, 'utf8'))
const appPath = process.env.TRUTHGRID_BASE_PATH || '/TruthGrid-Local/'
const chromePath = (await import('@playwright/test')).chromium.executablePath()
const servers = []

if (!pathExists(candidateDist)) throw new Error(`Candidate build not found: ${candidateDist}`)
if (hasBaseline && !pathExists(path.join(baselineDirectory, 'dist', 'index.html'))) {
  throw new Error(`Baseline build not found: ${path.join(baselineDirectory, 'dist', 'index.html')}`)
}

function pathExists(filePath) {
  try {
    readFileSync(filePath)
    return true
  } catch {
    return false
  }
}

function startPreview(directory, port) {
  const viteCli = path.join(directory, 'node_modules', 'vite', 'bin', 'vite.js')
  const server = spawn(process.execPath, [viteCli, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: directory,
    env: { ...process.env, GITHUB_PAGES: 'true' },
    stdio: 'ignore',
  })
  servers.push(server)
  return server
}

async function waitForServer(url, server) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Preview server exited with code ${server.exitCode}`)
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The preview server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function runLighthouse(url, outputPath) {
  const result = spawnSync('npx', [
    '--yes',
    '--package=lighthouse@13.6.0',
    '--',
    'lighthouse',
    url,
    '--output=json',
    `--output-path=${outputPath}`,
    '--preset=desktop',
    '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage',
    '--quiet',
  ], {
    cwd: candidateDirectory,
    env: { ...process.env, CHROME_PATH: chromePath },
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    timeout: 180_000,
  })
  if (result.error || result.status !== 0) {
    throw new Error(`Lighthouse failed for ${url}: ${result.stderr || result.error?.message}`)
  }
  return JSON.parse(readFileSync(outputPath, 'utf8'))
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

function measure(reports) {
  const metrics = Object.keys(budget.regressionNoiseFloors)
  const result = Object.fromEntries(metrics.map(metric => [
    metric,
    median(reports.map(report => report.audits[metric].numericValue)),
  ]))
  result['performance-score'] = median(reports.map(report => report.categories.performance.score))
  return result
}

mkdirSync(reportsDirectory, { recursive: true })
const baselineReports = []
const candidateReports = []
let baselineServer
let candidateServer

try {
  if (hasBaseline) {
    baselineServer = startPreview(baselineDirectory, 4173)
    await waitForServer(`http://127.0.0.1:4173${appPath}`, baselineServer)
  }
  candidateServer = startPreview(candidateDirectory, hasBaseline ? 4174 : 4173)
  const candidatePort = hasBaseline ? 4174 : 4173
  await waitForServer(`http://127.0.0.1:${candidatePort}${appPath}`, candidateServer)

  for (let run = 1; run <= budget.runs; run += 1) {
    if (hasBaseline) {
      const reportPath = path.join(reportsDirectory, `baseline-${run}.json`)
      baselineReports.push(runLighthouse(`http://127.0.0.1:4173${appPath}`, reportPath))
    }
    const reportPath = path.join(reportsDirectory, `candidate-${run}.json`)
    candidateReports.push(runLighthouse(`http://127.0.0.1:${candidatePort}${appPath}`, reportPath))
  }
} finally {
  for (const server of servers) server.kill('SIGTERM')
}

const candidateMetrics = measure(candidateReports)
const baselineMetrics = hasBaseline ? measure(baselineReports) : null
const failures = []

for (const [metric, maximum] of Object.entries(budget.absoluteBudgets)) {
  if (candidateMetrics[metric] > maximum) {
    failures.push(`${metric} ${candidateMetrics[metric]} exceeded absolute budget ${maximum}`)
  }
}

for (const [metric, minimum] of Object.entries(budget.minimumScores)) {
  if (candidateMetrics[metric] < minimum) {
    failures.push(`${metric} ${candidateMetrics[metric]} fell below minimum score ${minimum}`)
  }
}

if (hasBaseline) {
  for (const [metric, noiseFloor] of Object.entries(budget.regressionNoiseFloors)) {
    const maximum = Math.max(
      baselineMetrics[metric] * (1 + budget.maxRegressionPercent / 100),
      baselineMetrics[metric] + noiseFloor
    )
    if (candidateMetrics[metric] > maximum) {
      failures.push(`${metric} regressed from ${baselineMetrics[metric]} to ${candidateMetrics[metric]} (allowed ${maximum})`)
    }
  }
}

const summary = {
  baselineAvailable: hasBaseline,
  runsPerBuild: budget.runs,
  maxRegressionPercent: budget.maxRegressionPercent,
  baselineMetrics,
  candidateMetrics,
  failures,
}
writeFileSync(path.join(reportsDirectory, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)

console.log(`Lighthouse candidate medians: ${JSON.stringify(candidateMetrics)}`)
if (baselineMetrics) console.log(`Lighthouse baseline medians: ${JSON.stringify(baselineMetrics)}`)
else console.warn('No build baseline is available; absolute performance budgets were applied.')

if (failures.length) {
  console.error('Lighthouse performance budgets failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log('Lighthouse performance budgets passed.')
}