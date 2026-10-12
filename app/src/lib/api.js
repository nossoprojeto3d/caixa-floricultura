// Conversa com o servidor (Apps Script do Google, ligado à planilha).
// Sem endereço configurado (ou com ?demo), usa o modo demonstração, que guarda tudo neste navegador.
import { URL_SERVIDOR } from './config.js'
import { Demo } from './demo.js'

const CHAVE_CODIGO = 'ternura_codigo'

export const modoDemo = !URL_SERVIDOR || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo'))

export class ErroServidor extends Error {
  constructor(msg, tipo = 'servidor') { super(msg); this.tipo = tipo }
}

function lerCodigo() { try { return localStorage.getItem(CHAVE_CODIGO) || '' } catch { return '' } }
export const codigoSalvo = lerCodigo

async function chamar(acao, dados = {}, tempo = 30000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), tempo)
  let res
  try {
    // text/plain evita a checagem prévia (CORS) que o Apps Script não responde
    res = await fetch(URL_SERVIDOR, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ acao, codigo: lerCodigo(), ...dados }),
      signal: ctrl.signal,
      redirect: 'follow',
    })
  } catch (e) {
    throw new ErroServidor(e.name === 'AbortError' ? 'O servidor demorou para responder.' : 'Sem conexão com a internet.', 'rede')
  } finally { clearTimeout(t) }
  let r
  try { r = await res.json() } catch { throw new ErroServidor('Resposta estranha do servidor. Confira o endereço do Apps Script.') }
  if (!r.ok) throw new ErroServidor(r.erro || 'Erro no servidor.', r.tipo || 'servidor')
  return r.dados
}

const Remoto = {
  temCodigo: () => !!lerCodigo(),
  async entrar(codigo) {
    try { localStorage.setItem(CHAVE_CODIGO, codigo) } catch {}
    try { return await chamar('carregar') }
    catch (e) { if (e.tipo === 'codigo') try { localStorage.removeItem(CHAVE_CODIGO) } catch {} ; throw e }
  },
  sair() { try { localStorage.removeItem(CHAVE_CODIGO) } catch {} },
  carregar: () => chamar('carregar'),
  // ops: [{ op: 'salvar', tabela, registro } | { op: 'excluir', tabela, id }], gravadas juntas
  lote: ops => chamar('lote', { ops }),
  lerCaderno: (imagem, data) => chamar('lerCaderno', { imagem, data }, 90000),
  foto: id => chamar('foto', { id }, 60000),
  testarTelegram: () => chamar('testarTelegram'),
  info: () => chamar('info'),
  versao: () => chamar('versao', {}, 15000),
}

export const Api = modoDemo ? Demo : Remoto
