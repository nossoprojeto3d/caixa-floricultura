<script>
  import Folha from './Folha.svelte'
  import Campo from './Campo.svelte'
  import Escolha from './Escolha.svelte'
  import { S, salvarEncomenda, excluirEncomenda, avisar, tratarErro, confirmar } from '../lib/estado.svelte.js'
  import { lerValor, hoje } from '../lib/formato.js'

  // os valores ficam como texto enquanto ela digita
  const f = $state({ ...$state.snapshot(S.encomenda) })
  f.valor = f.valor ? String(f.valor).replace('.', ',') : ''
  f.sinal = f.sinal ? String(f.sinal).replace('.', ',') : ''
  let enviando = $state(false)
  let falta = $state('')
  const fechar = () => (S.encomenda = null)

  async function salvar() {
    if (enviando) return
    if (!f.cliente.trim()) { falta = 'cliente'; return avisar('Escreva o nome da cliente.', 'erro') }
    if (!f.pedido.trim()) { falta = 'pedido'; return avisar('Escreva o que foi pedido.', 'erro') }
    if (!f.entrega_data) { falta = 'data'; return avisar('Escolha a data de entrega.', 'erro') }
    const valor = lerValor(f.valor), sinal = lerValor(f.sinal)
    if (sinal > valor && valor) return avisar('O sinal está maior que o valor total.', 'erro')
    enviando = true
    try {
      await salvarEncomenda({ ...f, cliente: f.cliente.trim(), pedido: f.pedido.trim(), valor, sinal })
      avisar(f.id ? 'Encomenda atualizada' : 'Encomenda anotada')
      fechar()
    } catch (e) { tratarErro(e) } finally { enviando = false }
  }
  async function excluir() {
    if (!(await confirmar('Apagar esta encomenda? Os pagamentos já lançados no caixa continuam lá.', { ok: 'Apagar', perigo: true }))) return
    try { await excluirEncomenda(f.id); avisar('Encomenda apagada'); fechar() } catch (e) { tratarErro(e) }
  }
</script>

<Folha titulo={f.id ? 'Editar encomenda' : 'Nova encomenda'} aoFechar={fechar} largo>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo rotulo="Cliente"><input class="campo {falta === 'cliente' ? 'tremer border-sai' : ''}" bind:value={f.cliente} maxlength="80" autocomplete="off" /></Campo>
      <Campo rotulo="Telefone / WhatsApp"><input class="campo" bind:value={f.telefone} inputmode="tel" maxlength="20" placeholder="(11) 99999-9999" /></Campo>
    </div>
    <Campo rotulo="O que foi pedido"><textarea class="campo h-20 resize-none py-3 {falta === 'pedido' ? 'tremer border-sai' : ''}" bind:value={f.pedido} maxlength="300" placeholder="Ex.: buquê com 12 rosas vermelhas e laço dourado"></textarea></Campo>
    <div class="grid grid-cols-2 gap-3">
      <Campo rotulo="Valor total"><input class="campo num text-[17px]" bind:value={f.valor} inputmode="decimal" placeholder="R$ 0,00" /></Campo>
      <Campo rotulo="Sinal pago"><input class="campo num text-[17px]" bind:value={f.sinal} inputmode="decimal" placeholder="R$ 0,00" /></Campo>
    </div>
    <div class="grid grid-cols-[1.3fr_1fr] gap-3">
      <Campo rotulo="Data da entrega"><input type="date" class="campo {falta === 'data' ? 'tremer border-sai' : ''}" bind:value={f.entrega_data} /></Campo>
      <Campo rotulo="Horário"><input type="time" class="campo" bind:value={f.entrega_hora} /></Campo>
    </div>
    <div>
      <span class="mb-1.5 block text-[13px] font-medium text-txt-2">Como vai</span>
      <Escolha opcoes={[['retirada', 'Cliente retira'], ['entrega', 'Entregar']]} bind:valor={f.modo} />
    </div>
    {#if f.modo === 'entrega'}
      <Campo rotulo="Endereço da entrega"><input class="campo" bind:value={f.endereco} maxlength="160" /></Campo>
      <Campo rotulo="Para quem (quem recebe)"><input class="campo" bind:value={f.destinatario} maxlength="80" /></Campo>
    {/if}
    <Campo rotulo="Mensagem do cartão"><textarea class="campo h-20 resize-none py-3" bind:value={f.cartao} maxlength="300" placeholder="Se tiver cartãozinho"></textarea></Campo>
    <Campo rotulo="Observação"><input class="campo" bind:value={f.obs} maxlength="200" /></Campo>
  </div>
  <button class="mt-6 h-13 w-full rounded-2xl bg-rosa text-[16px] font-semibold text-white disabled:opacity-60" disabled={enviando} onclick={salvar}>{enviando ? 'Salvando…' : f.id ? 'Salvar alterações' : 'Anotar encomenda'}</button>
  {#if f.id}<button class="mt-2 h-12 w-full rounded-2xl text-[15px] font-medium text-sai" onclick={excluir}>Apagar encomenda</button>{/if}
</Folha>
