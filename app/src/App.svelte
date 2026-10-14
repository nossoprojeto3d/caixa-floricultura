<script>
  import { fly, fade } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { Sun, ShoppingBag, Receipt, ChartColumn, Ellipsis, CircleCheck, CircleAlert, WifiOff, LoaderCircle } from '@lucide/svelte'
  import Hoje from './telas/Hoje.svelte'
  import Encomendas from './telas/Encomendas.svelte'
  import Contas from './telas/Contas.svelte'
  import Relatorios from './telas/Relatorios.svelte'
  import Mais from './telas/Mais.svelte'
  import Porta from './telas/Porta.svelte'
  import Lancar from './componentes/Lancar.svelte'
  import Caderno from './componentes/Caderno.svelte'
  import FormEncomenda from './componentes/FormEncomenda.svelte'
  import FormConta from './componentes/FormConta.svelte'
  import FormFornecedor from './componentes/FormFornecedor.svelte'
  import Petalas from './componentes/Petalas.svelte'
  import { S, tela, demo, irPara, responderConfirmacao, iniciar, contasUrgentes, encomendasAtivas, recarregar } from './lib/estado.svelte.js'
  import { diasAte } from './lib/formato.js'

  iniciar()

  const TELAS = { hoje: Hoje, encomendas: Encomendas, contas: Contas, relatorios: Relatorios, mais: Mais }
  const NAV = [['hoje', 'Hoje', Sun], ['encomendas', 'Encomendas', ShoppingBag], ['contas', 'Contas', Receipt], ['relatorios', 'Relatórios', ChartColumn], ['mais', 'Mais', Ellipsis]]
  const Tela = $derived(TELAS[S.tela])
  // bolinhas de aviso na navegação
  const marca = $derived({
    contas: contasUrgentes().filter(c => diasAte(c.vencimento) <= 0).length,
    encomendas: encomendasAtivas().filter(e => diasAte(e.entrega_data) <= 0).length,
  })
</script>

