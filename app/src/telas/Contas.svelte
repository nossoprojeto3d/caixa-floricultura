<script>
  import { Plus, Copy, Repeat, CircleCheck, Undo2, Receipt } from '@lucide/svelte'
  import { fade } from 'svelte/transition'
  import Dinheiro from '../componentes/Dinheiro.svelte'
  import Folha from '../componentes/Folha.svelte'
  import Escolha from '../componentes/Escolha.svelte'
  import { S, abrirConta, contasAbertas, pagarConta, desfazerPagamento, fornecedor, nomeCat, avisar, tratarErro, confirmar } from '../lib/estado.svelte.js'
  import { FORMAS } from '../lib/dados.js'
  import { diasAte, prazo, fmt, hoje, ontem, dataCurta, dataBonita, mesAtual, mesDe } from '../lib/formato.js'

  let aba = $state('abertas')
  let pagando = $state(null) // { conta, data, forma, lancar }
  let enviando = $state(false)

  const abertas = $derived(contasAbertas())
  const pagas = $derived(S.contas.filter(c => c.status === 'paga').sort((a, b) => (b.pago_em || '').localeCompare(a.pago_em || '')).slice(0, 60))
  const grupos = $derived.by(() => {
    const g = { atrasadas: [], semana: [], depois: [] }
    for (const c of abertas) {
      const n = diasAte(c.vencimento)
      ;(n < 0 ? g.atrasadas : n <= 7 ? g.semana : g.depois).push(c)
    }
    return [['atrasadas', 'Atrasadas', g.atrasadas], ['semana', 'Próximos 7 dias', g.semana], ['depois', 'Mais pra frente', g.depois]].filter(x => x[2].length)
  })
  const soma = l => l.reduce((a, c) => a + Math.round(c.valor * 100), 0) / 100
  const doMes = $derived(abertas.filter(c => mesDe(c.vencimento) <= mesAtual()))

  function abrirPagar(c) { pagando = { conta: c, data: hoje(), forma: c.forma || 'Pix', lancar: true } }
  async function pagar() {
    if (enviando) return
    enviando = true
    const { conta, data, forma, lancar } = pagando
    try {
      await pagarConta(conta, { data, forma, lancar })
      avisar(conta.repetir === 'mensal' ? 'Paga! A do mês que vem já ficou anotada.' : 'Conta paga')
      pagando = null
    } catch (e) { tratarErro(e) } finally { enviando = false }
  }
  async function desfazer(c) {
    if (!(await confirmar('Desfazer o pagamento? A conta volta para “em aberto” e a saída sai do caixa.', { ok: 'Desfazer' }))) return
    try { await desfazerPagamento(c); avisar('Pagamento desfeito') } catch (e) { tratarErro(e) }
  }
  async function copiar(t) {
    try { await navigator.clipboard.writeText(t); avisar('Código copiado') } catch { avisar('Não consegui copiar.', 'erro') }
  }
  const corPrazo = c => { const n = diasAte(c.vencimento); return n < 0 ? 'text-sai' : n <= 1 ? 'text-alerta' : 'text-txt-3' }
</script>

<header class="mb-5 flex items-center justify-between gap-3">
  <h1 class="titulo text-[30px] font-semibold lg:text-[34px]">Contas</h1>
  <button class="flex h-11 items-center gap-1.5 rounded-full bg-destaque px-4 text-[15px] font-semibold text-white active:scale-[0.97]" onclick={() => abrirConta()}><Plus size={18} strokeWidth={2.4} /> Nova</button>
</header>

<div class="mb-4 grid grid-cols-2 gap-3">
  <div class="cartao px-4 py-3.5">
    <p class="text-[12.5px] text-txt-3">A pagar até o fim do mês</p>
    <Dinheiro valor={soma(doMes)} class="text-[22px] font-semibold" />
  </div>
  <div class="cartao px-4 py-3.5">
    <p class="text-[12.5px] text-txt-3">Atrasadas</p>
    <Dinheiro valor={soma(grupos.find(g => g[0] === 'atrasadas')?.[2] || [])} class="text-[22px] font-semibold {grupos.some(g => g[0] === 'atrasadas') ? 'text-sai' : 'text-txt-3'}" />
  </div>
</div>

