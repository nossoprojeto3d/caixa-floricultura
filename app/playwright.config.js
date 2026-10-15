import { defineConfig, devices } from '@playwright/test'

// Testes de tela (ponta a ponta) no build de produção, com a CSP ligada, sempre no modo demonstração.
// Rodar: cd app && npm run teste:telas   (gera o build e sobe o preview sozinho)
// Só um aparelho: npx playwright test --project=iPhone
const PORTA = 5181

export default defineConfig({
  testDir: 'testes/e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORTA}/`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    screenshot: 'only-on-failure',
    // o service worker guardaria arquivos entre os testes; sw.js é conferido à parte
    serviceWorkers: 'block',
  },
  projects: [
    // WebKit é o motor do Safari: o mais perto do iPhone que dá para ter sem Xcode
    { name: 'iPhone', use: { ...devices['iPhone 16'] } },
    { name: 'Android', use: { ...devices['Pixel 7'] } },
    { name: 'Computador', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    // o build vai para a raiz do repositório; o preview serve de lá
    command: `npm run build && npx vite preview --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
