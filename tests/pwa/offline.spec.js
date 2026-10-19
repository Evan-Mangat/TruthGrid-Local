import { expect, test } from '@playwright/test'

test('installed app shell reloads after the browser goes offline', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'TruthGrid Classroom' })).toBeVisible()

  const manifest = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifest).toBeTruthy()
  const manifestResponse = await page.request.get(new URL(manifest, page.url()).toString())
  const manifestData = await manifestResponse.json()
  expect(manifestData.display).toBe('standalone')

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'TruthGrid Classroom' })).toBeVisible()
  await expect(page.getByLabel(/Reading Passage/)).toBeVisible()
})