import { readFileSync } from 'node:fs'

const [sbomPath, policyPath] = process.argv.slice(2)
if (!sbomPath || !policyPath) {
  throw new Error('Usage: node check-license-policy.mjs <sbom-json> <policy-json>')
}

const sbom = JSON.parse(readFileSync(sbomPath, 'utf8'))
const policy = JSON.parse(readFileSync(policyPath, 'utf8'))
const components = (sbom.components || []).filter(component => component.type !== 'application')
const missingLicenses = []
const blockedLicenses = []

for (const component of components) {
  const declarations = (component.licenses || []).map(entry =>
    entry.expression || entry.license?.id || entry.license?.name || ''
  ).filter(Boolean)

  const componentName = `${component.name || 'unnamed'}${component.version ? `@${component.version}` : ''}`
  if (!declarations.length) {
    missingLicenses.push(componentName)
    continue
  }

  for (const declaration of declarations) {
    const normalized = declaration.toUpperCase()
    const blockedPrefix = policy.blockedLicensePrefixes.find(prefix => {
      const escapedPrefix = prefix.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`(^|[^A-Z0-9])${escapedPrefix}[A-Z0-9.-]*`).test(normalized)
    })
    if (blockedPrefix) blockedLicenses.push({ component: componentName, license: declaration, blockedPrefix })
  }
}

console.log(`Reviewed ${components.length} dependency components.`)
console.log(policy.policyNote)

if (missingLicenses.length) {
  console.error(`Dependencies with missing or unrecognized license metadata (${missingLicenses.length}):`)
  for (const component of missingLicenses) console.error(`- ${component}`)
}

if (blockedLicenses.length) {
  console.error(`Dependencies matching the prohibited-license policy (${blockedLicenses.length}):`)
  for (const finding of blockedLicenses) {
    console.error(`- ${finding.component}: ${finding.license} (blocked family ${finding.blockedPrefix})`)
  }
}

if ((policy.failOnMissingLicense && missingLicenses.length) || blockedLicenses.length) {
  process.exitCode = 1
} else {
  console.log('Dependency license policy passed.')
}