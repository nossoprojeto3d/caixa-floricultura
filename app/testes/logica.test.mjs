// Testes de lógica: dinheiro, datas, relatórios e o servidor (Codigo.gs) num Google simulado.
// Rodar: cd app && node --test testes/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as F from '../src/lib/formato.js'
import * as A from '../src/lib/analise.js'
import { carregarServidor } from './google-falso.mjs'

/* ---------------- Dinheiro ---------------- */
test('lerValor entende o jeito brasileiro de digitar', () => {
  const casos = { '12,50': 12.5, '1.200': 1200, '1.200,50': 1200.5, '12.50': 12.5, 'R$ 30': 30, '0,1': 0.1, '1.234.567': 1234567, '10.5': 10.5, '2.500': 2500, '100': 100, '': 0, 'abc': 0 }
  for (const [txt, esperado] of Object.entries(casos)) assert.equal(F.lerValor(txt), esperado, txt)
})
test('lerValor nunca devolve valor negativo', () => {
  assert.equal(F.lerValor('-50'), 50)
})
test('soma em centavos não erra decimal', () => {
  assert.equal(F.soma([{ valor: 0.1 }, { valor: 0.2 }]), 0.3)
  assert.equal(F.soma(Array(100).fill({ valor: 0.07 })), 7)
})

/* ---------------- Datas ---------------- */
test('somarMeses e somarDias viram o ano direito', () => {
  assert.equal(F.somarMeses('2026-12', 1), '2027-01')
  assert.equal(F.somarMeses('2026-01', -1), '2025-12')
  assert.equal(F.somarDias('2026-12-31', 1), '2027-01-01')
  assert.equal(F.somarDias('2028-02-28', 1), '2028-02-29') // bissexto
})
test('diasNoMes considera fevereiro bissexto', () => {
  assert.equal(F.diasNoMes('2028-02'), 29)
  assert.equal(F.diasNoMes('2026-02'), 28)
})

/* ---------------- Relatórios ---------------- */
const L = (data, tipo, valor, categoria = 'c', forma = 'Pix') => ({ data, tipo, valor, categoria, forma })
test('resumo soma entradas, saídas e média por dia com venda', () => {
  const r = A.resumo([L('2026-10-01', 'entrada', 100), L('2026-10-01', 'entrada', 50), L('2026-10-02', 'entrada', 30), L('2026-10-02', 'saida', 80)])
  assert.deepEqual(r, { entradas: 180, saidas: 80, saldo: 100, diasComVenda: 2, mediaDia: 90 })
})
test('agrupar ordena do maior e soma as partes em 100%', () => {
  const g = A.agrupar([L('2026-10-01', 'saida', 30, 'a'), L('2026-10-01', 'saida', 70, 'b'), L('2026-10-01', 'entrada', 999, 'x')], 'saida', 'categoria')
  assert.deepEqual(g.map(x => x.chave), ['b', 'a'])
  assert.equal(g.reduce((a, x) => a + x.parte, 0), 1)
})
test('serieMeses devolve 12 meses em ordem, com zeros nos vazios', () => {
  const s = A.serieMeses([L('2026-10-05', 'entrada', 10), L('2025-11-05', 'saida', 4)], '2026-10', 12)
  assert.equal(s.length, 12)
  assert.equal(s[0].mes, '2025-11')
  assert.equal(s[0].saidas, 4)
  assert.equal(s[11].entradas, 10)
  assert.equal(s[5].entradas, 0)
})
test('porDiaDoMes cobre todos os dias do mês', () => {
  assert.equal(A.porDiaDoMes([], '2028-02').length, 29)
})
test('variacao não divide por zero', () => {
  assert.equal(A.variacao(10, 0), null)
  assert.equal(A.variacao(150, 100), 0.5)
})

/* ---------------- Servidor (Codigo.gs) ---------------- */
const novoServidor = () => {
  const s = carregarServidor({ props: { CODIGO_ACESSO: 'flor123', TELEGRAM_TOKEN: 'x' } })
  s.configurar()
  return s
}

