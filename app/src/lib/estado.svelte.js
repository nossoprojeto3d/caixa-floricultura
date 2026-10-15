// Estado do app, dados da planilha, sincronização e as regras de negócio
// (pagar conta, fechar o dia, encomendas).
import { Api, modoDemo, ErroServidor } from './api.js'
import { corDaPosicao } from './dados.js'
import { cent, hoje, novoId, somarMeses, somarDias, deISO, iso, diasAte } from './formato.js'

export const VERSAO = '1.1.8'
const CHAVE_CACHE = 'ternura_cache'
let versaoDados = '' // muda no servidor a cada gravação

export const S = $state({
  fase: 'carregando', // 'carregando' | 'codigo' | 'app'
  erroCodigo: '',
  tela: 'hoje', // 'hoje' | 'encomendas' | 'contas' | 'relatorios' | 'mais'
  dia: hoje(), // dia aberto na tela Hoje (dá para voltar e corrigir dias anteriores)
  categorias: [],
  lancamentos: [],
  encomendas: [],
  contas: [],
  fornecedores: [],
  fechamentos: [],
  resumos: [], // totais por mês dos anos arquivados
  // formulários abertos por cima (null = fechado)
  lanc: null,
  encomenda: null,
  conta: null,
  fornecedor: null,
  caderno: null, // fluxo "fechar o dia com a foto do caderno"
  aviso: null,
  confirmar: null,
  folhas: 0, // painéis abertos (a atualização automática espera fecharem)
  offline: false,
  gravando: 0, // gravações em andamento (a planilha leva alguns segundos: mostra "Salvando…")
  carregadoEm: 0,
  flores: 0, // dispara a chuva de pétalas
})
export const demo = modoDemo

// Tela larga (mesmo ponto do Tailwind lg)
export const tela = $state({ largo: false })
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(min-width: 1024px)')
  tela.largo = mq.matches
  mq.addEventListener('change', e => { tela.largo = e.matches })
}

/* ---------- Leitura rápida ---------- */
const memo = new Map()
function indice(nome, lista) {
  const m = memo.get(nome)
  if (m && m.lista === lista && m.tam === lista.length) return m.mapa
  const mapa = new Map(lista.map(x => [x.id, x]))
  memo.set(nome, { lista, tam: lista.length, mapa })
  return mapa
}
export const cat = id => indice('cat', S.categorias).get(id)
export const fornecedor = id => indice('forn', S.fornecedores).get(id)
export const nomeCat = id => cat(id)?.nome || 'Sem categoria'
export const corCat = id => cat(id)?.cor || '#a4949a'

// Lançamentos + os totais por mês dos anos arquivados, no mesmo formato (data = dia 1 do mês,
// resumo: true). É o que os relatórios usam; o dia a dia e a busca usam só S.lancamentos.
export function historico() {
  if (!S.resumos.length) return S.lancamentos
  return [...S.lancamentos, ...S.resumos.map(x => ({ id: 'resumo-' + x.id, data: x.mes + '-01', tipo: x.tipo, valor: x.valor, categoria: x.categoria, forma: x.forma, resumo: true }))]
}
export const mesArquivado = m => S.resumos.some(x => x.mes === m)
export const anoArquivado = a => S.resumos.some(x => x.mes.startsWith(String(a)))

export const categoriasDoTipo = tipo => S.categorias.filter(c => c.tipo === tipo)
export const lancsDoDia = d => S.lancamentos.filter(l => l.data === d)
export const fechamento = d => S.fechamentos.find(f => f.data === d)

// Dias que ficaram sem fechar, do mais antigo para o mais novo (até ontem).
// Começa no primeiro dia de uso do app e olha no máximo 30 dias para trás.
export function diasSemFechar() {
  const datas = [...S.fechamentos.map(f => f.data), ...S.lancamentos.map(l => l.data)]
  if (!datas.length) return []
  const fechados = new Set(S.fechamentos.map(f => f.data))
  const limite = somarDias(hoje(), -30)
  let d = datas.reduce((m, x) => (x < m ? x : m))
  if (d < limite) d = limite
  const fim = somarDias(hoje(), -1), lista = []
  for (; d <= fim; d = somarDias(d, 1)) if (!fechados.has(d)) lista.push(d)
  return lista
}
export const totalTipo = (lista, tipo) => lista.reduce((a, l) => a + (l.tipo === tipo ? cent(l.valor) : 0), 0) / 100

