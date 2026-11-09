import { expect, test } from '@playwright/test';

test('the cited extract stays in a real workspace', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Φόρτωση πραγματικού αποσπάσματος' }).click();
  await expect(page.getByTestId('data-mode')).toHaveText('ΠΡΑΓΜΑΤΙΚΑ');
  await expect(page.getByRole('cell', { name: 'Attiki' })).toBeVisible();
  await expect(page.getByText('Συνθετική Ενεργειακή ΑΕ — DEMO')).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'docs/evidence/m5-real-1440.png' });
  await page.getByRole('button', { name: 'Εφαρμογές' }).click();
  await expect(page.locator('[data-iso="GRC"]')).not.toHaveAttribute('data-value', 'none');
  await expect(page.locator('[data-iso="FRA"]')).toHaveAttribute('data-value', 'none');
  await page.getByRole('tab', { name: 'Κεφάλαια' }).click();
  await expect(page.getByTestId('capital-path').filter({ hasText: 'Germany → FRAPORT AG → Αεροδρόμιο Χανίων → Kriti' })).toBeVisible();
  await expect(page.getByTestId('unmapped-airports')).toContainText('Αεροδρόμιο Σαντορίνης');
  await expect(page.getByTestId('unmapped-airports')).toContainText('Αεροδρόμιο Ακτίου');
  await expect(page.getByText('αιτιότητα')).toBeVisible();
  await page.screenshot({ path: 'docs/evidence/m5-path-1440.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/evidence/m5-path-390.png', fullPage: true });
});
