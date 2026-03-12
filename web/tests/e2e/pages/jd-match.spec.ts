import { test, expect } from '@playwright/test'
import { cleanupResume, loginWithUi, seedResume, skipWithoutAi, skipWithoutAuth, skipWithoutUiAuth } from './helpers'

test.describe('JD Match Page', () => {
  test('submits JD text and shows result shell', async ({ page, request }) => {
    skipWithoutAuth()
    skipWithoutUiAuth()
    skipWithoutAi()
    const seeded = await seedResume(request)

    await loginWithUi(page)
    await page.goto(`/resume/${seeded.id}/jd-match`)

    await expect(page.getByRole('heading', { name: 'JD Match' })).toBeVisible()
    await page.getByPlaceholder('粘贴完整 JD，包括职责、必备技能、加分项和业务背景。').fill(
      'We need a frontend engineer with React, TypeScript, design system, analytics and performance optimization experience.'
    )
    await page.getByRole('button', { name: '开始匹配' }).click()

    await expect(page.getByText('推荐动作')).toBeVisible()
    await expect(page.getByText('已覆盖关键词')).toBeVisible()

    await cleanupResume(request, seeded.id)
  })
})
