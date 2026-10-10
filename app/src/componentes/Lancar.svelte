<script>
  import { X, Trash2, CalendarDays, Check } from '@lucide/svelte'
  import Teclado from './Teclado.svelte'
  import Folha from './Folha.svelte'
  import Dinheiro from './Dinheiro.svelte'
  import { S, categoriasDoTipo, salvarLanc, excluirLanc, avisar, tratarErro, confirmar, fechamento } from '../lib/estado.svelte.js'
  import { FORMAS } from '../lib/dados.js'
  import { hoje, ontem, dataBonita } from '../lib/formato.js'

  // modo 'tela' = celular (tela cheia); 'painel' = computador (gaveta à direita)
  let { modo = 'tela' } = $props()

  const f = $derived(S.lanc)
  const cats = $derived(f ? categoriasDoTipo(f.tipo) : [])
  const formas = $derived(f?.tipo === 'entrada' ? FORMAS.filter(x => x !== 'Boleto') : FORMAS)

  let folhaData = $state(false)
  let falta = $state(null)
  let enviando = $state(false)

  function tecla(t) {
    if (t === 'limpar') f.centavos = 0
    else if (t === 'apagar') f.centavos = Math.floor(f.centavos / 10)
    else if (String(f.centavos).length + t.length <= 9) f.centavos = Number(String(f.centavos) + t)
  }
  function trocarTipo(tipo) {
    if (f.tipo === tipo) return
    f.tipo = tipo
    f.categoria = ''
    if (tipo === 'entrada' && f.forma === 'Boleto') f.forma = ''
  }
  function teclaFisica(e) {
    if (!f || modo !== 'painel' || folhaData || S.folhas) return
    if (e.key === 'Escape') return fechar()
    if (e.target.matches?.('input, textarea, select')) return
    if (/^[0-9]$/.test(e.key)) { tecla(e.key); e.preventDefault() }
    else if (e.key === 'Backspace') { tecla('apagar'); e.preventDefault() }
    else if (e.key === 'Enter') { lancar(); e.preventDefault() }
  }
  const marcarFalta = c => { falta = c; setTimeout(() => (falta = null), 600) }
  const fechar = () => (S.lanc = null)

  async function lancar() {
    if (enviando) return
    if (!f.centavos) return avisar('Digite o valor.', 'erro')
    if (!f.categoria) { marcarFalta('cat'); return avisar('Escolha a categoria.', 'erro') }
    enviando = true
    const editando = !!f.id, tipo = f.tipo
    try {
      await salvarLanc(f)
      avisar(editando ? 'Alterações salvas' : tipo === 'entrada' ? 'Entrada lançada' : 'Saída lançada')
      fechar()
    } catch (e) { tratarErro(e) } finally { enviando = false }
  }

  async function excluir() {
    if (enviando) return
    const extra = S.contas.some(c => c.lanc === f.id) ? ' A conta ligada a ele volta a ficar em aberto.' : ''
    if (!(await confirmar('Excluir este lançamento? O valor sai do caixa.' + extra, { ok: 'Excluir', perigo: true }))) return
    enviando = true
    try { await excluirLanc(f.id); avisar('Lançamento excluído'); fechar() }
    catch (e) { tratarErro(e) } finally { enviando = false }
  }
  const corTipo = $derived(f?.tipo === 'saida' ? 'text-sai' : 'text-ent')
</script>

<svelte:window onkeydown={teclaFisica} />