test('configurar cria as abas e as categorias iniciais', () => {
  const s = novoServidor()
  assert.equal(s.abas.size, 7)
  assert.equal(s.lerTabela('categorias').length, 14)
  s.configurar() // rodar de novo não duplica
  assert.equal(s.lerTabela('categorias').length, 14)
})

test('código errado é recusado e bloqueia depois de 15 tentativas', () => {
  const s = novoServidor()
  assert.equal(s.post('carregar', {}, 'errado').tipo, 'codigo')
  for (let i = 0; i < 15; i++) s.post('carregar', {}, 'errado')
  const r = s.post('carregar', {}, 'flor123')
  assert.equal(r.ok, false)
  assert.match(r.erro, /Espere 15 minutos/)
})

test('lote: cria, atualiza e apaga, e a leitura devolve tipos certos', () => {
  const s = novoServidor()
  const reg = { id: 'l1', data: '2026-10-10', tipo: 'entrada', valor: 85.5, categoria: 'c-balcao', forma: 'Pix', descricao: 'Buquê', origem: 'manual', ref: '', criado: '' }
  let r = s.post('lote', { ops: [{ op: 'salvar', tabela: 'lancamentos', registro: reg }, { op: 'salvar', tabela: 'lancamentos', registro: { ...reg, id: 'l2', valor: 10 } }] })
  assert.ok(r.ok)
  assert.ok(r.dados.salvos[0].criado, 'preenche "criado"')
  s.post('lote', { ops: [{ op: 'salvar', tabela: 'lancamentos', registro: { ...reg, valor: 90 } }, { op: 'excluir', tabela: 'lancamentos', id: 'l2' }] })
  const tudo = s.post('carregar').dados.lancamentos
  assert.equal(tudo.length, 1)
  assert.equal(tudo[0].valor, 90)
  assert.equal(typeof tudo[0].valor, 'number')
  assert.equal(tudo[0].data, '2026-10-10')
})

test('lote com o mesmo id duas vezes grava uma linha só', () => {
  const s = novoServidor()
  const reg = { id: 'dup', nome: 'A', telefone: '', produtos: '', pix: '', obs: '', criado: '' }
  s.post('lote', { ops: [{ op: 'salvar', tabela: 'fornecedores', registro: reg }, { op: 'salvar', tabela: 'fornecedores', registro: { ...reg, nome: 'B' } }] })
  const f = s.lerTabela('fornecedores')
  assert.equal(f.length, 1)
  assert.equal(f[0].nome, 'B')
})

test('apagar várias linhas no mesmo lote apaga as certas', () => {
  const s = novoServidor()
  const base = { data: '2026-10-10', tipo: 'saida', valor: 1, categoria: 'c', forma: '', descricao: '', origem: 'manual', ref: '', criado: '' }
  s.post('lote', { ops: ['a', 'b', 'c', 'd', 'e'].map(id => ({ op: 'salvar', tabela: 'lancamentos', registro: { ...base, id } })) })
  s.post('lote', { ops: [{ op: 'excluir', tabela: 'lancamentos', id: 'b' }, { op: 'excluir', tabela: 'lancamentos', id: 'd' }] })
  assert.deepEqual(s.lerTabela('lancamentos').map(l => l.id), ['a', 'c', 'e'])
})

test('recusa dado ruim: valor negativo, data errada, tipo inválido, tabela inventada', () => {
  const s = novoServidor()
  const base = { id: 'x', data: '2026-10-10', tipo: 'entrada', valor: 1, categoria: 'c' }
  const tenta = registro => s.post('lote', { ops: [{ op: 'salvar', tabela: 'lancamentos', registro }] })
  assert.equal(tenta({ ...base, valor: -5 }).ok, false)
  assert.equal(tenta({ ...base, data: '10/10/2026' }).ok, false)
  assert.equal(tenta({ ...base, tipo: 'roubo' }).ok, false)
  assert.equal(s.post('lote', { ops: [{ op: 'salvar', tabela: 'senhas', registro: base }] }).ok, false)
})

