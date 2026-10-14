/**
 * Ternura Flores · Caixa — servidor (Google Apps Script ligado à planilha).
 *
 * Guarda os dados nas abas da planilha, lê a foto do caderno com o Gemini,
 * guarda as fotos no Google Drive e arquiva os anos antigos.
 *
 * Configuração (Configurações do projeto › Propriedades do script):
 *   CODIGO_ACESSO   → código que a família digita uma vez em cada aparelho (obrigatório)
 *   GEMINI_API_KEY  → chave do Gemini (aistudio.google.com) para ler a foto do caderno
 *   GEMINI_MODEL    → opcional; padrão "gemini-flash-latest"
 * Depois de configurar, rode a função "configurar" uma vez (menu Executar).
 * O passo a passo completo está no CONFIGURAR.md do repositório.
 */

// Mesmas colunas de app/src/lib/dados.js (mudou lá, mude aqui)
const TABELAS = {
  lancamentos: ['id', 'data', 'tipo', 'valor', 'categoria', 'forma', 'descricao', 'origem', 'ref', 'criado'],
  categorias: ['id', 'nome', 'tipo', 'ordem'],
  encomendas: ['id', 'cliente', 'telefone', 'pedido', 'valor', 'sinal', 'entrega_data', 'entrega_hora', 'modo', 'endereco', 'destinatario', 'cartao', 'status', 'obs', 'criado'],
  contas: ['id', 'descricao', 'fornecedor', 'valor', 'vencimento', 'categoria', 'status', 'pago_em', 'forma', 'repetir', 'codigo', 'obs', 'lanc', 'criado'],
  fornecedores: ['id', 'nome', 'telefone', 'produtos', 'pix', 'obs', 'criado'],
  fechamentos: ['id', 'data', 'foto', 'entradas', 'saidas', 'obs', 'criado'],
  // totais por mês dos anos arquivados (tipo 'dias' = quantos dias tiveram venda no mês)
  resumos: ['id', 'mes', 'tipo', 'categoria', 'forma', 'valor', 'qtd', 'criado'],
};
const NOMES_ABAS = { lancamentos: 'Lançamentos', categorias: 'Categorias', encomendas: 'Encomendas', contas: 'Contas a pagar', fornecedores: 'Fornecedores', fechamentos: 'Fechamentos', resumos: 'Resumos' };
const NUMEROS = ['valor', 'sinal', 'entradas', 'saidas', 'ordem', 'qtd'];
const DATAS = ['data', 'entrega_data', 'vencimento', 'pago_em'];
const FORMAS = ['Dinheiro', 'Pix', 'Débito', 'Crédito', 'Boleto', 'Outro'];
const PASTA_FOTOS = 'Ternura Flores · Fotos do caderno';

const CATEGORIAS_INICIAIS = [
  ['c-balcao', 'Venda no balcão', 'entrada'], ['c-encomenda', 'Encomendas e arranjos', 'entrada'], ['c-coroa', 'Coroas de flores', 'entrada'],
  ['c-taxa', 'Taxa de entrega', 'entrada'], ['c-outra-e', 'Outra entrada', 'entrada'], ['c-flores', 'Flores e plantas', 'saida'],
  ['c-materiais', 'Vasos, fitas e embalagens', 'saida'], ['c-aluguel', 'Aluguel', 'saida'], ['c-contas', 'Luz, água e internet', 'saida'],
  ['c-funcionario', 'Funcionário', 'saida'], ['c-impostos', 'Impostos', 'saida'], ['c-entrega', 'Entrega e combustível', 'saida'],
  ['c-retirada', 'Retirada pessoal', 'saida'], ['c-outra-s', 'Outra saída', 'saida'],
];

const props = () => PropertiesService.getScriptProperties();
const fuso = () => Session.getScriptTimeZone() || 'America/Sao_Paulo';
const hojeISO = () => Utilities.formatDate(new Date(), fuso(), 'yyyy-MM-dd');

