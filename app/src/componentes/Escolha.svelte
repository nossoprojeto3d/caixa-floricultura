<script>
  // Fileira de opções em pílulas (uma escolhida). opcoes: [[valor, rótulo, cor?]]
  let { opcoes, valor = $bindable(), aoMudar, vazio = false, quebrar = true } = $props()
  function tocar(v) {
    const novo = vazio && valor === v ? '' : v
    valor = novo
    aoMudar?.(novo)
  }
</script>

<div class="flex gap-2 {quebrar ? 'flex-wrap' : '-mx-5 overflow-x-auto px-5 [scrollbar-width:none]'}">
  {#each opcoes as [v, rot, cor]}
    {@const on = valor === v}
    <button type="button"
      class="flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition-colors {on ? 'border-transparent bg-txt text-fundo' : 'border-linha bg-sup text-txt-2 hover:border-sup-3'}"
      aria-pressed={on} onclick={() => tocar(v)}>
      {#if cor}<span class="size-2.5 rounded-full" style="background:{cor}"></span>{/if}{rot}
    </button>
  {/each}
</div>