export const contasAbertas = () => S.contas.filter(c => c.status !== 'paga').sort((a, b) => a.vencimento.localeCompare(b.vencimento))
export const contasUrgentes = () => contasAbertas().filter(c => diasAte(c.vencimento) <= 3)
export const encomendasAtivas = () => S.encomendas
  .filter(e => e.status === 'aberta' || e.status === 'pronta')
  .sort((a, b) => (a.entrega_data + (a.entrega_hora || '99')).localeCompare(b.entrega_data + (b.entrega_hora || '99')))

/* ---------- Normalização do que vem da planilha ---------- */
const NUMEROS = ['valor', 'sinal', 'entradas', 'saidas', 'ordem', 'qtd']
function normal(reg) {
  const r = { ...reg }
  for (const k of NUMEROS) if (k in r) r[k] = Number(r[k]) || 0
  for (const k in r) if (r[k] == null) r[k] = ''
  r.id = String(r.id)
  return r
}
const ordemCats = lista => {
  const pos = { entrada: 0, saida: 0 }
  return [...lista].sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(c => ({ ...c, cor: corDaPosicao(pos[c.tipo]++) }))
}

function aplicar(dados) {
  S.categorias = ordemCats((dados.categorias || []).map(normal))
  S.lancamentos = (dados.lancamentos || []).map(normal)
  S.encomendas = (dados.encomendas || []).map(normal)
  S.contas = (dados.contas || []).map(normal)
  S.fornecedores = (dados.fornecedores || []).map(normal)
  S.fechamentos = (dados.fechamentos || []).map(normal)
  S.resumos = (dados.resumos || []).map(normal)
  versaoDados = dados.versao ?? versaoDados
  S.carregadoEm = Date.now()
}

function guardarCache() {
  if (demo) return
  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify({
      categorias: S.categorias.map(({ cor, ...c }) => c), lancamentos: S.lancamentos, encomendas: S.encomendas,
      contas: S.contas, fornecedores: S.fornecedores, fechamentos: S.fechamentos, resumos: S.resumos,
    }))
  } catch {}
}

/* ---------- Avisos e confirmação ---------- */
let avisoT
export function avisar(texto, tipo = 'ok') {
  clearTimeout(avisoT)
  S.aviso = { texto, tipo, id: Date.now() }
  avisoT = setTimeout(() => { S.aviso = null }, tipo === 'erro' ? 4200 : 2600)
}

export function tratarErro(e) {
  console.error(e)
  if (e instanceof ErroServidor && e.tipo === 'codigo') { S.fase = 'codigo'; S.erroCodigo = 'O código de acesso mudou. Digite o novo.'; return }
  if (e instanceof ErroServidor && e.tipo === 'rede') S.offline = true
  avisar(e.message || 'Algo deu errado.', 'erro')
}

// Confirmação própria do app (o confirm() do iPhone instalado derruba a chamada seguinte ao servidor)
let respostaConfirmar
export function confirmar(texto, { ok = 'Confirmar', perigo = false } = {}) {
  S.confirmar = { texto, ok, perigo }
  return new Promise(r => { respostaConfirmar = r })
}
export function responderConfirmacao(sim) { S.confirmar = null; respostaConfirmar?.(sim) }

/* ---------- Início, código de acesso e sincronização ---------- */
export async function iniciar() {
  if (!demo) {
    if (!Api.temCodigo()) { S.fase = 'codigo'; return }
    try {
      const c = JSON.parse(localStorage.getItem(CHAVE_CACHE) || 'null')
      if (c) { aplicar(c); S.fase = 'app'; recarregar(); return }
    } catch {}
  }
  try {
    aplicar(await Api.carregar())
    S.fase = 'app'
    guardarCache()
  } catch (e) {
    if (e instanceof ErroServidor && e.tipo === 'codigo') { S.fase = 'codigo'; return }
    S.fase = 'app'
    tratarErro(e)
  }
}