{#if S.fase !== 'app'}
  <Porta />
{:else}
<div class="min-h-dvh lg:flex">
  <!-- Computador: menu lateral -->
  <nav class="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col border-r border-linha bg-sup/50 px-4 py-6 lg:flex" aria-label="Navegação">
    <div class="mb-8 flex items-center gap-2.5 px-2">
      <img src="./favicon.svg" alt="" class="size-9" />
      <span class="titulo text-[19px] leading-tight font-semibold">Ternura<br /><em class="font-normal text-destaque">Flores</em></span>
    </div>
    {#each NAV as [id, rot, Icone]}
      <button class="mb-1 flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors {S.tela === id ? 'bg-destaque-fundo font-semibold text-destaque-forte' : 'text-txt-2 hover:bg-sup-2'}" aria-current={S.tela === id ? 'page' : undefined} onclick={() => irPara(id)}>
        <Icone size={19} strokeWidth={S.tela === id ? 2.2 : 1.8} /><span class="flex-1 text-left">{rot}</span>
        {#if marca[id]}<span class="grid size-5 place-items-center rounded-full bg-sai text-[11px] font-bold text-white">{marca[id]}</span>{/if}
      </button>
    {/each}
    {#if demo}<p class="mt-auto rounded-xl bg-alerta-fundo px-3 py-2 text-[12px] text-alerta">Modo demonstração</p>{/if}
  </nav>

  <main class="mx-auto w-full max-w-[1120px] px-4 pt-[max(18px,env(safe-area-inset-top))] pb-32 lg:px-10 lg:pt-8 lg:pb-12">
    {#if demo}<p class="mb-3 inline-block rounded-full bg-alerta-fundo px-3 py-1 text-[12px] font-medium text-alerta lg:hidden">Modo demonstração · dados de exemplo</p>{/if}
    {#if S.offline}
      <button class="mb-3 flex w-full items-center gap-2 rounded-2xl bg-sup-2 px-4 py-2.5 text-[13px] text-txt-2" onclick={() => recarregar({ silencioso: false })}><WifiOff size={15} /> Sem conexão. Mostrando os últimos dados salvos. Toque para tentar de novo.</button>
    {/if}
    {#key S.tela}
      <div in:fade={{ duration: 160 }}><Tela /></div>
    {/key}
  </main>

  <!-- Celular: barra inferior -->
  <nav class="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-fundo/90 pb-seguro backdrop-blur-xl lg:hidden" aria-label="Navegação">
    <div class="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
      {#each NAV as [id, rot, Icone]}
        <button class="relative flex h-full flex-col items-center justify-center gap-1 text-[11px] transition-colors {S.tela === id ? 'font-semibold text-destaque' : 'text-txt-3'}" aria-current={S.tela === id ? 'page' : undefined} onclick={() => irPara(id)}>
          <Icone size={22} strokeWidth={S.tela === id ? 2.2 : 1.7} />{rot}
          {#if marca[id]}<span class="absolute top-2 left-[calc(50%+6px)] grid size-4 place-items-center rounded-full bg-sai text-[10px] font-bold text-white">{marca[id]}</span>{/if}
        </button>
      {/each}
    </div>
  </nav>
</div>

<!-- Lançamento e fechamento do dia por cima: tela cheia no celular, gaveta à direita no computador -->
{#each [['lanc', Lancar], ['caderno', Caderno]] as [chave, Comp]}
  {#if S[chave]}
    {#if tela.largo}
      <div class="trava-rolagem fixed inset-0 z-[52]">
        <button class="absolute inset-0 bg-[#1d2a22]/40" aria-label="Fechar" onclick={() => chave === 'lanc' && (S.lanc = null)} transition:fade={{ duration: 180 }}></button>
        <div class="absolute inset-y-3 right-3 w-[440px] overflow-hidden rounded-[28px] bg-fundo shadow-2xl" transition:fly={{ x: 460, duration: 300, easing: cubicOut }}>
          {#key chave === 'caderno' ? S.caderno?.data : 0}<Comp modo="painel" />{/key}
        </div>
      </div>
    {:else}
      <div class="trava-rolagem fixed inset-0 z-[52] bg-fundo" transition:fly={{ y: 800, duration: 340, easing: cubicOut, opacity: 1 }}>
        {#key chave === 'caderno' ? S.caderno?.data : 0}<Comp modo="tela" />{/key}
      </div>
    {/if}
  {/if}
{/each}

{#if S.encomenda}<FormEncomenda />{/if}
{#if S.conta}<FormConta />{/if}
{#if S.fornecedor}<FormFornecedor />{/if}
{/if}

<Petalas />

<!-- Confirmação própria do app -->
{#if S.confirmar}
  <div class="trava-rolagem fixed inset-0 z-[66] flex items-center justify-center px-6" role="alertdialog" aria-modal="true">
    <button class="absolute inset-0 bg-[#1d2a22]/50" aria-label="Cancelar" onclick={() => responderConfirmacao(false)} transition:fade={{ duration: 150 }}></button>
    <div class="relative w-full max-w-sm rounded-[24px] bg-fundo p-5 shadow-2xl" transition:fly={{ y: 12, duration: 200 }}>
      <p class="text-[16px] leading-relaxed">{S.confirmar.texto}</p>
      <div class="mt-5 grid grid-cols-2 gap-2">
        <button class="h-12 rounded-2xl bg-sup-2 text-[15px] font-semibold" onclick={() => responderConfirmacao(false)}>Cancelar</button>
        <button class="h-12 rounded-2xl text-[15px] font-semibold text-white {S.confirmar.perigo ? 'bg-sai' : 'bg-destaque'}" onclick={() => responderConfirmacao(true)}>{S.confirmar.ok}</button>
      </div>
    </div>
  </div>
{/if}

{#if S.gravando && !S.aviso}
  <div class="pointer-events-none fixed inset-x-0 top-[max(14px,env(safe-area-inset-top))] z-[80] flex justify-center px-4" role="status" transition:fly={{ y: -24, duration: 220 }}>
    <div class="flex items-center gap-2 rounded-full border border-linha bg-sup py-2.5 pr-5 pl-3.5 text-[14px] font-medium shadow-xl">
      <LoaderCircle size={18} class="animate-spin text-destaque" /> Salvando…
    </div>
  </div>
{/if}
{#if S.aviso}
  {#key S.aviso.id}
    <div class="pointer-events-none fixed inset-x-0 top-[max(14px,env(safe-area-inset-top))] z-[80] flex justify-center px-4" role="status" transition:fly={{ y: -24, duration: 220 }}>
      <div class="flex items-center gap-2 rounded-full border border-linha bg-sup py-2.5 pr-5 pl-3.5 text-[14px] font-medium shadow-xl">
        {#if S.aviso.tipo === 'erro'}<CircleAlert size={18} class="text-sai" />{:else}<CircleCheck size={18} class="text-ent" />{/if}
        {S.aviso.texto}
      </div>
    </div>
  {/key}
{/if}
