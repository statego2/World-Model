import { expect, test } from '@playwright/test';

test('empty workspace keeps a supplier model after reload', async ({ page }) => {
  const workspaceId = `workspace:ui-${Date.now()}`;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Χτίσε το μοντέλο του κόσμου.' })).toBeVisible();
  await expect(page.getByText('Ελλάδα')).toHaveCount(0);
  await page.getByLabel('Όνομα χώρου').fill('Προμηθευτές');
  await page.getByLabel('ID χώρου').fill(workspaceId);
  await page.getByRole('button', { name: 'Δημιουργία κενού χώρου' }).click();
  await expect(page.getByRole('heading', { name: 'Οντολογία' })).toBeVisible();
  await expect(page.getByTestId('data-mode')).toHaveText('ΠΡΑΓΜΑΤΙΚΑ');

  await page.getByLabel('ID τύπου').fill('type:infrastructure');
  await page.getByLabel('Όνομα τύπου').fill('Υποδομή');
  await page.getByLabel('Περιγραφή').fill('Φυσική εγκατάσταση');
  await page.getByRole('button', { name: 'Προσθήκη τύπου' }).click();
  await expect(page.getByRole('button', { name: 'Υποδομή' })).toBeVisible();
  await page.getByLabel('ID τύπου').fill('type:supplier');
  await page.getByLabel('Όνομα τύπου').fill('Προμηθευτής');
  await page.getByLabel('Περιγραφή').fill('Παρέχει δυναμικότητα σε υποδομή');
  await page.getByRole('button', { name: 'Προσθήκη τύπου' }).click();
  await expect(page.getByRole('button', { name: 'Προμηθευτής' })).toBeVisible();
  await expect(page.getByTestId('revision')).toHaveText('2');

  await page.getByLabel('ID ιδιότητας').fill('property:capacity');
  await page.getByLabel('Όνομα ιδιότητας').fill('Δυναμικότητα');
  await page.getByLabel('Ιδιοκτήτης').selectOption({ label: 'Οντότητα · Προμηθευτής' });
  await page.getByLabel('Μονάδα').fill('MW');
  await page.getByRole('button', { name: 'Προσθήκη ιδιότητας' }).click();
  await page.getByLabel('ID σχέσης').fill('reltype:supplies_to');
  await page.getByLabel('Όνομα σχέσης').fill('Προμηθεύει');
  await page.getByLabel('Νόημα').fill('Παροχή δυναμικότητας, όχι ιδιοκτησία');
  await page.getByRole('group', { name: 'Από τύπους' }).getByLabel('Προμηθευτής').check();
  await page.getByRole('group', { name: 'Προς τύπους' }).getByLabel('Υποδομή').check();
  await page.getByRole('button', { name: 'Προσθήκη σχέσης' }).click();
  await expect(page.getByTestId('revision')).toHaveText('4');

  await page.getByRole('button', { name: 'Πηγές' }).click();
  await page.getByLabel('ID πηγής').fill('source:note');
  await page.getByLabel('Όνομα πηγής').fill('Σημείωση πεδίου');
  await page.getByLabel('Εντοπιστής').fill('notebook:alpha');
  await page.getByLabel('Άδεια ή σημείωση').fill('Προσωπική σημείωση');
  await page.getByRole('button', { name: 'Προσθήκη πηγής' }).click();

  await page.getByRole('button', { name: 'Οντότητες' }).click();
  await addEntity(page, 'Προμηθευτής', 'supplier:alpha', 'Άλφα');
  await addEntity(page, 'Υποδομή', 'infra:berth', 'Προβλήτα');

  await page.getByRole('button', { name: 'Σχέσεις' }).click();
  await page.getByLabel('ID σύνδεσης').fill('edge:alpha-berth');
  await page.getByLabel('Τύπος σχέσης').selectOption({ label: 'Προμηθεύει' });
  await page.getByLabel('Από οντότητα').selectOption({ label: 'Άλφα' });
  await page.getByLabel('Προς οντότητα').selectOption({ label: 'Προβλήτα' });
  await page.getByRole('group', { name: 'Τεκμήρια' }).getByLabel('Σημείωση πεδίου').check();
  await page.getByRole('button', { name: 'Προσθήκη σύνδεσης' }).click();
  await expect(page.getByTestId('revision')).toHaveText('8');

  await page.getByRole('button', { name: 'Γεγονότα' }).click();
  await page.getByLabel('ID γεγονότος').fill('fact:alpha-capacity');
  await page.getByLabel('Υποκείμενο').selectOption({ label: 'Άλφα' });
  await page.getByLabel('Ιδιότητα').selectOption({ label: 'Δυναμικότητα (MW)' });
  await page.getByLabel('Τιμή').fill('120');
  await page.getByRole('group', { name: 'Τεκμήρια' }).getByLabel('Σημείωση πεδίου').check();
  await page.getByRole('button', { name: 'Καταγραφή γεγονότος' }).click();
  await expect(page.getByRole('cell', { name: '120 MW' })).toBeVisible();
  await expect(page.getByTestId('revision')).toHaveText('9');

  await page.getByLabel('ID γεγονότος').fill('fact:negative');
  await page.getByLabel('Τιμή').fill('-5');
  await page.getByRole('button', { name: 'Καταγραφή γεγονότος' }).click();
  await expect(page.getByTestId('errors')).toContainText('αρνητικ');
  await expect(page.getByTestId('revision')).toHaveText('9');

  await page.reload();
  await expect(page.getByTestId('revision')).toHaveText('9');
  await expect(page.getByRole('cell', { name: '120 MW' })).toBeVisible();
  await page.getByRole('button', { name: 'Οντότητες' }).click();
  await page.getByRole('cell', { name: 'Άλφα' }).click();
  await expect(page.getByRole('heading', { name: 'Άλφα' })).toBeVisible();
  await expect(page.getByText('Δυναμικότητα: 120 MW')).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'docs/evidence/m1-1440.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/evidence/m1-390.png', fullPage: true });
});

