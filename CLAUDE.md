# Contexto do projeto: Ternura Flores · Caixa

## O que é
PWA de caixa da **Ternura Flores**, a floricultura da mãe do dono do repositório. Substitui o caderninho: no fim do dia ela tira foto da página do caderno, a IA lê, ela confere e o dia é fechado. Também anota encomendas, contas a pagar (boletos e fornecedores) com lembrete no Telegram, e mostra relatórios para entender a saúde da loja (mês a mês, de onde vem e para onde vai o dinheiro). Movimento pequeno: cerca de R$ 500 por dia.

Usuários: a mãe (celular Android ou iPhone) e o irmão (o outro), às vezes no computador. Sem login por pessoa: um **código de acesso** digitado uma vez em cada aparelho.

Publicado em <https://nossoprojeto3d.github.io/caixa-floricultura/>. Versão: 1.0.1.

## Regras que não mudam
- **Custo zero:** GitHub Pages + Google Sheets/Apps Script + Gemini grátis + Telegram. Nada pago sem autorização.
- **Dados no Google Sheets** (decisão do dono), nunca no repositório (é público).
- **Lembretes pelo Telegram** (decisão do dono). WhatsApp foi descartado: a API oficial é paga.
- **Mobile primeiro**, linguagem simples para leigos (nada de "margem", "fluxo de caixa operacional": use "sobrou", "de onde vem o dinheiro").
- Tudo em português do Brasil, inclusive nomes de funções e variáveis.
- **Valores em centavos** nas contas (`cent()` em `app/src/lib/formato.js`).
- **Sem `confirm()`/`alert()`/`prompt()`**: use `confirmar()` do `estado.svelte.js` (no iPhone instalado, a chamada seguinte ao `confirm()` falha).
- **Toque duplo:** toda ação que grava começa com `if (enviando) return`.
- **iPhone:** campos com fonte de pelo menos 16px e alvos de toque de pelo menos 40px.
- **Tailwind:** nada de classe montada com variável (`bg-{cor}`); use classes inteiras (ver `STATUS_ENCOMENDA` em `dados.js`).

## Identidade visual "Ternura" (verde, como a loja)
A floricultura é nos tons verdes. Papel de folha clara, tinta verde-musgo e um só destaque verde-eucalipto. Fundo `#f3f5ee`, cartões brancos com borda `#dfe6d7`, texto `#1d2a22` / `#546358` / `#8e9b91`. Destaque (token `destaque`) `#2f5d45`, forte `#234935`, fundo `#e2ede0`. Entradas em verde-água `#178a72` (bem diferente do destaque, para o botão principal não parecer "entrada"), saídas em terracota `#c4553c`: par validado para daltonismo pelo script do dataviz (não troque um sem revalidar). Alerta mostarda `#b97b12`. O rosa ficou só na flor (ilustração, ícone e pétalas), por ser floricultura. Títulos e números em **Fraunces** (eixo SOFT, itálico no "Flores"), texto em **Figtree**. Tokens no `@theme` de `app/src/app.css`. Destaques: a **flor do mês** (`Flor.svelte`), que abre conforme o mês se aproxima do que entrou no mês anterior, e a **chuva de folhas e pétalas** (`Petalas.svelte`) ao fechar o dia. Ícone: tulipa rosa com folhas verde-claras sobre fundo verde-eucalipto. Cores de categoria por posição dentro do tipo, paleta validada para daltonismo (`dados.js`); da 9ª em diante fica cinza e entra em "Outras" nos gráficos.

