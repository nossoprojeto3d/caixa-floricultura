// Roteiro 6: trocar mês/ano, tocar num mês do gráfico, buscar, tabela
import { test, expect, abrir, irPara } from './comum.js'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const agora = new Date()
const mesAtual = MESES[agora.getMonth()]
const mesPassado = MESES[(agora.getMonth() + 11) % 12]

test.beforeEach(async ({ page, tocar }) => {
  await abrir(page)
  await irPara(page, tocar, 'Relatórios')
})

const titulo = page => page.locator('p.titulo.capitalize')

test('troca de mês e de ano', async ({ page, tocar }) => {
  await expect(titulo(page)).toHaveText(mesAtual)
  await expect(page.getByRole('button', { name: 'Próximo' })).toBeDisabled()
  await tocar(page.getByRole('button', { name: 'Anterior' }))
  await expect(titulo(page)).toHaveText(new RegExp('^' + mesPassado))
  await expect(page.getByText('De onde vem o dinheiro')).toBeVisible()

  await tocar(page.getByRole('button', { name: 'Ano', exact: true }))
  await expect(titulo(page)).toHaveText(String(agora.getFullYear()))
  await tocar(page.getByRole('button', { name: 'Anterior' }))
  await expect(titulo(page)).toHaveText(String(agora.getFullYear() - 1))
})

test('tocar num mês do gráfico abre esse mês', async ({ page, tocar }) => {
  await tocar(page.getByRole('button', { name: new RegExp('^' + mesPassado + '.*: entrou') }))
  await expect(titulo(page)).toHaveText(new RegExp('^' + mesPassado))
})

test('tabela mês a mês', async ({ page, tocar }) => {
  await tocar(page.getByRole('button', { name: 'Tabela' }))
  const tabela = page.locator('table')
  await expect(tabela).toBeVisible()
  expect(await tabela.locator('tbody tr').count()).toBeGreaterThan(3)
  await tocar(page.getByRole('button', { name: 'Gráfico' }))
  await expect(tabela).toHaveCount(0)
})

test('busca lançamentos', async ({ page, tocar }) => {
  await tocar(page.getByRole('button', { name: 'Buscar' }))
  const busca = page.getByRole('dialog', { name: 'Buscar lançamentos' })
  await busca.getByPlaceholder('Ex.: orquídea, Ceasa, 150').fill('ceasa')
  await expect(busca.getByText('Compra no Ceasa').first()).toBeVisible()
  await busca.getByPlaceholder('Ex.: orquídea, Ceasa, 150').fill('xyzxyz')
  await expect(busca.getByText('Compra no Ceasa')).toHaveCount(0)
})
