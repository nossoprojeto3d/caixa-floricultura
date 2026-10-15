// Roteiro 1, 2 e 7: abre sem erros, cabe na tela do celular, menu e gavetas no computador, código de acesso
import { test, expect, abrir, menu, irPara, semVazamento } from './comum.js'

test('abre no modo demonstração, com manifest e service worker', async ({ page, request }) => {
  await abrir(page)
  await expect(page.getByText(/Modo demonstração/).filter({ visible: true })).toBeVisible()
  for (const arq of ['manifest.json', 'sw.js', 'favicon.svg']) {
    const r = await request.get(arq)
    expect(r.ok(), arq).toBe(true)
  }
  const manifest = await (await request.get('manifest.json')).json()
  expect(manifest.name).toMatch(/Ternura/)
})

test('todas as telas cabem na largura, sem nada vazando para os lados', async ({ page, tocar, celular }) => {
  await abrir(page)
  await semVazamento(page)
  // celular: barra de baixo; computador: menu lateral
  const nav = page.getByRole('navigation')
  await expect(nav).toBeVisible()
  const caixa = await nav.boundingBox()
  const vp = page.viewportSize()
  if (celular) expect(caixa.y + caixa.height).toBeLessThanOrEqual(vp.height + 1)
  else expect(caixa.x).toBeLessThan(10)

  for (const [nome, titulo] of [['Encomendas', 'Encomendas'], ['Contas', 'Contas'], ['Relatórios', 'Relatórios'], ['Mais', /.+/]]) {
    await tocar(menu(page, nome))
    await expect(page.getByRole('heading', { level: 1, name: titulo }).first()).toBeVisible()
    await semVazamento(page)
  }
})

test('formulários cabem na tela (no computador, abrem em gaveta à direita)', async ({ page, tocar, celular }) => {
  await abrir(page)
  const vp = page.viewportSize()

  // lançamento
  await tocar(page.getByRole('button', { name: 'Entrada', exact: true }))
  const lancar = page.getByRole('button', { name: 'Lançar entrada' })
  await expect(lancar).toBeVisible()
  const b = await lancar.boundingBox()
  expect(b.y + b.height, 'botão de lançar fora da tela').toBeLessThanOrEqual(vp.height)
  if (!celular) expect(b.x, 'no computador deveria estar na gaveta da direita').toBeGreaterThan(vp.width / 2)
  await semVazamento(page)
  await tocar(page.getByRole('button', { name: 'Fechar' }).last())

  // nova encomenda: o painel inteiro dentro da largura da tela
  await irPara(page, tocar, 'Encomendas')
  await tocar(page.getByRole('button', { name: 'Nova' }))
  const folha = page.getByRole('dialog', { name: 'Nova encomenda' })
  await expect(folha).toBeVisible()
  const f = await folha.boundingBox()
  expect(f.x).toBeGreaterThanOrEqual(0)
  expect(f.x + f.width).toBeLessThanOrEqual(vp.width)
  await semVazamento(page)
})

test('campos com fonte de pelo menos 16px (senão o iPhone dá zoom)', async ({ page, tocar }) => {
  await abrir(page)
  await irPara(page, tocar, 'Encomendas')
  await tocar(page.getByRole('button', { name: 'Nova' }))
  await expect(page.getByRole('dialog', { name: 'Nova encomenda' })).toBeVisible()
  const pequenos = await page.evaluate(() =>
    [...document.querySelectorAll('input:not([type=hidden]):not([type=file]), textarea, select')]
      .filter(el => el.offsetParent && parseFloat(getComputedStyle(el).fontSize) < 16)
      .map(el => el.outerHTML.slice(0, 80)))
  expect(pequenos).toEqual([])
})

test.describe('código de acesso (servidor simulado, nada sai do computador)', () => {
  test('código errado avisa; o certo abre o caixa', async ({ page }) => {
    const vazio = { lancamentos: [], categorias: [], encomendas: [], contas: [], fornecedores: [], fechamentos: [], resumos: [], versao: '1' }
    // registrado depois do bloqueio do comum.js, então tem preferência
    await page.route(/script\.google\.com/, r => {
      const pedido = JSON.parse(r.request().postData() || '{}')
      const corpo = pedido.codigo === 'flor123'
        ? { ok: true, dados: pedido.acao === 'versao' ? '1' : vazio }
        : { ok: false, erro: 'Código de acesso errado.', tipo: 'codigo' }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) })
    })
    await page.goto('./')
    const campo = page.getByLabel('Código de acesso')
    await campo.fill('errado')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByText('Código errado. Tente de novo.')).toBeVisible()

    await campo.fill('flor123')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('button', { name: 'Fechar o dia' })).toBeVisible()
    await expect(page.getByText(/Modo demonstração/)).toHaveCount(0)
  })
})
