// Contas dos relatórios. Sempre em centavos e devolvendo reais no fim.
import { cent, mesDe, somarMeses, deISO, diasNoMes, mesAtual, hoje } from './formato.js'

const r = c => c / 100

export function lancsDoPeriodo(lancs, inicio, fim) {
  return lancs.filter(l => l.data >= inicio && l.data <= fim)
}
export const lancsDoMes = (lancs, m) => lancs.filter(l => mesDe(l.data) === m)
export const lancsDoAno = (lancs, a) => lancs.filter(l => l.data.startsWith(String(a)))

export function resumo(lista) {
  let e = 0, s = 0
  const dias = new Set()
  for (const l of lista) {
    if (l.tipo === 'entrada') { e += cent(l.valor); dias.add(l.data) } else s += cent(l.valor)
  }
  return { entradas: r(e), saidas: r(s), saldo: r(e - s), diasComVenda: dias.size, mediaDia: dias.size ? r(Math.round(e / dias.size)) : 0 }
}

// Agrupa por uma chave (categoria, forma...) e ordena do maior para o menor
export function agrupar(lista, tipo, chave) {
  const m = new Map()
  let total = 0
  for (const l of lista) {
    if (l.tipo !== tipo) continue
    const k = l[chave] || ''
    m.set(k, (m.get(k) || 0) + cent(l.valor))
    total += cent(l.valor)
  }
  return [...m.entries()].map(([k, v]) => ({ chave: k, valor: r(v), parte: total ? v / total : 0 })).sort((a, b) => b.valor - a.valor)
}

// Últimos n meses até "ate" (inclusive), do mais antigo para o mais novo
export function serieMeses(lancs, ate = mesAtual(), n = 12) {
  const meses = Array.from({ length: n }, (_, i) => somarMeses(ate, i - n + 1))
  const mapa = new Map(meses.map(m => [m, { mes: m, e: 0, s: 0 }]))
  for (const l of lancs) {
    const x = mapa.get(mesDe(l.data))
    if (x) l.tipo === 'entrada' ? (x.e += cent(l.valor)) : (x.s += cent(l.valor))
  }
  return meses.map(m => { const x = mapa.get(m); return { mes: m, entradas: r(x.e), saidas: r(x.s), saldo: r(x.e - x.s) } })
}

// Vendas por dia da semana: média de quanto entra em cada dia (só dias com venda)
export function porDiaSemana(lista) {
  const soma = Array(7).fill(0), dias = Array.from({ length: 7 }, () => new Set())
  for (const l of lista) {
    if (l.tipo !== 'entrada') continue
    const d = deISO(l.data).getDay()
    soma[d] += cent(l.valor)
    dias[d].add(l.data)
  }
  return soma.map((v, i) => ({ dia: i, media: dias[i].size ? r(Math.round(v / dias[i].size)) : 0, total: r(v) }))
}

// Entradas e saídas de cada dia do mês (para o gráfico diário)
export function porDiaDoMes(lista, m) {
  const n = diasNoMes(m)
  const e = Array(n).fill(0), s = Array(n).fill(0)
  for (const l of lista) {
    if (mesDe(l.data) !== m) continue
    const d = Number(l.data.slice(8, 10)) - 1
    l.tipo === 'entrada' ? (e[d] += cent(l.valor)) : (s[d] += cent(l.valor))
  }
  return e.map((v, i) => ({ dia: i + 1, entradas: r(v), saidas: r(s[i]) }))
}

// Variação entre dois valores (null quando não dá para comparar)
export const variacao = (agora, antes) => (antes ? (agora - antes) / Math.abs(antes) : null)

// Resumo de outro mês (m + deslocamento). Se m é o mês em andamento, pega só até o mesmo dia
// de hoje naquele mês: comparar 10 dias com um mês inteiro não é justo.
export function mesComparavel(lancs, m, deslocamento) {
  const outro = somarMeses(m, deslocamento)
  const lista = lancs.filter(l => mesDe(l.data) === outro)
  if (m !== mesAtual()) return resumo(lista)
  const dia = Number(hoje().slice(8, 10))
  const lim = `${outro}-${String(Math.min(dia, diasNoMes(outro))).padStart(2, '0')}`
  return resumo(lista.filter(l => l.data <= lim))
}
