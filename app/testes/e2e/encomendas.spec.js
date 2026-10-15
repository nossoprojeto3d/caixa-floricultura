// Roteiro 5 (encomendas): nova, pronta, entregue, lançar sinal
import { test, expect, abrir, irPara, aviso, diaRelativo, menu } from './comum.js'

test.beforeEach(async ({ page, tocar }) => {
  await abrir(page)
  await irPara(page, tocar, 'Encomendas')
})

const cartao = (page, cliente) => page.getByRole('button', { name: new RegExp(cliente) })

test('anota uma encomenda nova', async ({ page, tocar }) => {
  await tocar(page.getByRole('button', { name: 'Nova' }))
  const f = page.getByRole('dialog', { name: 'Nova encomenda' })
  await tocar(f.getByRole('button', { name: 'Anotar encomenda' }))
  await expect(aviso(page, 'Escreva o nome da cliente.')).toBeVisible()

  await f.getByLabel('Cliente').fill('Teste Automático')
  await f.getByLabel('O que foi pedido').fill('Buquê de girassóis')
  await f.getByLabel('Valor total').fill('200')
  await f.getByLabel('Sinal pago').fill('50')
  await f.getByLabel('Data da entrega').fill(diaRelativo(3))
  await tocar(f.getByRole('button', { name: 'Entregar' }))
  await f.getByLabel('Endereço da entrega').fill('Rua das Rosas, 10')
  await tocar(f.getByRole('button', { name: 'Anotar encomenda' }))
  await expect(aviso(page, 'Encomenda anotada')).toBeVisible()
  await expect(cartao(page, 'Teste Automático')).toContainText('falta R$ 150,00')
})

test('sinal maior que o valor não salva', async ({ page, tocar }) => {
  await tocar(page.getByRole('button', { name: 'Nova' }))
  const f = page.getByRole('dialog', { name: 'Nova encomenda' })
  await f.getByLabel('Cliente').fill('Fulana')
  await f.getByLabel('O que foi pedido').fill('Vaso')
  await f.getByLabel('Valor total').fill('50')
  await f.getByLabel('Sinal pago').fill('80')
  await f.getByLabel('Data da entrega').fill(diaRelativo(1))
  await tocar(f.getByRole('button', { name: 'Anotar encomenda' }))
  await expect(aviso(page, 'O sinal está maior que o valor total.')).toBeVisible()
})

test('marca pronta e depois entregue', async ({ page, tocar }) => {
  await tocar(cartao(page, 'Paulo Henrique'))
  const det = page.getByRole('dialog', { name: 'Paulo Henrique' })
  await tocar(det.getByRole('button', { name: 'Está pronta' }))
  await expect(aviso(page, 'Marcada como pronta')).toBeVisible()
  await tocar(det.getByRole('button', { name: 'Entregue' }))
  await expect(aviso(page, 'Encomenda entregue')).toBeVisible()
  await tocar(det.getByRole('button', { name: 'Fechar' }).last())
  await tocar(page.getByRole('button', { name: 'Entregues' }))
  await expect(cartao(page, 'Paulo Henrique')).toBeVisible()
})

test('lança o sinal no caixa de hoje', async ({ page, tocar }) => {
  await tocar(cartao(page, 'Marcia Souza'))
  const det = page.getByRole('dialog', { name: 'Marcia Souza' })
  await tocar(det.getByRole('button', { name: /Sinal · R\$ 90,00/ }))
  const receber = page.getByRole('dialog', { name: 'Lançar sinal' })
  await tocar(receber.getByRole('button', { name: 'Lançar entrada' }))
  await expect(aviso(page, 'Sinal lançado no caixa')).toBeVisible()
  await expect(det.getByRole('button', { name: '✓ Sinal lançado' })).toBeDisabled()
  await tocar(det.getByRole('button', { name: 'Fechar' }).last())
  await tocar(menu(page, 'Hoje'))
  await expect(page.locator('section.cartao').first().getByText('Entrou').locator('..')).toContainText('90,00')
})

test('busca e cancelamento', async ({ page, tocar }) => {
  await page.getByPlaceholder('Buscar cliente ou pedido').fill('igreja')
  await expect(cartao(page, 'Igreja Matriz')).toBeVisible()
  await expect(cartao(page, 'Renata Alves')).toHaveCount(0)

  await tocar(cartao(page, 'Igreja Matriz'))
  await tocar(page.getByRole('button', { name: 'Cancelar encomenda' }))
  await tocar(page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar encomenda' }))
  await expect(aviso(page, 'Marcada como cancelada')).toBeVisible()
})