export async function entrar(codigo) {
  S.erroCodigo = ''
  try {
    aplicar(await Api.entrar(codigo))
    guardarCache()
    S.fase = 'app'
  } catch (e) {
    S.erroCodigo = e.tipo === 'codigo' ? 'Código errado. Tente de novo.' : e.message
  }
}

export function sair() {
  Api.sair()
  try { localStorage.removeItem(CHAVE_CACHE) } catch {}
  S.fase = 'codigo'
}

let recarregando = false
let gravacoes = 0 // conta as gravações: dado que chegou de uma busca anterior a uma gravação está velho
export async function recarregar({ silencioso = true } = {}) {
  if (recarregando) return
  recarregando = true
  const versao = gravacoes
  try {
    const dados = await Api.carregar()
    // não troca os dados por baixo de um formulário aberto, nem por dados de antes de uma gravação
    if (versao === gravacoes && S.folhas === 0 && !S.lanc && !S.encomenda && !S.conta && !S.fornecedor && !S.caderno) {
      aplicar(dados)
      guardarCache()
    }
    S.offline = false
  } catch (e) {
    if (!silencioso || (e instanceof ErroServidor && e.tipo === 'codigo')) tratarErro(e)
    else if (e instanceof ErroServidor && e.tipo === 'rede') S.offline = true
  } finally { recarregando = false }
}

let ultimoHoje = hoje()
// Atualiza ao voltar para o app e a cada 2 minutos com ele aberto (para mãe e irmão verem o mesmo)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    // app ficou aberto de um dia para o outro: a tela Hoje passa para o dia novo
    if (hoje() !== ultimoHoje) { if (S.dia === ultimoHoje) S.dia = hoje(); ultimoHoje = hoje() }
    if (S.fase === 'app' && Date.now() - S.carregadoEm > 20000) recarregar()
  })
  // a cada 2 minutos só pergunta a versão (resposta minúscula); baixa tudo só se alguém gravou algo
  setInterval(async () => {
    if (document.visibilityState !== 'visible' || S.fase !== 'app' || demo) return
    try { if ((await Api.versao()) !== versaoDados) recarregar() } catch {}
  }, 120000)
}

/* ---------- Gravação: um lote de operações vai junto para a planilha ---------- */
async function gravar(ops) {
  gravacoes++
  S.gravando++
  let r
  try { r = await Api.lote(ops) } finally { S.gravando-- }
  gravacoes++ // e de novo no fim: busca que começou durante a gravação também é descartada
  const salvos = new Map((r?.salvos || []).map(x => [x.id, x]))
  for (const o of ops) {
    if (o.op === 'excluir') { S[o.tabela] = S[o.tabela].filter(x => x.id !== o.id); continue }
    const reg = normal(salvos.get(o.registro.id) || o.registro)
    const lista = S[o.tabela]
    const i = lista.findIndex(x => x.id === reg.id)
    if (i >= 0) lista[i] = reg; else lista.push(reg)
  }
  if (ops.some(o => o.tabela === 'categorias')) S.categorias = ordemCats(S.categorias)
  S.offline = false
  guardarCache()
}
const salvar = (tabela, registro) => ({ op: 'salvar', tabela, registro: $state.snapshot(registro) })
const excluir = (tabela, id) => ({ op: 'excluir', tabela, id })
const limpo = reg => { const { cor, ...r } = $state.snapshot(reg); return r }

// Id de um registro novo, fixo enquanto o formulário estiver aberto: se a gravação falhar depois de já ter
// chegado à planilha, tentar de novo regrava o mesmo registro em vez de criar outro igual
const idsNovos = new WeakMap()
export function idDe(f) {
  if (f.id) return f.id
  if (!idsNovos.has(f)) idsNovos.set(f, novoId())
  return idsNovos.get(f)
}

/* ---------- Lançamentos ---------- */
export function abrirLanc(tipo = 'entrada', base = {}) {
  S.lanc = { id: '', data: S.tela === 'hoje' ? S.dia : hoje(), tipo, centavos: 0, categoria: '', forma: '', descricao: '', origem: 'manual', ref: '', ...base }
}
export function editarLanc(l) { S.lanc = { ...$state.snapshot(l), centavos: cent(l.valor) } }

