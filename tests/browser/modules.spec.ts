import { expect, test } from '@playwright/test';

test('four modules read one model and keep the regional map distinct', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Φόρτωση συνθετικού DEMO' }).click();
  await page.getByRole('button', { name: 'Εφαρμογές' }).click();
  await expect(page.locator('[data-iso="GRC"]')).not.toHaveAttribute('data-value', 'none');
  await expect(page.locator('[data-iso="FRA"]')).toHaveAttribute('data-value', 'none');
  await expect(page.getByText('Χωρίς δεδομένα δεν σημαίνει μηδέν.')).toBeVisible();

  await page.getByRole('tab', { name: 'Ελλάδα–Τουρκία' }).click();
  await expect(page.getByTestId('milex-country:GRC')).toContainText('4160000000');
  await expect(page.getByTestId('milex-country:TUR')).not.toContainText('χωρίς δεδομένα');
  await expect(page.getByText('Δεν προκύπτει νικητής.')).toBeVisible();

  await page.getByRole('tab', { name: 'Κεφάλαια' }).click();
  await expect(page.getByText('Απόθεμα:')).toBeVisible();
  await expect(page.getByText('Ροή:')).toBeVisible();
  await expect(page.getByText('Γερμανία → Συνθετική Ενεργειακή ΑΕ — DEMO → Συνθετικός τερματικός — DEMO → Αττική — DEMO')).toBeVisible();
  await expect(page.getByText('αιτιότητα')).toBeVisible();

  await page.getByRole('tab', { name: 'Ελληνική οικονομία' }).click();
  await expect(page.locator('[data-nuts]')).toHaveCount(13);
  await expect(page.locator('[data-nuts="EL30"]')).not.toHaveAttribute('data-value', 'none');
  await expect(page.locator('[data-nuts="EL41"]')).toHaveAttribute('data-value', 'none');
  await expect(page.getByText('Αττική — DEMO: γεωμετρία EL30')).toBeVisible();
  await expect(page.getByText('Κεντρική περιφέρεια — DEMO: χωρίς γεωμετρία')).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'docs/evidence/m4-regions-1440.png' });
  await page.getByRole('tab', { name: 'Παγκόσμιος χάρτης' }).click();
  await page.screenshot({ path: 'docs/evidence/m4-world-1440.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/evidence/m4-world-390.png', fullPage: true });
});
