<script>
  import Folha from './Folha.svelte'
  import Campo from './Campo.svelte'
  import { S, salvarFornecedor, excluirFornecedor, avisar, tratarErro, confirmar } from '../lib/estado.svelte.js'

  const f = $state({ ...$state.snapshot(S.fornecedor) })
  let enviando = $state(false)
  const fechar = () => (S.fornecedor = null)

  async function salvar() {
    if (enviando) return
    if (!f.nome.trim()) return avisar('Escreva o nome do fornecedor.', 'erro')
    enviando = true
    try { await salvarFornecedor({ ...f, nome: f.nome.trim() }); avisar('Fornecedor salvo'); fechar() }
    catch (e) { tratarErro(e) } finally { enviando = false }
  }
  async function excluir() {
    if (!(await confirmar(`Apagar ${f.nome}? As contas dele continuam, só sem o fornecedor.`, { ok: 'Apagar', perigo: true }))) return
    try { await excluirFornecedor(f.id); avisar('Fornecedor apagado'); fechar() } catch (e) { tratarErro(e) }
  }
</script>

<Folha titulo={f.id ? 'Editar fornecedor' : 'Novo fornecedor'} aoFechar={fechar}>
  <div class="space-y-4">
    <Campo rotulo="Nome"><input class="campo" bind:value={f.nome} maxlength="80" /></Campo>
    <Campo rotulo="Telefone / WhatsApp"><input class="campo" bind:value={f.telefone} inputmode="tel" maxlength="20" /></Campo>
    <Campo rotulo="O que fornece"><input class="campo" bind:value={f.produtos} maxlength="120" placeholder="Ex.: rosas, folhagens" /></Campo>
    <Campo rotulo="Chave Pix"><input class="campo" bind:value={f.pix} maxlength="100" /></Campo>
    <Campo rotulo="Observação"><input class="campo" bind:value={f.obs} maxlength="200" placeholder="Ex.: entrega terça e sexta" /></Campo>
  </div>
  <button class="mt-6 h-13 w-full rounded-2xl bg-rosa text-[16px] font-semibold text-white disabled:opacity-60" disabled={enviando} onclick={salvar}>{enviando ? 'Salvando…' : 'Salvar'}</button>
  {#if f.id}<button class="mt-2 h-12 w-full rounded-2xl text-[15px] font-medium text-sai" onclick={excluir}>Apagar fornecedor</button>{/if}
</Folha>
