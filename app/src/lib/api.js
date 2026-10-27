// Conversa com o servidor (Apps Script do Google, ligado à planilha).
// Sem endereço configurado (ou com ?demo), usa o modo demonstração, que guarda tudo neste navegador.
import { URL_SERVIDOR } from './config.js'
import { Demo } from './demo.js'

const CHAVE_CODIGO = 'ternura_codigo'
const CHAVE_CONEXAO = 'ternura_conexao'

export const modoDemo = !URL_SERVIDOR || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo'))

export class ErroServidor extends Error {
  constructor(msg, tipo = 'servidor') { super(msg); this.tipo = tipo }
}

function lerCodigo() { try { return localStorage.getItem(CHAVE_CODIGO) || '' } catch { return '' } }
export const codigoSalvo = lerCodigo

// Registro das falhas de conexão, só neste aparelho (Mais › Conexão): mostra a mensagem do
// celular e quanto tempo depois de voltar para o app ela aconteceu
let voltouEm = Date.now()
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') voltouEm = Date.now() })
function anotar(acao, tentativa, erro) {
  try {
    const lista = registroConexao()
    lista.unshift({
      quando: new Date().toISOString(), acao, tentativa, erro,
      aposVoltar: Math.round((Date.now() - voltouEm) / 1000),
      online: typeof navigator === 'undefined' ? null : navigator.onLine,
    })
    localStorage.setItem(CHAVE_CONEXAO, JSON.stringify(lista.slice(0, 40)))
  } catch {}
}
export function registroConexao() { try { return JSON.parse(localStorage.getItem(CHAVE_CONEXAO) || '[]') } catch { return [] } }
export function apagarRegistroConexao() { try { localStorage.removeItem(CHAVE_CONEXAO) } catch {} }

async function chamar(acao, dados = {}, tempo = 30000) {
  // falha de rede passageira (comum no iPhone ao voltar para o app): tenta de novo depois de 1 s e de 3 s.
  // Repetir é seguro: o lote grava pelo id. A foto do caderno repete só uma vez, e só quando nem saiu do
  // aparelho (no iPhone, logo depois de voltar da câmera a rede às vezes ainda não acordou)
  const foto = acao === 'lerCaderno'
  const esperas = foto ? [2000] : [1000, 3000]
  const extra = foto ? ` · foto de ${Math.round((dados.imagem || '').length * 0.75 / 1024)} KB` : ''
  const inicio = Date.now()
  let r
  for (let n = 1; ; n++) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), tempo)
    try {
      // text/plain evita a checagem prévia (CORS) que o Apps Script não responde
      const res = await fetch(URL_SERVIDOR, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ acao, codigo: lerCodigo(), ...dados }),
        signal: ctrl.signal,
        redirect: 'follow',
      })
      // o Google às vezes devolve uma página de erro (HTML) no lugar da resposta: trata como falha passageira
      const texto = await res.text()
      try { r = JSON.parse(texto) } catch {
        anotar(acao, n, `resposta estranha (HTTP ${res.status})${extra}: ${texto.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)}`)
        if (n <= esperas.length && !foto) { await new Promise(r => setTimeout(r, esperas[n - 1])); continue }
        throw new ErroServidor('O Google respondeu com erro. Tente de novo: o que já tiver sido gravado não duplica.')
      }
      if (n > 1) anotar(acao, n, `recuperou na tentativa ${n}${extra}`)
      break
    } catch (e) {
      if (e instanceof ErroServidor) throw e
      if (e.name === 'AbortError') { anotar(acao, n, `demorou mais de ${tempo / 1000} s${extra}`); throw new ErroServidor('O servidor demorou para responder.', 'rede') }
      anotar(acao, n, `${e.name}: ${e.message} (depois de ${Math.round((Date.now() - inicio) / 1000)} s)${extra}`)
      if (n <= esperas.length) { await new Promise(r => setTimeout(r, esperas[n - 1])); continue }
      // o detalhe ("Load failed", "Failed to fetch"…) ajuda a descobrir a causa pelo print
      throw new ErroServidor(`Sem conexão com a internet (${e.message || e.name}).`, 'rede')
    } finally { clearTimeout(t) }
  }
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
  info: () => chamar('info'),
  versao: () => chamar('versao', {}, 15000),
}

export const Api = modoDemo ? Demo : Remoto
