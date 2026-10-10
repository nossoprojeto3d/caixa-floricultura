<script>
  // Lista com barra de proporção: onde entra / onde sai o dinheiro.
  // itens: [{ nome, valor, parte, cor }]. Mostra os 7 maiores e junta o resto em "Outras".
  import { fmt } from '../lib/formato.js'
  import { COR_OUTRAS } from '../lib/dados.js'
  let { itens, limite = 7, aoTocar } = $props()
  const lista = $derived.by(() => {
    if (itens.length <= limite + 1) return itens
    const resto = itens.slice(limite)
    return [...itens.slice(0, limite), { nome: `Outras (${resto.length})`, valor: resto.reduce((a, x) => a + x.valor, 0), parte: resto.reduce((a, x) => a + x.parte, 0), cor: COR_OUTRAS, outras: true }]
  })
  const maior = $derived(Math.max(...lista.map(x => x.parte), 0.0001))
</script>

{#if !lista.length}
  <p class="py-4 text-center text-[13.5px] text-txt-3">Nada neste período.</p>
{:else}
  <ul class="space-y-3">
    {#each lista as x (x.nome)}
      <li>
        <button class="w-full text-left {aoTocar && !x.outras ? 'cursor-pointer' : 'cursor-default'}" onclick={() => !x.outras && aoTocar?.(x)}>
          <div class="mb-1 flex items-baseline justify-between gap-3 text-[14px]">
            <span class="flex min-w-0 items-center gap-2"><span class="size-2.5 shrink-0 rounded-full" style="background:{x.cor}"></span><span class="truncate">{x.nome}</span></span>
            <span class="shrink-0"><span class="font-semibold">{fmt(x.valor)}</span> <span class="ml-1 text-[12px] text-txt-3">{Math.round(x.parte * 100)}%</span></span>
          </div>
          <div class="h-2 rounded-full bg-sup-2">
            <div class="h-full rounded-full transition-[width] duration-700 ease-mola" style="width:{(x.parte / maior) * 100}%;background:{x.cor}"></div>
          </div>
        </button>
      </li>
    {/each}
  </ul>
{/if}