function Erro(msg, tipo) { const e = new Error(msg); e.tipo = tipo || 'servidor'; return e; }
function resposta(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/* ---------------- Entrada do app ---------------- */

function doGet() {
  return ContentService.createTextOutput('Ternura Flores · servidor funcionando.');
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (_) { return resposta({ ok: false, erro: 'Pedido inválido.' }); }
  try {
    checarCodigo(req.codigo);
    let dados;
    switch (req.acao) {
      case 'carregar': dados = carregarTudo(); break;
      case 'lote': dados = aplicarLote(req.ops || []); break;
      case 'lerCaderno': dados = lerCaderno(req.imagem, req.data); break;
      case 'foto': dados = lerFoto(req.id); break;
      case 'info': dados = info(); break;
      case 'versao': dados = props().getProperty('VERSAO_DADOS') || ''; break;
      default: throw Erro('Ação desconhecida.');
    }
    return resposta({ ok: true, dados: dados });
  } catch (err) {
    console.error(err && err.stack || err);
    return resposta({ ok: false, erro: err.message || String(err), tipo: err.tipo || 'servidor' });
  }
}

// Código de acesso, com trava depois de muitas tentativas erradas
function checarCodigo(codigo) {
  const certo = props().getProperty('CODIGO_ACESSO');
  if (!certo) throw Erro('Servidor sem CODIGO_ACESSO. Veja o CONFIGURAR.md.');
  const cache = CacheService.getScriptCache();
  const falhas = Number(cache.get('falhas') || 0);
  if (falhas >= 15) throw Erro('Muitas tentativas erradas. Espere 15 minutos.', 'codigo');
  if (String(codigo || '') !== certo) {
    cache.put('falhas', String(falhas + 1), 900);
    throw Erro('Código de acesso errado.', 'codigo');
  }
}

/* ---------------- Planilha ---------------- */

let planilhaAtiva = null; // só o testeDeVelocidade troca, para usar uma planilha temporária
function planilha() { return planilhaAtiva || SpreadsheetApp.getActiveSpreadsheet(); }

function aba(tabela) {
  const ss = planilha();
  const nome = NOMES_ABAS[tabela];
  let sh = ss.getSheetByName(nome);
  if (sh) return sh;
  const cols = TABELAS[tabela];
  sh = ss.insertSheet(nome);
  sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#fbe4ea');
  sh.setFrozenRows(1);
  // texto puro (datas não viram data do Sheets) e números com centavos
  cols.forEach(function (c, i) {
    sh.getRange(2, i + 1, sh.getMaxRows() - 1, 1).setNumberFormat(NUMEROS.indexOf(c) >= 0 ? '#,##0.00' : '@');
  });
  return sh;
}

function lerTabela(tabela) {
  const sh = aba(tabela);
  const n = sh.getLastRow();
  if (n < 2) return [];
  const cols = TABELAS[tabela];
  const valores = sh.getRange(2, 1, n - 1, cols.length).getValues();
  const tz = fuso();
  return valores.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    const o = {};
    cols.forEach(function (c, i) {
      let v = r[i];
      if (v instanceof Date) {
        // se o Sheets converteu sozinho, volta para o formato do app
        v = c === 'entrega_hora' ? Utilities.formatDate(v, tz, 'HH:mm') : c === 'criado' ? v.toISOString() : Utilities.formatDate(v, tz, 'yyyy-MM-dd');
      }
      o[c] = NUMEROS.indexOf(c) >= 0 ? Number(v) || 0 : String(v);
    });
    return o;
  });
}

function carregarTudo() {
  const r = {};
  Object.keys(TABELAS).forEach(function (t) { r[t] = lerTabela(t); });
  r.versao = props().getProperty('VERSAO_DADOS') || '';
  return r;
}