{#if f}
  <div class="flex h-full flex-col {modo === 'tela' ? 'pt-seguro' : ''}">
    <div class="flex items-center gap-2 px-4 pt-3 {modo === 'painel' ? 'px-5 pt-5' : ''}">
      <button class="grid size-10 shrink-0 place-items-center rounded-full text-txt-2 hover:bg-sup-2" aria-label="Fechar" onclick={fechar}><X size={22} /></button>
      {#if f.id}
        <p class="flex-1 text-[15px] font-medium text-txt-2">Editando {f.tipo === 'entrada' ? 'entrada' : 'saída'}</p>
        <button class="grid size-10 shrink-0 place-items-center rounded-full text-txt-3 hover:bg-sai-fundo hover:text-sai" aria-label="Excluir lançamento" onclick={excluir}><Trash2 size={19} /></button>
      {:else}
        <div class="relative mx-auto grid w-full max-w-[260px] grid-cols-2 rounded-full border border-linha bg-sup p-1" role="radiogroup" aria-label="Tipo">
          <span class="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-mola {f.tipo === 'saida' ? 'translate-x-full bg-sai-fundo' : 'bg-ent-fundo'}"></span>
          {#each [['entrada', 'Entrada'], ['saida', 'Saída']] as [v, r]}
            <button role="radio" aria-checked={f.tipo === v} class="relative z-10 h-10 rounded-full text-[15px] font-semibold transition-colors {f.tipo === v ? (v === 'entrada' ? 'text-ent' : 'text-sai') : 'text-txt-3'}" onclick={() => trocarTipo(v)}>{r}</button>
          {/each}
        </div>
        <span class="size-10 shrink-0"></span>
      {/if}
    </div>

    <div class="flex flex-1 flex-col items-center justify-center px-5 py-2" aria-live="polite">
      <div class="transition-colors {f.centavos ? corTipo : 'text-txt-3'}">
        <Dinheiro valor={f.centavos / 100} class="text-[clamp(44px,12vw,58px)] leading-none font-semibold" />
      </div>
      <button class="mt-3 flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-medium {f.data !== hoje() ? 'bg-alerta-fundo text-alerta' : 'text-txt-2'}" onclick={() => (folhaData = true)}>
        <CalendarDays size={15} />{dataBonita(f.data)}{#if fechamento(f.data) && f.data !== hoje()}<span class="opacity-70">· dia fechado</span>{/if}
      </button>
    </div>

    <div class="space-y-3 px-5">
      <div class="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] {falta === 'cat' ? 'tremer' : ''} {modo === 'painel' ? 'flex-wrap overflow-visible' : ''}">
        {#each cats as k (k.id)}
          {@const on = f.categoria === k.id}
          <button class="flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[14px] font-medium transition-colors {on ? 'border-transparent bg-txt text-fundo' : 'border-linha bg-sup text-txt-2'}" onclick={() => (f.categoria = on ? '' : k.id)}>
            <span class="size-2.5 rounded-full" style="background:{k.cor}"></span>{k.nome}
          </button>
        {/each}
      </div>
      <div class="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
        {#each formas as p}
          <button class="h-9 shrink-0 rounded-full px-3.5 text-[13.5px] font-medium transition-colors {f.forma === p ? 'bg-rosa-fundo text-rosa-forte' : 'text-txt-2 hover:bg-sup-2'}" onclick={() => (f.forma = f.forma === p ? '' : p)}>{p}</button>
        {/each}
      </div>
      <input bind:value={f.descricao} maxlength="120" enterkeyhint="done" onkeydown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        class="campo" placeholder={f.tipo === 'entrada' ? 'O que foi vendido? (opcional)' : 'Com o que gastou? (opcional)'} />
    </div>

    <div class="px-4 pt-3 {modo === 'painel' ? 'px-5' : ''}">
      <Teclado aoTocar={tecla} compacto={modo === 'painel'} />
    </div>

    <div class="px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] {modo === 'painel' ? 'px-5 pb-5' : ''}">
      <button class="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[17px] font-semibold text-white transition-[transform,opacity] active:scale-[0.98] disabled:opacity-60 {f.tipo === 'saida' ? 'bg-sai' : 'bg-ent'}" disabled={enviando} onclick={lancar}>
        {#if enviando}<span class="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
        {:else if f.id}<Check size={20} />Salvar alterações
        {:else}{f.tipo === 'entrada' ? 'Lançar entrada' : 'Lançar saída'}{/if}
      </button>
    </div>
  </div>

  {#if folhaData}
    <Folha titulo="Data" aoFechar={() => (folhaData = false)}>
      <div class="flex gap-2">
        {#each [[hoje(), 'Hoje'], [ontem(), 'Ontem']] as [d, r]}
          <button class="h-11 rounded-full px-5 text-[15px] font-medium {f.data === d ? 'bg-txt text-fundo' : 'border border-linha bg-sup text-txt-2'}" onclick={() => { f.data = d; folhaData = false }}>{r}</button>
        {/each}
        <input type="date" bind:value={f.data} max={hoje()} aria-label="Outra data" class="campo min-w-0 flex-1 rounded-full" />
      </div>
      <p class="mt-3 text-[13px] text-txt-3">Esqueceu de lançar algo de outro dia? Escolha a data aqui.</p>
      <button class="mt-5 h-12 w-full rounded-2xl bg-txt text-[15px] font-semibold text-fundo" onclick={() => (folhaData = false)}>Pronto</button>
    </Folha>
  {/if}
{/if}
