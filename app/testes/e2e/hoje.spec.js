// Roteiro 3 e 4: tela Hoje, lançamentos pelo teclado próprio e fechar o dia
import path from 'node:path'
import { test, expect, abrir, aviso, digitarValor, diaRelativo } from './comum.js'

const FOTO = path.join(import.meta.dirname, 'caderno.jpg')
const caixa = page => page.locator('section.cartao').first() // cartão do caixa do dia
const totalEntrou = page => caixa(page).getByText('Entrou').locator('..')

async function lancar(page, tocar, tipo, numeros, categoria) {
  await tocar(page.getByRole('button', { name: tipo === 'entrada' ? 'Entrada' : 'Saída', exact: true }))
  await digitarValor(page, tocar, numeros)
  await tocar(page.getByRole('button', { name: categoria }))
  await tocar(page.getByRole('button', { name: tipo === 'entrada' ? 'Lançar entrada' : 'Lançar saída' }))
  await expect(aviso(page, tipo === 'entrada' ? 'Entrada lançada' : 'Saída lançada')).toBeVisible()
}

test('troca de dia pelas setas', async ({ page, tocar }) => {
  await abrir(page)
  const anterior = page.getByRole('button', { name: 'Dia anterior' })
  const proximo = page.getByRole('button', { name: 'Próximo dia' })
  await expect(caixa(page).getByText('Hoje', { exact: true })).toBeVisible()
  await expect(proximo).toBeDisabled()
  await tocar(anterior)
  await expect(caixa(page).getByText('Ontem', { exact: true })).toBeVisible()
  await tocar(anterior)
  await expect(caixa(page).getByText(/^\d{2}\/\d{2}\/\d{4}$/)).toBeVisible()
  await tocar(proximo)
  await tocar(proximo)
  await expect(caixa(page).getByText('Hoje', { exact: true })).toBeVisible()
})

test('lança entrada e saída pelo teclado próprio', async ({ page, tocar }) => {
  await abrir(page)
  await lancar(page, tocar, 'entrada', ['1', '2', '5', '0'], 'Venda no balcão')
  await expect(totalEntrou(page)).toContainText('12,50')
  await lancar(page, tocar, 'saida', ['3', '00'], 'Flores e plantas')
  await expect(caixa(page).getByText('Saiu').locator('..')).toContainText('3,00')
  await expect(caixa(page).getByText('Saldo').locator('..')).toContainText('9,50')
})

test('não lança sem valor nem sem categoria', async ({ page, tocar }) => {
  await abrir(page)
  await tocar(page.getByRole('button', { name: 'Entrada', exact: true }))
  await tocar(page.getByRole('button', { name: 'Lançar entrada' }))
  await expect(aviso(page, 'Digite o valor.')).toBeVisible()
  await digitarValor(page, tocar, ['5'])
  await tocar(page.getByRole('button', { name: 'Lançar entrada' }))
  await expect(aviso(page, 'Escolha a categoria.')).toBeVisible()
})

test('tocar num lançamento abre a edição; editar e excluir', async ({ page, tocar }) => {
  await abrir(page)
  await lancar(page, tocar, 'entrada', ['4', '0', '00'], 'Venda no balcão')
  await tocar(caixa(page).getByRole('button', { name: /Venda no balcão/ }))
  await expect(page.getByText('Editando entrada')).toBeVisible()
  await digitarValor(page, tocar, ['0']) // 40,00 → 400,00
  await tocar(page.getByRole('button', { name: 'Salvar alterações' }))
  await expect(aviso(page, 'Alterações salvas')).toBeVisible()
  await expect(totalEntrou(page)).toContainText('400,00')

  await tocar(caixa(page).getByRole('button', { name: /Venda no balcão/ }))
  await tocar(page.getByRole('button', { name: 'Excluir lançamento' }))
  await tocar(page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }))
  await expect(aviso(page, 'Lançamento excluído')).toBeVisible()
  await expect(page.getByText('Nada lançado hoje ainda.')).toBeVisible()
})

test.describe('com a planilha demorando 3 s', () => {
  test.use({ lento: true })
  test('mostra "Salvando…" e o toque duplo não lança duas vezes', async ({ page, tocar }) => {
    await abrir(page)
    await tocar(page.getByRole('button', { name: 'Entrada', exact: true }))
    await digitarValor(page, tocar, ['7', '00'])
    await tocar(page.getByRole('button', { name: 'Venda no balcão' }))
    // o texto do botão vira um carregando: guarda o próprio elemento para o segundo toque
    const botao = await page.getByRole('button', { name: 'Lançar entrada' }).elementHandle()
    await botao.click()
    await botao.dispatchEvent('click')
    await expect(aviso(page, 'Salvando…')).toBeVisible()
    await expect(aviso(page, 'Entrada lançada')).toBeVisible({ timeout: 10_000 })
    await expect(caixa(page).getByRole('button', { name: /Venda no balcão/ })).toHaveCount(1)
    await expect(totalEntrou(page)).toContainText('7,00')
  })
})

test('fechar o dia: opções certas num dia sem lançamentos', async ({ page, tocar }) => {
  await abrir(page)
  await tocar(page.getByRole('button', { name: 'Fechar o dia' }))
  await expect(page.getByText('Como quer fechar?')).toBeVisible()
  await expect(page.getByRole('button', { name: /Fechar com os itens já lançados/ })).toHaveCount(0)
  for (const op of ['Tirar foto do caderno', 'Escolher da galeria', 'Digitar sem foto', 'A loja não abriu neste dia'])
    await expect(page.getByRole('button', { name: new RegExp(op) })).toBeVisible()
})

