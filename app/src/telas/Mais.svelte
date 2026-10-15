<script>
  import { Truck, Tags, Download, Smartphone, ChevronRight, ChevronUp, ChevronDown, Plus, MessageCircle, Pencil, Trash2, FileSpreadsheet, LogOut, RotateCcw } from '@lucide/svelte'
  import Folha from '../componentes/Folha.svelte'
  import Campo from '../componentes/Campo.svelte'
  import Escolha from '../componentes/Escolha.svelte'
  import { S, idDe, demo, abrirFornecedor, salvarCategoria, excluirCategoria, moverCategoria, usoCategoria, categoriasDoTipo, contasAbertas, avisar, tratarErro, confirmar, sair, VERSAO } from '../lib/estado.svelte.js'
  import { Api, registroConexao, apagarRegistroConexao } from '../lib/api.js'
  import { baixarCSV } from '../lib/exportar.js'
  import { telefoneWhats, fmt, dataCurta } from '../lib/formato.js'

  let painel = $state(null) // 'fornecedores' | 'categorias' | 'exportar' | 'instalar' | 'conexao'
  // falhas de conexão anotadas neste aparelho (para descobrir a causa pelo print)
  let conexao = $state(registroConexao())
  const hora = q => { const d = new Date(q); return `${dataCurta(q.slice(0, 10))} ${d.toLocaleTimeString('pt-BR')}` }
  let cat = $state(null) // categoria sendo editada { id, nome, tipo }
  let apagando = $state(null) // { cat, destino }
  let info = $state(null)
  let tipoCat = $state('entrada')
  let enviando = $state(false)

  // o link da planilha vem do servidor (no modo demonstração não existe)
  async function abrirExportar() {
    painel = 'exportar'
    if (!demo && !info) try { info = await Api.info() } catch (e) { tratarErro(e) }
  }
  async function salvarCat(e) {
    e?.preventDefault()
    if (enviando) return
    const nome = cat.nome.trim()
    if (!nome) return avisar('Dê um nome para a categoria.', 'erro')
    if (S.categorias.some(c => c.id !== cat.id && c.tipo === cat.tipo && c.nome.toLowerCase() === nome.toLowerCase())) return avisar('Já existe uma categoria com esse nome.', 'erro')
    enviando = true
    try { await salvarCategoria({ ...cat, nome, id: idDe(cat) }); avisar('Categoria salva'); cat = null } catch (e) { tratarErro(e) } finally { enviando = false }
  }
  async function moverCat(id, passo) {
    if (enviando) return
    enviando = true
    try { await moverCategoria(id, passo) } catch (e) { tratarErro(e) } finally { enviando = false }
  }
  async function pedirExcluir(c) {
    if (enviando) return
    const uso = usoCategoria(c.id)
    if (!uso) {
      if (!(await confirmar(`Apagar a categoria “${c.nome}”?`, { ok: 'Apagar', perigo: true }))) return
      enviando = true
      try { await excluirCategoria(c.id); avisar('Categoria apagada') } catch (e) { tratarErro(e) } finally { enviando = false }
      return
    }
    apagando = { cat: c, destino: categoriasDoTipo(c.tipo).find(x => x.id !== c.id)?.id || '', uso }
  }
  async function confirmarExcluir() {
    if (enviando) return
    enviando = true
    try { await excluirCategoria(apagando.cat.id, apagando.destino); avisar('Categoria apagada'); apagando = null } catch (e) { tratarErro(e) } finally { enviando = false }
  }
  function exportar(qual) {
    const ano = new Date().getFullYear()
    const lista = qual === 'tudo' ? S.lancamentos : S.lancamentos.filter(l => l.data.startsWith(String(qual)))
    if (!lista.length) return avisar('Nada para exportar nesse período.', 'erro')
    baixarCSV(lista, `ternura-flores-${qual === 'tudo' ? 'tudo' : qual}.csv`)
  }
  async function zerarDemo() {
    if (!(await confirmar('Voltar os dados de exemplo para o começo? O que você testou aqui some.', { ok: 'Voltar ao começo' }))) return
    Api.apagarTudo(); location.reload()
  }
  async function esquecer() {
    if (!(await confirmar('Sair deste aparelho? Para entrar de novo vai precisar do código de acesso.', { ok: 'Sair', perigo: true }))) return
    sair()
  }
  const anos = $derived([...new Set(S.lancamentos.map(l => l.data.slice(0, 4)))].sort().reverse())
  const contasDe = id => contasAbertas().filter(c => c.fornecedor === id)

  const ITENS = [
    ['fornecedores', Truck, 'Fornecedores', () => `${S.fornecedores.length} cadastrado${S.fornecedores.length === 1 ? '' : 's'}`],
    ['categorias', Tags, 'Categorias', () => 'Tipos de entrada e saída'],
    ['exportar', Download, 'Planilha e Excel', () => 'Abrir a planilha ou baixar para o contador'],
    ['instalar', Smartphone, 'Instalar no celular', () => 'Ícone na tela de início'],
  ]
