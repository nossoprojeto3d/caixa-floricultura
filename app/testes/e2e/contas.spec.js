// Roteiro 5 (contas): nova, pagar (mensal cria a do mês seguinte), desfazer
import { test, expect, abrir, irPara, aviso, diaRelativo, menu } from './comum.js'

test.beforeEach(async ({ page, tocar }) => {
  await abrir(page)
  await irPara(page, tocar, 'Contas')
})

const linhaConta = (page, nome) => page.locator('div.flex.items-center').filter({ has: page.getByText(nome, { exact: true }) })

test('anota uma conta nova', async ({ page, tocar }) => {
  await tocar(page.getByRole('button', { name: 'Nova' }))
  const f = page.getByRole('dialog', { name: 'Nova conta a pagar' })
  await tocar(f.getByRole('button', { name: 'Anotar conta' }))
  await expect(aviso(page, 'Escreva o que é a conta.')).toBeVisible()
  await f.getByLabel('O que é').fill('Boleto de teste')
  await f.getByLabel('Valor', { exact: true }).fill('99,90')
  await f.getByLabel('Vencimento').fill(diaRelativo(3))
  await tocar(f.getByRole('button', { name: 'Anotar conta' }))
  await expect(aviso(page, 'Conta anotada')).toBeVisible()
  await expect(page.getByText('Boleto de teste', { exact: true })).toBeVisible()
})

test('pagar conta mensal lança a saída e já anota a do mês que vem; desfazer volta', async ({ page, tocar }) => {
  await tocar(linhaConta(page, 'Conta de luz').getByRole('button', { name: 'Pagar' }))
  const f = page.getByRole('dialog', { name: 'Pagar conta' })
  await tocar(f.getByRole('button', { name: 'Confirmar pagamento' }))
  await expect(aviso(page, 'Paga! A do mês que vem já ficou anotada.')).toBeVisible()
  // a do mês que vem continua em aberto
  await expect(page.getByText('Conta de luz', { exact: true })).toHaveCount(1)
  await tocar(page.getByRole('button', { name: 'Pagas' }))
  await expect(page.getByText('Conta de luz', { exact: true })).toBeVisible()

  // a saída entrou no caixa de hoje
  await tocar(menu(page, 'Hoje'))
  await expect(page.locator('section.cartao').first().getByRole('button', { name: /Conta de luz/ })).toBeVisible()

  await irPara(page, tocar, 'Contas')
  await tocar(page.getByRole('button', { name: 'Pagas' }))
  await tocar(linhaConta(page, 'Conta de luz').getByRole('button', { name: 'Desfazer pagamento' }))
  await tocar(page.getByRole('alertdialog').getByRole('button', { name: 'Desfazer' }))
  await expect(aviso(page, 'Pagamento desfeito')).toBeVisible()
  await tocar(menu(page, 'Hoje'))
  await expect(page.locator('section.cartao').first().getByRole('button', { name: /Conta de luz/ })).toHaveCount(0)
})

test.describe('com a planilha demorando 3 s', () => {
  test.use({ lento: true })
  test('toque duplo em "Confirmar pagamento" paga uma vez só', async ({ page, tocar }) => {
    await tocar(linhaConta(page, 'Embalagens de outubro').getByRole('button', { name: 'Pagar' }))
    const botao = page.getByRole('dialog', { name: 'Pagar conta' }).getByRole('button', { name: 'Confirmar pagamento' })
    await tocar(botao)
    await expect(page.getByRole('button', { name: 'Salvando…' })).toBeDisabled()
    await expect(aviso(page, 'Conta paga')).toBeVisible({ timeout: 10_000 })
    await tocar(menu(page, 'Hoje'))
    await expect(page.locator('section.cartao').first().getByRole('button', { name: /Embalagens de outubro/ })).toHaveCount(1)
  })
})