export async function salvarLanc(f) {
  const { centavos, ...resto } = $state.snapshot(f)
  const reg = { ...resto, id: idDe(f), valor: centavos / 100, descricao: f.descricao.trim() }
  await gravar([salvar('lancamentos', reg)])
  return reg
}
export async function excluirLanc(id) {
  const ops = [excluir('lancamentos', id)]
  // se veio do pagamento de uma conta, a conta volta a ficar em aberto
  const conta = S.contas.find(c => c.lanc === id)
  if (conta) ops.push(salvar('contas', { ...limpo(conta), status: 'aberta', pago_em: '', lanc: '' }))
  await gravar(ops)
}

/* ---------- Fechamento do dia (caderno) ---------- */
export async function fecharDia(data, itens, { foto = '', obs = '' } = {}) {
  const novos = itens.map(i => ({
    // a chave da linha do caderno vira o id: salvar de novo depois de uma falha não duplica o dia
    id: i.chave || novoId() + Math.random().toString(36).slice(2, 5), data, tipo: i.tipo, valor: Math.round(i.valor * 100) / 100,
    categoria: i.categoria, forma: i.forma || '', descricao: (i.descricao || '').trim(), origem: 'caderno', ref: '',
  }))
  const todos = [...lancsDoDia(data), ...novos]
  const anterior = fechamento(data)
  const fech = {
    id: anterior?.id || data, data, foto: foto || anterior?.foto || '', obs: obs || anterior?.obs || '',
    entradas: totalTipo(todos, 'entrada'), saidas: totalTipo(todos, 'saida'), criado: anterior?.criado || '',
  }
  await gravar([...novos.map(n => salvar('lancamentos', n)), salvar('fechamentos', fech)])
  S.flores++
}
export async function reabrirDia(data) {
  const f = fechamento(data)
  if (f) await gravar([excluir('fechamentos', f.id)])
}

/* ---------- Encomendas ---------- */
export function abrirEncomenda(base = {}) {
  S.encomenda = { id: '', cliente: '', telefone: '', pedido: '', valor: '', sinal: '', entrega_data: hoje(), entrega_hora: '', modo: 'retirada', endereco: '', destinatario: '', cartao: '', status: 'aberta', obs: '', criado: '', ...base }
}
export async function salvarEncomenda(e) { await gravar([salvar('encomendas', { ...e, id: idDe(e) })]) }
export async function mudarStatusEncomenda(e, status) { await gravar([salvar('encomendas', { ...limpo(e), status })]) }
export async function excluirEncomenda(id) { await gravar([excluir('encomendas', id)]) }

// Lança no caixa o que a cliente pagou (sinal ou o restante)
// (r = { valor, forma, oque }, o formulário aberto: o id fica fixo se precisar tentar de novo)
export async function receberEncomenda(e, r) {
  const { valor, forma, oque } = r
  const lanc = { id: idDe(r), data: hoje(), tipo: 'entrada', valor, categoria: categoriaPadrao('entrada', 'encomenda'), forma, descricao: `${oque} · ${e.cliente}`, origem: 'encomenda', ref: e.id }
  await gravar([salvar('lancamentos', lanc)])
}
export const recebidoEncomenda = e => S.lancamentos.filter(l => l.ref === e.id && l.origem === 'encomenda').reduce((a, l) => a + cent(l.valor), 0) / 100

function categoriaPadrao(tipo, pista) {
  const lista = categoriasDoTipo(tipo)
  return (lista.find(c => c.nome.toLowerCase().includes(pista)) || lista[0])?.id || ''
}

/* ---------- Contas a pagar ---------- */
export function abrirConta(base = {}) {
  S.conta = { id: '', descricao: '', fornecedor: '', valor: '', vencimento: hoje(), categoria: '', status: 'aberta', pago_em: '', forma: 'Boleto', repetir: 'nao', codigo: '', obs: '', lanc: '', criado: '', ...base }
}
export async function salvarConta(c) { await gravar([salvar('contas', { ...c, id: idDe(c) })]) }
export async function excluirConta(id) { await gravar([excluir('contas', id)]) }

