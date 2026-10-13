// Modo demonstração: mesmo jeito de falar do servidor, mas guarda tudo neste navegador.
// Gera ~14 meses de movimento inventado para dar para testar relatórios e comparações.
import { CATEGORIAS_INICIAIS } from './dados.js'
import { iso, hoje, somarDias, deISO, novoId } from './formato.js'

const CHAVE = 'ternura_demo_v1'
const espera = ms => new Promise(r => setTimeout(r, ms))
const fotos = new Map() // fotos do caderno só ficam enquanto a página está aberta

// Sorteio com semente: os dados de exemplo saem sempre iguais
function sorteador(semente) {
  let s = semente
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
}

function gerar() {
  const r = sorteador(20261010)
  const entre = (a, b) => a + r() * (b - a)
  const valor = (a, b, passo = 5) => Math.round(entre(a, b) / passo) * passo
  const lancs = [], fechamentos = []
  const agora = new Date().toISOString()
  const lanc = (data, tipo, v, categoria, forma, descricao) =>
    lancs.push({ id: novoId() + lancs.length, data, tipo, valor: v, categoria, forma, descricao, origem: 'caderno', ref: '', criado: agora })

  const fim = hoje()
  let d = iso(new Date(new Date().getFullYear() - 1, new Date().getMonth() - 2, 1))
  while (d <= fim) {
    const dt = deISO(d), dia = dt.getDate(), mes = dt.getMonth() + 1, sem = dt.getDay()
    // datas fortes de floricultura
    let fator = 1
    if (mes === 5 && dia >= 6 && dia <= 12) fator = 2.6 // Dia das Mães
    if (mes === 6 && dia >= 9 && dia <= 12) fator = 2.4 // Dia dos Namorados
    if (mes === 11 && dia <= 2) fator = 3 // Finados
    if (mes === 12 && dia >= 18 && dia <= 24) fator = 1.6
    if (mes === 3 && dia === 8) fator = 1.8 // Dia da Mulher
    const aberto = sem !== 0 || r() < 0.3
    if (aberto && d !== fim) {
      const n = Math.round(entre(3, 6) * fator)
      for (let i = 0; i < n; i++) {
        const x = r()
        if (x < 0.55) lanc(d, 'entrada', valor(25, 120), 'c-balcao', r() < 0.5 ? 'Pix' : r() < 0.6 ? 'Dinheiro' : 'Débito', ['Buquê de rosas', 'Vaso de orquídea', 'Flores avulsas', 'Arranjo pequeno', 'Kalanchoe', 'Girassóis'][Math.floor(r() * 6)])
        else if (x < 0.85) lanc(d, 'entrada', valor(90, 260), 'c-encomenda', r() < 0.7 ? 'Pix' : 'Crédito', ['Arranjo de mesa', 'Buquê de noiva', 'Cesta de café com flores', 'Arranjo para aniversário'][Math.floor(r() * 4)])
        else if (x < 0.93) lanc(d, 'entrada', valor(250, 480, 10), 'c-coroa', 'Pix', 'Coroa de flores')
        else lanc(d, 'entrada', valor(10, 25), 'c-taxa', 'Pix', 'Entrega')
      }
      if (sem === 2 || sem === 5) lanc(d, 'saida', valor(280, 520, 10) * (fator > 1.5 ? 1.8 : 1), 'c-flores', 'Pix', 'Compra no Ceasa')
      if (sem === 3) lanc(d, 'saida', valor(60, 160), 'c-materiais', 'Dinheiro', ['Fitas e papel', 'Vasos', 'Espuma floral', 'Celofane'][Math.floor(r() * 4)])
      if (sem === 1) lanc(d, 'saida', valor(60, 110), 'c-entrega', 'Débito', 'Gasolina')
    }
    if (d !== fim) {
      if (dia === 5) { lanc(d, 'saida', 1800, 'c-aluguel', 'Boleto', 'Aluguel da loja'); lanc(d, 'saida', 1750, 'c-funcionario', 'Pix', 'Salário da Joana') }
      if (dia === 10) lanc(d, 'saida', valor(210, 290), 'c-contas', 'Boleto', 'Conta de luz')
      if (dia === 15) lanc(d, 'saida', 119.9, 'c-contas', 'Boleto', 'Internet')
      if (dia === 20) lanc(d, 'saida', 76.9, 'c-impostos', 'Boleto', 'DAS do MEI')
      if (dia === 28) lanc(d, 'saida', valor(1200, 1800, 50), 'c-retirada', 'Pix', 'Retirada do mês')
      if (d < somarDias(fim, -1)) fechamentos.push({ id: d, data: d, foto: '', entradas: 0, saidas: 0, obs: '', criado: agora })
    }
    d = somarDias(d, 1)
  }

  const fornecedores = [
    { id: 'f1', nome: 'Ceasa · Box do Seu Antônio', telefone: '11988887777', produtos: 'Rosas, crisântemos, folhagens', pix: '', obs: 'Terça e sexta bem cedo', criado: agora },
    { id: 'f2', nome: 'Holambra Plantas', telefone: '19977776666', produtos: 'Orquídeas e vasos de planta', pix: '', obs: 'Boleto 28 dias', criado: agora },
    { id: 'f3', nome: 'Embalagens Primavera', telefone: '1133332222', produtos: 'Celofane, fitas, papel kraft', pix: '', obs: '', criado: agora },
  ]
  const conta = (descricao, valor, dias, categoria, fornecedor = '', repetir = 'nao') =>
    ({ id: novoId() + descricao.length, descricao, fornecedor, valor, vencimento: somarDias(fim, dias), categoria, status: 'aberta', pago_em: '', forma: 'Boleto', repetir, codigo: '', obs: '', lanc: '', criado: agora })
  const contas = [
    conta('Boleto orquídeas', 640, -1, 'c-flores', 'f2'),
    conta('Conta de luz', 248.6, 0, 'c-contas', '', 'mensal'),
    conta('Embalagens de outubro', 312, 2, 'c-materiais', 'f3'),
    conta('Internet', 119.9, 5, 'c-contas', '', 'mensal'),
    conta('DAS do MEI', 76.9, 10, 'c-impostos', '', 'mensal'),
    conta('Aluguel da loja', 1800, 25, 'c-aluguel', '', 'mensal'),
  ]
  const enc = (cliente, pedido, valor, sinal, dias, hora, modo, status, extra = {}) =>
    ({ id: novoId() + cliente.length, cliente, telefone: '11 9' + Math.floor(10000000 + r() * 89999999), pedido, valor, sinal, entrega_data: somarDias(fim, dias), entrega_hora: hora, modo, endereco: '', destinatario: '', cartao: '', status, obs: '', criado: agora, ...extra })
  const encomendas = [
    enc('Marcia Souza', 'Buquê com 12 rosas vermelhas', 180, 90, 0, '16:00', 'retirada', 'pronta'),
    enc('Paulo Henrique', 'Arranjo de mesa com lírios', 150, 0, 0, '18:30', 'entrega', 'aberta', { endereco: 'Rua das Acácias, 120', destinatario: 'Dona Célia', cartao: 'Feliz aniversário, mãe! Te amo.' }),
    enc('Igreja Matriz', 'Decoração do altar (casamento)', 950, 400, 1, '09:00', 'entrega', 'aberta', { endereco: 'Praça Central, s/n', obs: 'Flores brancas e verdes' }),
    enc('Funerária Paz', 'Coroa de flores grande', 420, 420, 2, '07:30', 'entrega', 'aberta', { cartao: 'Saudades eternas da família Lima' }),
    enc('Renata Alves', 'Cesta de café da manhã com flores', 230, 100, 4, '08:00', 'entrega', 'aberta'),
    enc('Carlos Mendes', 'Orquídea branca', 120, 120, -2, '', 'retirada', 'entregue'),
  ]
  return { categorias: CATEGORIAS_INICIAIS, lancamentos: lancs, encomendas, contas, fornecedores, fechamentos, resumos: [] }
}

