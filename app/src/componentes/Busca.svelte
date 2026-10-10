<script>
  // Buscar lançamentos por texto, tipo, categoria e período
  import { Search } from '@lucide/svelte'
  import Folha from './Folha.svelte'
  import ItemLanc from './ItemLanc.svelte'
  import Escolha from './Escolha.svelte'
  import { S, editarLanc, nomeCat } from '../lib/estado.svelte.js'
  import { normalizar, fmt, nomeMes, mesDe, cent } from '../lib/formato.js'

  let { filtros = {}, periodo = {}, aoFechar } = $props()
  let texto = $state('')
  let tipo = $state(filtros.tipo || '')
  let categoria = $state(filtros.categoria || '')
  let soPeriodo = $state(!!(filtros.categoria || filtros.tipo))
  let limite = $state(80)

  const nomePeriodo = periodo.mes ? nomeMes(periodo.mes) : String(periodo.ano)
  const resultado = $derived.by(() => {
    const q = normalizar(texto.trim())
    return S.lancamentos
      .filter(l => (!tipo || l.tipo === tipo) && (!categoria || l.categoria === categoria)
        && (!soPeriodo || (periodo.mes ? mesDe(l.data) === periodo.mes : l.data.startsWith(String(periodo.ano))))
        && (!q || normalizar(`${l.descricao} ${nomeCat(l.categoria)} ${l.forma}`).includes(q) || String(l.valor).replace('.', ',').includes(q)))
      .sort((a, b) => b.data.localeCompare(a.data) || (b.criado || '').localeCompare(a.criado || ''))
  })
  const total = $derived(resultado.reduce((a, l) => a + (l.tipo === 'entrada' ? 1 : -1) * cent(l.valor), 0) / 100)
  const cats = $derived(S.categorias.filter(c => !tipo || c.tipo === tipo))
</script>

<Folha titulo="Buscar lançamentos" {aoFechar} largo>
  <div class="relative">
    <Search size={17} class="absolute top-1/2 left-4 -translate-y-1/2 text-txt-3" />
    <input class="campo pl-11" placeholder="Ex.: orquídea, Ceasa, 150" bind:value={texto} />
  </div>
  <div class="mt-3"><Escolha opcoes={[['', 'Tudo'], ['entrada', 'Entradas'], ['saida', 'Saídas']]} bind:valor={tipo} aoMudar={() => { if (categoria && !cats.some(c => c.id === categoria)) categoria = '' }} /></div>
  <div class="mt-3 grid grid-cols-[1fr_auto] gap-2">
    <select class="campo px-3" bind:value={categoria} aria-label="Categoria">
      <option value="">Todas as categorias</option>
      {#each cats as c}<option value={c.id}>{c.nome}</option>{/each}
    </select>
    <button class="h-12 rounded-2xl border px-4 text-[14px] font-medium {soPeriodo ? 'border-transparent bg-txt text-fundo' : 'border-linha bg-sup text-txt-2'}" onclick={() => (soPeriodo = !soPeriodo)}>Só {nomePeriodo}</button>
  </div>

  <div class="mt-4 flex items-baseline justify-between px-1 text-[13px] text-txt-2">
    <span>{resultado.length} lançamento{resultado.length === 1 ? '' : 's'}</span>
    <span>Saldo <b class={total < 0 ? 'text-sai' : 'text-ent'}>{fmt(total)}</b></span>
  </div>
  <div class="cartao mt-2 divide-y divide-linha/70 overflow-hidden">
    {#each resultado.slice(0, limite) as l (l.id)}<ItemLanc {l} mostrarData aoTocar={editarLanc} />{/each}
    {#if !resultado.length}<p class="px-4 py-8 text-center text-[14px] text-txt-3">Nada encontrado.</p>{/if}
  </div>
  {#if resultado.length > limite}
    <button class="mt-3 h-11 w-full rounded-2xl text-[14px] font-medium text-txt-2 hover:bg-sup-2" onclick={() => (limite += 100)}>Mostrar mais</button>
  {/if}
</Folha>
