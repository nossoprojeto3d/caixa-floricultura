<script>
  // A flor do mês: as pétalas vão abrindo conforme o mês chega no que entrou no mês passado.
  // progresso 0 = botão fechado; 1 = flor aberta (igualou o mês passado); acima de 1 ganha brilho.
  let { progresso = 0, tamanho = 132 } = $props()
  const p = $derived(Math.max(0, Math.min(1, progresso)))
  const N = 8
  // cada pétala abre com um pequeno atraso em relação à anterior
  const abertura = i => Math.max(0, Math.min(1, p * 1.25 - (i % 2) * 0.18))
</script>

<svg viewBox="-60 -60 120 140" width={tamanho} height={tamanho * 140 / 120} aria-hidden="true" class="overflow-visible">
  <path d="M0 18 C 2 40 -2 60 0 78" stroke="#3c8a5c" stroke-width="3.5" fill="none" stroke-linecap="round" />
  <path d="M0 56 C -16 54 -26 44 -28 34 C -12 34 -2 44 0 56Z" fill="#3c8a5c" class="folha" style="transform: rotate({-8 + p * 10}deg)" />
  <path d="M0 64 C 14 62 22 54 24 46 C 10 46 2 54 0 64Z" fill="#58a776" class="folha" style="transform: rotate({8 - p * 10}deg)" />
  {#if progresso > 1}
    <circle r="54" fill="#f2a7bb" opacity=".18" class="brilho" />
  {/if}
  {#each Array(N) as _, i}
    {@const a = abertura(i)}
    <g style="transform: rotate({(360 / N) * i + (i % 2 ? 22 : 0)}deg)">
      <path
        d="M0 0 C 10 -8 12 -28 0 -42 C -12 -28 -10 -8 0 0Z"
        fill={i % 2 ? '#de6f8e' : '#c2456a'}
        class="petala"
        style="transform: scale({0.35 + a * 0.65}) rotate({(1 - a) * (i % 2 ? -1 : 1) * 160 / N}deg); opacity:{0.55 + a * 0.45}"
      />
    </g>
  {/each}
  <circle r={6 + p * 4} fill="#e8b84a" />
  <circle r={3 + p * 2} fill="#d49a2a" />
</svg>

<style>
  .petala, .folha { transform-box: view-box; transform-origin: 0 0; transition: transform 1.2s cubic-bezier(.32,.72,0,1), opacity 1.2s; }
  .folha { transform-origin: 0 60px; }
  .brilho { animation: pulsar 3s ease-in-out infinite; }
  @keyframes pulsar { 50% { opacity: .32; transform: scale(1.06) } }
</style>
