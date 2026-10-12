<script>
  import { Plus, Truck, Store, Clock, MessageCircle, Pencil, Check, PackageCheck, Gift, MapPin, User, Search } from '@lucide/svelte'
  import { fade } from 'svelte/transition'
  import Dinheiro from '../componentes/Dinheiro.svelte'
  import Folha from '../componentes/Folha.svelte'
  import Escolha from '../componentes/Escolha.svelte'
  import { S, abrirEncomenda, encomendasAtivas, mudarStatusEncomenda, receberEncomenda, avisar, tratarErro, confirmar } from '../lib/estado.svelte.js'
  import { STATUS_ENCOMENDA, FORMAS } from '../lib/dados.js'
  import { dataBonita, diasAte, fmt, hoje, telefoneWhats, normalizar, somarDias } from '../lib/formato.js'

  let aba = $state('ativas')
  let busca = $state('')
  let aberta = $state(null) // id da encomenda no detalhe
  let receber = $state(null) // { oque, valor, forma }
  let enviando = $state(false)

  const ativas = $derived(encomendasAtivas())
  const passadas = $derived(S.encomendas.filter(e => e.status === 'entregue' || e.status === 'cancelada').sort((a, b) => b.entrega_data.localeCompare(a.entrega_data)))
  const lista = $derived.by(() => {
    const base = aba === 'ativas' ? ativas : passadas
    if (!busca.trim()) return base
    const q = normalizar(busca)
    return base.filter(e => normalizar(`${e.cliente} ${e.pedido} ${e.destinatario} ${e.telefone}`).includes(q))
  })
  // Agrupa por dia de entrega; atrasadas juntas no topo
  const grupos = $derived.by(() => {
    const m = new Map()
    for (const e of lista) {
      const k = aba === 'ativas' && diasAte(e.entrega_data) < 0 ? 'atrasada' : e.entrega_data
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(e)
    }
    return [...m.entries()]
  })
  const det = $derived(aberta ? S.encomendas.find(e => e.id === aberta) : null)
  const lancsEnc = $derived(det ? S.lancamentos.filter(l => l.ref === det.id && l.origem === 'encomenda') : [])
  const lancado = oque => lancsEnc.some(l => l.descricao.startsWith(oque))

  async function status(e, s) {
    if (enviando) return
    enviando = true
    try { await mudarStatusEncomenda(e, s); avisar(s === 'entregue' ? 'Encomenda entregue 🌷' : `Marcada como ${STATUS_ENCOMENDA[s].nome.toLowerCase()}`) }
    catch (err) { tratarErro(err) } finally { enviando = false }
  }
  async function cancelar(e) {
    if (!(await confirmar('Cancelar esta encomenda?', { ok: 'Cancelar encomenda', perigo: true }))) return
    status(e, 'cancelada')
  }
  async function confirmarReceber() {
    if (enviando) return
    enviando = true
    try { await receberEncomenda(det, receber.valor, receber.forma, receber.oque); avisar(`${receber.oque} lançado no caixa`); receber = null }
    catch (err) { tratarErro(err) } finally { enviando = false }
  }
  const whats = e => `https://wa.me/${telefoneWhats(e.telefone)}`
  const tituloGrupo = k => k === 'atrasada' ? 'Atrasadas' : dataBonita(k)
</script>

<header class="mb-5 flex items-center justify-between gap-3">
  <h1 class="titulo text-[30px] font-semibold lg:text-[34px]">Encomendas</h1>
  <button class="flex h-11 items-center gap-1.5 rounded-full bg-destaque px-4 text-[15px] font-semibold text-white active:scale-[0.97]" onclick={() => abrirEncomenda()}><Plus size={18} strokeWidth={2.4} /> Nova</button>
</header>

