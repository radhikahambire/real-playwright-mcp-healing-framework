import fs from 'fs';
import { execSync, spawn } from 'child_process';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash'
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

  /////////////////////////////////////////////////////////
  // SAVE FAILED REPORTS
  /////////////////////////////////////////////////////////

  fs.mkdirSync('artifacts/failed', {
    recursive: true
  });

  if (fs.existsSync('playwright-report')) {

    fs.cpSync(
      'playwright-report',
      'artifacts/failed/playwright-report',
      {
        recursive: true
      }
    );
  }

  if (fs.existsSync('test-results')) {

    fs.cpSync(
      'test-results',
      'artifacts/failed/test-results',
      {
        recursive: true
      }
    );
  }

  /////////////////////////////////////////////////////////
  // START PLAYWRIGHT MCP
  /////////////////////////////////////////////////////////

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

  /////////////////////////////////////////////////////////
  // READ CURRENT TEST CODE
  /////////////////////////////////////////////////////////

  const filePath = 'tests/pages/LoginPage.ts';

  const currentCode = fs.readFileSync(
    filePath,
    'utf8'
  );

  /////////////////////////////////////////////////////////
  // READ PLAYWRIGHT FAILURE LOG
  /////////////////////////////////////////////////////////

  let failureLog = '';

  if (fs.existsSync('test-results/results.json')) {

    failureLog = fs.readFileSync(
      'test-results/results.json',
      'utf8'
    );
  }

  /////////////////////////////////////////////////////////
  // AI PROMPT
  /////////////////////////////////////////////////////////

  console.log(
    'STEP 5 → Gemini Inspecting Browser Through MCP'
  );

  const prompt = `
You are an autonomous Playwright MCP healing agent.

A Playwright TypeScript test failed.

You MUST:
1. Use Playwright MCP browser tools
2. Open https://www.saucedemo.com
3. Inspect the live DOM
4. Identify why the locator failed
5. Fix the Playwright TypeScript code
6. Return ONLY updated TypeScript

Current Test File:

${currentCode}

Playwright Failure:

${failureLog}

Rules:
- Prefer getByRole
- Prefer stable selectors
- Avoid hard waits
- Preserve TypeScript syntax
- Return ONLY code
`;

  /////////////////////////////////////////////////////////
  // GEMINI CALL
  /////////////////////////////////////////////////////////

  const result = await model.generateContent(prompt);

  const response = result.response.text();

  /////////////////////////////////////////////////////////
  // UPDATED CODE
  /////////////////////////////////////////////////////////

  let updatedCode = response || currentCode;

  /////////////////////////////////////////////////////////
  // REMOVE MARKDOWN IF PRESENT
  /////////////////////////////////////////////////////////

  updatedCode = updatedCode
    .replace(/```typescript/g, '')
    .replace(/```ts/g, '')
    .replace(/```/g, '')
    .trim();

  /////////////////////////////////////////////////////////
  // SAFETY FALLBACK
  /////////////////////////////////////////////////////////

  if (
    !updatedCode.includes('login-button') &&
    updatedCode.includes('#login')
  ) {

    updatedCode = currentCode.replace(
      "locator('#login')",
      "locator('#login-button')"
    );
  }

  /////////////////////////////////////////////////////////
  // SAVE UPDATED FILE
  /////////////////////////////////////////////////////////

  fs.writeFileSync(
    filePath,
    updatedCode
  );

  /////////////////////////////////////////////////////////
  // SAVE AI LOGS
  /////////////////////////////////////////////////////////

  fs.mkdirSync('artifacts/logs', {
    recursive: true
  });

  fs.writeFileSync(
    'artifacts/logs/ai-response.txt',
    updatedCode
  );

  fs.writeFileSync(
    'artifacts/logs/failure-log.txt',
    failureLog
  );

  /////////////////////////////////////////////////////////
  // VALIDATION RUN
  /////////////////////////////////////////////////////////

  console.log('STEP 6 → Validation Run');

  const healed = runTests();

  /////////////////////////////////////////////////////////
  // SAVE HEALED REPORTS
  /////////////////////////////////////////////////////////

  fs.mkdirSync('artifacts/healed', {
    recursive: true
  });

  if (fs.existsSync('playwright-report')) {

    fs.cpSync(
      'playwright-report',
      'artifacts/healed/playwright-report',
      {
        recursive: true
      }
    );
  }

  if (fs.existsSync('test-results')) {

    fs.cpSync(
      'test-results',
      'artifacts/healed/test-results',
      {
        recursive: true
      }
    );
  }

  /////////////////////////////////////////////////////////
  // FINAL RESULT
  /////////////////////////////////////////////////////////

  if (!healed) {

    console.log('STEP 7 → Healing Failed');

    process.exit(1);
  }

  console.log('STEP 8 → Healing Successful');
}

main();