// Confere e limpa um registro antes de gravar
function limpar(tabela, reg) {
  if (!reg || typeof reg !== 'object') throw Erro('Registro inválido.');
  const o = {};
  TABELAS[tabela].forEach(function (c) {
    let v = reg[c];
    if (NUMEROS.indexOf(c) >= 0) {
      v = Number(v) || 0;
      if (v < 0 || v > 10000000) throw Erro('Valor fora do esperado.');
      v = Math.round(v * 100) / 100;
    } else {
      v = v == null ? '' : String(v).slice(0, 500);
      if (DATAS.indexOf(c) >= 0 && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw Erro('Data inválida: ' + v);
    }
    o[c] = v;
  });
  if (!o.id || o.id.length > 60) throw Erro('Registro sem id.');
  if (tabela === 'lancamentos' && ['entrada', 'saida'].indexOf(o.tipo) < 0) throw Erro('Tipo inválido.');
  if (tabela === 'resumos') throw Erro('Resumos são gravados só pelo arquivamento.');
  return o;
}

// Texto que começa com = + - @ viraria fórmula no Sheets
function celula(c, v) {
  if (NUMEROS.indexOf(c) >= 0) return v;
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

// Grava um lote de operações de uma vez (com trava, para mãe e irmão não se atropelarem)
function aplicarLote(ops) {
  if (!Array.isArray(ops) || !ops.length) return { salvos: [] };
  if (ops.length > 2000) throw Erro('Lote grande demais.');
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(25000)) throw Erro('A planilha está ocupada. Tente de novo.');
  try {
    const porTabela = {};
    ops.forEach(function (o) {
      if (!TABELAS[o.tabela]) throw Erro('Tabela desconhecida: ' + o.tabela);
      (porTabela[o.tabela] = porTabela[o.tabela] || []).push(o);
    });
    const salvos = [];
    const agora = new Date().toISOString();
    Object.keys(porTabela).forEach(function (t) {
      const sh = aba(t), cols = TABELAS[t];
      const n = sh.getLastRow();
      const ids = n > 1 ? sh.getRange(2, 1, n - 1, 1).getDisplayValues().map(function (r) { return String(r[0]); }) : [];
      const linhaDe = {};
      ids.forEach(function (id, i) { if (id) linhaDe[id] = i + 2; });
      const novos = [], novosIds = [], apagar = {};
      porTabela[t].forEach(function (o) {
        if (o.op === 'excluir') {
          const l = linhaDe[String(o.id)];
          if (l) apagar[l] = true;
          return;
        }
        const reg = limpar(t, o.registro);
        if ('criado' in reg && !reg.criado) reg.criado = agora;
        const linha = cols.map(function (c) { return celula(c, reg[c]); });
        const l = linhaDe[reg.id];
        if (l && !apagar[l]) sh.getRange(l, 1, 1, cols.length).setValues([linha]);
        else {
          const i = novosIds.indexOf(reg.id);
          if (i >= 0) novos[i] = linha; else { novos.push(linha); novosIds.push(reg.id); }
        }
        salvos.push(reg);
      });
      if (novos.length) {
        const inicio = sh.getLastRow() + 1;
        const faixa = sh.getRange(inicio, 1, novos.length, cols.length);
        cols.forEach(function (c, i) { sh.getRange(inicio, i + 1, novos.length, 1).setNumberFormat(NUMEROS.indexOf(c) >= 0 ? '#,##0.00' : '@'); });
        faixa.setValues(novos);
      }
      Object.keys(apagar).map(Number).sort(function (a, b) { return b - a; }).forEach(function (l) { sh.deleteRow(l); });
    });
    // o app pergunta só por este número a cada 2 minutos e baixa tudo só quando ele muda
    const versao = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    if (!planilhaAtiva) props().setProperty('VERSAO_DADOS', versao);
    return { salvos: salvos, versao: versao };
  } finally {
    trava.releaseLock();
  }
}

/* ---------------- Foto do caderno + Gemini ---------------- */

function pastaFotos() {
  const id = props().getProperty('PASTA_FOTOS_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (_) {} }
  const p = DriveApp.createFolder(PASTA_FOTOS);
  props().setProperty('PASTA_FOTOS_ID', p.getId());
  return p;
}

function lerCaderno(imagem, data) {
  if (!imagem || typeof imagem !== 'string') throw Erro('Foto não recebida.');
  if (imagem.length > 12000000) throw Erro('Foto grande demais.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data))) throw Erro('Data inválida.');
  const bytes = Utilities.base64Decode(imagem);
  const nome = 'caderno-' + data + '-' + Utilities.formatDate(new Date(), fuso(), 'HHmmss') + '.jpg';
  const arquivo = pastaFotos().createFile(Utilities.newBlob(bytes, 'image/jpeg', nome));
  const foto = arquivo.getId();

  const chave = props().getProperty('GEMINI_API_KEY');
  if (!chave) return { foto: foto, itens: [], aviso: 'A leitura automática ainda não está ligada (falta a chave do Gemini). Digite olhando a foto.' };

  const cats = lerTabela('categorias');
  const listaCats = cats.map(function (c) { return '- ' + c.id + ': ' + c.nome + ' (' + (c.tipo === 'entrada' ? 'entrada' : 'saída') + ')'; }).join('\n');
  const [y, m, d] = String(data).split('-');
  const prompt = [
    'Esta é a foto de uma página do caderno de caixa de uma floricultura pequena, escrito à mão em português do Brasil.',
    'Extraia cada lançamento (cada linha que tem um valor em dinheiro).',
    'O dia que está sendo fechado é ' + d + '/' + m + '/' + y + '. Se a página tiver mais de um dia, pegue só as linhas desse dia; se não der para saber o dia, pegue todas.',
    'Regras:',
    '- tipo "entrada" = venda ou dinheiro recebido. tipo "saida" = pagamento, compra, gasto, vale ou retirada (costuma estar marcado com "saída", "-", "pg", "pago", "retirada", ou numa coluna separada).',
    '- valor em reais como número com ponto decimal (ex.: "12,50" → 12.5; "1.200" → 1200).',
    '- Ignore linhas de total, soma, subtotal, saldo ou troco inicial.',
    '- descricao: o que estiver escrito na linha, corrigindo só a ortografia óbvia. Curta.',
    '- forma: Dinheiro, Pix, Débito, Crédito, Boleto ou Outro, se estiver anotada (din/dinh = Dinheiro, deb = Débito, cred = Crédito). Se só disser "cartão" ou não tiver nada, use "nenhuma".',
    '- categoria: o id mais adequado desta lista, do mesmo tipo do lançamento:\n' + listaCats,
    '- NÃO invente nada. Se não tiver certeza do valor, do tipo ou de algum número, marque duvida = true.',
  ].join('\n');

  const schema = {
    type: 'OBJECT',
    properties: {
      itens: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            tipo: { type: 'STRING', enum: ['entrada', 'saida'] },
            valor: { type: 'NUMBER' },
            descricao: { type: 'STRING' },
            forma: { type: 'STRING', enum: FORMAS.concat(['nenhuma']) },
            categoria: { type: 'STRING' },
            duvida: { type: 'BOOLEAN' },
          },
          required: ['tipo', 'valor', 'descricao', 'forma', 'categoria', 'duvida'],
        },
      },
      observacao: { type: 'STRING' },
    },
    required: ['itens'],
  };
  const corpo = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: imagem } }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.1 },
  };

  const preferido = props().getProperty('GEMINI_MODEL') || 'gemini-flash-latest';
  const modelos = [preferido, 'gemini-3.8-flash', 'gemini-flash-lite-latest'].filter(function (x, i, a) { return a.indexOf(x) === i; });
  let ultimoErro = '';
  for (let i = 0; i < modelos.length; i++) {
    const r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelos[i] + ':generateContent', {
      method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': chave },
      payload: JSON.stringify(corpo), muteHttpExceptions: true,
    });
    const status = r.getResponseCode();
    if (status !== 200) { ultimoErro = 'Gemini ' + status + ': ' + r.getContentText().slice(0, 200); console.warn(ultimoErro); continue; }
    try {
      const json = JSON.parse(r.getContentText());
      const texto = json.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
      const lido = JSON.parse(texto);
      const itens = (lido.itens || []).filter(function (x) { return x && Number(x.valor) > 0; }).map(function (x) {
        return { tipo: x.tipo === 'saida' ? 'saida' : 'entrada', valor: Math.round(Number(x.valor) * 100) / 100, descricao: String(x.descricao || '').slice(0, 120), forma: FORMAS.indexOf(x.forma) >= 0 ? x.forma : '', categoria: String(x.categoria || ''), duvida: !!x.duvida };
      });
      return { foto: foto, itens: itens, aviso: lido.observacao ? String(lido.observacao).slice(0, 200) : '' };
    } catch (err) { ultimoErro = 'Resposta da IA sem formato: ' + err; console.warn(ultimoErro); }
  }
  return { foto: foto, itens: [], aviso: 'Não consegui ler a foto agora (' + ultimoErro.slice(0, 80) + '). Digite olhando a foto.' };
}