<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
  <div class="grid grid-cols-2 rounded-full border border-linha bg-sup p-1 sm:w-72">
    {#each [['ativas', `A entregar (${ativas.length})`], ['passadas', 'Entregues']] as [v, r]}
      <button class="h-10 rounded-full text-[14px] font-semibold transition-colors {aba === v ? 'bg-txt text-fundo' : 'text-txt-2'}" onclick={() => (aba = v)}>{r}</button>
    {/each}
  </div>
  <div class="relative flex-1">
    <Search size={17} class="absolute top-1/2 left-4 -translate-y-1/2 text-txt-3" />
    <input class="campo h-12 pl-11" placeholder="Buscar cliente ou pedido" bind:value={busca} />
  </div>
</div>

{#if !grupos.length}
  <div class="cartao px-6 py-12 text-center" in:fade>
    <Gift size={34} class="mx-auto text-destaque" strokeWidth={1.6} />
    <p class="titulo mt-3 text-[19px] font-semibold">{busca ? 'Nada encontrado' : aba === 'ativas' ? 'Nenhuma encomenda para entregar' : 'Nenhuma encomenda entregue ainda'}</p>
    {#if aba === 'ativas' && !busca}<p class="mt-1 text-[14px] text-txt-3">Toque em “Nova” para anotar um pedido.</p>{/if}
  </div>
{/if}

<div class="grid gap-5 lg:grid-cols-2 lg:gap-x-6">
  {#each grupos as [k, itens] (k)}
    <section>
      <h2 class="mb-2 px-1 text-[13.5px] font-semibold tracking-wide uppercase {k === 'atrasada' ? 'text-sai' : k === hoje() ? 'text-destaque' : 'text-txt-3'}">{tituloGrupo(k)}</h2>
      <div class="space-y-2.5">
        {#each itens as e (e.id)}
          {@const st = STATUS_ENCOMENDA[e.status]}
          <button class="cartao flex w-full gap-3.5 p-4 text-left transition-transform active:scale-[0.99]" onclick={() => (aberta = e.id)}>
            <div class="flex w-12 shrink-0 flex-col items-center gap-1 pt-0.5">
              <span class="num text-[17px] font-semibold">{e.entrega_hora || '--:--'}</span>
              {#if e.modo === 'entrega'}<Truck size={17} class="text-txt-3" />{:else}<Store size={17} class="text-txt-3" />{/if}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-[15.5px] font-semibold">{e.cliente}</p>
                <span class="ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold {st.classe}">{st.nome}</span>
              </div>
              <p class="mt-0.5 line-clamp-2 text-[14px] leading-snug text-txt-2">{e.pedido}</p>
              {#if aba === 'passadas'}<p class="mt-1 text-[12.5px] text-txt-3">{dataBonita(e.entrega_data)}</p>{/if}
              {#if e.valor}
                <p class="mt-1.5 text-[13px] text-txt-3">{fmt(e.valor)}{e.sinal && e.sinal < e.valor ? ` · falta ${fmt(e.valor - e.sinal)}` : e.sinal >= e.valor ? ' · pago' : ''}</p>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </section>
  {/each}
</div>

{#if det}
  {@const st = STATUS_ENCOMENDA[det.status]}
  <Folha titulo={det.cliente} aoFechar={() => (aberta = null)} largo>
    <div class="flex flex-wrap items-center gap-2 text-[13.5px]">
      <span class="rounded-full px-3 py-1 font-semibold {st.classe}">{st.nome}</span>
      <span class="flex items-center gap-1.5 text-txt-2"><Clock size={15} />{dataBonita(det.entrega_data)}{det.entrega_hora ? ` às ${det.entrega_hora}` : ''}</span>
      <span class="flex items-center gap-1.5 text-txt-2">{#if det.modo === 'entrega'}<Truck size={15} /> Entregar{:else}<Store size={15} /> Cliente retira{/if}</span>
    </div>

    <p class="mt-4 text-[16px] leading-relaxed">{det.pedido}</p>

    <div class="mt-4 space-y-2.5 rounded-2xl border border-linha bg-sup p-4 text-[14.5px]">
      {#if det.modo === 'entrega' && det.endereco}<p class="flex gap-2.5"><MapPin size={17} class="mt-0.5 shrink-0 text-txt-3" />{det.endereco}</p>{/if}
      {#if det.destinatario}<p class="flex gap-2.5"><User size={17} class="mt-0.5 shrink-0 text-txt-3" />Para {det.destinatario}</p>{/if}
      {#if det.cartao}<p class="flex gap-2.5 italic"><Gift size={17} class="mt-0.5 shrink-0 text-destaque" />“{det.cartao}”</p>{/if}
      {#if det.obs}<p class="text-txt-2">{det.obs}</p>{/if}
      <div class="flex justify-between border-t border-linha pt-2.5"><span class="text-txt-2">Valor</span><span class="font-semibold">{fmt(det.valor)}</span></div>
      {#if det.sinal}<div class="flex justify-between"><span class="text-txt-2">Sinal pago</span><span>{fmt(det.sinal)}</span></div>{/if}
      {#if det.valor > det.sinal}<div class="flex justify-between"><span class="text-txt-2">Falta receber</span><span class="font-semibold text-destaque">{fmt(det.valor - det.sinal)}</span></div>{/if}
    </div>

    <div class="mt-4 grid grid-cols-2 gap-2">
      {#if det.status === 'aberta'}
        <button class="flex h-12 items-center justify-center gap-2 rounded-2xl bg-ent-fundo text-[15px] font-semibold text-ent" disabled={enviando} onclick={() => status(det, 'pronta')}><Check size={18} /> Está pronta</button>
      {/if}
      {#if det.status === 'aberta' || det.status === 'pronta'}
        <button class="flex h-12 items-center justify-center gap-2 rounded-2xl bg-txt text-[15px] font-semibold text-fundo {det.status === 'pronta' ? 'col-span-2' : ''}" disabled={enviando} onclick={() => status(det, 'entregue')}><PackageCheck size={18} /> Entregue</button>
      {:else}
        <button class="col-span-2 h-12 rounded-2xl border border-linha bg-sup text-[15px] font-medium text-txt-2" onclick={() => status(det, 'aberta')}>Voltar para “a fazer”</button>
      {/if}
      {#if det.telefone}
        <a class="flex h-12 items-center justify-center gap-2 rounded-2xl border border-linha bg-sup text-[15px] font-medium text-txt-2" href={whats(det)} target="_blank" rel="noopener"><MessageCircle size={18} /> WhatsApp</a>
      {/if}
      <button class="flex h-12 items-center justify-center gap-2 rounded-2xl border border-linha bg-sup text-[15px] font-medium text-txt-2 {det.telefone ? '' : 'col-span-2'}" onclick={() => { abrirEncomenda($state.snapshot(det)); aberta = null }}><Pencil size={17} /> Editar</button>
    </div>

    {#if det.valor && det.status !== 'cancelada'}
      <div class="mt-5">
        <p class="mb-2 text-[13px] font-medium text-txt-2">Lançar no caixa</p>
        <div class="flex flex-wrap gap-2">
          {#if det.sinal}
            <button class="h-10 rounded-full border px-4 text-[14px] font-medium {lancado('Sinal') ? 'border-ent/30 bg-ent-fundo text-ent' : 'border-linha bg-sup text-txt-2'}" disabled={lancado('Sinal')} onclick={() => (receber = { oque: 'Sinal', valor: det.sinal, forma: 'Pix' })}>{lancado('Sinal') ? '✓ Sinal lançado' : `Sinal · ${fmt(det.sinal)}`}</button>
          {/if}
          {#if det.valor > det.sinal}
            <button class="h-10 rounded-full border px-4 text-[14px] font-medium {lancado('Restante') ? 'border-ent/30 bg-ent-fundo text-ent' : 'border-linha bg-sup text-txt-2'}" disabled={lancado('Restante')} onclick={() => (receber = { oque: det.sinal ? 'Restante' : 'Restante (total)', valor: det.valor - det.sinal, forma: 'Pix' })}>{lancado('Restante') ? '✓ Restante lançado' : `${det.sinal ? 'Restante' : 'Valor total'} · ${fmt(det.valor - det.sinal)}`}</button>
          {/if}
        </div>
        <p class="mt-2 text-[12px] text-txt-3">Use só se não for anotar no caderno, para não contar duas vezes.</p>
      </div>
    {/if}

    {#if det.status === 'aberta' || det.status === 'pronta'}
      <button class="mt-5 h-11 w-full rounded-2xl text-[14px] font-medium text-txt-3 hover:text-sai" onclick={() => cancelar(det)}>Cancelar encomenda</button>
    {/if}
  </Folha>
{/if}

{#if receber}
  <Folha titulo="Lançar {receber.oque.toLowerCase()}" aoFechar={() => (receber = null)}>
    <Dinheiro valor={receber.valor} class="text-[34px] font-semibold text-ent" />
    <p class="mt-1 mb-4 text-[14px] text-txt-2">Entra no caixa de hoje como “Encomendas”.</p>
    <p class="mb-2 text-[13px] font-medium text-txt-2">Como pagou</p>
    <Escolha opcoes={FORMAS.filter(f => f !== 'Boleto').map(f => [f, f])} bind:valor={receber.forma} />
    <button class="mt-6 h-13 w-full rounded-2xl bg-ent text-[16px] font-semibold text-white disabled:opacity-60" disabled={enviando} onclick={confirmarReceber}>{enviando ? 'Lançando…' : 'Lançar entrada'}</button>
  </Folha>
{/if}
