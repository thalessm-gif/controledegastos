# Controle de Gastos da Casa

Versão inicial de um painel simples para controlar gastos da casa, com:

- gastos normais do mês
- separação por pessoa
- total consolidado da casa
- compras no cartão parceladas com progresso do que já foi pago
- preparação para sincronizar com Google Sheets
- edição de gastos e parcelados
- filtros por pessoa, categoria, tipo e cartao
- fechamento mensal com trava logica do mes fechado

## Como abrir

Abra o arquivo `index.html` no navegador.

Nesta cópia do projeto, a URL do seu Apps Script já ficou configurada por padrão.

## O que essa versão já faz

- mostra resumo mensal
- calcula total por pessoa
- agrupa por categoria
- permite lançar compras parceladas
- acompanha quanto falta pagar em cada compra parcelada
- permite editar gastos e compras parceladas
- filtra a visao mensal por pessoa, categoria, cartao, tipo e status
- permite fechar e reabrir o mes selecionado
- exporta e importa os dados em JSON

## Como usar o Google Sheets

1. Crie uma planilha nova no Google Sheets.
2. Abra o Apps Script dessa planilha.
3. Cole o conteúdo atualizado de `google-apps-script/Code.gs`.
4. Atualize a implantacao do Web App com acesso liberado para quem tiver o link.
5. Copie a URL gerada.
6. No painel, confirme a URL no campo `URL do Apps Script`.
7. Use `Puxar do Google` e `Enviar ao Google`.

## Observação importante

Essa primeira versão usa sincronização simples por merge de dados. Para um casal usando em dois celulares, já funciona bem como ponto de partida. Se vocês curtirem o fluxo, a próxima evolução natural é transformar isso em uma aplicação hospedada com autenticação e sincronização automática em tempo real.

## Importante nesta etapa

Como agora existem campos novos, como `cardName` em gastos normais e `monthClosures` para fechamento mensal, vale atualizar o Apps Script antes de sincronizar de novo com o Google Sheets.