</script>

<h1 class="titulo mb-5 text-[30px] font-semibold lg:text-[34px]">Mais</h1>

{#if demo}
  <div class="mb-4 rounded-[24px] border border-alerta/30 bg-alerta-fundo p-4">
    <p class="text-[15px] font-semibold text-alerta">Modo demonstração</p>
    <p class="mt-1 text-[13.5px] leading-relaxed text-txt-2">Os dados são de exemplo e ficam só neste navegador. Pode testar à vontade: criar, editar e apagar.</p>
    <button class="mt-3 flex h-10 items-center gap-2 rounded-full bg-white/70 px-4 text-[14px] font-medium" onclick={zerarDemo}><RotateCcw size={15} /> Voltar os dados de exemplo ao começo</button>
  </div>
{/if}

<div class="cartao divide-y divide-linha/70 overflow-hidden lg:max-w-2xl">
  {#each ITENS as [id, Icone, nome, sub]}
    <button class="flex min-h-16 w-full items-center gap-3.5 px-4 py-3 text-left hover:bg-sup-2/60" onclick={() => (id === 'exportar' ? abrirExportar() : (painel = id))}>
      <span class="grid size-10 place-items-center rounded-full bg-destaque-fundo text-destaque"><Icone size={19} /></span>
      <span class="flex-1"><span class="block text-[15.5px] font-medium">{nome}</span><span class="text-[13px] text-txt-3">{sub()}</span></span>
      <ChevronRight size={18} class="text-txt-3" />
    </button>
  {/each}
</div>

<div class="mt-6 flex flex-col items-center gap-3 text-center lg:max-w-2xl">
  {#if !demo}
    <button class="flex h-11 items-center gap-2 rounded-full px-4 text-[14px] text-txt-3 hover:bg-sup-2" onclick={esquecer}><LogOut size={16} /> Sair deste aparelho</button>
  {/if}
  <p class="text-[12px] text-txt-3">Ternura Flores · Caixa · versão {VERSAO}</p>
  {#if conexao.length}
    <button class="h-10 rounded-full px-4 text-[12.5px] text-txt-3 underline underline-offset-2" onclick={() => { conexao = registroConexao(); painel = 'conexao' }}>Conexão · {conexao.length} anotaç{conexao.length === 1 ? 'ão' : 'ões'}</button>
  {/if}
</div>

{#if painel === 'conexao'}
  <Folha titulo="Conexão" aoFechar={() => (painel = null)} largo>
    <p class="mb-3 text-[13.5px] leading-relaxed text-txt-2">Falhas de conexão com a planilha neste aparelho, da mais nova para a mais antiga. Tire um print e mande para quem cuida do app.</p>
    <div class="cartao divide-y divide-linha/70 overflow-hidden">
      {#each conexao as c}
        <div class="px-4 py-2.5 text-[13px]">
          <p class="flex justify-between gap-2"><span class="font-medium">{hora(c.quando)}</span><span class="text-txt-3">{c.acao} · tentativa {c.tentativa}</span></p>
          <p class="break-words {c.erro.startsWith('recuperou') ? 'text-ent' : 'text-sai'}">{c.erro}</p>
          <p class="text-[12px] text-txt-3">{c.aposVoltar} s depois de abrir/voltar ao app{c.online === false ? ' · celular dizia estar sem internet' : ''}</p>
        </div>
      {/each}
    </div>
    <button class="mt-4 h-11 w-full rounded-2xl text-[14px] font-medium text-txt-2 hover:bg-sup-2" onclick={() => { apagarRegistroConexao(); conexao = []; painel = null }}>Apagar anotações</button>
  </Folha>
{/if}

{#if painel === 'fornecedores'}
  <Folha titulo="Fornecedores" aoFechar={() => (painel = null)} largo>
    <button class="mb-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-destaque text-[15px] font-semibold text-white" onclick={() => abrirFornecedor()}><Plus size={18} /> Novo fornecedor</button>
    {#if !S.fornecedores.length}<p class="py-6 text-center text-[14px] text-txt-3">Nenhum fornecedor ainda.</p>{/if}
    <div class="space-y-2.5">
      {#each [...S.fornecedores].sort((a, b) => a.nome.localeCompare(b.nome)) as f (f.id)}
        {@const abertas = contasDe(f.id)}
        <div class="rounded-[20px] border border-linha bg-sup p-4">
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-[15.5px] font-semibold">{f.nome}</p>
              {#if f.produtos}<p class="text-[13.5px] text-txt-2">{f.produtos}</p>{/if}
              {#if f.obs}<p class="mt-0.5 text-[12.5px] text-txt-3">{f.obs}</p>{/if}
              {#if f.pix}<p class="mt-1 text-[12.5px] text-txt-3">Pix: <span class="select-all">{f.pix}</span></p>{/if}
              {#if abertas.length}<p class="mt-1.5 text-[12.5px] font-medium text-alerta">{abertas.length} conta{abertas.length > 1 ? 's' : ''} em aberto · {fmt(abertas.reduce((a, c) => a + c.valor, 0))}</p>{/if}
            </div>
            <div class="flex shrink-0 gap-1">
              {#if f.telefone}<a class="grid size-10 place-items-center rounded-full text-txt-2 hover:bg-sup-2" href="https://wa.me/{telefoneWhats(f.telefone)}" target="_blank" rel="noopener" aria-label="WhatsApp"><MessageCircle size={18} /></a>{/if}
              <button class="grid size-10 place-items-center rounded-full text-txt-2 hover:bg-sup-2" aria-label="Editar" onclick={() => abrirFornecedor($state.snapshot(f))}><Pencil size={17} /></button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </Folha>
{/if}

{#if painel === 'categorias'}
  <Folha titulo="Categorias" aoFechar={() => (painel = null)} largo>
    <Escolha opcoes={[['entrada', 'Entradas'], ['saida', 'Saídas']]} bind:valor={tipoCat} />
    <div class="mt-4 overflow-hidden rounded-[20px] border border-linha bg-sup">
      {#each categoriasDoTipo(tipoCat) as c, i (c.id)}
        <div class="flex items-center gap-1 py-1 pr-1 pl-4 not-last:border-b not-last:border-linha/70">
          <span class="size-3 shrink-0 rounded-full" style="background:{c.cor}"></span>
          <span class="flex-1 truncate text-[15px]">{c.nome}</span>
          <button class="grid size-10 place-items-center rounded-full text-txt-3 hover:bg-sup-2 disabled:opacity-20" disabled={i === 0} aria-label="Subir" onclick={() => moverCat(c.id, -1)}><ChevronUp size={17} /></button>
          <button class="grid size-10 place-items-center rounded-full text-txt-3 hover:bg-sup-2 disabled:opacity-20" disabled={i === categoriasDoTipo(tipoCat).length - 1} aria-label="Descer" onclick={() => moverCat(c.id, 1)}><ChevronDown size={17} /></button>
          <button class="grid size-10 place-items-center rounded-full text-txt-3 hover:bg-sup-2" aria-label="Renomear" onclick={() => (cat = { ...$state.snapshot(c) })}><Pencil size={16} /></button>
          <button class="grid size-10 place-items-center rounded-full text-txt-3 hover:bg-sai-fundo hover:text-sai" aria-label="Apagar" onclick={() => pedirExcluir(c)}><Trash2 size={16} /></button>
        </div>
      {/each}
    </div>
    <button class="mt-3 h-12 w-full rounded-2xl border border-dashed border-sup-3 text-[15px] text-txt-2" onclick={() => (cat = { id: '', nome: '', tipo: tipoCat })}>+ Nova categoria de {tipoCat === 'entrada' ? 'entrada' : 'saída'}</button>
    <p class="mt-3 text-[12.5px] text-txt-3">A ordem aqui é a ordem em que aparecem na hora de lançar. As 8 primeiras de cada tipo ganham cor própria.</p>
  </Folha>
{/if}

{#if cat}
  <Folha titulo={cat.id ? 'Renomear categoria' : 'Nova categoria'} aoFechar={() => (cat = null)}>
    <form onsubmit={salvarCat}>
      <Campo rotulo="Nome"><input class="campo" bind:value={cat.nome} maxlength="40" enterkeyhint="done" /></Campo>
      <button class="mt-5 h-12 w-full rounded-2xl bg-destaque text-[15px] font-semibold text-white disabled:opacity-60" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar'}</button>
    </form>
  </Folha>
{/if}

{#if apagando}
  <Folha titulo="Apagar “{apagando.cat.nome}”" aoFechar={() => (apagando = null)}>
    <p class="text-[14.5px] leading-relaxed text-txt-2">Ela é usada em {apagando.uso} lançamento(s) ou conta(s). Para onde eles vão?</p>
    <select class="campo mt-3 px-3" bind:value={apagando.destino}>
      {#each categoriasDoTipo(apagando.cat.tipo).filter(x => x.id !== apagando.cat.id) as c}<option value={c.id}>{c.nome}</option>{/each}
    </select>
    <button class="mt-5 h-12 w-full rounded-2xl bg-sai text-[15px] font-semibold text-white disabled:opacity-50" disabled={!apagando.destino || enviando} onclick={confirmarExcluir}>{enviando ? 'Apagando…' : 'Mover e apagar'}</button>
  </Folha>
{/if}

{#if painel === 'exportar'}
  <Folha titulo="Planilha e Excel" aoFechar={() => (painel = null)}>
    {#if info?.planilha}
      <a class="mb-5 flex h-12 items-center justify-center gap-2 rounded-2xl border border-linha bg-sup text-[15px] font-medium text-txt-2" href={info.planilha} target="_blank" rel="noopener"><FileSpreadsheet size={18} /> Abrir a planilha do Google</a>
    {/if}
    <p class="mb-4 text-[14.5px] leading-relaxed text-txt-2">Baixa um arquivo .csv que abre no Excel. Todos os dados também ficam na planilha do Google.</p>
    <div class="space-y-2">
      {#each anos as a}
        <button class="flex h-12 w-full items-center justify-between rounded-2xl border border-linha bg-sup px-4 text-[15px]" onclick={() => exportar(a)}>Lançamentos de {a} <Download size={17} class="text-txt-3" /></button>
      {/each}
      <button class="flex h-12 w-full items-center justify-between rounded-2xl border border-linha bg-sup px-4 text-[15px]" onclick={() => exportar('tudo')}>Tudo <Download size={17} class="text-txt-3" /></button>
    </div>
  </Folha>
{/if}

{#if painel === 'instalar'}
  <Folha titulo="Instalar no celular" aoFechar={() => (painel = null)}>
    <div class="space-y-4 text-[14.5px] leading-relaxed text-txt-2">
      <div class="rounded-2xl border border-linha bg-sup p-4">
        <p class="mb-1 font-semibold text-txt">iPhone (Safari)</p>
        <p>Toque no botão de compartilhar (quadrado com a seta para cima) › “Adicionar à Tela de Início” › Adicionar.</p>
      </div>
      <div class="rounded-2xl border border-linha bg-sup p-4">
        <p class="mb-1 font-semibold text-txt">Android (Chrome)</p>
        <p>Toque nos três pontinhos no canto de cima › “Instalar app” ou “Adicionar à tela inicial”.</p>
      </div>
    </div>
  </Folha>
{/if}
