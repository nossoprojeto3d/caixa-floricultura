<script>
  // Entradas e saídas mês a mês (barras lado a lado, um eixo só). Tocar num mês escolhe ele.
  import { fmt, fmtCurto, nomeMesCurto, nomeMes } from '../lib/formato.js'
  let { serie, escolhido = '', aoEscolher } = $props()

  const A = 180, topo = 12, base = 22
  const max = $derived(Math.max(1, ...serie.flatMap(m => [m.entradas, m.saidas])))
  // linhas de grade em valores redondos
  const grade = $derived.by(() => {
    const passo = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000].find(p => max / p <= 4) || 100000
    return Array.from({ length: Math.floor(max / passo) }, (_, i) => (i + 1) * passo)
  })
  const y = v => topo + (A - topo - base) * (1 - v / max)
  const h = v => Math.max(v > 0 ? 2 : 0, (A - topo - base) * (v / max))
  let largura = $state(600)
  const col = $derived(largura / serie.length)
  const bw = $derived(Math.max(8, Math.min(18, (col - 10) / 2)))
  // barra com cantos de cima arredondados (4px), presa na linha de base
  const barra = (x, hh) => hh >= 4 ? `M${x} ${A - base} v${-hh + 4} q0 -4 4 -4 h${bw - 8} q4 0 4 4 v${hh - 4}z` : `M${x} ${A - base} h${bw} v${-hh} h${-bw}z`
  let foco = $state(-1)
  const f = $derived(foco >= 0 ? serie[foco] : null)
</script>

<div class="relative" bind:clientWidth={largura}>
  <div class="mb-3 flex items-center gap-4 text-[12.5px] text-txt-2">
    <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px] bg-ent"></span>Entrou</span>
    <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px] bg-sai"></span>Saiu</span>
  </div>
  <svg width={largura} height={A} role="img" aria-label="Entradas e saídas dos últimos meses" class="block overflow-visible">
    {#each grade as g}
      <line x1="0" x2={largura} y1={y(g)} y2={y(g)} stroke="var(--color-linha)" stroke-dasharray="2 4" />
      <text x={largura} y={y(g) - 4} text-anchor="end" class="fill-txt-3 text-[10px]">{fmtCurto(g).replace('R$ ', '')}</text>
    {/each}
    <line x1="0" x2={largura} y1={A - base} y2={A - base} stroke="var(--color-sup-3)" />
    {#each serie as m, i}
      {@const cx = col * i + col / 2}
      {@const ativo = !escolhido || m.mes === escolhido || foco === i}
      <g opacity={ativo ? 1 : 0.38} class="transition-opacity">
        <path d={barra(cx - bw - 1, h(m.entradas))} fill="var(--color-ent)" />
        <path d={barra(cx + 1, h(m.saidas))} fill="var(--color-sai)" />
      </g>
      <text x={cx} y={A - 6} text-anchor="middle" class="text-[11px] {m.mes === escolhido ? 'fill-txt font-semibold' : 'fill-txt-3'}">{nomeMesCurto(m.mes)}</text>
      <!-- área de toque maior que a barra -->
      <rect x={col * i} y="0" width={col} height={A} fill="transparent" class="cursor-pointer"
        role="button" tabindex="0" aria-label="{nomeMes(m.mes)}: entrou {fmt(m.entradas)}, saiu {fmt(m.saidas)}"
        onpointerenter={() => (foco = i)} onpointerleave={() => (foco = -1)} onfocus={() => (foco = i)} onblur={() => (foco = -1)}
        onclick={() => aoEscolher?.(m.mes)} onkeydown={e => e.key === 'Enter' && aoEscolher?.(m.mes)} />
    {/each}
  </svg>
  {#if f}
    <div class="pointer-events-none absolute top-8 z-10 w-44 rounded-2xl border border-linha bg-sup px-3.5 py-2.5 text-[12.5px] shadow-xl"
      style="left:{Math.min(Math.max(0, col * foco + col / 2 - 88), largura - 176)}px">
      <p class="mb-1 font-semibold capitalize">{nomeMes(f.mes)}</p>
      <p class="flex justify-between"><span class="flex items-center gap-1.5 text-txt-2"><span class="size-2 rounded-full bg-ent"></span>Entrou</span>{fmt(f.entradas)}</p>
      <p class="flex justify-between"><span class="flex items-center gap-1.5 text-txt-2"><span class="size-2 rounded-full bg-sai"></span>Saiu</span>{fmt(f.saidas)}</p>
      <p class="mt-1 flex justify-between border-t border-linha pt-1 font-semibold"><span>Sobrou</span>{fmt(f.saldo)}</p>
    </div>
  {/if}
</div>
