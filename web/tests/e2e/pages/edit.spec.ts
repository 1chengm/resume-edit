import { test, expect } from '@playwright/test'
import { cleanupResume, expectEditorShell, loginWithUi, seedResume, skipWithoutAuth, skipWithoutUiAuth } from './helpers'

test.describe('Resume Edit Page', () => {
  test('loads editor shell and preview for a seeded resume', async ({ page, request }) => {
    skipWithoutAuth()
    skipWithoutUiAuth()
    const seeded = await seedResume(request)

    await loginWithUi(page)
    await page.goto(`/resume/${seeded.id}/edit`)

    await expectEditorShell(page)
    await expect(page.getByRole('heading', { name: '基本信息' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '工作经历' })).toBeVisible()
    await expect(page.getByText('Live Preview')).toBeVisible()
    await expect(page.getByText('Modern Template')).toBeVisible()

    await cleanupResume(request, seeded.id)
  })

  test('accepts AI hint query params and shows focus card', async ({ page, request }) => {
    skipWithoutAuth()
    skipWithoutUiAuth()
    const seeded = await seedResume(request)

    await loginWithUi(page)
    await page.goto(`/resume/${seeded.id}/edit?section=summary&hint=${encodeURIComponent('请补充量化结果与求职定位')}`)

    await expect(page.getByText('AI Focus')).toBeVisible()
    await expect(page.getByText('请补充量化结果与求职定位')).toBeVisible()

    await cleanupResume(request, seeded.id)
  })
})
