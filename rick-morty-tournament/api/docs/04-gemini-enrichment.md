# Especificacao de Enriquecimento com Gemini

## Objetivo

Usar Gemini para preencher ou complementar dados ausentes ou nao estruturados, sem comprometer a integridade canonica do catalogo.

## Principios

- Gemini complementa, nao substitui, a fonte publica
- todo campo vindo de IA deve ser rastreavel
- a saida deve obedecer schema fechado
- resultados devem ser reprocessaveis

## Casos de uso

- gerar resumo curto do personagem
- inferir estilo de combate
- gerar tags de personalidade
- sugerir notas de poder
- gerar observacoes uteis para o jogo
- atribuir os atributos do jogo com base no que o personagem demonstrou na serie

## Campos permitidos para IA

- `short_lore`
- `combat_style`
- `personality_tags`
- `power_notes`
- `danger_rating`
- `caos`
- `sobrevivencia`
- `instabilidade`
- `genialidade`
- `influencia`
- `vitalidade`
- `attributes_reasoning`
- `attributes_confidence`

## Campos proibidos para IA

- `source_id`
- `name`
- `species`
- `status`
- `episode_count`
- `origin`
- `location`
- `image_url`

## Pipeline proposto

1. selecionar personagens pendentes de enriquecimento
2. montar contexto com dados canonicos e evidencias de serie
3. enviar prompt estruturado ao Gemini
4. validar resposta contra schema
5. persistir campos enriquecidos
6. registrar `EnrichmentRun`

## Estrategia de prompt

Entradas:

- dados canonicos do personagem
- contagem de episodios
- episodios principais opcionais
- evidencias narrativas e feats quando disponiveis
- instrucoes de formato estrito

Saida exigida:

- JSON puro
- sem markdown
- sem texto fora do schema

Saida deve incluir:

- atributos do jogo
- justificativa curta por atributo
- score de confianca

## Controle de qualidade

- limite de tamanho por campo
- enum ou faixas controladas onde possivel
- rejeicao de resposta invalida
- reprocessamento com retry limitado
- rejeicao de score fora da faixa aprovada
- rejeicao de justificativas vazias para atributos

## Versionamento

Todo enriquecimento deve registrar:

- modelo usado
- versao do prompt
- versao do schema de resposta
- timestamp

## Seguranca operacional

- API key via variavel de ambiente
- sem logar segredos
- sem enviar campos desnecessarios
- opcao de desligar enriquecimento por ambiente

## Endpoints administrativos planejados

- `POST /admin/enrichment/run`
- `POST /admin/enrichment/character/:id`
- `GET /admin/enrichment/runs`
- `GET /admin/enrichment/runs/:id`

## Riscos

- alucinacao
- inconsistencias entre rodadas
- custo por volume
- latencia

## Mitigacoes

- schema estrito
- campos IA claramente separados
- revisao manual futura em casos criticos
- cache e reprocessamento sob demanda
- registro de justificativa e confianca para cada score atribuido
