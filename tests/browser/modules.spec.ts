import { expect, test } from '@playwright/test';

test('four modules read one model and keep the regional map distinct', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Φόρτωση συνθετικού DEMO' }).click();
  await page.getByRole('button', { name: 'Εφαρμογές' }).click();
  await expect(page.locator('[data-iso="GRC"]')).not.toHaveAttribute('data-value', 'none');
  await expect(page.locator('[data-iso="FRA"]')).toHaveAttribute('data-value', 'none');
  await expect(page.getByText('Χωρίς δεδομένα δεν σημαίνει μηδέν.')).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  const header = await page.locator('header.topbar').boundingBox();
  expect(header?.y ?? 99).toBeLessThan(2);
  const atlas = await page.locator('.atlas').boundingBox();
  expect(atlas?.height ?? 0).toBeGreaterThan(640);
  await expect(page.getByRole('button', { name: /Χώρες/ })).toHaveAttribute('data-availability', 'ready');
  await expect(page.locator('header.topbar select')).toHaveValue('2023');
  await page.screenshot({ path: 'docs/evidence/m4-world-1440.png' });

  await page.getByText('Στοιχεία και διαδρομές').click();
  await expect(page.getByTestId('milex-country:GRC')).toContainText('δισ.');
  await expect(page.getByTestId('milex-country:TUR')).not.toContainText('χωρίς δεδομένα');
  await expect(page.getByText('Δεν προκύπτει νικητής.')).toBeVisible();

  await expect(page.getByText('Απόθεμα:')).toBeVisible();
  await expect(page.getByText('Ροή:')).toBeVisible();
  await expect(page.getByText('Γερμανία → Συνθετική Ενεργειακή ΑΕ — DEMO → Συνθετικός τερματικός — DEMO → Αττική — DEMO')).toBeVisible();
  await expect(page.getByText('αιτιότητα')).toBeVisible();

  await page.getByText('Στοιχεία και διαδρομές').click();
  await page.getByRole('button', { name: 'Περιφέρειες' }).click();
  await expect(page.locator('[data-nuts]')).toHaveCount(13);
  await expect(page.locator('[data-nuts="EL30"]')).not.toHaveAttribute('data-value', 'none');
  await expect(page.locator('[data-nuts="EL41"]')).toHaveAttribute('data-value', 'none');
  await page.getByText('Στοιχεία και διαδρομές').click();
  await expect(page.getByText('Αττική — DEMO: γεωμετρία EL30')).toBeVisible();
  await expect(page.getByText('Κεντρική περιφέρεια — DEMO: χωρίς γεωμετρία')).toBeVisible();
  await page.getByText('Στοιχεία και διαδρομές').click();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'docs/evidence/m4-regions-1440.png' });
  await page.getByRole('button', { name: 'Χώρες' }).click();
  await page.getByRole('button', { name: 'Φίλτρα και ρόλοι' }).click();
  const checkbox = await page.locator('.checks input').first().boundingBox();
  expect(checkbox?.width ?? 99).toBeLessThan(28);
  await page.getByRole('button', { name: 'Φίλτρα και ρόλοι' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const phone = await page.locator('.atlas').boundingBox();
  expect(phone?.height ?? 0).toBeGreaterThan(420);
  await page.screenshot({ path: 'docs/evidence/m4-world-390.png', fullPage: true });
});
