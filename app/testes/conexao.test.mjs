// Conexão com o servidor: novas tentativas quando a rede falha e o registro das falhas no aparelho.
// fetch e localStorage simulados: nada sai do computador.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const guardado = new Map()
globalThis.localStorage = {
  getItem: k => (guardado.has(k) ? guardado.get(k) : null),
  setItem: (k, v) => guardado.set(k, String(v)),
  removeItem: k => guardado.delete(k),
}
let respostas = [] // cada item: Error (falha de rede), texto (página de erro do Google) ou objeto (resposta do servidor)
let chamadas = []
globalThis.fetch = async (url, opcoes) => {
  chamadas.push(JSON.parse(opcoes.body))
  const r = respostas.shift()
  if (r instanceof Error) throw r
  return { status: 200, text: async () => (typeof r === 'string' ? r : JSON.stringify(r)) }
}
// esperas entre tentativas (até 5 s) passam na hora; o limite de tempo das chamadas (15 s ou mais) não muda
const esperaOriginal = globalThis.setTimeout
globalThis.setTimeout = (f, ms, ...a) => esperaOriginal(f, ms <= 5000 ? 0 : ms, ...a)
const { Api, registroConexao } = await import('../src/lib/api.js')
const falhaIOS = () => Object.assign(new TypeError('Load failed'), { name: 'TypeError' })

beforeEach(() => { guardado.clear(); guardado.set('ternura_codigo', 'teste'); respostas = []; chamadas = [] })

test('rede falha duas vezes e volta: tenta de novo e não dá erro', async () => {
  respostas = [falhaIOS(), falhaIOS(), { ok: true, dados: 'v9' }]
  assert.equal(await Api.versao(), 'v9')
  assert.equal(chamadas.length, 3)
  const reg = registroConexao()
  assert.equal(reg.length, 3)
  assert.match(reg[0].erro, /recuperou na tentativa 3/)
  assert.match(reg[1].erro, /Load failed/)
  assert.equal(reg[1].acao, 'versao')
  assert.equal(typeof reg[1].aposVoltar, 'number')
})

test('rede fora nas 3 tentativas: avisa sem conexão e anota as 3', async () => {
  respostas = [falhaIOS(), falhaIOS(), falhaIOS()]
  await assert.rejects(Api.carregar(), e => e.tipo === 'rede' && /Load failed/.test(e.message))
  assert.equal(chamadas.length, 3)
  assert.equal(registroConexao().length, 3)
})

test('gravação também tenta de novo (é segura: grava pelo id)', async () => {
  respostas = [falhaIOS(), { ok: true, dados: { salvos: [] } }]
  await Api.lote([{ op: 'salvar', tabela: 'lancamentos', registro: { id: 'x' } }])
  assert.equal(chamadas.length, 2)
  assert.deepEqual(chamadas[0], chamadas[1])
})

test('foto do caderno não repete (duplicaria no Drive)', async () => {
  respostas = [falhaIOS(), { ok: true, dados: {} }]
  await assert.rejects(Api.lerCaderno('abc', '2026-10-15'), e => e.tipo === 'rede')
  assert.equal(chamadas.length, 1)
})

test('o registro guarda só as 40 últimas', async () => {
  for (let i = 0; i < 25; i++) { respostas = [falhaIOS(), { ok: true, dados: '' }]; await Api.versao() }
  assert.equal(registroConexao().length, 40)
})

const paginaGoogle = '<html><body><p>Desculpe, não foi possível abrir o arquivo no momento.</p></body></html>'

test('página de erro do Google no lugar da resposta: tenta de novo e anota o texto', async () => {
  respostas = [paginaGoogle, { ok: true, dados: { salvos: [] } }]
  await Api.lote([{ op: 'salvar', tabela: 'lancamentos', registro: { id: 'x' } }])
  assert.equal(chamadas.length, 2)
  assert.deepEqual(chamadas[0], chamadas[1])
  assert.match(registroConexao()[1].erro, /resposta estranha.*não foi possível abrir/)
})

test('página de erro nas 3 tentativas: avisa que pode tentar de novo', async () => {
  respostas = [paginaGoogle, paginaGoogle, paginaGoogle]
  await assert.rejects(Api.carregar(), /Tente de novo/)
  assert.equal(chamadas.length, 3)
})
