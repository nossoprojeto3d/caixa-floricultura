<script>
  // Uma série só, em colunas (dias do mês ou dias da semana), com dica ao tocar
  import { fmt, fmtCurto } from '../lib/formato.js'
  let { itens, rotulo, dica, altura = 120, cor = 'var(--color-destaque)', mostrarValor = false, destaque = -1 } = $props()
  let largura = $state(300)
  const max = $derived(Math.max(1, ...itens.map(x => x.valor)))
  const col = $derived(largura / Math.max(1, itens.length))
  const bw = $derived(Math.max(8, Math.min(28, col - 3)))
  const topo = $derived(mostrarValor ? 18 : 6)
  const base = 18
  const h = v => Math.max(v > 0 ? 2 : 0, (altura - topo - base) * v / max)
  let foco = $state(-1)
</script>

<div class="relative" bind:clientWidth={largura}>
  <svg width={largura} height={altura} class="block overflow-visible" role="img" aria-label={dica?.(null) || ''}>
    <line x1="0" x2={largura} y1={altura - base} y2={altura - base} stroke="var(--color-sup-3)" />
    {#each itens as x, i}
      {@const cx = col * i + col / 2}
      {@const hh = h(x.valor)}
      <path d={hh >= 4 ? `M${cx - bw / 2} ${altura - base} v${-hh + 4} q0 -4 4 -4 h${bw - 8} q4 0 4 4 v${hh - 4}z` : `M${cx - bw / 2} ${altura - base} h${bw} v${-hh} h${-bw}z`}
        fill={cor} opacity={foco === -1 ? (destaque === -1 || destaque === i ? 1 : 0.45) : foco === i ? 1 : 0.45} class="transition-opacity" />
      {#if mostrarValor && x.valor}
        <text x={cx} y={altura - base - hh - 5} text-anchor="middle" class="fill-txt-2 text-[10.5px] font-medium">{x.valor >= 1000 ? fmtCurto(x.valor).replace('R$ ', '') : Math.round(x.valor)}</text>
      {/if}
      {#if rotulo(x, i)}<text x={cx} y={altura - 4} text-anchor="middle" class="fill-txt-3 text-[10.5px]">{rotulo(x, i)}</text>{/if}
      <rect x={col * i} y="0" width={col} height={altura} fill="transparent" role="img" aria-label={dica(x)}
        onpointerenter={() => (foco = i)} onpointerleave={() => (foco = -1)} />
    {/each}
  </svg>
  {#if foco >= 0}
    <div class="pointer-events-none absolute -top-2 z-10 rounded-xl border border-linha bg-sup px-3 py-1.5 text-[12.5px] whitespace-nowrap shadow-lg"
      style="left:{Math.min(Math.max(0, col * foco + col / 2 - 70), largura - 140)}px">{dica(itens[foco])}</div>
  {/if}
</div>