<div class="mb-4 grid grid-cols-2 rounded-full border border-linha bg-sup p-1 sm:w-72">
  {#each [['abertas', `Em aberto (${abertas.length})`], ['pagas', 'Pagas']] as [v, r]}
    <button class="h-10 rounded-full text-[14px] font-semibold transition-colors {aba === v ? 'bg-txt text-fundo' : 'text-txt-2'}" onclick={() => (aba = v)}>{r}</button>
  {/each}
</div>

{#if aba === 'abertas'}
  {#if !abertas.length}
    <div class="cartao px-6 py-12 text-center" in:fade>
      <CircleCheck size={34} class="mx-auto text-ent" strokeWidth={1.6} />
      <p class="titulo mt-3 text-[19px] font-semibold">Tudo pago por aqui</p>
      <p class="mt-1 text-[14px] text-txt-3">Anote boletos e contas de fornecedor para não esquecer o vencimento.</p>
    </div>
  {/if}
  <div class="space-y-5">
    {#each grupos as [k, nome, itens] (k)}
      <section>
        <h2 class="mb-2 flex justify-between px-1 text-[13.5px] font-semibold tracking-wide uppercase {k === 'atrasadas' ? 'text-sai' : 'text-txt-3'}"><span>{nome}</span><span class="normal-case">{fmt(soma(itens))}</span></h2>
        <div class="cartao divide-y divide-linha/70 overflow-hidden">
          {#each itens as c (c.id)}
            <div class="flex items-center gap-3 px-4 py-3">
              <button class="min-w-0 flex-1 text-left" onclick={() => abrirConta($state.snapshot(c))}>
                <p class="flex items-center gap-1.5 truncate text-[15.5px] font-semibold">{c.descricao}{#if c.repetir === 'mensal'}<Repeat size={13} class="shrink-0 text-txt-3" />{/if}</p>
                <p class="truncate text-[13px] {corPrazo(c)}">
                  {diasAte(c.vencimento) < 0 ? 'Venceu' : 'Vence'} {prazo(c.vencimento)}<span class="text-txt-3">{c.vencimento && Math.abs(diasAte(c.vencimento)) < 7 ? ` · ${dataCurta(c.vencimento)}` : ''}{c.fornecedor && fornecedor(c.fornecedor) ? ` · ${fornecedor(c.fornecedor).nome}` : ''}</span>
                </p>
              </button>
              <div class="flex shrink-0 flex-col items-end gap-1">
                <Dinheiro valor={c.valor} class="text-[16px] font-semibold" />
              </div>
              <button class="h-10 shrink-0 rounded-full bg-txt px-4 text-[14px] font-semibold text-fundo active:scale-95" onclick={() => abrirPagar(c)}>Pagar</button>
            </div>
          {/each}
        </div>
      </section>
    {/each}
  </div>
{:else}
  {#if !pagas.length}<p class="cartao px-6 py-10 text-center text-[14px] text-txt-3">Nenhuma conta paga ainda.</p>{/if}
  {#if pagas.length}
    <div class="cartao divide-y divide-linha/70 overflow-hidden">
      {#each pagas as c (c.id)}
        <div class="flex items-center gap-3 px-4 py-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-[15px] font-medium">{c.descricao}</p>
            <p class="truncate text-[13px] text-txt-3">Paga {c.pago_em ? dataBonita(c.pago_em).toLowerCase() : ''}{c.forma ? ` · ${c.forma}` : ''}{c.categoria ? ` · ${nomeCat(c.categoria)}` : ''}</p>
          </div>
          <Dinheiro valor={c.valor} class="text-[15px] font-semibold text-txt-2" />
          <button class="grid size-10 shrink-0 place-items-center rounded-full text-txt-3 hover:bg-sup-2" aria-label="Desfazer pagamento" onclick={() => desfazer(c)}><Undo2 size={17} /></button>
        </div>
      {/each}
    </div>
  {/if}
{/if}

{#if pagando}
  {@const c = pagando.conta}
  <Folha titulo="Pagar conta" aoFechar={() => (pagando = null)}>
    <p class="text-[15px] text-txt-2">{c.descricao}{c.fornecedor && fornecedor(c.fornecedor) ? ` · ${fornecedor(c.fornecedor).nome}` : ''}</p>
    <Dinheiro valor={c.valor} class="text-[36px] font-semibold" />

    {#if c.codigo}
      <button class="mt-3 flex w-full items-center gap-3 rounded-2xl border border-linha bg-sup p-3.5 text-left" onclick={() => copiar(c.codigo)}>
        <Copy size={18} class="shrink-0 text-destaque" />
        <span class="min-w-0 flex-1 truncate font-mono text-[13px] text-txt-2">{c.codigo}</span>
        <span class="shrink-0 text-[13px] font-semibold text-destaque">Copiar</span>
      </button>
    {/if}

    <p class="mt-5 mb-2 text-[13px] font-medium text-txt-2">Pago em</p>
    <div class="flex gap-2">
      {#each [[hoje(), 'Hoje'], [ontem(), 'Ontem']] as [d, r]}
        <button class="h-11 rounded-full px-5 text-[15px] font-medium {pagando.data === d ? 'bg-txt text-fundo' : 'border border-linha bg-sup text-txt-2'}" onclick={() => (pagando.data = d)}>{r}</button>
      {/each}
      <input type="date" bind:value={pagando.data} max={hoje()} class="campo min-w-0 flex-1 rounded-full" aria-label="Outra data" />
    </div>

    <p class="mt-5 mb-2 text-[13px] font-medium text-txt-2">Como pagou</p>
    <Escolha opcoes={FORMAS.map(f => [f, f])} bind:valor={pagando.forma} />

    <button class="mt-5 flex w-full items-center gap-3 rounded-2xl border border-linha bg-sup p-4 text-left" aria-pressed={pagando.lancar} onclick={() => (pagando.lancar = !pagando.lancar)}>
      <Receipt size={18} class="text-txt-3" />
      <span class="flex-1"><span class="block text-[15px]">Lançar a saída no caixa</span><span class="text-[12.5px] text-txt-3">{pagando.lancar ? `Entra como ${c.categoria ? nomeCat(c.categoria) : 'saída'} em ${dataBonita(pagando.data).toLowerCase()}` : 'Desligue se já anotou no caderno'}</span></span>
      <span class="relative h-7 w-12 shrink-0 rounded-full transition-colors {pagando.lancar ? 'bg-ent' : 'bg-sup-3'}"><span class="absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform {pagando.lancar ? 'translate-x-5' : ''}"></span></span>
    </button>

    <button class="mt-6 h-13 w-full rounded-2xl bg-txt text-[16px] font-semibold text-fundo disabled:opacity-60" disabled={enviando} onclick={pagar}>{enviando ? 'Salvando…' : 'Confirmar pagamento'}</button>
  </Folha>
{/if}
