import { test, expect } from '@playwright/test'
import { cleanupResume, loginWithUi, seedResume, skipWithoutAi, skipWithoutAuth, skipWithoutUiAuth } from './helpers'

test.describe('Analysis Page', () => {
  test('renders analysis summary and actionable links', async ({ page, request }) => {
    skipWithoutAuth()
    skipWithoutUiAuth()
    skipWithoutAi()
    const seeded = await seedResume(request)

    await loginWithUi(page)
    await page.goto(`/resume/${seeded.id}/analysis`)

    await expect(page.getByRole('heading', { name: 'AI Analysis' })).toBeVisible()
    await expect(page.getByText(`简历分析 - ${seeded.title}`)).toBeVisible()
    await expect(page.getByText('评分拆解')).toBeVisible()
    await expect(page.getByText('最优先动作')).toBeVisible()

    await cleanupResume(request, seeded.id)
  })
})
