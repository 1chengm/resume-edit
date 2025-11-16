import { test, expect } from '@playwright/test'

test('首页重定向并显示登录页中文文案', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
})

test('未登录访问仪表盘重定向到登录页', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
})