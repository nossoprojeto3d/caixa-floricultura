// Base dos testes de tela: abre o app no modo demonstração, barra qualquer conversa com o
// servidor real (os dados são da loja) e reprova o teste se aparecer erro no console.
import { test as base, expect } from '@playwright/test'

export { expect }

export const test = base.extend({
  // lento: simula a planilha real (2–4 s por gravação) trocando a espera de 350 ms do demo por 3 s
  lento: [false, { option: true }],

  page: async ({ page, lento }, use) => {
    const erros = []
    page.on('pageerror', e => erros.push(String(e)))
    page.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
    const servidorReal = []
    await page.route(/script\.google(usercontent)?\.com/, r => { servidorReal.push(r.request().url()); return r.abort() })
    if (lento) {
      await page.addInitScript(() => {
        const original = window.setTimeout
        window.setTimeout = (f, ms, ...a) => original(f, ms === 350 ? 3000 : ms, ...a)
      })
    }
    await use(page)
    expect(servidorReal, 'o teste tentou falar com o servidor real').toEqual([])
    expect(erros, 'erros no console').toEqual([])
  },

  // toque de verdade no celular, clique no computador
  tocar: async ({}, use, info) => {
    await use(loc => (info.project.use.hasTouch ? loc.tap() : loc.click()))
  },

  celular: async ({}, use, info) => { await use(!!info.project.use.isMobile) },
})

// Abre o app no modo demonstração (dados de exemplo novos a cada teste)
export async function abrir(page, ajustarDemo, arg) {
  await page.goto('./?demo')
  // a tela de carregando também tem o título "Ternura": espera a navegação do app
  await expect(page.getByRole('navigation')).toBeVisible()
  if (ajustarDemo) {
    // mexe nos dados de exemplo guardados no navegador e recarrega
    await page.evaluate(ajustarDemo, arg)
    await page.reload()
    await expect(page.getByRole('navigation')).toBeVisible()
  }
}

export const menu = (page, nome) => page.getByRole('navigation').getByRole('button', { name: new RegExp('^' + nome) })

export async function irPara(page, tocar, nome) {
  await tocar(menu(page, nome))
  await expect(page.getByRole('heading', { level: 1, name: nome })).toBeVisible()
}

// Aviso que aparece no alto da tela ("Entrada lançada", "Salvando…")
export const aviso = (page, texto) => page.getByRole('status').filter({ hasText: texto })

// Nada vazando para os lados
export async function semVazamento(page) {
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(sobra, 'a página rola para o lado').toBeLessThanOrEqual(0)
}

// Teclado próprio do app: digita os números tecla por tecla
export async function digitarValor(page, tocar, numeros) {
  for (const t of numeros) await tocar(page.getByRole('button', { name: t, exact: true }))
}

// Datas no mesmo formato do app
export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const diaRelativo = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d) }
