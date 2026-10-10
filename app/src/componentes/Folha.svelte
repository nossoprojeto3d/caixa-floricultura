<script>
  // Painel que sobe de baixo no celular e abre no centro no computador
  import { onMount } from 'svelte'
  import { fly, fade } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { X } from '@lucide/svelte'
  import { S, tela } from '../lib/estado.svelte.js'
  let { titulo = '', aoFechar, children, largo = false } = $props()

  // enquanto houver painel aberto, a atualização automática espera
  onMount(() => { S.folhas++; return () => { S.folhas-- } })
  function tecla(e) { if (e.key === 'Escape') { e.stopImmediatePropagation(); aoFechar() } }
</script>

<svelte:window onkeydown={tecla} />

<div class="trava-rolagem fixed inset-0 z-50 flex items-end justify-center lg:items-center">
  <button class="absolute inset-0 bg-[#2d2026]/40 backdrop-blur-[2px]" aria-label="Fechar" onclick={aoFechar} transition:fade={{ duration: 180 }}></button>
  <div
    role="dialog"
    aria-modal="true"
    aria-label={titulo}
    class="relative max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-[28px] bg-fundo pb-seguro shadow-2xl lg:rounded-[28px] {largo ? 'lg:max-w-xl' : 'lg:max-w-md'}"
    transition:fly={{ y: tela.largo ? 16 : 400, duration: 280, easing: cubicOut }}
  >
    <div class="sticky top-0 z-10 bg-fundo/95 backdrop-blur">
      <div class="mx-auto mt-2.5 h-1 w-10 rounded-full bg-sup-3 lg:hidden"></div>
      <div class="flex items-center justify-between px-5 pt-3 pb-2 lg:pt-5">
        <h2 class="titulo text-[22px] font-semibold">{titulo}</h2>
        <button class="-mr-2 grid size-10 place-items-center rounded-full text-txt-2 hover:bg-sup-2" aria-label="Fechar" onclick={aoFechar}><X size={20} /></button>
      </div>
    </div>
    <div class="px-5 pt-1 pb-6">{@render children()}</div>
  </div>
</div>
