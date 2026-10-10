// Formatação, datas e contas em centavos (nunca somar decimais direto)
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const fmt = v => BRL.format(v || 0)
export const fmtCurto = v => {
  const a = Math.abs(v)
  if (a >= 1000) return (v < 0 ? '−' : '') + 'R$ ' + (a / 1000).toFixed(a >= 10000 ? 0 : 1).replace('.', ',') + ' mil'
  return fmt(v)
}
export const cent = v => Math.round((Number(v) || 0) * 100)
export const soma = lista => lista.reduce((a, l) => a + cent(l.valor), 0) / 100
export const pct = v => (v == null || !isFinite(v) ? '—' : Math.round(v * 100) + '%')

// Separa reais e centavos para mostrar os centavos menores
export function partes(v) {
  const t = fmt(Math.abs(v)).replace('R$', '').trim()
  const [reais, cents] = t.split(',')
  return { sinal: v < 0 ? '−' : '', reais, cents }
}

export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const MESES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
export const DIAS_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const deISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const hoje = () => iso(new Date())
export const somarDias = (s, n) => { const d = deISO(s); d.setDate(d.getDate() + n); return iso(d) }
export const ontem = () => somarDias(hoje(), -1)
export const amanha = () => somarDias(hoje(), 1)
export const diasAte = s => Math.round((deISO(s) - deISO(hoje())) / 864e5)
export const mesDe = s => s.slice(0, 7) // 'AAAA-MM'
export const mesAtual = () => mesDe(hoje())
export function somarMeses(m, n) {
  const [y, mm] = m.split('-').map(Number)
  const d = new Date(y, mm - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export const nomeMes = (m, ano = true) => {
  const [y, mm] = m.split('-').map(Number)
  return MESES_LONGO[mm - 1] + (ano && y !== new Date().getFullYear() ? ` de ${y}` : '')
}
export const nomeMesCurto = m => MESES[Number(m.slice(5, 7)) - 1]
export const diasNoMes = m => { const [y, mm] = m.split('-').map(Number); return new Date(y, mm, 0).getDate() }

export function dataBonita(s) {
  if (s === hoje()) return 'Hoje'
  if (s === ontem()) return 'Ontem'
  if (s === amanha()) return 'Amanhã'
  const d = deISO(s)
  const dia = `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`
  return d.getFullYear() === new Date().getFullYear() ? dia : `${dia} de ${d.getFullYear()}`
}
export const dataCurta = s => { const d = deISO(s); return `${d.getDate()} ${MESES[d.getMonth()]}` }

// "vence hoje", "venceu há 3 dias", "vence em 5 dias"
export function prazo(s) {
  const n = diasAte(s)
  if (n === 0) return 'hoje'
  if (n === 1) return 'amanhã'
  if (n === -1) return 'ontem'
  if (n < 0) return `há ${-n} dias`
  if (n < 7) return `em ${n} dias`
  return dataCurta(s)
}

// Converte o texto digitado ("12,50", "1.200", "R$ 30") em número
export function lerValor(t) {
  if (typeof t === 'number') return t
  let s = String(t || '').replace(/[^\d,.-]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isFinite(n) ? Math.round(n * 100) / 100 : 0
}

export const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
export const telefoneWhats = t => { const d = String(t || '').replace(/\D/g, ''); return d ? (d.length <= 11 ? '55' + d : d) : '' }
export const normalizar = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