test('keyboard creates a type and a stale tab is rejected', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await page.getByLabel('Όνομα χώρου').focus();
  await page.keyboard.type('Πληκτρολόγιο');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('ID χώρου')).toBeFocused();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('workspace:keys');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Δημιουργία κενού χώρου' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Οντολογία' })).toBeVisible();

  await page.getByLabel('ID τύπου').focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('type:keyboard');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Πληκτρολόγιο');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Τύπος από το πληκτρολόγιο');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Πληκτρολόγιο' })).toBeVisible();
  await expect(page.getByTestId('revision')).toHaveText('1');

  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.getByTestId('revision')).toHaveText('1');
  await page.getByLabel('ID τύπου').fill('type:second');
  await page.getByLabel('Όνομα τύπου').fill('Δεύτερος');
  await page.getByLabel('Περιγραφή').fill('Άλλος ορισμός');
  await page.getByRole('button', { name: 'Προσθήκη τύπου' }).click();
  await expect(page.getByTestId('revision')).toHaveText('2');

  await other.getByLabel('ID τύπου').fill('type:stale');
  await other.getByLabel('Όνομα τύπου').fill('Παλιό');
  await other.getByLabel('Περιγραφή').fill('Σύγκρουση καρτέλας');
  await other.getByRole('button', { name: 'Προσθήκη τύπου' }).click();
  await expect(other.getByTestId('conflict')).toBeVisible();
  await expect(other.getByTestId('revision')).toHaveText('1');
  await other.getByRole('button', { name: 'Φόρτωση τρέχουσας αναθεώρησης' }).click();
  await expect(other.getByTestId('revision')).toHaveText('2');
  await expect(other.getByRole('button', { name: 'Δεύτερος' })).toBeVisible();
  await context.close();
});

test('csv import records a measurement and leaves an unknown id unresolved', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Φόρτωση συνθετικού DEMO' }).click();
  await expect(page.getByRole('cell', { name: 'Ελλάδα' })).toBeVisible();
  await expect(page.getByTestId('data-mode')).toHaveText('ΣΥΝΘΕΤΙΚΟ DEMO');
  await page.getByRole('button', { name: 'Μεταφορά' }).click();
  await page.getByLabel('CSV').fill('entityId,value,year\ncountry:GRC,11000000,2024\ncountry:MISSING,3,2024\n');
  await page.getByLabel('Ιδιότητα').selectOption({ label: 'Πληθυσμός' });
  await page.getByLabel('Πηγή').selectOption({ label: 'Συνθετικές μακροοικονομικές μετρήσεις' });
  await page.getByRole('button', { name: 'Προεπισκόπηση' }).click();
  await expect(page.getByRole('cell', { name: /Εκκρεμές/ })).toBeVisible();
  await page.getByRole('button', { name: 'Καταγραφή εισαγωγής' }).click();
  await expect(page.getByText('Καταγράφηκαν')).toBeVisible();
  await page.getByRole('button', { name: 'Καταγραφή εισαγωγής' }).click();
  await expect(page.getByText('είχε ήδη καταγραφεί')).toBeVisible();
  await page.getByRole('button', { name: 'Γεγονότα' }).click();
  await expect(page.getByRole('cell', { name: '11000000 persons' })).toHaveCount(1);
});

async function addEntity(page: import('@playwright/test').Page, typeLabel: string, id: string, label: string) {
  await page.getByLabel('Τύπος οντότητας').selectOption({ label: typeLabel });
  await page.getByLabel('ID οντότητας').fill(id);
  await page.getByLabel('Όνομα οντότητας').fill(label);
  await page.getByRole('button', { name: 'Προσθήκη οντότητας' }).click();
  await expect(page.getByRole('cell', { name: label })).toBeVisible();
}
