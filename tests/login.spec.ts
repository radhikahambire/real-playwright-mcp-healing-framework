import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test('saucedemo login', async ({ page }) => {

  const login = new LoginPage(page);

  await login.goto();

  await login.login();

  await expect(page).toHaveURL(/inventory/);
});
