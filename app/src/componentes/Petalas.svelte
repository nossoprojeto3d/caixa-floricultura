<script>
  // Chuva de pétalas quando o dia é fechado (S.flores muda)
  import { S } from '../lib/estado.svelte.js'
  let chuva = $state([])
  let ultimo = S.flores
  const CORES = ['#c2456a', '#de6f8e', '#f2a7bb', '#e8c46a', '#f7d6df']
  $effect(() => {
    if (S.flores === ultimo) return
    ultimo = S.flores
    chuva = Array.from({ length: 28 }, (_, i) => ({
      i, x: Math.random() * 100, atraso: Math.random() * 0.8, dur: 2.4 + Math.random() * 1.6,
      giro: Math.random() * 720 - 360, deriva: Math.random() * 80 - 40, tam: 10 + Math.random() * 12,
      cor: CORES[i % CORES.length],
    }))
    setTimeout(() => (chuva = []), 4800)
  })
</script>

{#if chuva.length}
  <div class="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden="true">
    {#each chuva as p (p.i)}
      <svg viewBox="0 0 20 28" class="petala absolute -top-10" style="left:{p.x}%;width:{p.tam}px;animation-delay:{p.atraso}s;animation-duration:{p.dur}s;--giro:{p.giro}deg;--deriva:{p.deriva}px">
        <path d="M10 0C16 6 20 14 10 28 0 14 4 6 10 0z" fill={p.cor} />
      </svg>
    {/each}
  </div>
{/if}

<style>
  .petala { animation-name: cair; animation-timing-function: cubic-bezier(.3,.1,.6,1); animation-fill-mode: both; }
  @keyframes cair {
    0% { transform: translate(0, 0) rotate(0); opacity: 0 }
    10% { opacity: 1 }
    100% { transform: translate(var(--deriva), 110vh) rotate(var(--giro)); opacity: .9 }
  }
</style>
