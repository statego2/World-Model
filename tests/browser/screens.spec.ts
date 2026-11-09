import { test } from '@playwright/test';

test('editor screens stay reachable from the map shell', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Φόρτωση συνθετικού DEMO' }).click();
  for (const [name, file] of [
    ['Οντολογία', 'px-ontology'],
    ['Οντότητες', 'px-entities'],
    ['Μεταφορά', 'px-transfer'],
  ] as const) {
    await page.getByRole('button', { name }).click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: `docs/evidence/${file}-1440.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `docs/evidence/${file}-390.png` });
  }
});
