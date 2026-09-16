# Testes da lógica de domínio

## Alterações
- Criar uma suíte hermética para as funções puras de `anime-storage`, com helpers mínimos de anime e temporada.
- Cobrir duração, tempo assistido, tiers, médias, gêneros, premiações e rótulos de datas nos casos especificados.
- Isolar o cliente de dados com mock para impedir dependência de ambiente ou rede.
- Adicionar o script `typecheck` e incluir a configuração do Vitest na verificação TypeScript.

## Validação
- Executar `npm run typecheck`.
- Executar `npm run test`, mantendo o teste de avatar inalterado.

## Escopo
- Nenhuma função de produção ou comportamento visual será alterado.
