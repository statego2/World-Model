import { expect, test, type Page } from '@playwright/test';

test('a blank workspace can save and rerun its own path query', async ({ page }) => {
  const workspaceId = `workspace:query-${Date.now()}`;
  await page.goto('/');
  await page.getByLabel('Όνομα χώρου').fill('Δικό μου ερώτημα');
  await page.getByLabel('ID χώρου').fill(workspaceId);
  await page.getByRole('button', { name: 'Δημιουργία κενού χώρου' }).click();
  await expect(page.getByRole('heading', { name: 'Οντολογία' })).toBeVisible();

  for (const [id, label] of [['type:country', 'Χώρα'], ['type:company', 'Εταιρεία'], ['type:infrastructure', 'Υποδομή'], ['type:region', 'Περιφέρεια']] as const) {
    await page.getByLabel('ID τύπου').fill(id);
    await page.getByLabel('Όνομα τύπου').fill(label);
    await page.getByLabel('Περιγραφή').fill(label);
    await page.getByRole('button', { name: 'Προσθήκη τύπου' }).click();
    await expect(page.getByRole('button', { name: label })).toBeVisible();
  }
  await addRelation(page, 'reltype:invests', 'Επενδύει', 'Χώρα', 'Εταιρεία');
  await addRelation(page, 'reltype:operates', 'Λειτουργεί', 'Εταιρεία', 'Υποδομή');
  await addRelation(page, 'reltype:located', 'Βρίσκεται', 'Υποδομή', 'Περιφέρεια');

  await page.getByRole('button', { name: 'Πηγές' }).click();
  await page.getByLabel('ID πηγής').fill('source:note');
  await page.getByLabel('Όνομα πηγής').fill('Σημείωση');
  await page.getByLabel('Εντοπιστής').fill('notebook:path');
  await page.getByLabel('Άδεια ή σημείωση').fill('Τοπική σημείωση');
  await page.getByRole('button', { name: 'Προσθήκη πηγής' }).click();

  await page.getByRole('button', { name: 'Οντότητες' }).click();
  await addEntity(page, 'Χώρα', 'country:DE', 'Γερμανία');
  await addEntity(page, 'Εταιρεία', 'company:ONE', 'Πρώτη');
  await addEntity(page, 'Υποδομή', 'infra:ONE', 'Πρώτη υποδομή');
  await addEntity(page, 'Περιφέρεια', 'region:ONE', 'Πρώτη περιφέρεια');

  await page.getByRole('button', { name: 'Σχέσεις' }).click();
  await addEdge(page, 'edge:invest-1', 'Επενδύει', 'Γερμανία', 'Πρώτη');
  await addEdge(page, 'edge:operate-1', 'Λειτουργεί', 'Πρώτη', 'Πρώτη υποδομή');
  await addEdge(page, 'edge:located-1', 'Βρίσκεται', 'Πρώτη υποδομή', 'Πρώτη περιφέρεια');

  await page.getByRole('button', { name: 'Εξερεύνηση' }).click();
  await page.getByLabel('ID προβολής').fill('view:mine');
  await page.getByLabel('Όνομα').fill('Δική μου διαδρομή');
  await page.getByLabel('Αφετηρία').selectOption({ label: 'Γερμανία' });
  await page.getByLabel('Τύπος βήματος 1').selectOption({ label: 'Επενδύει' });
  await page.getByLabel('Τύπος βήματος 2').selectOption({ label: 'Λειτουργεί' });
  await page.getByLabel('Τύπος βήματος 3').selectOption({ label: 'Βρίσκεται' });
  await page.getByRole('group', { name: 'Πηγές ερωτήματος' }).getByLabel('Σημείωση').check();
  await page.getByRole('button', { name: 'Αποθήκευση προβολής' }).click();
  await expect(page.getByRole('heading', { name: 'Δική μου διαδρομή' })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Εξερεύνηση' }).click();
  await page.getByRole('heading', { name: 'Δική μου διαδρομή' }).locator('xpath=..').getByRole('button', { name: 'Εκτέλεση' }).click();
  await expect(page.getByTestId('path-results')).toContainText('Γερμανία → Πρώτη → Πρώτη υποδομή → Πρώτη περιφέρεια');

  await page.getByRole('button', { name: 'Οντότητες' }).click();
  await addEntity(page, 'Εταιρεία', 'company:TWO', 'Δεύτερη');
  await addEntity(page, 'Υποδομή', 'infra:TWO', 'Δεύτερη υποδομή');
  await page.getByRole('button', { name: 'Σχέσεις' }).click();
  await addEdge(page, 'edge:invest-2', 'Επενδύει', 'Γερμανία', 'Δεύτερη');
  await addEdge(page, 'edge:operate-2', 'Λειτουργεί', 'Δεύτερη', 'Δεύτερη υποδομή');
  await addEdge(page, 'edge:located-2', 'Βρίσκεται', 'Δεύτερη υποδομή', 'Πρώτη περιφέρεια');
  await page.getByRole('button', { name: 'Εξερεύνηση' }).click();
  await page.getByRole('heading', { name: 'Δική μου διαδρομή' }).locator('xpath=..').getByRole('button', { name: 'Εκτέλεση' }).click();
  await expect(page.getByTestId('path-results')).toContainText('Δεύτερη → Δεύτερη υποδομή → Πρώτη περιφέρεια');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'docs/evidence/n3-query-1440.png', fullPage: true });
});

async function addRelation(page: Page, id: string, label: string, from: string, to: string) {
  await page.getByLabel('ID σχέσης').fill(id);
  await page.getByLabel('Όνομα σχέσης').fill(label);
  await page.getByLabel('Νόημα').fill(label);
  await page.getByRole('group', { name: 'Από τύπους' }).getByLabel(from).check();
  await page.getByRole('group', { name: 'Προς τύπους' }).getByLabel(to).check();
  await page.getByRole('button', { name: 'Προσθήκη σχέσης' }).click();
  await expect(page.getByText(label).first()).toBeVisible();
}

async function addEntity(page: Page, typeLabel: string, id: string, label: string) {
  await page.getByLabel('Τύπος οντότητας').selectOption({ label: typeLabel });
  await page.getByLabel('ID οντότητας').fill(id);
  await page.getByLabel('Όνομα οντότητας').fill(label);
  await page.getByRole('button', { name: 'Προσθήκη οντότητας' }).click();
  await expect(page.getByRole('cell', { name: label })).toBeVisible();
}

async function addEdge(page: Page, id: string, typeLabel: string, fromLabel: string, toLabel: string) {
  await page.getByLabel('ID σύνδεσης').fill(id);
  await page.getByLabel('Τύπος σχέσης').selectOption({ label: typeLabel });
  await page.getByLabel('Από οντότητα').selectOption({ label: fromLabel });
  await page.getByLabel('Προς οντότητα').selectOption({ label: toLabel });
  await page.getByLabel('Ισχύς από').fill('2022-01-01');
  await page.getByRole('group', { name: 'Τεκμήρια' }).getByLabel('Σημείωση').check();
  const revision = await page.getByTestId('revision').innerText();
  await page.getByRole('button', { name: 'Προσθήκη σύνδεσης' }).click();
  await expect(page.getByTestId('revision')).not.toHaveText(revision);
}
