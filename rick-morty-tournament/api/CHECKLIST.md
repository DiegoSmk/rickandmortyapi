# Checklist — API Propria

## Direcao inicial

- [ ] Definir como regra que a API propria comeca replicando apenas os campos da API publica
- [ ] Congelar o escopo inicial para evitar adicionar campos do jogo cedo demais
- [ ] Separar claramente `dados canonicos importados` de `dados enriquecidos por IA`

## Campos iniciais da API propria

- [ ] Mapear todos os campos atuais da API publica de personagens
- [ ] Mapear todos os campos atuais da API publica de episodios
- [ ] Mapear todos os campos atuais da API publica de localizacoes
- [ ] Documentar quais campos serao persistidos sem alteracao
- [ ] Documentar quais campos serao normalizados internamente

## Modelo de dados

- [ ] Criar checklist do schema `Character`
- [ ] Criar checklist do schema `Episode`
- [ ] Criar checklist do schema `Location`
- [ ] Definir relacoes entre personagens, episodios e localizacoes
- [ ] Definir campos tecnicos de sync: `source_id`, `source_url`, `last_synced_at`, `source_hash`
- [ ] Definir campos tecnicos de enriquecimento: `ai_status`, `ai_model`, `ai_version`, `ai_updated_at`
- [x] Definir schema central do banco para as entidades nucleares
- [x] Definir tratamento de dimensao de origem quando conhecida
- [x] Definir schema relacional final da fase 1

## Atributos do jogo

- [x] Definir conjunto tematico inicial de atributos do jogo
- [x] Aprovar nomes: `caos`, `sobrevivencia`, `instabilidade`, `genialidade`, `influencia`, `vitalidade`
- [ ] Definir faixa numerica oficial de cada atributo
- [x] Definir que os atributos nao serao calculados por formula simplista
- [x] Definir que a IA decide os atributos com base no que o personagem demonstrou na serie
- [ ] Definir como `vitalidade` se converte em HP efetivo no combate
- [ ] Definir o perfil consolidado que sera enviado para a IA
- [x] Definir o perfil consolidado de entrada da IA
- [x] Definir formato de justificativa por atributo
- [x] Definir score de confianca por personagem

## Traits, fraquezas e habilidades

- [x] Definir que a IA escolhe de uma biblioteca fechada
- [x] Definir biblioteca inicial de fase 1
- [x] Definir traits positivos iniciais
- [x] Definir fraquezas iniciais
- [x] Definir habilidades programaveis iniciais
- [ ] Definir limite oficial de habilidades por personagem
- [ ] Definir limite oficial de traits por personagem
- [ ] Definir payload final aceito para cada habilidade

## Importacao da API publica

- [ ] Definir bootstrap completo da API publica
- [ ] Definir estrategia de paginacao
- [ ] Definir estrategia de idempotencia
- [ ] Definir estrategia de reimportacao segura
- [ ] Definir estrategia para personagens removidos ou alterados
- [ ] Definir logs e auditoria da importacao
- [x] Definir que sync deve passar por resolucao de identidade antes da consolidacao
- [x] Definir fluxo operacional da fase 1

## Identidade e variantes

- [x] Definir que `nome` nao e chave de identidade
- [x] Definir camadas `source entity`, `canonical entity` e `variant family`
- [x] Definir tratamento especial para variantes de Rick e Morty
- [ ] Definir schema final de `variant_family`
- [ ] Definir schema final de `character_alias`
- [ ] Definir regras oficiais de revisao manual para matching ambiguo
- [x] Definir papel da dimensao no matching de variantes
- [x] Definir thresholds objetivos de matching

## Atualizacao automatica

- [ ] Definir job de sincronizacao periodica
- [ ] Definir job manual sob demanda
- [ ] Definir criterio para detectar novos registros
- [ ] Definir criterio para detectar registros alterados
- [ ] Definir politica para conflitos entre dados antigos e novos
- [x] Definir politica multi-fonte de reconciliacao
- [x] Definir decisoes `update_existing`, `create_new`, `attach_source_only`, `conflict_pending_review`

## Enriquecimento com IA

- [ ] Definir quais lacunas a IA pode preencher
- [ ] Definir quais campos a IA nunca pode sobrescrever
- [ ] Definir prompts estruturados
- [x] Definir schema estrito de saida
- [ ] Definir validacao da resposta da IA
- [ ] Definir politica de retry
- [ ] Definir politica de versionamento do enriquecimento
- [ ] Definir politica de reprocessamento quando o prompt mudar
- [ ] Definir prompt de atribuicao dos atributos do jogo
- [ ] Definir evidencias minimas para atribuicao confiavel
- [x] Definir payload oficial de personagem avaliado pela IA

## Fontes futuras alem da API publica

- [x] Definir se TheTVDB sera usado como fonte complementar
- [x] Definir se TMDb sera usado como fonte complementar
- [x] Definir se Fandom sera usado como fonte complementar
- [x] Definir prioridade entre fontes
- [x] Definir reconciliacao entre fontes

## Contrato HTTP

- [ ] Definir endpoints minimos de leitura
- [ ] Definir endpoints administrativos de sync
- [ ] Definir endpoints administrativos de enriquecimento IA
- [ ] Definir formato padrao de erro
- [ ] Definir versionamento `/v1`

## Persistencia e infraestrutura

- [ ] Confirmar uso inicial de SQLite
- [ ] Definir local do arquivo de banco
- [ ] Definir migrations
- [ ] Definir volume Docker para persistencia
- [ ] Definir variaveis de ambiente

## Operacao

- [ ] Definir healthcheck
- [ ] Definir logs estruturados
- [ ] Definir auditoria de sync
- [ ] Definir auditoria de enriquecimento
- [ ] Definir backup do banco

## Antes de implementar

- [ ] Revisar se o escopo inicial continua fiel ao plano: primeiro espelhar a API publica
- [ ] Revisar se a IA esta tratada como complemento, nao como fonte canonica
- [ ] Revisar se os endpoints iniciais nao carregam regras do jogo prematuramente
