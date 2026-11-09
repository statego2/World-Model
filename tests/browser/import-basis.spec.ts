import { expect, test } from '@playwright/test';

test('a reported import stays beside an assumption', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Φόρτωση συνθετικού DEMO' }).click();
  await page.getByRole('button', { name: 'Γεγονότα' }).click();
  await page.getByLabel('ID γεγονότος').fill('fact:assume-2030');
  await page.getByLabel('Υποκείμενο').selectOption({ label: 'Ελλάδα' });
  await page.getByLabel('Ιδιότητα').selectOption({ label: 'Πληθυσμός (persons)' });
  await page.getByLabel('Βάση').selectOption('assumption');
  await page.getByLabel('Τιμή').fill('111');
  await page.getByLabel('Έτος').fill('2030');
  await page.getByRole('checkbox', { name: 'Συνθετικές μακροοικονομικές μετρήσεις' }).check();
  await page.getByRole('button', { name: 'Καταγραφή γεγονότος' }).click();
  await expect(page.getByRole('cell', { name: 'Υπόθεση' })).toHaveCount(1);

  await page.getByRole('button', { name: 'Μεταφορά' }).click();
  await page.getByLabel('CSV').fill('entityId,value,year\ncountry:GRC,111,2030\n');
  await page.getByLabel('Ιδιότητα').selectOption({ label: 'Πληθυσμός' });
  await page.getByLabel('Πηγή').selectOption({ label: 'Συνθετικές μακροοικονομικές μετρήσεις' });
  await page.getByRole('button', { name: 'Προεπισκόπηση' }).click();
  await expect(page.getByRole('cell', { name: /Νέο/ })).toBeVisible();
  await expect(page.getByText('Διπλότυπο')).toHaveCount(0);
  await page.getByRole('button', { name: 'Καταγραφή εισαγωγής' }).click();
  await expect(page.getByText('Καταγράφηκαν 1 γεγονότα.')).toBeVisible();

  await page.getByRole('button', { name: 'Γεγονότα' }).click();
  await expect(page.getByRole('cell', { name: '111 persons' })).toHaveCount(2);
  await expect(page.getByRole('cell', { name: 'Υπόθεση' })).toHaveCount(1);
});
