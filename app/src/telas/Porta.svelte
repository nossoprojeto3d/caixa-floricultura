<script>
  // Carregando / código de acesso (pedido só uma vez em cada aparelho)
  import { S, entrar } from '../lib/estado.svelte.js'
  import Flor from '../componentes/Flor.svelte'
  let codigo = $state('')
  let enviando = $state(false)
  async function ok(e) {
    e.preventDefault()
    if (enviando || !codigo.trim()) return
    enviando = true
    await entrar(codigo.trim())
    enviando = false
  }
</script>

<div class="pautado flex min-h-dvh flex-col items-center justify-center px-6 pt-seguro pb-seguro">
  <Flor progresso={S.fase === 'carregando' ? 0.4 : 1} tamanho={110} />
  <h1 class="titulo mt-3 text-[34px] font-semibold">Ternura <em class="font-normal text-destaque">Flores</em></h1>
  {#if S.fase === 'carregando'}
    <p class="mt-2 text-[14px] text-txt-3">Abrindo o caixa…</p>
  {:else}
    <form class="mt-8 w-full max-w-xs" onsubmit={ok}>
      <label class="mb-2 block text-center text-[14px] text-txt-2" for="codigo">Código de acesso</label>
      <input id="codigo" class="campo num h-14 text-center text-[22px] tracking-[0.3em]" type="password" inputmode="numeric" autocomplete="current-password" bind:value={codigo} autofocus />
      {#if S.erroCodigo}<p class="mt-2 text-center text-[13.5px] text-sai">{S.erroCodigo}</p>{/if}
      <button class="mt-4 h-13 w-full rounded-2xl bg-destaque text-[16px] font-semibold text-white disabled:opacity-60" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
      <p class="mt-4 text-center text-[12.5px] text-txt-3">Só precisa digitar uma vez neste aparelho.</p>
    </form>
  {/if}
</div>
