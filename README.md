# Controle da Casa

Painel pensado para THALES e CÁTIA, com foco em:

- lançamento rápido de gastos
- cálculo automático do mês de cobrança no crédito
- cartões com dia de fechamento e dia de pagamento
- resumo enxuto do mês
- resumo por cartão
- orçamento opcional
- sincronização com Google Sheets

## Como abrir

Abra `index.html` no navegador.

## O que esta versão faz

- cadastra cartões com fechamento e pagamento
- lança compras com responsável, data, valor, categoria, cartão, tipo de pagamento, parcelas e observação
- calcula sozinho em qual mês a compra entra na fatura
- mostra o total do mês, o total de THALES e o total de CÁTIA
- mostra os gastos cobrados no mês selecionado
- mostra um resumo específico de cartões no mês
- acompanha compras parceladas ainda ativas

## Google Sheets

1. Abra a planilha que vai guardar os dados.
2. Entre no Apps Script da planilha.
3. Substitua o conteúdo por `google-apps-script/Code.gs`.
4. Publique ou atualize o Web App.
5. Volte ao painel e use o botão `Sincronizar com Google Sheets`.

## Próxima personalização

Falta só você me passar:

- os cartões com nome, dia de fechamento e dia de pagamento
- a lista final de categorias que quer padronizar

Com isso eu deixo o painel já pronto com os dados reais de vocês.
