// Simula o pedaço do Google Apps Script que o Codigo.gs usa (planilha, propriedades,
// trava, cache, Drive, Gemini), para testar o servidor no Node sem conta Google.
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

class Faixa {
  constructor(aba, l, c, nl, nc) { Object.assign(this, { aba, l, c, nl, nc }) }
  getValues() {
    const r = []
    for (let i = 0; i < this.nl; i++) {
      const linha = this.aba.dados[this.l - 1 + i] || []
      r.push(Array.from({ length: this.nc }, (_, j) => linha[this.c - 1 + j] ?? ''))
    }
    return r
  }
  getDisplayValues() { return this.getValues().map(r => r.map(v => String(v))) }
  setValues(v) {
    this.aba.escritas++
    v.forEach((linha, i) => {
      const idx = this.l - 1 + i
      while (this.aba.dados.length <= idx) this.aba.dados.push([])
      linha.forEach((x, j) => {
        // como o Sheets: o apóstrofo do começo só marca "é texto" e some
        this.aba.dados[idx][this.c - 1 + j] = typeof x === 'string' && x.startsWith("'") ? x.slice(1) : x
      })
    })
    return this
  }
  setNumberFormat() { return this }
  clearContent() {
    for (let i = 0; i < this.nl; i++) { const linha = this.aba.dados[this.l - 1 + i]; if (linha) for (let j = 0; j < this.nc; j++) linha[this.c - 1 + j] = '' }
    // como o Sheets: linhas vazias no fim não contam em getLastRow
    while (this.aba.dados.length && this.aba.dados.at(-1).every(v => v === '' || v == null)) this.aba.dados.pop()
    return this
  }
  setFontWeight() { return this }
  setBackground() { return this }
}

class Aba {
  constructor(nome) { this.nome = nome; this.dados = []; this.escritas = 0 }
  getRange(l, c, nl = 1, nc = 1) { return new Faixa(this, l, c, nl, nc) }
  getLastRow() { return this.dados.length }
  getMaxRows() { return Math.max(1000, this.dados.length) }
  setFrozenRows() {}
  deleteRow(l) { this.dados.splice(l - 1, 1) }
  deleteRows(l, n) { this.dados.splice(l - 1, n) }
}

export function carregarServidor({ props = {} } = {}) {
  const abas = new Map()
  const propriedades = { ...props }
  const cache = new Map()
  const chamadas = [] // chamadas a serviços de fora (Gemini)
  const gemini = [] // respostas do Gemini na ordem: [status, texto]; vazio = lê sem itens
  const lixeira = []
  const novaPlanilha = (id) => {
    const abasP = new Map()
    return { id, abas: abasP, getId: () => id, getSheetByName: n => abasP.get(n) || null, insertSheet: n => { const a = new Aba(n); abasP.set(n, a); return a }, getSheets: () => [...abasP.values()], deleteSheet: a => abasP.delete(a.nome), getUrl: () => 'x' }
  }
  const temporarias = []
  const planilha = {
    getSheetByName: n => abas.get(n) || null,
    insertSheet: n => { const a = new Aba(n); abas.set(n, a); return a },
    getSheets: () => [...abas.values()],
    deleteSheet: a => abas.delete(a.nome),
    getUrl: () => 'https://docs.google.com/spreadsheets/d/falso',
  }
  const pad = n => String(n).padStart(2, '0')
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    SpreadsheetApp: { getActiveSpreadsheet: () => planilha, create: () => { const p = novaPlanilha('temp' + temporarias.length); temporarias.push(p); return p }, openById: id => { const p = temporarias.find(x => x.id === id); if (!p) throw new Error('não existe'); return p }, flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => propriedades[k] ?? null, setProperty: (k, v) => { propriedades[k] = v } }) },
    CacheService: { getScriptCache: () => ({ get: k => cache.get(k) ?? null, put: (k, v) => cache.set(k, v) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },
    Utilities: {
      formatDate: (d, tz, f) => f === 'HH:mm' ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : f === 'HHmmss' ? '120000' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      base64Decode: s => Buffer.from(s, 'base64'), base64Encode: b => Buffer.from(b).toString('base64'),
      newBlob: (bytes, tipo, nome) => ({ bytes, tipo, nome }),
    },
    ContentService: { createTextOutput: t => ({ texto: t, setMimeType() { return this } }), MimeType: { JSON: 'json' } },
    UrlFetchApp: {
      fetch: (url, op) => {
        const corpo = JSON.parse(op.payload || '{}')
        chamadas.push({ url, corpo })
        const [status, texto] = gemini.shift() || [200, '{"itens":[]}']
        return { getResponseCode: () => status, getContentText: () => (status === 200 ? JSON.stringify({ candidates: [{ content: { parts: [{ text: texto }] } }] }) : texto) }
      },
    },
    DriveApp: { getFileById: id => ({ setTrashed: v => v && lixeira.push(id) }), getFolderById: () => ({ getId: () => 'pasta', createFile: b => ({ getId: () => 'foto1' }) }), createFolder: () => ({ getId: () => 'pasta', createFile: () => ({ getId: () => 'foto1' }) }) },
    ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, newTrigger: () => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ nearMinute: () => ({ create() {} }) }) }), onMonthDay: () => ({ atHour: () => ({ create() {} }) }) }) }) },
  }
  vm.createContext(ctx)
  const codigo = readFileSync(new URL('../../apps-script/Codigo.gs', import.meta.url), 'utf8')
  vm.runInContext(codigo + '\n;globalThis.__s = { doPost, aplicarLote, lerTabela, carregarTudo, configurar, checarCodigo, testeDeVelocidade, arquivarAntigos, TABELAS };', ctx)
  const s = ctx.__s
  // chama como o app chama: POST com JSON no corpo
  const post = (acao, dados = {}, codigoAcesso = propriedades.CODIGO_ACESSO) =>
    JSON.parse(s.doPost({ postData: { contents: JSON.stringify({ acao, codigo: codigoAcesso, ...dados }) } }).texto)
  return { ...s, post, abas, propriedades, chamadas, gemini, cache, lixeira, temporarias }
}