test('fechar o dia pela galeria: lê, revisa, salva, chove pétalas e oferece o dia pendente', async ({ page, tocar }) => {
  await abrir(page)
  await tocar(page.getByRole('button', { name: 'Fechar o dia' }))
  // a galeria é o campo de arquivo sem "capture" (o com capture abre a câmera)
  await page.locator('input[type=file]:not([capture])').setInputFiles(FOTO)
  await expect(page.getByText('Lendo o caderno…')).toBeVisible()
  await expect(page.getByText(/Modo demonstração: estas linhas são de exemplo/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByLabel('Valor')).toHaveCount(6)
  await tocar(page.getByRole('button', { name: 'Salvar e fechar o dia' }))
  await expect(aviso(page, 'Dia fechado · 6 lançamentos')).toBeVisible()
  await expect(page.locator('svg.petala').first()).toBeAttached()
  // ontem continua sem fechar: o app oferece em seguida
  await expect(page.getByText('Ainda falta fechar 1 dia:')).toBeVisible()
  await tocar(page.getByRole('button', { name: 'Deixar para depois' }))
  await expect(caixa(page).getByText('Dia fechado')).toBeVisible()
  await expect(totalEntrou(page)).toContainText('440,00')
})

test('fechar com os itens já lançados e depois reabrir', async ({ page, tocar }) => {
  await abrir(page)
  await lancar(page, tocar, 'entrada', ['2', '5', '00'], 'Venda no balcão')
  await tocar(page.getByRole('button', { name: 'Fechar o dia' }))
  await tocar(page.getByRole('button', { name: /Fechar com os itens já lançados/ }))
  await expect(aviso(page, 'Dia fechado')).toBeVisible()
  await tocar(page.getByRole('button', { name: 'Deixar para depois' }))
  await expect(caixa(page).getByText('Dia fechado')).toBeVisible()

  await tocar(page.getByRole('button', { name: 'Reabrir o dia' }))
  await tocar(page.getByRole('alertdialog').getByRole('button', { name: 'Reabrir' }))
  await expect(aviso(page, 'Dia reaberto')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fechar o dia' })).toBeVisible()
})

test('digitar sem foto: linha igual a um lançamento pergunta antes e não duplica', async ({ page, tocar }) => {
  await abrir(page)
  await lancar(page, tocar, 'entrada', ['5', '0', '00'], 'Venda no balcão')
  await tocar(page.getByRole('button', { name: 'Fechar o dia' }))
  await tocar(page.getByRole('button', { name: /Digitar sem foto/ }))
  await page.getByLabel('Valor').fill('50')
  await expect(page.getByText('É o mesmo lançamento?')).toBeVisible()
  // com a pergunta sem resposta, não salva
  await tocar(page.getByRole('button', { name: 'Salvar e fechar o dia' }))
  await expect(aviso(page, 'Responda se a linha amarela já está lançada.')).toBeVisible()
  await tocar(page.getByRole('button', { name: 'Sim, já está lançado' }))
  await tocar(page.getByRole('button', { name: 'Salvar e fechar o dia' }))
  await expect(aviso(page, /^\s*Dia fechado\s*$/)).toBeVisible()
  await tocar(page.getByRole('button', { name: 'Deixar para depois' }))
  await expect(totalEntrou(page)).toContainText('50,00')
  await expect(caixa(page).getByRole('button', { name: /Venda no balcão/ })).toHaveCount(1)
})

test('digitar sem foto: "Não, lançar também" lança a linha repetida', async ({ page, tocar }) => {
  await abrir(page)
  await lancar(page, tocar, 'entrada', ['5', '0', '00'], 'Venda no balcão')
  await tocar(page.getByRole('button', { name: 'Fechar o dia' }))
  await tocar(page.getByRole('button', { name: /Digitar sem foto/ }))
  await page.getByLabel('Valor').fill('50')
  await tocar(page.getByRole('button', { name: 'Não, lançar também' }))
  await tocar(page.getByRole('button', { name: 'Salvar e fechar o dia' }))
  await expect(aviso(page, 'Dia fechado · 1 lançamento')).toBeVisible()
  await tocar(page.getByRole('button', { name: 'Deixar para depois' }))
  await expect(totalEntrou(page)).toContainText('100,00')
})

test('vários dias sem fechar: lista, loja fechada e oferta do próximo dia', async ({ page, tocar }) => {
  const [d3, d2] = [diaRelativo(-3), diaRelativo(-2)]
  await abrir(page, ([d3, d2]) => {
    // tira o fechamento de 3 e 2 dias atrás; o de 3 dias atrás fica também sem lançamentos
    const db = JSON.parse(localStorage.getItem('ternura_demo_v1'))
    db.fechamentos = db.fechamentos.filter(f => f.data !== d3 && f.data !== d2)
    db.lancamentos = db.lancamentos.filter(l => l.data !== d3)
    localStorage.setItem('ternura_demo_v1', JSON.stringify(db))
  }, [d3, d2])
  await tocar(page.getByRole('button', { name: /3 dias sem fechar/ }))
  const lista = page.getByRole('dialog', { name: 'Dias sem fechar' })
  // o X do painel também se chama "Fechar", mas não tem texto escrito
  const botoes = lista.getByRole('button', { name: 'Fechar', exact: true }).filter({ hasText: 'Fechar' })
  await expect(botoes).toHaveCount(3)
  await tocar(botoes.first())
  await tocar(page.getByRole('button', { name: /A loja não abriu neste dia/ }))
  await expect(aviso(page, 'Dia fechado · loja fechada')).toBeVisible()
  await expect(page.getByText('Ainda faltam 2 dias para fechar. O mais antigo:')).toBeVisible()
  await tocar(page.getByRole('button', { name: /^Fechar / }).last())
  await expect(page.getByText('Como quer fechar?')).toBeVisible()
})
