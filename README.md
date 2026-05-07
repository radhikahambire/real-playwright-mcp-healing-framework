# Real Playwright MCP Self-Healing Framework

## Stack

- Playwright TypeScript
- Real Playwright MCP
- OpenAI
- GitHub Actions

## Demo Site

https://www.saucedemo.com

## Intentional Failure

Wrong locator:

#login

Correct locator:

#login-button

## CI Flow

1. Run Playwright test
2. Test fails
3. Upload failed report
4. Start Playwright MCP
5. OpenAI connects through MCP
6. AI inspects live browser
7. AI fixes locator
8. Validation rerun
9. Upload healed report
10. Upload logs

## Setup

npm install

npx playwright install

## GitHub Secret

OPENAI_API_KEY

## Run

npm run heal

## GitHub Actions

Actions → Real MCP Self Healing Pipeline → Run workflow