// Só devolve fotos da pasta do caderno
function lerFoto(id) {
  if (!id) return '';
  const arq = DriveApp.getFileById(String(id));
  const pastas = arq.getParents();
  const pasta = pastaFotos().getId();
  let ok = false;
  while (pastas.hasNext()) if (pastas.next().getId() === pasta) ok = true;
  if (!ok) throw Erro('Foto não encontrada.');
  return 'data:image/jpeg;base64,' + Utilities.base64Encode(arq.getBlob().getBytes());
}

function info() {
  return {
    planilha: planilha().getUrl(),
    ia: !!props().getProperty('GEMINI_API_KEY'),
  };
}

/* ---------------- Instalação (rodar uma vez pelo editor) ---------------- */

function configurar() {
  // abas
  Object.keys(TABELAS).forEach(aba);
  // categorias iniciais, se estiver vazio
  if (!lerTabela('categorias').length) {
    aplicarLote(CATEGORIAS_INICIAIS.map(function (c, i) {
      return { op: 'salvar', tabela: 'categorias', registro: { id: c[0], nome: c[1], tipo: c[2], ordem: i + 1 } };
    }));
  }
  // tira a "Página1" vazia que vem na planilha nova
  const ss = planilha();
  ['Página1', 'Sheet1', 'Planilha1'].forEach(function (n) { const s = ss.getSheetByName(n); if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s); });
  // pasta das fotos
  pastaFotos();
  // arquivamento: roda todo dia 2 de madrugada, mas só faz algo quando um ano passa dos 2 anos de detalhe
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'arquivarAntigos') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('arquivarAntigos').timeBased().onMonthDay(2).atHour(3).create();

  const p = props();
  console.log('Pronto!');
  console.log('Código de acesso: ' + (p.getProperty('CODIGO_ACESSO') ? 'ok' : 'FALTA (crie a propriedade CODIGO_ACESSO)'));
  console.log('Gemini: ' + (p.getProperty('GEMINI_API_KEY') ? 'ok' : 'falta GEMINI_API_KEY (sem ela a foto não é lida)'));
  console.log('Fuso horário do projeto: ' + fuso());
}

