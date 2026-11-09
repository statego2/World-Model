import { expect, test } from '@playwright/test';

test('an entity CSV stays unresolved for an unknown type and commits an exact id', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Φόρτωση συνθετικού DEMO' }).click();
  await page.getByRole('button', { name: 'Μεταφορά' }).click();
  await page.getByLabel('Είδος').selectOption('entities');
  await page.getByLabel('CSV').fill('id,typeId,label\ncompany:IMPORTED,type:company,Εισαγόμενη\ncompany:BAD,type:missing,Όχι\n');
  await page.getByRole('button', { name: 'Προεπισκόπηση' }).click();
  await expect(page.getByRole('cell', { name: /Εκκρεμές/ })).toBeVisible();
  await page.getByRole('button', { name: 'Καταγραφή εισαγωγής' }).click();
  await expect(page.getByText(/Καταγράφηκαν 1/)).toBeVisible();
  await page.getByRole('button', { name: 'Οντότητες' }).click();
  await expect(page.getByRole('cell', { name: 'Εισαγόμενη' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Όχι' })).toHaveCount(0);
});
