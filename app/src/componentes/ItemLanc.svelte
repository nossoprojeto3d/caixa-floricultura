<script>
  import Dinheiro from './Dinheiro.svelte'
  import { nomeCat, corCat } from '../lib/estado.svelte.js'
  import { dataCurta } from '../lib/formato.js'
  import { Camera, Receipt, ShoppingBag } from '@lucide/svelte'
  let { l, aoTocar, mostrarData = false } = $props()
</script>

<button class="flex min-h-15 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-sup-2/60 active:bg-sup-2" onclick={() => aoTocar?.(l)}>
  <span class="size-2.5 shrink-0 rounded-full" style="background:{corCat(l.categoria)}"></span>
  <span class="min-w-0 flex-1">
    <span class="block truncate text-[15px] font-medium">{l.descricao || nomeCat(l.categoria)}</span>
    <span class="flex items-center gap-1.5 truncate text-[12.5px] text-txt-3">
      {#if mostrarData}{dataCurta(l.data)} · {/if}{l.descricao ? nomeCat(l.categoria) : ''}{l.descricao && l.forma ? ' · ' : ''}{l.forma}
      {#if l.origem === 'conta'}<Receipt size={12} />{:else if l.origem === 'encomenda'}<ShoppingBag size={12} />{/if}
    </span>
  </span>
  <Dinheiro valor={l.tipo === 'saida' ? -l.valor : l.valor} sinal class="text-[16px] font-semibold {l.tipo === 'saida' ? 'text-sai' : 'text-ent'}" />
</button>