// Confere se a chave do Gemini funciona (rodar pelo editor). Manda só um texto curto, sem foto.
function testarGemini() {
  const chave = props().getProperty('GEMINI_API_KEY');
  if (!chave) { console.log('Falta a propriedade GEMINI_API_KEY.'); return; }
  console.log('Chave começa com: ' + chave.slice(0, 4) + '… (' + chave.length + ' caracteres)');
  const preferido = props().getProperty('GEMINI_MODEL') || 'gemini-flash-latest';
  const modelos = [preferido, 'gemini-3.8-flash', 'gemini-flash-lite-latest'].filter(function (x, i, a) { return a.indexOf(x) === i; });
  modelos.forEach(function (m) {
    const r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent', {
      method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': chave },
      payload: JSON.stringify({ contents: [{ parts: [{ text: 'Responda só: ok' }] }] }), muteHttpExceptions: true,
    });
    const status = r.getResponseCode();
    console.log(m + ': ' + (status === 200 ? 'FUNCIONOU' : 'erro ' + status + ' · ' + r.getContentText().slice(0, 300)));
  });
}

/* ---------------- Teste de velocidade (rodar pelo editor, quando quiser) ---------------- */

// Cria uma planilha TEMPORÁRIA (não mexe na de verdade), enche com 2 e 5 anos de movimento
// no volume da loja, mede leitura e gravação e manda a temporária para a lixeira.
function testeDeVelocidade() {
  const resultados = [];
  [2, 5].forEach(function (anos) {
    const temp = SpreadsheetApp.create('Ternura · teste de velocidade (pode apagar)');
    planilhaAtiva = temp;
    try {
      Object.keys(TABELAS).forEach(aba);
      const linhas = { lancamentos: [], fechamentos: [], contas: [], encomendas: [] };
      const fim = new Date(), d = new Date(); d.setFullYear(fim.getFullYear() - anos);
      let n = 0;
      for (; d < fim; d.setDate(d.getDate() + 1)) {
        const dia = Utilities.formatDate(d, fuso(), 'yyyy-MM-dd'), agora = d.toISOString();
        if (d.getDay() !== 0) {
          for (let i = 0; i < 9; i++) linhas.lancamentos.push(['l' + n++, dia, i < 8 ? 'entrada' : 'saida', 50 + (n % 120), 'c-balcao', 'Pix', 'Buquê de rosas vermelhas', 'caderno', '', agora]);
          if (n % 3 === 0) linhas.encomendas.push(['e' + n, 'Cliente Exemplo', '11999998888', 'Arranjo de mesa com lírios', 180, 90, dia, '14:00', 'entrega', 'Rua das Flores, 123', 'Dona Maria', 'Feliz aniversário!', 'entregue', '', agora]);
        }
        linhas.fechamentos.push([dia, dia, '', 600, 300, '', agora]);
        if (d.getDate() <= 8) linhas.contas.push(['c' + n++, 'Boleto fornecedor', 'f1', 350, dia, 'c-flores', 'paga', dia, 'Boleto', 'nao', '', '', '', agora]);
      }
      Object.keys(linhas).forEach(function (t) {
        if (linhas[t].length) aba(t).getRange(2, 1, linhas[t].length, TABELAS[t].length).setValues(linhas[t]);
      });
      SpreadsheetApp.flush();

      let t0 = Date.now();
      const tudo = carregarTudo();
      const leitura = Date.now() - t0;
      const tamanho = JSON.stringify(tudo).length;

      t0 = Date.now();
      aplicarLote([{ op: 'salvar', tabela: 'lancamentos', registro: { id: 'novo', data: hojeISO(), tipo: 'entrada', valor: 85, categoria: 'c-balcao', forma: 'Pix', descricao: 'teste', origem: 'manual', ref: '', criado: '' } }]);
      SpreadsheetApp.flush();
      const gravacao = Date.now() - t0;

      resultados.push(anos + ' anos: ' + tudo.lancamentos.length + ' lançamentos · leitura ' + (leitura / 1000).toFixed(1) + ' s · gravar um lançamento ' + (gravacao / 1000).toFixed(1) + ' s · ' + (tamanho / 1048576).toFixed(1) + ' MB enviados ao app');
    } finally {
      planilhaAtiva = null;
      DriveApp.getFileById(temp.getId()).setTrashed(true);
    }
  });
  resultados.forEach(function (r) { console.log(r); });
  return resultados;
}

