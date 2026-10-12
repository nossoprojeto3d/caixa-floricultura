<script>
  import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Search, Table2 } from '@lucide/svelte'
  import { fade } from 'svelte/transition'
  import Dinheiro from '../componentes/Dinheiro.svelte'
  import GraficoMeses from '../componentes/GraficoMeses.svelte'
  import BarrasLista from '../componentes/BarrasLista.svelte'
  import BarrasSimples from '../componentes/BarrasSimples.svelte'
  import Busca from '../componentes/Busca.svelte'
  import { S, nomeCat, corCat, historico, mesArquivado, anoArquivado } from '../lib/estado.svelte.js'
  import { resumo, agrupar, serieMeses, porDiaSemana, porDiaDoMes, variacao, lancsDoMes, lancsDoAno, mesComparavel, anoComparavel } from '../lib/analise.js'
  import { mesAtual, somarMeses, nomeMes, nomeMesCurto, fmt, pct, DIAS_CURTO, DIAS, MESES_LONGO } from '../lib/formato.js'
  import { corDaPosicao, FORMAS } from '../lib/dados.js'

  let modo = $state('mes') // 'mes' | 'ano'
  let mes = $state(mesAtual())
  let ano = $state(new Date().getFullYear())
  let busca = $state(null) // filtros iniciais da busca aberta
  let tabela = $state(false)

  // lançamentos + totais dos anos arquivados (calculado uma vez só)
  const base = $derived(historico())
  const primeiro = $derived(base.reduce((m, l) => (l.data < m ? l.data : m), mesAtual() + '-01').slice(0, 7))
  const lista = $derived(modo === 'mes' ? lancsDoMes(base, mes) : lancsDoAno(base, ano))
  // dia a dia e dias da semana precisam do detalhe: anos arquivados só têm o total do mês
  const arquivado = $derived(modo === 'mes' ? mesArquivado(mes) : anoArquivado(ano))
  const detalhe = $derived(lista.filter(l => !l.resumo))
  const r = $derived(resumo(lista))
  // comparações: período anterior e o mesmo período do ano passado
  // no mês em andamento, compara só até o mesmo dia
  const emAndamento = $derived(modo === 'mes' && mes === mesAtual())
  const rAnt = $derived(modo === 'mes' ? mesComparavel(base, mes, -1) : anoComparavel(base, ano))
  const rAnoPassado = $derived(modo === 'mes' ? mesComparavel(base, mes, -12) : null)
  const nomeAnt = $derived(modo === 'mes' ? nomeMes(somarMeses(mes, -1), false) : ano === new Date().getFullYear() ? `${ano - 1} até hoje` : String(ano - 1))

  const serie = $derived(serieMeses(base, modo === 'mes' ? mes : `${ano}-12`, 12))
  const cats = tipo => agrupar(lista, tipo, 'categoria').map(x => ({ ...x, nome: nomeCat(x.chave), cor: corCat(x.chave) }))
  const entradasCat = $derived(cats('entrada'))
  const saidasCat = $derived(cats('saida'))
  // cor fixa por forma de pagamento (não pela posição no ranking)
  const formas = $derived(agrupar(lista, 'entrada', 'forma').map(x => ({ ...x, nome: x.chave || 'Não anotado', cor: x.chave && FORMAS.includes(x.chave) ? corDaPosicao(FORMAS.indexOf(x.chave)) : '#a4949a' })))
  const semana = $derived(porDiaSemana(detalhe))
  const melhorDia = $derived(semana.reduce((m, x) => (x.media > m.media ? x : m), semana[0]))
  const diario = $derived(modo === 'mes' ? porDiaDoMes(detalhe, mes) : [])
  const melhorDiaMes = $derived(diario.reduce((m, x) => (x.entradas > (m?.entradas || 0) ? x : m), null))

  // ano: tabela mês a mês contra o ano anterior
  const anoAno = $derived(modo === 'ano' ? MESES_LONGO.map((nome, i) => {
    const m = `${ano}-${String(i + 1).padStart(2, '0')}`
    const a = resumo(lancsDoMes(base, m)), b = resumo(lancsDoMes(base, somarMeses(m, -12)))
    return { nome, m, ...a, antes: b.entradas, var: variacao(a.entradas, b.entradas) }
  }) : [])

  const podeVoltar = $derived(modo === 'mes' ? mes > primeiro : ano > Number(primeiro.slice(0, 4)))
  const podeIr = $derived(modo === 'mes' ? mes < mesAtual() : ano < new Date().getFullYear())
  function navegar(n) { if (modo === 'mes') mes = somarMeses(mes, n); else ano += n }

  // De cada R$ 100 que entraram, quanto sobrou (linguagem simples em vez de "margem")
  const sobraDe100 = $derived(r.entradas ? Math.round((r.saldo / r.entradas) * 100) : null)
