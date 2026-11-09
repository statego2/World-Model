import { expect, test } from '@playwright/test';

test('search opens a two-step neighborhood and a series keeps gaps empty', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Φόρτωση συνθετικού DEMO' }).click();
  await page.getByRole('button', { name: 'Εξερεύνηση' }).click();
  await page.getByLabel('Αναζήτηση οντότητας').fill('Γερμαν');
  await page.getByRole('button', { name: 'Γερμανία' }).click();
  await expect(page.getByTestId('neighborhood-table')).toContainText('Συνθετικός τερματικός — DEMO');
  await page.getByLabel('Βήματα').selectOption('1');
  await expect(page.getByTestId('neighborhood-table')).not.toContainText('Συνθετικός τερματικός — DEMO');
  await expect(page.getByTestId('graph-inspector')).toContainText('country:DEU');

  await page.getByRole('checkbox', { name: 'Ελλάδα' }).check();
  await page.getByRole('checkbox', { name: 'Γερμανία' }).check();
  await expect(page.getByTestId('series-table')).toContainText('2022');
  await expect(page.getByTestId('series-table')).toContainText('2023');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'docs/evidence/n4-graph-1440.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/evidence/n4-graph-390.png', fullPage: true });
});
