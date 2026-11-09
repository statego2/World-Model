import { expect, test } from '@playwright/test';

test('the same saved view includes a company added from the UI', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Φόρτωση συνθετικού DEMO' }).click();
  await page.getByRole('button', { name: 'Εξερεύνηση' }).click();
  await page.getByRole('button', { name: 'Εκτέλεση' }).click();
  await expect(page.getByTestId('path-results')).toContainText('Γερμανία → Συνθετική Ενεργειακή ΑΕ — DEMO → Συνθετικός τερματικός — DEMO → Αττική — DEMO');
  await expect(page.getByTestId('path-results')).toContainText('αιτιότητα');

  await page.getByRole('button', { name: 'Οντότητες' }).click();
  await addEntity(page, 'Εταιρεία', 'company:SECOND', 'Δεύτερη — DEMO');
  await addEntity(page, 'Υποδομή', 'infra:SECOND', 'Δεύτερη υποδομή — DEMO');

  await page.getByRole('button', { name: 'Σχέσεις' }).click();
  await addEdge(page, 'edge:second-invest', 'Επενδυτική σχέση', 'Γερμανία', 'Δεύτερη — DEMO');
  await addEdge(page, 'edge:second-operates', 'Λειτουργεί', 'Δεύτερη — DEMO', 'Δεύτερη υποδομή — DEMO');
  await addEdge(page, 'edge:second-location', 'Βρίσκεται σε', 'Δεύτερη υποδομή — DEMO', 'Κεντρική περιφέρεια — DEMO');

  await page.getByRole('button', { name: 'Εξερεύνηση' }).click();
  await page.getByRole('button', { name: 'Εκτέλεση' }).click();
  const results = page.getByTestId('path-results');
  await expect(results).toContainText('Συνθετική Ενεργειακή ΑΕ — DEMO');
  await expect(results).toContainText('Δεύτερη — DEMO → Δεύτερη υποδομή — DEMO → Κεντρική περιφέρεια — DEMO');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'docs/evidence/m3-path-1440.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/evidence/m3-path-390.png', fullPage: true });
});

async function addEntity(page: import('@playwright/test').Page, typeLabel: string, id: string, label: string) {
  await page.getByLabel('Τύπος οντότητας').selectOption({ label: typeLabel });
  await page.getByLabel('ID οντότητας').fill(id);
  await page.getByLabel('Όνομα οντότητας').fill(label);
  await page.getByRole('button', { name: 'Προσθήκη οντότητας' }).click();
  await expect(page.getByRole('cell', { name: label })).toBeVisible();
}

async function addEdge(page: import('@playwright/test').Page, id: string, typeLabel: string, fromLabel: string, toLabel: string) {
  await page.getByLabel('ID σύνδεσης').fill(id);
  await page.getByLabel('Τύπος σχέσης').selectOption({ label: typeLabel });
  await page.getByLabel('Από οντότητα').selectOption({ label: fromLabel });
  await page.getByLabel('Προς οντότητα').selectOption({ label: toLabel });
  await page.getByLabel('Ισχύς από').fill('2022-01-01');
  await page.getByRole('group', { name: 'Τεκμήρια' }).getByLabel('Συνθετικές διασυνδέσεις — όχι πραγματικές επενδύσεις').check();
  const revision = await page.getByTestId('revision').innerText();
  await page.getByRole('button', { name: 'Προσθήκη σύνδεσης' }).click();
  await expect(page.getByTestId('revision')).not.toHaveText(revision);
}
