// Tabelas, categorias iniciais e listas fixas do app.
// Cada tabela vira uma aba na planilha do Google, com as colunas nesta ordem.
export const TABELAS = {
  lancamentos: ['id', 'data', 'tipo', 'valor', 'categoria', 'forma', 'descricao', 'origem', 'ref', 'criado'],
  categorias: ['id', 'nome', 'tipo', 'ordem'],
  encomendas: ['id', 'cliente', 'telefone', 'pedido', 'valor', 'sinal', 'entrega_data', 'entrega_hora', 'modo', 'endereco', 'destinatario', 'cartao', 'status', 'obs', 'criado'],
  contas: ['id', 'descricao', 'fornecedor', 'valor', 'vencimento', 'categoria', 'status', 'pago_em', 'forma', 'repetir', 'codigo', 'obs', 'lanc', 'criado'],
  fornecedores: ['id', 'nome', 'telefone', 'produtos', 'pix', 'obs', 'criado'],
  fechamentos: ['id', 'data', 'foto', 'entradas', 'saidas', 'obs', 'criado'],
}

// Sugestão para começar: dá para renomear, apagar e criar outras em Mais › Categorias
export const CATEGORIAS_INICIAIS = [
  ['c-balcao', 'Venda no balcão', 'entrada'],
  ['c-encomenda', 'Encomendas e arranjos', 'entrada'],
  ['c-coroa', 'Coroas de flores', 'entrada'],
  ['c-taxa', 'Taxa de entrega', 'entrada'],
  ['c-outra-e', 'Outra entrada', 'entrada'],
  ['c-flores', 'Flores e plantas', 'saida'],
  ['c-materiais', 'Vasos, fitas e embalagens', 'saida'],
  ['c-aluguel', 'Aluguel', 'saida'],
  ['c-contas', 'Luz, água e internet', 'saida'],
  ['c-funcionario', 'Funcionário', 'saida'],
  ['c-impostos', 'Impostos', 'saida'],
  ['c-entrega', 'Entrega e combustível', 'saida'],
  ['c-retirada', 'Retirada pessoal', 'saida'],
  ['c-outra-s', 'Outra saída', 'saida'],
].map(([id, nome, tipo], i) => ({ id, nome, tipo, ordem: i + 1 }))

export const FORMAS = ['Dinheiro', 'Pix', 'Débito', 'Crédito', 'Boleto', 'Outro']

export const STATUS_ENCOMENDA = {
  aberta: { nome: 'A fazer', classe: 'bg-alerta-fundo text-alerta' },
  pronta: { nome: 'Pronta', classe: 'bg-ent-fundo text-ent' },
  entregue: { nome: 'Entregue', classe: 'bg-sup-2 text-txt-3' },
  cancelada: { nome: 'Cancelada', classe: 'bg-sup-2 text-txt-3 line-through' },
}

// Cores das categorias pela posição dentro do tipo (validadas para daltonismo, nesta ordem).
// Da 9ª em diante fica cinza: nos gráficos elas entram em "Outras".
const PALETA = ['#c2456a', '#1a8bb0', '#c47a1e', '#7a55c0', '#3c8a5c', '#d65f8a', '#4a6fd0', '#9a6a2a']
export const COR_OUTRAS = '#a4949a'
export const corDaPosicao = i => PALETA[i] || COR_OUTRAS
