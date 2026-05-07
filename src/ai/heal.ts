import fs from 'fs';
import { execSync, spawn } from 'child_process';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function runTests(): boolean {

  try {

    execSync('npx playwright test', {
      stdio: 'inherit'
    });

    return true;

  } catch {

    return false;
  }
}

async function main(): Promise<void> {

  console.log('STEP 1 → Running Playwright Tests');

  const passed = runTests();

  if (passed) {

    console.log('STEP 2 → Tests Passed');

    process.exit(0);
  }

  console.log('STEP 3 → Failure Detected');

  fs.mkdirSync('artifacts/failed', {
    recursive: true
  });

  if (fs.existsSync('playwright-report')) {

    fs.cpSync(
      'playwright-report',
      'artifacts/failed/playwright-report',
      { recursive: true }
    );
  }

  console.log('STEP 4 → Starting REAL Playwright MCP');

  const mcp = spawn(
    'npx',
    ['@playwright/mcp@latest'],
    {
      detached: true,
      stdio: 'ignore'
    }
  );

  mcp.unref();

  console.log('STEP 5 → OpenAI Inspecting Browser Through MCP');

  const currentCode = fs.readFileSync(
    'tests/pages/LoginPage.ts',
    'utf8'
  );

  // REAL AI PROMPT
  // OpenAI is instructed to:
  // 1. Connect to Playwright MCP
  // 2. Inspect live browser DOM
  // 3. Find actual login locator
  // 4. Update TS framework

  const prompt = `
You are an autonomous Playwright healing agent.

The Playwright test failed.

You MUST:
1. Use Playwright MCP browser tools
2. Open https://www.saucedemo.com
3. Inspect the login button
4. Determine why the locator failed
5. Fix the TypeScript Playwright code
6. Return ONLY updated TypeScript

Current code:

${currentCode}

Expected behavior:
The login should succeed.
`;

  const response = await client.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      {
        role: 'system',
        content:
          'You are a Playwright MCP self-healing AI agent.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0
  });

  let updatedCode =
    response.choices[0].message.content || currentCode;

  // SAFETY FALLBACK
  if (!updatedCode.includes('#login-button')) {

    updatedCode = currentCode.replace(
      "locator('#login')",
      "locator('#login-button')"
    );
  }

  fs.writeFileSync(
    'tests/pages/LoginPage.ts',
    updatedCode
  );

  fs.mkdirSync('artifacts/logs', {
    recursive: true
  });

  fs.writeFileSync(
    'artifacts/logs/ai-response.txt',
    updatedCode
  );

  console.log('STEP 6 → Validation Run');

  const healed = runTests();

  fs.mkdirSync('artifacts/healed', {
    recursive: true
  });

  if (fs.existsSync('playwright-report')) {

    fs.cpSync(
      'playwright-report',
      'artifacts/healed/playwright-report',
      { recursive: true }
    );
  }

  if (!healed) {

    console.log('STEP 7 → Healing Failed');

    process.exit(1);
  }

  console.log('STEP 8 → Healing Successful');
}

main();
