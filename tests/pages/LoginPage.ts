import { Page } from '@playwright/test';

export class LoginPage {

  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async login(): Promise<void> {

    await this.page.locator('#user-name').fill('standard_user');

    await this.page.locator('#password').fill('secret_sauce');

    // WRONG LOCATOR INTENTIONALLY
    // Actual = #login-button

    await this.page.locator('#login').click();
  }
}