## Estrutura
- `app/`: Vite + Svelte 5 + Tailwind 4, ícones Lucide, fontes Fontsource. O build vai para a **raiz** (`index.html`, `assets/`, `sw.js`, `manifest.json`, `icons/`, `favicon.svg`): não edite esses arquivos na raiz.
- `app/src/lib/config.js`: `URL_SERVIDOR` (endereço `/exec` do Apps Script). **Vazio = modo demonstração.** `?demo` na URL também força o modo demonstração.
- `app/src/lib/api.js`: fala com o Apps Script (POST `text/plain` para evitar CORS) ou com `demo.js`.
- `app/src/lib/demo.js`: modo demonstração (localStorage `ternura_demo_v1`), gera ~14 meses de dados de exemplo com sementes fixas.
- `app/src/lib/estado.svelte.js`: estado (`S`), carregar/cache (`ternura_cache`), gravação em lote e as regras (pagar conta cria a saída e a próxima conta mensal; fechar o dia; encomendas).
- `app/src/lib/analise.js`: contas dos relatórios. `formato.js`: dinheiro e datas. `dados.js`: colunas das tabelas, categorias iniciais, formas de pagamento, paleta.
- `app/src/telas/`: `Hoje`, `Encomendas`, `Contas`, `Relatorios`, `Mais`, `Porta` (código de acesso).
- `app/src/componentes/`: `Lancar` (teclado próprio), `Caderno` (fluxo da foto), `Form*` (encomenda, conta, fornecedor), `Folha`, gráficos (`GraficoMeses`, `BarrasLista`, `BarrasSimples`), `Busca`, `Flor`, `Petalas`.
- `apps-script/Codigo.gs`: servidor. Abas da planilha, lote com trava, Gemini (foto), fotos no Drive (pasta própria; só devolve fotos dessa pasta), Telegram (gatilho diário às 8h), função `configurar`.
- `CONFIGURAR.md`: passo a passo de instalação do servidor.

## Dados
Tabelas (abas): `lancamentos`, `categorias`, `encomendas`, `contas`, `fornecedores`, `fechamentos`. As colunas estão em `TABELAS`, **iguais** em `app/src/lib/dados.js` e `apps-script/Codigo.gs`: mudou em um, mude no outro. Datas como texto `AAAA-MM-DD`. IDs são texto gerado no app (`novoId()`).
- `lancamentos.origem`: `manual`, `caderno`, `conta` (pagamento de conta, `ref` = id da conta) ou `encomenda` (`ref` = id da encomenda).
- `fechamentos`: um por dia fechado (`id` = data). Os totais gravados são só uma referência para a planilha; o app sempre recalcula pelos lançamentos.
- Excluir um lançamento que veio de conta reabre a conta.
- **Fechar o dia não duplica, mas pergunta:** na revisão do caderno, linha com o mesmo tipo e valor de um lançamento já existente no dia (casamento um para um) fica amarela com "É o mesmo lançamento?" e os botões "Sim, já está lançado" (não salva) / "Não, lançar também". Nada é decidido sozinho: com pergunta sem resposta, o app não salva. Regra em `repetidas`/`pendentes` no `Caderno.svelte`.

## Publicar
1. Suba `VERSAO` em `app/src/lib/estado.svelte.js` e `CACHE` em `app/public/sw.js`.
2. `cd app && npm install && npm run build`.
3. Commit e push na `main` (o GitHub Actions publica).
Mudou o `Codigo.gs`? Ele não é publicado pelo GitHub: precisa colar no Apps Script e criar **Nova versão** da implantação (ver CONFIGURAR.md).

## Roteiro de teste
Usado pelo `/conferir-site`. **Teste sempre no modo demonstração** (`?demo` ou com `URL_SERVIDOR` vazio): os dados reais são da loja da mãe. Nunca grave nada no servidor real para testar.
1. Abre sem erros no console nem violação de CSP; `manifest.json` e `sw.js` carregam.
2. iPhone (390×844): nada vazando para os lados, barra inferior visível, formulários cabem na tela.
3. Hoje: trocar de dia pelas setas; "Fechar o dia" abre as opções: "Fechar com os itens já lançados" (só aparece se o dia tiver lançamentos), tirar foto, galeria (escolher imagem → revisar → salvar) e digitar sem foto. Ao fechar: chuva de pétalas e "Dia fechado".
4. Entrada/Saída pelo teclado próprio; tocar num lançamento abre a edição.
5. Encomendas: nova, marcar pronta/entregue, lançar sinal. Contas: nova, pagar (conta mensal cria a do mês seguinte), desfazer.
6. Relatórios: trocar mês/ano, tocar num mês do gráfico, buscar, tabela.
7. Computador (1440×900): menu lateral e formulários em gaveta à direita.