</script>

{#snippet comparacao(agora, antes, rotulo, inverso = false)}
  {@const v = variacao(agora, antes)}
  {#if v != null}
    {@const bom = inverso ? v <= 0 : v >= 0}
    <span class="inline-flex items-center gap-1 text-[12px] font-medium {bom ? 'text-ent' : 'text-sai'}">
      {#if v >= 0}<TrendingUp size={13} />{:else}<TrendingDown size={13} />{/if}{v >= 0 ? '+' : ''}{pct(v)} <span class="font-normal text-txt-3">{rotulo}</span>
    </span>
  {/if}
{/snippet}

<header class="mb-4 flex flex-wrap items-center justify-between gap-3">
  <h1 class="titulo text-[30px] font-semibold lg:text-[34px]">Relatórios</h1>
  <div class="flex gap-2">
    <button class="flex h-10 items-center gap-1.5 rounded-full border border-linha bg-sup px-3.5 text-[14px] font-medium text-txt-2" onclick={() => (busca = {})}><Search size={16} /> Buscar</button>
    <div class="grid grid-cols-2 rounded-full border border-linha bg-sup p-1">
      {#each [['mes', 'Mês'], ['ano', 'Ano']] as [v, rt]}
        <button class="h-9 rounded-full px-4 text-[13.5px] font-semibold {modo === v ? 'bg-txt text-fundo' : 'text-txt-2'}" onclick={() => (modo = v)}>{rt}</button>
      {/each}
    </div>
  </div>
</header>

<div class="mb-4 flex items-center justify-between">
  <button class="grid size-11 place-items-center rounded-full text-txt-2 hover:bg-sup-2 disabled:opacity-25" disabled={!podeVoltar} aria-label="Anterior" onclick={() => navegar(-1)}><ChevronLeft size={22} /></button>
  <p class="titulo text-[22px] font-semibold capitalize">{modo === 'mes' ? nomeMes(mes) : ano}</p>
  <button class="grid size-11 place-items-center rounded-full text-txt-2 hover:bg-sup-2 disabled:opacity-25" disabled={!podeIr} aria-label="Próximo" onclick={() => navegar(1)}><ChevronRight size={22} /></button>
</div>

{#key modo + mes + ano}
<div in:fade={{ duration: 160 }}>
  <!-- Resumo -->
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <div class="cartao px-4 py-4">
      <p class="text-[12.5px] text-txt-3">Entrou</p>
      <Dinheiro valor={r.entradas} class="text-[24px] font-semibold text-ent" />
      <div class="mt-1 flex flex-col gap-0.5">
        {@render comparacao(r.entradas, rAnt.entradas, `vs ${nomeAnt}`)}
        {#if rAnoPassado?.entradas}{@render comparacao(r.entradas, rAnoPassado.entradas, 'vs ano passado')}{/if}
      </div>
    </div>
    <div class="cartao px-4 py-4">
      <p class="text-[12.5px] text-txt-3">Saiu</p>
      <Dinheiro valor={r.saidas} class="text-[24px] font-semibold text-sai" />
      <div class="mt-1 flex flex-col gap-0.5">
        {@render comparacao(r.saidas, rAnt.saidas, `vs ${nomeAnt}`, true)}
        {#if rAnoPassado?.saidas}{@render comparacao(r.saidas, rAnoPassado.saidas, 'vs ano passado', true)}{/if}
      </div>
    </div>
    <div class="cartao col-span-2 px-4 py-4 lg:col-span-1">
      <p class="text-[12.5px] text-txt-3">Sobrou</p>
      <Dinheiro valor={r.saldo} class="text-[24px] font-semibold {r.saldo < 0 ? 'text-sai' : ''}" />
      <p class="mt-1 text-[12.5px] leading-snug text-txt-2">
        {#if sobraDe100 == null}Nada entrou neste período.{:else if sobraDe100 >= 0}De cada R$ 100 que entraram, sobraram <b>R$ {sobraDe100}</b>.{:else}Saiu mais do que entrou.{/if}
      </p>
    </div>
    <div class="cartao col-span-2 px-4 py-4 lg:col-span-1">
      <p class="text-[12.5px] text-txt-3">Média por dia com venda</p>
      <Dinheiro valor={r.mediaDia} class="text-[24px] font-semibold" />
      <p class="mt-1 text-[12.5px] text-txt-2">{r.diasComVenda} dia{r.diasComVenda === 1 ? '' : 's'} com venda</p>
    </div>
  </div>

  {#if emAndamento && rAnt.entradas}
    <p class="mt-3 px-1 text-[13px] text-txt-2">Comparando com o mesmo dia de {nomeAnt}: até lá tinham entrado {fmt(rAnt.entradas)}. {r.entradas >= rAnt.entradas ? 'Este mês está na frente 🌷' : `Faltam ${fmt(rAnt.entradas - r.entradas)} para empatar.`}</p>
  {/if}

  <!-- Mês a mês -->
  <section class="cartao mt-4 px-4 pt-4 pb-3 lg:px-6">
    <div class="mb-1 flex items-center justify-between">
      <h2 class="titulo text-[18px] font-semibold">Mês a mês</h2>
      <button class="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-txt-2 hover:bg-sup-2" onclick={() => (tabela = !tabela)}><Table2 size={15} />{tabela ? 'Gráfico' : 'Tabela'}</button>
    </div>
    {#if tabela}
      <div class="-mx-4 overflow-x-auto px-4">
        <table class="w-full text-[13.5px]">
          <thead><tr class="text-left text-[12px] text-txt-3"><th class="py-2 font-medium">Mês</th><th class="py-2 text-right font-medium">Entrou</th><th class="py-2 text-right font-medium">Saiu</th><th class="py-2 text-right font-medium">Sobrou</th></tr></thead>
          <tbody>
            {#each [...serie].reverse() as m}
              <tr class="border-t border-linha/70"><td class="py-2 capitalize">{nomeMes(m.mes)}</td><td class="py-2 text-right text-ent">{fmt(m.entradas)}</td><td class="py-2 text-right text-sai">{fmt(m.saidas)}</td><td class="py-2 text-right font-semibold">{fmt(m.saldo)}</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <GraficoMeses {serie} escolhido={modo === 'mes' ? mes : ''} aoEscolher={m => { modo = 'mes'; mes = m }} />
      <p class="mt-1 text-[12px] text-txt-3">Toque num mês para ver os detalhes dele.</p>
    {/if}
  </section>

  <div class="mt-4 grid gap-4 lg:grid-cols-2">
    <section class="cartao px-4 py-4 lg:px-6">
      <h2 class="titulo mb-0.5 text-[18px] font-semibold">De onde vem o dinheiro</h2>
      <p class="mb-4 text-[12.5px] text-txt-3">Entradas por tipo de venda{arquivado ? '' : ' · toque para ver os lançamentos'}</p>
      <BarrasLista itens={entradasCat} aoTocar={arquivado ? undefined : x => (busca = { categoria: x.chave, tipo: 'entrada' })} />
      {#if formas.length}
        <h3 class="mt-6 mb-3 text-[13px] font-semibold text-txt-2">Como os clientes pagam</h3>
        <BarrasLista itens={formas} />
      {/if}
    </section>
    <section class="cartao px-4 py-4 lg:px-6">
      <h2 class="titulo mb-0.5 text-[18px] font-semibold">Para onde vai o dinheiro</h2>
      <p class="mb-4 text-[12.5px] text-txt-3">Saídas por categoria{arquivado ? '' : ' · toque para ver os lançamentos'}</p>
      <BarrasLista itens={saidasCat} aoTocar={arquivado ? undefined : x => (busca = { categoria: x.chave, tipo: 'saida' })} />
    </section>
  </div>

  <div class="mt-4 grid gap-4 lg:grid-cols-2">
    {#if modo === 'mes'}
      <section class="cartao px-4 py-4 lg:px-6">
        <h2 class="titulo mb-0.5 text-[18px] font-semibold">Dia a dia</h2>
        <p class="mb-4 text-[12.5px] text-txt-3">Quanto entrou em cada dia{melhorDiaMes ? ` · melhor dia: ${melhorDiaMes.dia} (${fmt(melhorDiaMes.entradas)})` : ''}</p>
        {#if arquivado}
          <p class="rounded-2xl bg-sup-2 px-4 py-6 text-center text-[13.5px] leading-relaxed text-txt-2">Este mês foi arquivado: aqui fica só o total. Os lançamentos de cada dia estão na planilha “Ternura Flores · Arquivo”.</p>
        {:else}
          <BarrasSimples itens={diario.map(d => ({ ...d, valor: d.entradas }))} cor="var(--color-ent)"
            rotulo={(x, i) => (i === 0 || (i + 1) % 5 === 0 ? String(x.dia) : '')}
            dica={x => (x ? `Dia ${x.dia}: entrou ${fmt(x.entradas)} · saiu ${fmt(x.saidas)}` : 'Entradas por dia do mês')} />
        {/if}
      </section>
    {:else}
      <section class="cartao px-4 py-4 lg:px-6">
        <h2 class="titulo mb-3 text-[18px] font-semibold">{ano} contra {ano - 1}</h2>
        <table class="w-full text-[13.5px]">
          <thead><tr class="text-left text-[12px] text-txt-3"><th class="py-1.5 font-medium">Mês</th><th class="py-1.5 text-right font-medium">{ano - 1}</th><th class="py-1.5 text-right font-medium">{ano}</th><th class="py-1.5 text-right font-medium"></th></tr></thead>
          <tbody>
            {#each anoAno as m}
              <tr class="border-t border-linha/70">
                <td class="py-2 capitalize">{m.nome}</td>
                <td class="py-2 text-right text-txt-2">{m.antes ? fmt(m.antes) : '—'}</td>
                <td class="py-2 text-right font-semibold">{m.entradas ? fmt(m.entradas) : '—'}</td>
                <td class="w-14 py-2 text-right text-[12px] {m.var == null ? '' : m.var >= 0 ? 'text-ent' : 'text-sai'}">{m.var == null || !m.entradas ? '' : (m.var >= 0 ? '+' : '') + pct(m.var)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="mt-2 text-[12px] text-txt-3">Entradas de cada mês.</p>
      </section>
    {/if}
    <section class="cartao px-4 py-4 lg:px-6">
      <h2 class="titulo mb-0.5 text-[18px] font-semibold">Melhores dias da semana</h2>
      <p class="mb-4 text-[12.5px] text-txt-3">Média de vendas em cada dia{melhorDia?.media ? ` · ${DIAS[melhorDia.dia]} é o mais forte` : ''}</p>
      {#if arquivado && !detalhe.length}
        <p class="rounded-2xl bg-sup-2 px-4 py-6 text-center text-[13.5px] leading-relaxed text-txt-2">Período arquivado: o resumo é por mês, então não dá para ver os dias da semana. O detalhe está na planilha “Ternura Flores · Arquivo”.</p>
      {:else}
        <BarrasSimples itens={semana.map(x => ({ ...x, valor: x.media }))} altura={140} mostrarValor destaque={melhorDia?.media ? melhorDia.dia : -1}
          rotulo={x => DIAS_CURTO[x.dia]} dica={x => (x ? `${DIAS[x.dia]}: média de ${fmt(x.media)}` : 'Média de vendas por dia da semana')} />
        {#if arquivado}<p class="mt-2 text-[12px] text-txt-3">Só os meses que ainda têm o detalhe de cada dia.</p>{/if}
      {/if}
    </section>
  </div>
</div>
{/key}

{#if busca}
  <Busca filtros={busca} aoFechar={() => (busca = null)} periodo={modo === 'mes' ? { mes } : { ano }} />
{/if}