test('texto que parece fórmula (=, +, -, @) volta igual, sem virar fórmula', () => {
  const s = novoServidor()
  const reg = { id: 'f', nome: '=SOMA(A1:A9)', telefone: '+55 11 99999-0000', produtos: '-', pix: '@chave', obs: '', criado: '' }
  s.post('lote', { ops: [{ op: 'salvar', tabela: 'fornecedores', registro: reg }] })
  const f = s.lerTabela('fornecedores')[0]
  assert.equal(f.nome, '=SOMA(A1:A9)')
  assert.equal(f.telefone, '+55 11 99999-0000')
})

test('lembrete do Telegram lista atrasadas, hoje e encomendas; vazio quando não há nada', () => {
  const s = novoServidor()
  assert.equal(s.montarLembrete(), '')
  const hoje = F.hoje()
  const conta = (id, venc, status = 'aberta') => ({ op: 'salvar', tabela: 'contas', registro: { id, descricao: 'Conta ' + id, fornecedor: '', valor: 100, vencimento: venc, categoria: '', status, pago_em: '', forma: '', repetir: 'nao', codigo: '', obs: '', lanc: '', criado: '' } })
  s.post('lote', { ops: [conta('atrasada', F.somarDias(hoje, -2)), conta('hoje', hoje), conta('longe', F.somarDias(hoje, 10)), conta('paga', hoje, 'paga')] })
  s.post('lote', { ops: [{ op: 'salvar', tabela: 'encomendas', registro: { id: 'e1', cliente: 'Ana <b>', telefone: '', pedido: 'Buquê', valor: 0, sinal: 0, entrega_data: hoje, entrega_hora: '10:00', modo: 'retirada', endereco: '', destinatario: '', cartao: '', status: 'aberta', obs: '', criado: '' } }] })
  const m = s.montarLembrete()
  assert.match(m, /Conta atrasada/)
  assert.match(m, /venceu há 2 dias/)
  assert.match(m, /vence HOJE/)
  assert.doesNotMatch(m, /Conta longe/)
  assert.doesNotMatch(m, /Conta paga/)
  assert.match(m, /Ana &lt;b&gt;/, 'escapa HTML do nome')
})

test('ano em andamento compara com o ano anterior só até a mesma data', () => {
  const ano = new Date().getFullYear(), hoje = F.hoje()
  const antes = `${ano - 1}${hoje.slice(4)}`
  const depois = F.somarDias(antes, 1) // um dia depois da data de hoje, no ano passado
  const r = A.anoComparavel([L(antes, 'entrada', 10), ...(depois.startsWith(String(ano - 1)) ? [L(depois, 'entrada', 99)] : [])], ano)
  assert.equal(r.entradas, 10)
})

test('testeDeVelocidade usa planilha temporária, não toca a de verdade e joga a temporária fora', () => {
  const s = novoServidor()
  const antes = s.lerTabela('lancamentos').length
  const r = s.testeDeVelocidade()
  assert.equal(r.length, 2)
  assert.match(r[0], /^2 anos: \d+ lançamentos/)
  assert.equal(s.lerTabela('lancamentos').length, antes, 'planilha de verdade intacta')
  assert.deepEqual([...s.lixeira], ['temp0', 'temp1'])
  const lancs2anos = s.temporarias[0].abas.get('Lançamentos').dados.length - 1
  assert.ok(lancs2anos > 5000 && lancs2anos < 7000, `2 anos ≈ 5.600 lançamentos (veio ${lancs2anos})`)
})

test('versão dos dados muda a cada gravação e vem junto no carregar', () => {
  const s = novoServidor()
  const v1 = s.post('versao').dados
  s.post('lote', { ops: [{ op: 'salvar', tabela: 'fornecedores', registro: { id: 'v', nome: 'X', telefone: '', produtos: '', pix: '', obs: '', criado: '' } }] })
  const v2 = s.post('versao').dados
  assert.notEqual(v1, v2)
  assert.equal(s.post('carregar').dados.versao, v2)
})

