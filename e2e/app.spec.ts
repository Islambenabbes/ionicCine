import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function loginAs(page: Page, role: 'User' | 'Admin'): Promise<void> {
  await page.goto('/auth');
  await page.getByRole('button', { name: role, exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

test('opens the CineMatch authentication screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'CineMatch' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByText('Multi-criteria matching above 75%')).toBeVisible();
});

test('user can authenticate and view a qualifying match', async ({ page }) => {
  await loginAs(page, 'User');
  await expect(page).toHaveURL(/\/tabs\/discover$/);
  await expect(page.getByText('Popular movies')).toBeVisible();
  await page.goto('/tabs/matches');
  await expect(page.getByText('Lina Mansouri')).toBeVisible();
  await expect(page.getByText('strong matches')).toBeVisible();

  await page.goto('/tabs/discover');
  await page.getByRole('button', { name: 'Disconnect' }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('administrator can add a movie and disable a user without deleting them', async ({ page }) => {
  await loginAs(page, 'Admin');
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText('Manage the cinema community')).toBeVisible();

  await page.getByLabel('Title').fill('The Last Screening');
  await page.getByLabel('Overview').fill('A projectionist discovers one final hidden film.');
  await page.getByLabel('Genres').fill('Drama, Mystery');
  await page.getByLabel('Main actors').fill('Leila Ben Ali, Karim Mansour');
  await page.getByRole('button', { name: 'Add to catalogue' }).click();
  await expect(page.getByText('The Last Screening added to the catalogue')).toBeVisible();

  await page.getByRole('button', { name: 'Users', exact: true }).click();
  await expect(page.getByText('User accounts')).toBeVisible();
  await expect(page.locator('ion-toggle')).toHaveCount(4);

  const ahmedRow = page.locator('.user-row').filter({ hasText: 'Ahmed Trabelsi' });
  await ahmedRow.locator('ion-toggle').click();
  await expect(ahmedRow.getByText('Disabled')).toBeVisible();

  await page.getByLabel('Sign out').click();
  await page.getByLabel('Email').fill('ahmed@cinematch.tn');
  await page.getByLabel('Password').fill('demo123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('disabled by an administrator')).toBeVisible();
});