function ler() {
  try { const t = localStorage.getItem(CHAVE); if (t) return JSON.parse(t) } catch {}
  const db = gerar()
  gravar(db)
  return db
}
function gravar(db) { try { localStorage.setItem(CHAVE, JSON.stringify(db)) } catch {} }

export const Demo = {
  temCodigo: () => true,
  async entrar() { return this.carregar() },
  sair() {},
  async carregar() { await espera(250); return structuredClone(ler()) },
  async lote(ops) {
    await espera(350)
    const db = ler(), agora = new Date().toISOString(), salvos = []
    for (const o of ops) {
      const lista = db[o.tabela]
      if (!lista) throw new Error('Tabela desconhecida: ' + o.tabela)
      if (o.op === 'excluir') { db[o.tabela] = lista.filter(x => x.id !== o.id); continue }
      const reg = { ...o.registro, criado: o.registro.criado || agora }
      const i = lista.findIndex(x => x.id === reg.id)
      if (i >= 0) lista[i] = reg; else lista.push(reg)
      salvos.push(reg)
    }
    gravar(db)
    return { salvos }
  },
  // Finge ler o caderno: devolve linhas de exemplo depois de alguns segundos
  async lerCaderno(imagem, data) {
    await espera(2200)
    const id = 'foto-' + data
    fotos.set(id, 'data:image/jpeg;base64,' + imagem)
    return {
      foto: id,
      itens: [
        { tipo: 'entrada', valor: 85, descricao: 'Buquê rosas', forma: 'Pix', categoria: 'c-balcao' },
        { tipo: 'entrada', valor: 45, descricao: 'Vaso kalanchoe', forma: 'Dinheiro', categoria: 'c-balcao' },
        { tipo: 'entrada', valor: 160, descricao: 'Arranjo encomenda Dona Lúcia', forma: 'Crédito', categoria: 'c-encomenda' },
        { tipo: 'entrada', valor: 30, descricao: 'Flores avulsas', forma: 'Dinheiro', categoria: 'c-balcao' },
        { tipo: 'saida', valor: 25, descricao: 'Fita cetim', forma: 'Dinheiro', categoria: 'c-materiais' },
        { tipo: 'entrada', valor: 120, descricao: 'Orquídea', forma: '', categoria: 'c-balcao', duvida: true },
      ],
      aviso: 'Modo demonstração: estas linhas são de exemplo, não vieram da sua foto.',
    }
  },
  async versao() { return 'demo' },
  async foto(id) { await espera(200); return fotos.get(id) || '' },
  async info() { await espera(200); return { planilha: '', ia: false } },
  apagarTudo() { try { localStorage.removeItem(CHAVE) } catch {} },
}
