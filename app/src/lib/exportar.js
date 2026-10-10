// Exporta lançamentos em CSV (abre no Excel com acentos certos)
import { nomeCat } from './estado.svelte.js'

const celula = v => {
  const s = String(v ?? '')
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export function baixarCSV(lancs, nome) {
  const linhas = [['Data', 'Tipo', 'Valor', 'Categoria', 'Forma', 'Descrição']]
  for (const l of [...lancs].sort((a, b) => a.data.localeCompare(b.data))) {
    const [y, m, d] = l.data.split('-')
    linhas.push([`${d}/${m}/${y}`, l.tipo === 'entrada' ? 'Entrada' : 'Saída', String(l.valor.toFixed(2)).replace('.', ','), nomeCat(l.categoria), l.forma, l.descricao])
  }
  const csv = '﻿' + linhas.map(r => r.map(celula).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: nome })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
