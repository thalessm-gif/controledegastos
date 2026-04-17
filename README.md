# Controle de Gastos da Casa

Versão inicial de um painel simples para controlar gastos da casa, com:

- gastos normais do mês
- separação por pessoa
- total consolidado da casa
- compras no cartão parceladas com progresso do que já foi pago
- preparação para sincronizar com Google Sheets

## Como abrir

Abra o arquivo `index.html` no navegador.

## O que essa versão já faz

- mostra resumo mensal
- calcula total por pessoa
- agrupa por categoria
- permite lançar compras parceladas
- acompanha quanto falta pagar em cada compra parcelada
- exporta e importa os dados em JSON

## Como usar o Google Sheets

1. Crie uma planilha nova no Google Sheets.
2. Abra o Apps Script dessa planilha.
3. Cole o conteúdo de `google-apps-script/Code.gs`.
4. Publique como Web App com acesso liberado para quem tiver o link.
5. Copie a URL gerada.
6. No painel, cole essa URL no campo `URL do Apps Script`.
7. Use `Puxar do Google` e `Enviar ao Google`.

## Observação importante

Essa primeira versão usa sincronização simples por merge de dados. Para um casal usando em dois celulares, já funciona bem como ponto de partida. Se vocês curtirem o fluxo, a próxima evolução natural é transformar isso em uma aplicação hospedada com autenticação e sincronização automática em tempo real.
