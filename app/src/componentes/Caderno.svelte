<script>
  // Fechar o dia: foto do caderno → IA lê → ela confere/corrige → salva tudo no caixa
  import { X, Camera, Image as Imagem, Keyboard, Plus, Trash2, Minus, CircleAlert, ZoomIn, ZoomOut, Check, Sparkles, ListChecks, ChevronRight, CircleCheck, Store, CalendarClock } from '@lucide/svelte'
  import { fade, fly, slide } from 'svelte/transition'
  import Dinheiro from './Dinheiro.svelte'
  import { S, categoriasDoTipo, lancsDoDia, fechamento, fecharDia, diasSemFechar, avisar, tratarErro, confirmar, nomeCat, demo } from '../lib/estado.svelte.js'
  import { Api } from '../lib/api.js'
  import { FORMAS } from '../lib/dados.js'
  import { dataBonita, lerValor, cent, fmt, novoId } from '../lib/formato.js'
  import { prepararFoto } from '../lib/imagem.js'

  let { modo = 'tela' } = $props()
  const data = S.caderno.data
  const ja = $derived(lancsDoDia(data))

  let etapa = $state('inicio') // 'inicio' | 'lendo' | 'revisar' | 'feito'
  let proximo = $state('') // próximo dia que ficou sem fechar
  let foto = $state(null) // dataURL para mostrar
  let fotoId = $state('')
  let aviso = $state('')
  let itens = $state([])
  let obs = $state('')
  let verFoto = $state(false)
  let zoom = $state(1)
  let enviando = $state(false)
  let inputCamera = $state(), inputGaleria = $state()

  const linha = (x = {}) => ({ chave: novoId(), tipo: 'entrada', valorTxt: '', descricao: '', categoria: categoriasDoTipo(x.tipo || 'entrada')[0]?.id || '', forma: '', duvida: false, decisao: '', ...x })

  async function escolheuFoto(e) {
    const arq = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (!arq) return
    try {
      const p = await prepararFoto(arq)
      foto = p.dataUrl
      etapa = 'lendo'
      const r = await Api.lerCaderno(p.base64, data)
      fotoId = r.foto || ''
      aviso = r.aviso || ''
      itens = (r.itens || []).map(i => linha({
        tipo: i.tipo === 'saida' ? 'saida' : 'entrada',
        valorTxt: i.valor ? String(i.valor).replace('.', ',') : '',
        descricao: i.descricao || '',
        // a categoria sugerida pela IA só vale se for do mesmo tipo da linha
        categoria: categoriasDoTipo(i.tipo === 'saida' ? 'saida' : 'entrada').some(c => c.id === i.categoria) ? i.categoria : categoriasDoTipo(i.tipo === 'saida' ? 'saida' : 'entrada')[0]?.id,
        forma: FORMAS.includes(i.forma) ? i.forma : '',
        duvida: !!i.duvida,
      }))
      if (!itens.length) { aviso = 'Não encontrei lançamentos na foto. Pode digitar abaixo.'; itens = [linha()] }
      etapa = 'revisar'
    } catch (err) {
      tratarErro(err)
      aviso = 'Não consegui ler a foto agora. A foto fica aqui em cima para você digitar olhando para ela.'
      itens = [linha()]
      etapa = 'revisar'
    }
  }

  function semFoto() { itens = [linha()]; etapa = 'revisar' }
  function adicionar(tipo = 'entrada') { itens.push(linha({ tipo })) }
  function remover(i) { itens.splice(i, 1) }
  function trocarTipo(it) {
    it.tipo = it.tipo === 'entrada' ? 'saida' : 'entrada'
    if (!categoriasDoTipo(it.tipo).some(c => c.id === it.categoria)) it.categoria = categoriasDoTipo(it.tipo)[0]?.id || ''
    if (it.tipo === 'entrada' && it.forma === 'Boleto') it.forma = ''
  }

  // Linha que já está lançada no sistema neste dia (mesmo tipo e mesmo valor) não entra de novo.
  // Cada lançamento existente casa com uma linha só: duas vendas de R$ 50 no caderno e uma no sistema = uma repetida.
  const repetidas = $derived.by(() => {
    const livres = ja.map(l => ({ l, usado: false }))
    const m = new Map()
    for (const it of itens) {
      const v = cent(lerValor(it.valorTxt))
      if (!v) continue
      const x = livres.find(z => !z.usado && z.l.tipo === it.tipo && cent(z.l.valor) === v)
      if (x) { x.usado = true; m.set(it.chave, x.l) }
    }
    return m
  })
  // Linha parecida espera ela responder: 'mesmo' (não lança) ou 'diferente' (lança). Nada é decidido sozinho.
  const pendentes = $derived(itens.filter(i => repetidas.has(i.chave) && !i.decisao))
  const validos = $derived(itens.filter(i => lerValor(i.valorTxt) > 0 && !(repetidas.has(i.chave) && i.decisao !== 'diferente')))
  const tot = $derived.by(() => {
    let e = 0, s = 0
    const formas = {}
    for (const i of [...ja, ...validos.map(v => ({ ...v, valor: lerValor(v.valorTxt) }))]) {
      const c = cent(i.valor)
      if (i.tipo === 'entrada') { e += c; const k = i.forma || 'Sem forma'; formas[k] = (formas[k] || 0) + c } else s += c
    }
    return { e: e / 100, s: s / 100, formas: Object.entries(formas).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v / 100]) }
  })

  let tremerPendentes = $state(false)
  async function salvar() {
    if (enviando) return
    if (etapa === 'revisar' && pendentes.length) {
      avisar(pendentes.length === 1 ? 'Responda se a linha amarela já está lançada.' : `Responda as ${pendentes.length} linhas amarelas antes de salvar.`, 'erro')
      document.querySelector('[data-pendente]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      tremerPendentes = true; setTimeout(() => (tremerPendentes = false), 600)
      return
    }
    const vazios = itens.filter(i => !lerValor(i.valorTxt) && (i.descricao || '').trim())
    if (vazios.length && !(await confirmar(`${vazios.length} linha(s) estão sem valor e não serão salvas. Continuar?`, { ok: 'Continuar' }))) return
    if (!validos.length && !ja.length && !(await confirmar('Nenhum lançamento neste dia. Fechar o dia mesmo assim (loja fechada, por exemplo)?', { ok: 'Fechar dia' }))) return
    enviando = true
    // conta antes de gravar: depois, as linhas novas já estão no dia e saem de "validos"
    const novos = validos.map(i => ({ ...i, valor: lerValor(i.valorTxt) }))
    try {
      await fecharDia(data, novos, { foto: fotoId, obs })
      avisar(novos.length ? `Dia fechado · ${novos.length} lançamento${novos.length > 1 ? 's' : ''}` : 'Dia fechado')
      terminou()
    } catch (e) { tratarErro(e) } finally { enviando = false }
  }

  // Loja não abriu: fecha o dia com zero, sem perguntar de novo
  async function lojaFechada() {
    if (enviando) return
    enviando = true
    try { await fecharDia(data, [], { obs: 'Loja fechada' }); avisar('Dia fechado · loja fechada'); terminou() }
    catch (e) { tratarErro(e) } finally { enviando = false }
  }

  // Se ainda tem dia sem fechar, oferece fechar o próximo em seguida
  function terminou() {
    const resta = diasSemFechar().filter(d => d !== data)
    if (resta.length) { proximo = resta[0]; etapa = 'feito' } else S.caderno = null
  }

  // Opções da primeira tela; com algo já lançado no dia, fechar com isso vem primeiro
  const opcoes = $derived([
    ...(ja.length ? [{ id: 'lancados', icone: ListChecks, nome: 'Fechar com os itens já lançados', sub: `${ja.length} lançamento${ja.length > 1 ? 's' : ''} · entrou ${fmt(tot.e)} · saiu ${fmt(tot.s)}`, acao: salvar }] : []),
    { id: 'foto', icone: Camera, nome: 'Tirar foto do caderno', sub: 'Eu leio e você só confere', acao: () => inputCamera.click() },
    { id: 'galeria', icone: Imagem, nome: 'Escolher da galeria', sub: 'Uma foto que já está no celular', acao: () => inputGaleria.click() },
    { id: 'digitar', icone: Keyboard, nome: 'Digitar sem foto', sub: 'Lançar à mão agora', acao: semFoto },
    ...(ja.length ? [] : [{ id: 'fechada', icone: Store, nome: 'A loja não abriu neste dia', sub: 'Fecha o dia com zero (domingo, feriado…)', acao: lojaFechada }]),
  ])

  async function fechar() {
    if (etapa === 'revisar' && validos.length && !(await confirmar('Sair sem salvar? O que foi digitado aqui se perde.', { ok: 'Sair', perigo: true }))) return
    S.caderno = null
  }
</script>

<div class="flex h-full flex-col {modo === 'tela' ? 'pt-seguro' : ''}">
  <div class="flex items-center gap-2 px-4 pt-3 pb-2 {modo === 'painel' ? 'px-5 pt-5' : ''}">
    <button class="grid size-10 shrink-0 place-items-center rounded-full text-txt-2 hover:bg-sup-2" aria-label="Fechar" onclick={fechar}><X size={22} /></button>
    <div class="min-w-0 flex-1">
      <p class="titulo text-[20px] leading-tight font-semibold">Fechar o dia</p>
      <p class="text-[13px] text-txt-3">{dataBonita(data)}{fechamento(data) && etapa !== 'feito' ? ' · já fechado antes, o que entrar aqui soma' : ''}</p>
    </div>
    {#if foto && etapa === 'revisar'}
      <button class="size-11 shrink-0 overflow-hidden rounded-xl border border-linha" aria-label="Ver a foto do caderno" onclick={() => (verFoto = true)}>
        <img src={foto} alt="" class="size-full object-cover" />
      </button>
    {/if}
  </div>

  <div class="flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
    {#if etapa === 'inicio'}
      <p class="titulo mt-1 mb-3 text-[20px] font-semibold">Como quer fechar?</p>
      <div class="space-y-2.5" in:fade>
        {#each opcoes as o, i (o.id)}
          <button class="flex w-full items-center gap-3.5 rounded-[22px] border p-4 text-left transition-transform active:scale-[0.99] disabled:opacity-60 {i === 0 ? 'border-transparent bg-destaque text-white shadow-[0_12px_28px_-14px_rgba(47,93,69,.7)]' : 'border-linha bg-sup'}" disabled={enviando} onclick={o.acao}>
            <span class="grid size-11 shrink-0 place-items-center rounded-full {i === 0 ? 'bg-white/20' : 'bg-destaque-fundo text-destaque'}"><o.icone size={21} /></span>
            <span class="min-w-0 flex-1">
              <span class="block text-[15.5px] font-semibold">{o.nome}</span>
              <span class="block text-[13px] {i === 0 ? 'text-white/80' : 'text-txt-3'}">{o.sub}</span>
            </span>
            {#if enviando && o.id === 'lancados'}<span class="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>{:else}<ChevronRight size={18} class={i === 0 ? 'text-white/70' : 'text-txt-3'} />{/if}
          </button>
        {/each}
      </div>
      <p class="mt-4 px-2 text-center text-[12.5px] leading-relaxed text-txt-3">Na foto: a página do dia inteira, bem de cima e com luz.</p>
      <input bind:this={inputCamera} type="file" accept="image/*" capture="environment" class="hidden" onchange={escolheuFoto} />
      <input bind:this={inputGaleria} type="file" accept="image/*" class="hidden" onchange={escolheuFoto} />

    {:else if etapa === 'feito'}
      {@const resta = diasSemFechar()}
      <div class="mt-6 flex flex-col items-center text-center" in:fade>
        <div class="grid size-16 place-items-center rounded-full bg-ent-fundo text-ent"><CircleCheck size={32} strokeWidth={1.8} /></div>
        <p class="titulo mt-4 text-[22px] font-semibold">Dia fechado</p>
        <p class="text-[14px] text-txt-3 first-letter:uppercase">{dataBonita(data)}</p>
        <p class="mt-4 max-w-[300px] text-[14.5px] leading-relaxed text-txt-2">
          {resta.length === 1 ? 'Ainda falta fechar 1 dia:' : `Ainda faltam ${resta.length} dias para fechar. O mais antigo:`}
        </p>
        <button class="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-destaque text-[16px] font-semibold text-white active:scale-[0.98]" onclick={() => (S.caderno = { data: proximo })}>
          <CalendarClock size={20} /> Fechar {dataBonita(proximo).toLowerCase()}
        </button>
        <button class="mt-2 h-12 w-full rounded-2xl text-[15px] font-medium text-txt-2 hover:bg-sup-2" onclick={() => (S.caderno = null)}>Deixar para depois</button>
      </div>

    {:else if etapa === 'lendo'}
      <div class="mt-2 flex flex-col items-center" in:fade>
        <div class="relative w-full max-w-sm overflow-hidden rounded-[24px] border border-linha">
          <img src={foto} alt="Foto do caderno" class="block w-full" />
          <div class="scanner absolute inset-x-0 h-24"></div>
        </div>
        <p class="titulo mt-5 flex items-center gap-2 text-[19px] font-semibold"><Sparkles size={18} class="text-destaque" /> Lendo o caderno…</p>
        <p class="mt-1 text-[13.5px] text-txt-3">Leva uns segundinhos.</p>
      </div>

    {:else}
      {#if pendentes.length}
        <div class="mb-3 flex gap-2.5 rounded-2xl bg-alerta-fundo p-3.5 text-[13.5px] leading-snug text-alerta" transition:slide><CircleAlert size={18} class="mt-px shrink-0" />{pendentes.length === 1 ? '1 linha é parecida com algo que já está lançado neste dia. Confira abaixo se é a mesma.' : `${pendentes.length} linhas são parecidas com o que já está lançado neste dia. Confira abaixo se são as mesmas.`}</div>
      {/if}
      {#if aviso}
        <div class="mb-3 flex gap-2.5 rounded-2xl bg-alerta-fundo p-3.5 text-[13.5px] leading-snug text-alerta" transition:slide><CircleAlert size={18} class="mt-px shrink-0" />{aviso}</div>
      {/if}
      {#if foto}
        <p class="mb-3 text-[13.5px] text-txt-2">Confira cada linha com o caderno. As marcadas em amarelo eu não li direito. <button class="font-semibold text-destaque underline underline-offset-2" onclick={() => (verFoto = true)}>Ver a foto</button></p>
      {/if}

      {#if ja.length}
        <details class="mb-3 rounded-2xl border border-linha bg-sup px-4 py-3">
          <summary class="cursor-pointer text-[14px] font-medium text-txt-2">Já lançado neste dia ({ja.length})</summary>
          <ul class="mt-2 space-y-1 text-[13.5px] text-txt-2">
            {#each ja as l}<li class="flex justify-between gap-3"><span class="truncate">{l.descricao || nomeCat(l.categoria)}</span><span class="shrink-0 {l.tipo === 'saida' ? 'text-sai' : 'text-ent'}">{l.tipo === 'saida' ? '−' : '+'}{fmt(l.valor)}</span></li>{/each}
          </ul>
          <p class="mt-2 text-[12.5px] text-txt-3">Cuidado para não lançar de novo o que já está aqui.</p>
        </details>
      {/if}

      <div class="space-y-2.5">
        {#each itens as it, i (it.chave)}
          {@const igual = repetidas.get(it.chave)}
          <div data-pendente={igual && !it.decisao ? '' : undefined} class="rounded-[20px] border bg-sup p-3 {igual && !it.decisao ? 'border-alerta/60' : igual && it.decisao === 'mesmo' ? 'border-ent/30' : it.duvida ? 'border-alerta/50 bg-alerta-fundo/40' : 'border-linha'} {igual && !it.decisao && tremerPendentes ? 'tremer' : ''}" transition:slide={{ duration: 200 }}>
            {#if igual}
              {#if !it.decisao}
                <div class="-mx-3 -mt-3 mb-3 rounded-t-[20px] bg-alerta-fundo px-3.5 pt-3 pb-3 text-alerta">
                  <p class="text-[14px] font-semibold">É o mesmo lançamento?</p>
                  <p class="mt-0.5 text-[13px] text-txt-2">Já tem no sistema: <b>{igual.descricao || nomeCat(igual.categoria)}</b> · {fmt(igual.valor)}{igual.forma ? ` · ${igual.forma}` : ''}</p>
                  <div class="mt-2.5 grid grid-cols-2 gap-2">
                    <button class="h-10 rounded-xl bg-white text-[13.5px] font-semibold text-txt" onclick={() => (it.decisao = 'mesmo')}>Sim, já está lançado</button>
                    <button class="h-10 rounded-xl bg-white text-[13.5px] font-semibold text-txt" onclick={() => (it.decisao = 'diferente')}>Não, lançar também</button>
                  </div>
                </div>
              {:else}
                <div class="-mx-3 -mt-3 mb-3 flex items-center gap-2 rounded-t-[20px] px-3 py-2 text-[12.5px] {it.decisao === 'mesmo' ? 'bg-ent-fundo text-ent' : 'bg-sup-2 text-txt-2'}">
                  <span class="min-w-0 flex-1 truncate">{it.decisao === 'mesmo' ? `Já lançado (${igual.descricao || nomeCat(igual.categoria)}) · não vai repetir` : 'Diferente do que já tem · vai ser lançado'}</span>
                  <button class="shrink-0 rounded-full bg-white/70 px-3 py-1 font-semibold" onclick={() => (it.decisao = '')}>Mudar</button>
                </div>
              {/if}
            {/if}
            <div class={igual && it.decisao === 'mesmo' ? 'opacity-45' : ''}>
            <div class="flex items-center gap-2">
              <button class="grid size-11 shrink-0 place-items-center rounded-xl {it.tipo === 'entrada' ? 'bg-ent-fundo text-ent' : 'bg-sai-fundo text-sai'}" aria-label={it.tipo === 'entrada' ? 'Entrada (toque para virar saída)' : 'Saída (toque para virar entrada)'} onclick={() => trocarTipo(it)}>
                {#if it.tipo === 'entrada'}<Plus size={20} strokeWidth={2.4} />{:else}<Minus size={20} strokeWidth={2.4} />{/if}
              </button>
              <div class="relative flex-1">
                <span class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[14px] text-txt-3">R$</span>
                <input class="campo num pl-10 text-[18px] font-semibold" inputmode="decimal" placeholder="0,00" bind:value={it.valorTxt} oninput={() => (it.duvida = false)} aria-label="Valor" />
              </div>
              <button class="grid size-11 shrink-0 place-items-center rounded-xl text-txt-3 hover:bg-sai-fundo hover:text-sai" aria-label="Remover linha" onclick={() => remover(i)}><Trash2 size={18} /></button>
            </div>
            <input class="campo mt-2 h-11" placeholder="Descrição" bind:value={it.descricao} maxlength="120" aria-label="Descrição" />
            <div class="mt-2 grid grid-cols-[1.4fr_1fr] gap-2">
              <select class="campo h-11 px-3 text-[16px]" bind:value={it.categoria} aria-label="Categoria">
                {#each categoriasDoTipo(it.tipo) as c}<option value={c.id}>{c.nome}</option>{/each}
              </select>
              <select class="campo h-11 px-3 text-[16px]" bind:value={it.forma} aria-label="Forma de pagamento">
                <option value="">Forma…</option>
                {#each FORMAS.filter(x => it.tipo === 'saida' || x !== 'Boleto') as p}<option value={p}>{p}</option>{/each}
              </select>
            </div>
            </div>
          </div>
        {/each}
      </div>

      <div class="mt-3 grid grid-cols-2 gap-2">
        <button class="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-ent/40 text-[14.5px] font-medium text-ent" onclick={() => adicionar('entrada')}><Plus size={17} /> Entrada</button>
        <button class="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-sai/40 text-[14.5px] font-medium text-sai" onclick={() => adicionar('saida')}><Minus size={17} /> Saída</button>
      </div>

      <textarea class="campo mt-3 h-20 resize-none py-3" placeholder="Observação do dia (opcional)" bind:value={obs} maxlength="300"></textarea>

      <div class="mt-4 rounded-[24px] bg-txt p-4 text-fundo">
        <div class="grid grid-cols-3 gap-2 text-center">
          <div><p class="text-[12px] opacity-60">Entrou</p><Dinheiro valor={tot.e} class="text-[18px] font-semibold text-[#8fe0cc]" /></div>
          <div><p class="text-[12px] opacity-60">Saiu</p><Dinheiro valor={tot.s} class="text-[18px] font-semibold text-[#f5b3a3]" /></div>
          <div><p class="text-[12px] opacity-60">Saldo</p><Dinheiro valor={tot.e - tot.s} class="text-[18px] font-semibold" /></div>
        </div>
        {#if tot.formas.length}
          <div class="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-white/10 pt-3 text-[12.5px] opacity-75">
            {#each tot.formas as [k, v]}<span>{k} {fmt(v)}</span>{/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if etapa === 'revisar'}
    <div class="border-t border-linha bg-fundo px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] {modo === 'painel' ? 'px-5 pb-5' : ''}">
      <button class="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-destaque text-[17px] font-semibold text-white active:scale-[0.98] disabled:opacity-60" disabled={enviando} onclick={salvar}>
        {#if enviando}<span class="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
        {:else}<Check size={20} /> Salvar e fechar o dia{/if}
      </button>
    </div>
  {/if}
</div>

{#if verFoto}
  <div class="fixed inset-0 z-[65] flex flex-col bg-[#141c17]" transition:fade={{ duration: 150 }}>
    <div class="flex items-center justify-between px-3 pt-[max(12px,env(safe-area-inset-top))] pb-2 text-white">
      <div class="flex gap-1">
        <button class="grid size-11 place-items-center rounded-full bg-white/10" aria-label="Diminuir" onclick={() => (zoom = Math.max(1, zoom - 0.5))}><ZoomOut size={20} /></button>
        <button class="grid size-11 place-items-center rounded-full bg-white/10" aria-label="Aumentar" onclick={() => (zoom = Math.min(4, zoom + 0.5))}><ZoomIn size={20} /></button>
      </div>
      <button class="grid size-11 place-items-center rounded-full bg-white/10" aria-label="Fechar foto" onclick={() => (verFoto = false)}><X size={22} /></button>
    </div>
    <div class="flex-1 overflow-auto overscroll-contain">
      <img src={foto} alt="Foto do caderno" style="width:{zoom * 100}%;max-width:none" class="block" />
    </div>
  </div>
{/if}

<style>
  .scanner {
    background: linear-gradient(to bottom, transparent, rgba(47, 93, 69, 0.28), transparent);
    border-bottom: 2px solid rgba(47, 93, 69, 0.8);
    animation: varrer 1.8s ease-in-out infinite alternate;
  }
  @keyframes varrer { from { top: -6rem } to { top: 100% } }
</style>
