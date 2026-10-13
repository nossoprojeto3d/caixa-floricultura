<script>
  import Folha from './Folha.svelte'
  import Campo from './Campo.svelte'
  import Escolha from './Escolha.svelte'
  import { S, salvarConta, excluirConta, categoriasDoTipo, avisar, tratarErro, confirmar, abrirFornecedor } from '../lib/estado.svelte.js'
  import { FORMAS } from '../lib/dados.js'
  import { lerValor } from '../lib/formato.js'

  const f = $state({ ...$state.snapshot(S.conta) })
  f.valor = f.valor ? String(f.valor).replace('.', ',') : ''
  let enviando = $state(false)
  let falta = $state('')
  const fechar = () => (S.conta = null)

  async function salvar() {
    if (enviando) return
    if (!f.descricao.trim()) { falta = 'desc'; return avisar('Escreva o que é a conta.', 'erro') }
    if (!lerValor(f.valor)) { falta = 'valor'; return avisar('Digite o valor.', 'erro') }
    if (!f.vencimento) { falta = 'venc'; return avisar('Escolha o vencimento.', 'erro') }
    enviando = true
    try {
      await salvarConta({ ...f, descricao: f.descricao.trim(), valor: lerValor(f.valor), codigo: f.codigo.replace(/\s+/g, ' ').trim() })
      avisar(f.id ? 'Conta atualizada' : 'Conta anotada')
      fechar()
    } catch (e) { tratarErro(e) } finally { enviando = false }
  }
  async function excluir() {
    if (!(await confirmar('Apagar esta conta? Se já foi paga, o lançamento no caixa continua.', { ok: 'Apagar', perigo: true }))) return
    try { await excluirConta(f.id); avisar('Conta apagada'); fechar() } catch (e) { tratarErro(e) }
  }
</script>

<Folha titulo={f.id ? 'Editar conta' : 'Nova conta a pagar'} aoFechar={fechar} largo>
  <div class="space-y-4">
    <Campo rotulo="O que é"><input class="campo {falta === 'desc' ? 'tremer border-sai' : ''}" bind:value={f.descricao} maxlength="80" placeholder="Ex.: boleto das orquídeas, conta de luz" /></Campo>
    <div class="grid grid-cols-2 gap-3">
      <Campo rotulo="Valor"><input class="campo num text-[17px] {falta === 'valor' ? 'tremer border-sai' : ''}" bind:value={f.valor} inputmode="decimal" placeholder="R$ 0,00" /></Campo>
      <Campo rotulo="Vencimento"><input type="date" class="campo {falta === 'venc' ? 'tremer border-sai' : ''}" bind:value={f.vencimento} /></Campo>
    </div>
    <Campo rotulo="Fornecedor">
      <div class="flex gap-2">
        <select class="campo flex-1 px-3" bind:value={f.fornecedor}>
          <option value="">Nenhum</option>
          {#each S.fornecedores as x}<option value={x.id}>{x.nome}</option>{/each}
        </select>
        <button type="button" class="h-12 shrink-0 rounded-2xl border border-linha bg-sup px-4 text-[14px] font-medium text-txt-2" onclick={() => abrirFornecedor()}>+ Novo</button>
      </div>
    </Campo>
    <Campo rotulo="Categoria (para os relatórios)">
      <select class="campo px-3" bind:value={f.categoria}>
        <option value="">Escolher depois</option>
        {#each categoriasDoTipo('saida') as c}<option value={c.id}>{c.nome}</option>{/each}
      </select>
    </Campo>
    <div>
      <span class="mb-1.5 block text-[13px] font-medium text-txt-2">Repete?</span>
      <Escolha opcoes={[['nao', 'Só esta vez'], ['mensal', 'Todo mês']]} bind:valor={f.repetir} />
      {#if f.repetir === 'mensal'}<p class="mt-1.5 text-[12px] text-txt-3">Quando pagar, a do mês que vem já fica anotada.</p>{/if}
    </div>
    <div>
      <span class="mb-1.5 block text-[13px] font-medium text-txt-2">Como vai pagar</span>
      <Escolha opcoes={FORMAS.map(x => [x, x])} bind:valor={f.forma} vazio />
    </div>
    <Campo rotulo="Código de barras / Pix copia e cola" dica="Opcional. Dá para copiar daqui na hora de pagar."><textarea class="campo h-20 resize-none py-3 font-mono text-[16px]" bind:value={f.codigo} maxlength="400"></textarea></Campo>
    <Campo rotulo="Observação"><input class="campo" bind:value={f.obs} maxlength="200" /></Campo>
  </div>
  <button class="mt-6 h-13 w-full rounded-2xl bg-destaque text-[16px] font-semibold text-white disabled:opacity-60" disabled={enviando} onclick={salvar}>{enviando ? 'Salvando…' : f.id ? 'Salvar alterações' : 'Anotar conta'}</button>
  {#if f.id}<button class="mt-2 h-12 w-full rounded-2xl text-[15px] font-medium text-sai" onclick={excluir}>Apagar conta</button>{/if}
</Folha>
