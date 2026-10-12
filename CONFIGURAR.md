# Como ligar o caixa de verdade

Enquanto o endereço do servidor não estiver configurado, o app roda em **modo demonstração**: dados de exemplo guardados só no navegador. Para começar a usar de verdade, siga os passos abaixo. Leva uns 20 minutos e é tudo gratuito.

O que você vai criar:

- uma **planilha no Google Drive**, onde ficam todos os dados (uma aba para cada coisa: lançamentos, encomendas, contas, fornecedores...);
- um **Apps Script** ligado a essa planilha, que é o "servidor" do app;
- uma **chave do Gemini**, para ler a foto do caderno;
- um **bot no Telegram**, para os lembretes.

> Crie a planilha na conta Google que vai ser a dona dos dados (a da floricultura ou a da sua mãe). As fotos do caderno ficam no Drive dessa mesma conta.

## 1. Planilha e Apps Script

1. Em [sheets.new](https://sheets.new), crie uma planilha e dê o nome **Ternura Flores · Caixa**.
2. Abra **Extensões › Apps Script**.
3. Apague o que estiver no arquivo `Código.gs`, cole todo o conteúdo de [`apps-script/Codigo.gs`](apps-script/Codigo.gs) e salve (ícone de disquete).
4. Em **Configurações do projeto** (engrenagem à esquerda), confira se o **fuso horário** é `(GMT-03:00) Horário de Brasília`.

## 2. Chave do Gemini (ler a foto do caderno)

1. Entre em [aistudio.google.com/apikey](https://aistudio.google.com/apikey) e clique em **Criar chave de API**.
2. Copie a chave (começa com `AIza...`).

> No plano gratuito, o Google pode usar as fotos enviadas para melhorar os modelos dele. Se isso incomodar, dá para ativar o faturamento na mesma tela (custa centavos por foto) e o Google deixa de usar os dados.

## 3. Bot do Telegram (lembretes)

1. No Telegram, abra uma conversa com **@BotFather** e mande `/newbot`.
2. Escolha um nome (ex.: `Ternura Flores Lembretes`) e um usuário terminado em `bot` (ex.: `ternuraflores_bot`).
3. Copie o **token** que ele devolve (algo como `123456789:AAH...`).

## 4. Propriedades do script

No Apps Script, em **Configurações do projeto › Propriedades do script › Adicionar propriedade**, crie:

| Propriedade | Valor |
|---|---|
| `CODIGO_ACESSO` | O código que a família vai digitar uma vez em cada aparelho. **Só letras e números**, sem espaço (ex.: `ternura2026`). |
| `GEMINI_API_KEY` | A chave do passo 2 |
| `TELEGRAM_TOKEN` | O token do passo 3 |

Salve.

## 5. Rodar a configuração

1. Volte ao editor (`<>` à esquerda), escolha a função **`configurar`** na barra de cima e clique em **Executar**.
2. O Google pede autorização. Escolha a conta, clique em **Avançado › Acessar Ternura Flores (não seguro)** e permita. O aviso aparece porque o script é seu e não passou pela verificação do Google, o que é normal.
3. No registro de execução deve aparecer **Pronto!** e o status de cada item. A planilha ganha as abas e as categorias iniciais.

O passo 5 também cria o gatilho que manda os lembretes **todo dia às 8h**.

## 6. Publicar o servidor

1. Clique em **Implantar › Nova implantação**.
2. Na engrenagem de "Selecionar tipo", escolha **App da Web**.
3. **Executar como:** Eu. **Quem pode acessar:** Qualquer pessoa.
4. Clique em **Implantar** e copie o **URL do app da Web** (termina em `/exec`).

"Qualquer pessoa" é necessário para o app conseguir falar com o servidor. Quem não tiver o código de acesso não consegue ler nem gravar nada, e o servidor bloqueia por 15 minutos depois de 15 tentativas erradas.

## 7. Ligar o app ao servidor

Cole o endereço em [`app/src/lib/config.js`](app/src/lib/config.js):

```js
export const URL_SERVIDOR = 'https://script.google.com/macros/s/AKfy.../exec'
```

Depois gere o build e publique:

```sh
cd app && npm install && npm run build
cd .. && git add -A && git commit -m "Ligar o app ao servidor" && git push
```

Em 1 ou 2 minutos o site atualiza em <https://nossoprojeto3d.github.io/caixa-floricultura/>. O modo demonstração continua disponível em `.../caixa-floricultura/?demo`.

## 8. Em cada celular (mãe e irmão)

1. Abra o site, digite o código de acesso e instale o app na tela de início (o passo a passo também está em **Mais › Instalar no celular**).
2. Em **Mais › Lembretes no Telegram**, toque em **Conectar o Telegram deste celular**. O Telegram abre no bot: toque em **Começar**.
3. Volte ao app e toque em **Mandar mensagem de teste**. A mensagem deve chegar no Telegram.

Só recebe lembretes quem entrar no bot por esse botão, porque o link leva o código de acesso. Quem achar o bot por acaso não recebe nada.

## Quando mudar o código do servidor

Depois de colar uma versão nova do `Codigo.gs`, vá em **Implantar › Gerenciar implantações**, clique no lápis, escolha **Nova versão** e implante. O endereço `/exec` continua o mesmo.

Se mudar as colunas de alguma tabela, mude nos dois lugares: `TABELAS` no `Codigo.gs` e em `app/src/lib/dados.js`.

## Teste de velocidade (opcional)

Para saber quanto a planilha aguenta na sua conta: no editor do Apps Script, escolha a função **`testeDeVelocidade`** e clique em **Executar**. Ela cria uma planilha temporária e separada (a de verdade não é tocada), enche com 2 e com 5 anos de movimento no volume da loja, mede o tempo de leitura e de gravação e manda a temporária para a lixeira. O resultado aparece no registro de execução. Leva de 1 a 3 minutos.