/* ---------------- Arquivo dos anos antigos ---------------- */

// Mantém com detalhe os 2 anos anteriores completos + o ano atual. O que for mais antigo
// vai para a planilha "Ternura Flores · Arquivo" (uma aba por tabela e ano), sem apagar nada,
// e os lançamentos viram totais por mês na aba Resumos, que os relatórios usam para anos antigos.
// Só tira da planilha principal depois de conferir que a cópia no arquivo está completa.
const ARQUIVAVEIS = {
  lancamentos: function (o, corte) { return o.data && o.data < corte; },
  fechamentos: function (o, corte) { return o.data && o.data < corte; },
  contas: function (o, corte) { return o.status === 'paga' && o.pago_em && o.pago_em < corte; },
  encomendas: function (o, corte) { return (o.status === 'entregue' || o.status === 'cancelada') && o.entrega_data && o.entrega_data < corte; },
};

function planilhaArquivo() {
  const id = props().getProperty('ARQUIVO_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (_) {} }
  const p = SpreadsheetApp.create('Ternura Flores · Arquivo');
  props().setProperty('ARQUIVO_ID', p.getId());
  return p;
}

function arquivarAntigos() {
  const corte = (Number(hojeISO().slice(0, 4)) - 2) + '-01-01';
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(60000)) throw Erro('A planilha está ocupada. Tente de novo.');
  const relatorio = [];
  try {
    const tz = fuso();
    Object.keys(ARQUIVAVEIS).forEach(function (t) {
      const sh = aba(t), cols = TABELAS[t];
      const n = sh.getLastRow();
      if (n < 2) return;
      const brutas = sh.getRange(2, 1, n - 1, cols.length).getValues();
      const objetos = lerTabela(t); // mesmas linhas, já normalizadas (sem as vazias)
      const porId = {};
      objetos.forEach(function (o) { porId[o.id] = o; });
      const sai = [], fica = [], saiObj = [];
      brutas.forEach(function (r) {
        const o = porId[String(r[0])];
        if (o && ARQUIVAVEIS[t](o, corte)) { sai.push(r); saiObj.push(o); } else if (r[0] !== '') fica.push(r);
      });
      if (!sai.length) return;

      // 1) copia para o arquivo, separando por ano
      const arq = planilhaArquivo();
      const porAno = {};
      saiObj.forEach(function (o, i) {
        const ano = String(o.data || o.pago_em || o.entrega_data).slice(0, 4);
        (porAno[ano] = porAno[ano] || []).push(sai[i]);
      });
      Object.keys(porAno).forEach(function (ano) {
        const nome = NOMES_ABAS[t] + ' ' + ano;
        let a = arq.getSheetByName(nome);
        if (!a) {
          a = arq.insertSheet(nome);
          a.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
          a.setFrozenRows(1);
        }
        const antes = a.getLastRow();
        a.getRange(antes + 1, 1, porAno[ano].length, cols.length).setValues(porAno[ano]);
        SpreadsheetApp.flush();
        // 2) confere a cópia antes de tirar qualquer coisa da principal
        if (a.getLastRow() !== antes + porAno[ano].length) throw Erro('A cópia para o arquivo não conferiu (' + nome + '). Nada foi removido.');
      });

      // 3) lançamentos viram totais por mês na aba Resumos
      if (t === 'lancamentos') somarNosResumos(saiObj);

      // 4) só agora reescreve a principal com o que fica
      if (fica.length) sh.getRange(2, 1, fica.length, cols.length).setValues(fica);
      sh.deleteRows(fica.length + 2, n - 1 - fica.length);
      relatorio.push(NOMES_ABAS[t] + ': ' + sai.length + ' arquivados');
    });
    if (relatorio.length) props().setProperty('VERSAO_DADOS', Date.now() + '-arq');
  } finally {
    trava.releaseLock();
  }
  console.log(relatorio.length ? 'Arquivado (antes de ' + corte + '): ' + relatorio.join(' · ') : 'Nada para arquivar (tudo é de ' + corte.slice(0, 4) + ' para cá).');
  return relatorio;
}

