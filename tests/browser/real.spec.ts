import { expect, test } from '@playwright/test';

test('the cited extract stays in a real workspace', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Φόρτωση πραγματικού αποσπάσματος' }).click();
  await expect(page.getByTestId('data-mode')).toHaveText('ΠΡΑΓΜΑΤΙΚΑ');
  await expect(page.getByRole('cell', { name: 'Attiki' })).toBeVisible();
  await expect(page.getByText('Συνθετική Ενεργειακή ΑΕ — DEMO')).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'docs/evidence/m5-real-1440.png' });
});
