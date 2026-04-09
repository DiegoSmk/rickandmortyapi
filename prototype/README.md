# Protótipo — Rick & Morty Torneio Dimensional

## Como Executar

Abra o arquivo `index.html` em qualquer navegador:

```
prototype/index.html
```

## Funcionalidades Implementadas

- ✅ Busca 16 personagens da Rick & Morty API
- ✅ Gera atributs (ATK, DEF, HP) baseados em episódios
- ✅ Gera deck de 4 cartas por perfil (Rick/Morty/Alien/Caos/Default)
- ✅ Chaveamento aleatório (Quartas → Semi → Final)
- ✅ Sistema de apostas em Flurbos
- ✅ Sistema de trapaças (Gimmicks)
- ✅ Batalha por turnos (Atacar / Jogar Carta / Passar)
- ✅ Cooldowns entre turnos
- ✅ Persistência de estado (localStorage)
- ✅ Tela de campeão

## Como Jogar

1. **Iniciar Torneio** — Busca personagens da API
2. **Ver Chaveamento** — Mostra os confrontos
3. **Apostar** — Escolhe um personagem + quantos Flurbos
4. **Combater** — Turnos até HP = 0 ou 8 turnos
5. **Avançar** — Vencedor segue para próxima fase
6. **Campeão** — Ganha o tournaments

## Próximos Passos

- [ ] Implementar mecânicas completas de cartas (Campo, Buff, Dimensional)
- [ ] Animações com Framer Motion
- [ ] UI refinada para mobile
- [ ] Setup Tauri para produção
- [ ] API com enrichment de IA