/* ---------------- Arquivo dos anos antigos ---------------- */
test('arquivar: mantém 2 anos completos + o atual, copia o resto e resume por mês', () => {
  const s = novoServidor()
  const ano = new Date().getFullYear()
  const velho = ano - 3, guardado = ano - 2
  const lanc = (id, data, tipo, valor, forma = 'Pix') => ({ op: 'salvar', tabela: 'lancamentos', registro: { id, data, tipo, valor, categoria: tipo === 'entrada' ? 'c-balcao' : 'c-flores', forma, descricao: '', origem: 'caderno', ref: '', criado: '' } })
  s.post('lote', { ops: [
    lanc('a1', `${velho}-03-10`, 'entrada', 100), lanc('a2', `${velho}-03-10`, 'entrada', 50.5), lanc('a3', `${velho}-03-11`, 'entrada', 20, 'Dinheiro'),
    lanc('a4', `${velho}-03-12`, 'saida', 70), lanc('a5', `${velho}-12-31`, 'entrada', 10),
    lanc('b1', `${guardado}-01-01`, 'entrada', 999), lanc('c1', `${ano}-01-05`, 'entrada', 5),
  ] })
  const conta = (id, status, pago_em, venc) => ({ op: 'salvar', tabela: 'contas', registro: { id, descricao: id, fornecedor: '', valor: 10, vencimento: venc, categoria: '', status, pago_em, forma: '', repetir: 'nao', codigo: '', obs: '', lanc: '', criado: '' } })
  s.post('lote', { ops: [conta('paga-velha', 'paga', `${velho}-05-01`, `${velho}-05-01`), conta('aberta-velha', 'aberta', '', `${velho}-05-01`)] })

  const rel = s.arquivarAntigos()
  assert.ok(rel.some(r => r.startsWith('Lançamentos: 5')), rel.join())

  // principal: só o que é de (ano-2) para cá
  assert.deepEqual(s.lerTabela('lancamentos').map(l => l.id).sort(), ['b1', 'c1'])
  // conta paga antiga sai, conta em aberto antiga fica (ainda precisa ser paga)
  assert.deepEqual(s.lerTabela('contas').map(c => c.id), ['aberta-velha'])

  // arquivo: tudo copiado, nada perdido
  const arq = s.temporarias.find(p => p.abas.has(`Lançamentos ${velho}`))
  assert.equal(arq.abas.get(`Lançamentos ${velho}`).dados.length - 1, 5)
  assert.equal(arq.abas.get(`Contas a pagar ${velho}`).dados.length - 1, 1)

  // resumos: totais certos por mês, tipo, categoria e forma, mais os dias com venda
  const r = Object.fromEntries(s.lerTabela('resumos').map(x => [x.id, x]))
  assert.equal(r[`${velho}-03|entrada|c-balcao|Pix`].valor, 150.5)
  assert.equal(r[`${velho}-03|entrada|c-balcao|Pix`].qtd, 2)
  assert.equal(r[`${velho}-03|entrada|c-balcao|Dinheiro`].valor, 20)
  assert.equal(r[`${velho}-03|saida|c-flores|Pix`].valor, 70)
  assert.equal(r[`${velho}-03|dias`].valor, 2) // dias 10 e 11 tiveram venda
  assert.equal(r[`${velho}-12|dias`].valor, 1)

  // o app recebe os resumos junto com o resto
  assert.ok(s.post('carregar').dados.resumos.length >= 5)

  // rodar de novo não arquiva nada nem soma duas vezes
  assert.equal(s.arquivarAntigos().length, 0)
  assert.equal(Object.fromEntries(s.lerTabela('resumos').map(x => [x.id, x]))[`${velho}-03|entrada|c-balcao|Pix`].valor, 150.5)
})

test('o app não consegue gravar resumos (só o arquivamento grava)', () => {
  const s = novoServidor()
  const r = s.post('lote', { ops: [{ op: 'salvar', tabela: 'resumos', registro: { id: 'x', mes: '2020-01', tipo: 'entrada', categoria: '', forma: '', valor: 1, qtd: 1, criado: '' } }] })
  assert.equal(r.ok, false)
})