// Soma os lançamentos arquivados nos totais por mês × tipo × categoria × forma
function somarNosResumos(lancs) {
  const atual = {};
  lerTabela('resumos').forEach(function (r) { atual[r.id] = r; });
  const diasPorMes = {};
  lancs.forEach(function (l) {
    const mes = l.data.slice(0, 7);
    const id = [mes, l.tipo, l.categoria, l.forma].join('|');
    const r = atual[id] || (atual[id] = { id: id, mes: mes, tipo: l.tipo, categoria: l.categoria, forma: l.forma, valor: 0, qtd: 0, criado: '' });
    r.valor = Math.round((r.valor + Number(l.valor)) * 100) / 100;
    r.qtd += 1;
    if (l.tipo === 'entrada') (diasPorMes[mes] = diasPorMes[mes] || {})[l.data] = true;
  });
  Object.keys(diasPorMes).forEach(function (mes) {
    const id = mes + '|dias';
    const r = atual[id] || (atual[id] = { id: id, mes: mes, tipo: 'dias', categoria: '', forma: '', valor: 0, qtd: 0, criado: '' });
    r.valor += Object.keys(diasPorMes[mes]).length;
  });
  const cols = TABELAS.resumos, sh = aba('resumos'), agora = new Date().toISOString();
  const linhas = Object.keys(atual).sort().map(function (id) {
    const r = atual[id];
    if (!r.criado) r.criado = agora;
    return cols.map(function (c) { return celula(c, r[c]); });
  });
  const n = sh.getLastRow();
  if (n > 1) sh.getRange(2, 1, n - 1, cols.length).clearContent();
  if (linhas.length) sh.getRange(2, 1, linhas.length, cols.length).setValues(linhas);
}