// Pagar: marca a conta como paga, lança a saída no caixa e, se repete, já cria a do mês que vem
export async function pagarConta(c, { data = hoje(), forma = c.forma, lancar = true } = {}) {
  const ops = []
  let lancId = ''
  if (lancar) {
    lancId = 'pg-' + c.id // fixo por conta: pagar de novo depois de uma falha não duplica a saída
    const f = c.fornecedor ? fornecedor(c.fornecedor)?.nome : ''
    ops.push(salvar('lancamentos', {
      id: lancId, data, tipo: 'saida', valor: Number(c.valor), categoria: c.categoria || categoriaPadrao('saida', 'outra'),
      forma: forma || '', descricao: c.descricao + (f ? ` · ${f}` : ''), origem: 'conta', ref: c.id,
    }))
  }
  ops.push(salvar('contas', { ...limpo(c), status: 'paga', pago_em: data, forma: forma || '', lanc: lancId }))
  if (c.repetir === 'mensal') {
    const venc = proximoMes(c.vencimento)
    const jaTem = S.contas.some(x => x.id !== c.id && x.descricao === c.descricao && x.vencimento === venc)
    if (!jaTem) ops.push(salvar('contas', { ...limpo(c), id: c.id.split('~')[0] + '~' + venc, vencimento: venc, status: 'aberta', pago_em: '', lanc: '', criado: '' }))
  }
  await gravar(ops)
}
export async function desfazerPagamento(c) {
  const ops = [salvar('contas', { ...limpo(c), status: 'aberta', pago_em: '', lanc: '' })]
  if (c.lanc && S.lancamentos.some(l => l.id === c.lanc)) ops.push(excluir('lancamentos', c.lanc))
  await gravar(ops)
}
// mesmo dia no mês seguinte (dia 31 vira o último dia do mês)
function proximoMes(s) {
  const d = deISO(s), m = somarMeses(s.slice(0, 7), 1)
  const [y, mm] = m.split('-').map(Number)
  return iso(new Date(y, mm - 1, Math.min(d.getDate(), new Date(y, mm, 0).getDate())))
}

/* ---------- Fornecedores ---------- */
export function abrirFornecedor(base = {}) { S.fornecedor = { id: '', nome: '', telefone: '', produtos: '', pix: '', obs: '', criado: '', ...base } }
export async function salvarFornecedor(f) { await gravar([salvar('fornecedores', { ...f, id: idDe(f) })]) }
export async function excluirFornecedor(id) {
  const ops = S.contas.filter(c => c.fornecedor === id).map(c => salvar('contas', { ...limpo(c), fornecedor: '' }))
  await gravar([...ops, excluir('fornecedores', id)])
}

/* ---------- Categorias ---------- */
export async function salvarCategoria(c) {
  const ordem = c.ordem || Math.max(0, ...S.categorias.map(x => x.ordem || 0)) + 1
  const reg = { ...limpo(c), id: idDe(c), ordem }
  await gravar([salvar('categorias', reg)])
  return reg
}
// Excluir uma categoria usada: os lançamentos e contas passam para outra
export async function excluirCategoria(id, destino) {
  const ops = []
  if (destino) {
    S.lancamentos.filter(l => l.categoria === id).forEach(l => ops.push(salvar('lancamentos', { ...limpo(l), categoria: destino })))
    S.contas.filter(c => c.categoria === id).forEach(c => ops.push(salvar('contas', { ...limpo(c), categoria: destino })))
  }
  ops.push(excluir('categorias', id))
  await gravar(ops)
}
export async function moverCategoria(id, direcao) {
  const c = S.categorias.find(x => x.id === id)
  const lista = categoriasDoTipo(c.tipo)
  const i = lista.findIndex(x => x.id === id), j = i + direcao
  if (j < 0 || j >= lista.length) return
  const outra = lista[j]
  await gravar([salvar('categorias', { ...limpo(c), ordem: outra.ordem }), salvar('categorias', { ...limpo(outra), ordem: c.ordem })])
}

export const usoCategoria = id => S.lancamentos.filter(l => l.categoria === id).length + S.contas.filter(c => c.categoria === id).length

export function irPara(t) {
  if (t === 'hoje' && S.tela !== 'hoje') S.dia = hoje() // voltar para a aba Hoje abre o dia de hoje
  S.tela = t
  window.scrollTo({ top: 0 })
}
