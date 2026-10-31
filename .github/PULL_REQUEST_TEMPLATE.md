<!--
  PREENCHIMENTO OBRIGATÓRIO
  PR que chegar com este template apagado, em branco ou sem issue vinculada
  não entra na fila de review — vai ser devolvido sem análise.
  Se algum item não se aplica, escreva "não se aplica" e o porquê. Não apague a seção.
-->

## Issue relacionada

<!-- Obrigatório. Use "Closes #123" pra fechar a issue automaticamente no merge.
     Se a demanda só existe no GitLab da AGES, cole o link/ID do card. -->

Closes #

## O que foi feito

<!-- 2 a 5 bullets do que muda, em linguagem de quem vai revisar.
     Explique o "porquê" quando a solução não for óbvia. -->

-

## Tipo de mudança

<!-- Marque um. Deve bater com o prefixo da branch (feature/ | fix/ | chore/). -->

- [ ] `feature` — algo novo que o sistema não fazia antes
- [ ] `fix` — correção de comportamento que já existia e estava errado
- [ ] `chore` — não muda comportamento pra quem usa: config, deps, CI/CD, docs, formatação

## Evidência visual

<!-- Obrigatório quando o PR muda qualquer coisa de UI: print, GIF ou vídeo do que mudou.
     Se a mudança altera uma UI que já existia, mostre antes e depois.
     Se o PR não toca em UI, escreva "não altera UI". -->

## Como testar

<!-- Passo a passo pra quem revisa reproduzir na máquina dele.
     Rota, dados de entrada e o que deve acontecer. -->

1.

## Checklist

- [ ] Branch criada a partir de `develop` e nomeada como `<tipo>/<descrição-em-kebab-case>`
- [ ] `npm run lint` passa
- [ ] `npm run format:check` passa
- [ ] `npm run test` passa
- [ ] `npm run build` passa
- [ ] Revisei meu próprio diff (sem `console.log`, código comentado ou arquivo solto)
- [ ] Issue vinculada acima e evidência visual anexada (ou justificado que não se aplica)

## Observações pro time

<!-- Opcional: decisão que ficou em aberto, dívida técnica assumida,
     algo que precisa de atenção especial na review. Pode apagar se não tiver. -->
