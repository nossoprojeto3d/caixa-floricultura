<script>
  import { ChevronLeft, ChevronRight, BookCheck, NotebookPen, Plus, Minus, CircleCheck, Receipt, ShoppingBag, CalendarClock, ImageIcon, RotateCcw } from '@lucide/svelte'
  import { fade } from 'svelte/transition'
  import Dinheiro from '../componentes/Dinheiro.svelte'
  import ItemLanc from '../componentes/ItemLanc.svelte'
  import Flor from '../componentes/Flor.svelte'
  import Folha from '../componentes/Folha.svelte'
  import { S, lancsDoDia, fechamento, totalTipo, abrirLanc, editarLanc, contasUrgentes, encomendasAtivas, irPara, reabrirDia, confirmar, tratarErro, avisar } from '../lib/estado.svelte.js'
  import { Api } from '../lib/api.js'
  import { hoje, ontem, somarDias, dataBonita, diasAte, fmt, mesAtual, somarMeses, nomeMes, mesDe, deISO, DIAS } from '../lib/formato.js'
  import { resumo, lancsDoMes } from '../lib/analise.js'

  const ehHoje = $derived(S.dia === hoje())
  const lista = $derived(lancsDoDia(S.dia).sort((a, b) => (a.tipo === b.tipo ? (b.criado || '').localeCompare(a.criado || '') : a.tipo === 'entrada' ? -1 : 1)))
  const ent = $derived(totalTipo(lista, 'entrada'))
  const sai = $derived(totalTipo(lista, 'saida'))
  const fech = $derived(fechamento(S.dia))

  const urgentes = $derived(contasUrgentes())
  const atrasadas = $derived(urgentes.filter(c => diasAte(c.vencimento) < 0))
  const encProximas = $derived(encomendasAtivas().filter(e => diasAte(e.entrega_data) <= 1))
  const ontemAberto = $derived(ehHoje && !fechamento(ontem()))

  // Mês do dia aberto, comparado com o mês anterior inteiro
  const mes = $derived(mesDe(S.dia))
  const rMes = $derived(resumo(lancsDoMes(S.lancamentos, mes)))
  const rAnt = $derived(resumo(lancsDoMes(S.lancamentos, somarMeses(mes, -1))))
  const progresso = $derived(rAnt.entradas ? rMes.entradas / rAnt.entradas : rMes.entradas ? 1 : 0)

  const saudacao = (() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' })()

  let foto = $state(null) // { carregando } | { url }
  async function verFoto() {
    foto = { carregando: true }
    try {
      const url = await Api.foto(fech.foto)
      if (!url) { foto = null; return avisar('A foto não está disponível.', 'erro') }
      foto = { url }
    } catch (e) { foto = null; tratarErro(e) }
  }
  async function reabrir() {
    if (!(await confirmar('Marcar este dia como não fechado? Os lançamentos continuam.', { ok: 'Reabrir' }))) return
    try { await reabrirDia(S.dia); avisar('Dia reaberto') } catch (e) { tratarErro(e) }
  }
  const fecharDia = () => (S.caderno = { data: S.dia })

</script>

<header class="mb-5 flex items-end justify-between gap-3 lg:mb-7">
  <div>
    <p class="text-[14px] text-txt-3">{saudacao} · {DIAS[new Date().getDay()]}</p>
    <h1 class="titulo text-[30px] leading-tight font-semibold lg:text-[36px]">Ternura <em class="font-normal text-destaque">Flores</em></h1>
  </div>
</header>

<!-- Avisos -->
{#if atrasadas.length || urgentes.length || encProximas.length || ontemAberto}
  <div class="-mx-4 mb-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
    {#if urgentes.length}
      <button class="flex shrink-0 items-center gap-3 rounded-[20px] border py-3 pr-4 pl-3 text-left {atrasadas.length ? 'border-sai/30 bg-sai-fundo' : 'border-alerta/30 bg-alerta-fundo'}" onclick={() => irPara('contas')}>
        <span class="grid size-10 place-items-center rounded-full bg-white/70 {atrasadas.length ? 'text-sai' : 'text-alerta'}"><Receipt size={19} /></span>
        <span>
          <span class="block text-[14.5px] font-semibold">{atrasadas.length ? `${atrasadas.length} conta${atrasadas.length > 1 ? 's' : ''} atrasada${atrasadas.length > 1 ? 's' : ''}` : `${urgentes.length} conta${urgentes.length > 1 ? 's' : ''} para pagar`}</span>
          <span class="block text-[12.5px] text-txt-2">{#if atrasadas.length}{fmt(atrasadas.reduce((a, c) => a + c.valor, 0))}{urgentes.length > atrasadas.length ? ` · mais ${urgentes.length - atrasadas.length} vencendo` : ''}{:else}Vencem nos próximos dias · {fmt(urgentes.reduce((a, c) => a + c.valor, 0))}{/if}</span>
        </span>
      </button>
    {/if}
    {#if encProximas.length}
      <button class="flex shrink-0 items-center gap-3 rounded-[20px] border border-destaque/20 bg-destaque-fundo py-3 pr-4 pl-3 text-left" onclick={() => irPara('encomendas')}>
        <span class="grid size-10 place-items-center rounded-full bg-white/70 text-destaque"><ShoppingBag size={19} /></span>
        <span>
          <span class="block text-[14.5px] font-semibold">{encProximas.length} encomenda{encProximas.length > 1 ? 's' : ''}</span>
          <span class="block text-[12.5px] text-txt-2">Para hoje e amanhã</span>
        </span>
      </button>
    {/if}
    {#if ontemAberto}
      <button class="flex shrink-0 items-center gap-3 rounded-[20px] border border-linha bg-sup py-3 pr-4 pl-3 text-left" onclick={() => (S.dia = ontem())}>
        <span class="grid size-10 place-items-center rounded-full bg-sup-2 text-txt-2"><CalendarClock size={19} /></span>
        <span>
          <span class="block text-[14.5px] font-semibold">Ontem não foi fechado</span>
          <span class="block text-[12.5px] text-txt-2">Toque para fechar</span>
        </span>
      </button>
    {/if}
  </div>
{/if}

<div class="grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:items-start lg:gap-6">
  <!-- Caixa do dia -->
  <section class="cartao overflow-hidden">
    <div class="flex items-center justify-between gap-2 border-b border-linha px-2 py-2">
      <button class="grid size-11 place-items-center rounded-full text-txt-2 hover:bg-sup-2" aria-label="Dia anterior" onclick={() => (S.dia = somarDias(S.dia, -1))}><ChevronLeft size={22} /></button>
      <label class="relative flex flex-col items-center">
        <span class="titulo text-[18px] font-semibold">{dataBonita(S.dia)}</span>
        <span class="text-[12px] text-txt-3">{ehHoje ? 'toque para escolher outro dia' : deISO(S.dia).toLocaleDateString('pt-BR')}</span>
        <input type="date" class="absolute inset-0 opacity-0" bind:value={S.dia} max={hoje()} aria-label="Escolher dia" />
      </label>
      <button class="grid size-11 place-items-center rounded-full text-txt-2 hover:bg-sup-2 disabled:opacity-25" aria-label="Próximo dia" disabled={ehHoje} onclick={() => (S.dia = somarDias(S.dia, 1))}><ChevronRight size={22} /></button>
    </div>

    {#key S.dia}
      <div in:fade={{ duration: 150 }}>
        <div class="grid grid-cols-3 gap-2 px-5 pt-5 pb-4 text-center">
          <div><p class="text-[12.5px] text-txt-3">Entrou</p><Dinheiro valor={ent} class="text-[21px] font-semibold text-ent" /></div>
          <div><p class="text-[12.5px] text-txt-3">Saiu</p><Dinheiro valor={sai} class="text-[21px] font-semibold text-sai" /></div>
          <div><p class="text-[12.5px] text-txt-3">Saldo</p><Dinheiro valor={ent - sai} class="text-[21px] font-semibold" /></div>
        </div>

        <div class="px-4 pb-4">
          {#if fech}
            <div class="flex items-center gap-2 rounded-2xl bg-ent-fundo px-4 py-3 text-[14px] text-ent">
              <CircleCheck size={18} /><span class="flex-1 font-semibold">Dia fechado</span>
              {#if fech.foto}<button class="flex h-9 items-center gap-1.5 rounded-full bg-white/70 px-3 text-[13px] font-medium" onclick={verFoto}><ImageIcon size={15} /> Foto</button>{/if}
              <button class="grid size-9 place-items-center rounded-full bg-white/70" aria-label="Reabrir o dia" onclick={reabrir}><RotateCcw size={15} /></button>
            </div>
            {#if fech.obs}<p class="mt-2 px-1 text-[13px] text-txt-2 italic">“{fech.obs}”</p>{/if}
            <button class="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-[14px] font-medium text-txt-2 hover:bg-sup-2" onclick={fecharDia}><NotebookPen size={17} /> Adicionar mais ao dia</button>
          {:else}
            <button class="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-destaque text-[16.5px] font-semibold text-white shadow-[0_12px_28px_-12px_rgba(47,93,69,.7)] transition-transform active:scale-[0.98]" onclick={fecharDia}>
              <BookCheck size={21} /> Fechar o dia
            </button>
          {/if}
          <div class="mt-2 grid grid-cols-2 gap-2">
            <button class="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-ent-fundo text-[15px] font-semibold text-ent active:scale-[0.98]" onclick={() => abrirLanc('entrada')}><Plus size={18} strokeWidth={2.4} /> Entrada</button>
            <button class="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-sai-fundo text-[15px] font-semibold text-sai active:scale-[0.98]" onclick={() => abrirLanc('saida')}><Minus size={18} strokeWidth={2.4} /> Saída</button>
          </div>
        </div>

        {#if lista.length}
          <div class="divide-y divide-linha/70 border-t border-linha">
            {#each lista as l (l.id)}<ItemLanc {l} aoTocar={editarLanc} />{/each}
          </div>
        {:else}
          <p class="border-t border-linha px-5 py-8 text-center text-[14px] text-txt-3">Nada lançado {ehHoje ? 'hoje ainda' : 'neste dia'}.</p>
        {/if}
      </div>
    {/key}
  </section>

  <!-- Flor do mês -->
  <section class="cartao relative overflow-hidden px-5 pt-5 pb-5">
    <div class="pointer-events-none absolute -top-6 -right-6 opacity-95">
      <Flor progresso={progresso} tamanho={150} />
    </div>
    <p class="text-[13px] text-txt-3">Entrou em {nomeMes(mes)}</p>
    <Dinheiro valor={rMes.entradas} class="text-[34px] leading-tight font-semibold" />
    <p class="mt-1 max-w-[60%] text-[13.5px] leading-snug text-txt-2">
      {#if rAnt.entradas}
        {#if progresso >= 1}Já passou {nomeMes(somarMeses(mes, -1), false)} inteiro ({fmt(rAnt.entradas)})!{:else}{Math.round(progresso * 100)}% do que entrou em {nomeMes(somarMeses(mes, -1), false)} ({fmt(rAnt.entradas)}){/if}
      {:else}Primeiro mês no app. A flor abre conforme o mês cresce.{/if}
    </p>
    <div class="mt-5 grid grid-cols-2 gap-3 border-t border-linha pt-4">
      <div><p class="text-[12.5px] text-txt-3">Saiu no mês</p><Dinheiro valor={rMes.saidas} class="text-[18px] font-semibold text-sai" /></div>
      <div><p class="text-[12.5px] text-txt-3">Sobrou no mês</p><Dinheiro valor={rMes.saldo} class="text-[18px] font-semibold {rMes.saldo < 0 ? 'text-sai' : 'text-ent'}" /></div>
    </div>
    <button class="mt-4 h-11 w-full rounded-2xl border border-linha text-[14px] font-medium text-txt-2 hover:bg-sup-2" onclick={() => irPara('relatorios')}>Ver relatórios</button>
  </section>
</div>

{#if foto}
  <Folha titulo="Foto do caderno" aoFechar={() => (foto = null)} largo>
    {#if foto.carregando}
      <div class="grid h-60 place-items-center"><span class="size-8 animate-spin rounded-full border-2 border-destaque/30 border-t-destaque"></span></div>
    {:else}
      <img src={foto.url} alt="Foto do caderno" class="w-full rounded-2xl" />
    {/if}
  </Folha>
{/if}
