# Compute-lab

Jogo educacional de navegador: você é o computador. Cada fase mostra um pseudocódigo pronto e você o executa
num laboratório de redstone. Andar, acionar e esperar são suas ações; condições, laços e variáveis são calculados
pelo interpretador, e cada ação sua é validada contra a instrução que está sendo executada.

40 fases em 8 mundos: sequência → REPITA → SE/SENÃO → portas lógicas → variáveis → ENQUANTO → ticks
(repetidores, botões, relógios, pistões) → o Núcleo da Redstone.

## Controles

| Tecla | Ação |
| --- | --- |
| Setas | `andar(direção)` (seta na direção de uma alavanca vizinha apenas vira o robô) |
| E | `acionar(dispositivo)` |
| Espaço | `esperar()` |
| R | reiniciar a fase |
| U | voltar ao passo anterior após um erro (modo educativo) |
| H | mostrar/ocultar a dica |

No tablet há botões na tela. O modo **Desafio** liga o cronômetro, guarda o melhor tempo e exige recomeçar após um erro.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local
npm test         # testes do motor e das 40 fases
npm run build    # gera dist/
```

## Estrutura

- `src/engine/`: motor independente da renderização
  - `parser.ts`: pseudocódigo → AST (`SE/SENÃO SE/SENÃO`, `REPITA`, `ENQUANTO`, `E/OU/NÃO`, `MOD`, atribuições `←`)
  - `interpreter.ts`: execução passo a passo com pilha de frames, validação das ações e rastro
  - `world.ts`: grade, movimento e simulação de redstone em ticks discretos
- `src/levels/`: as 40 fases como dados (mapa, dispositivos, programa, objetivo, dica, explicação)
- `src/render/`: canvas com texturas pixeladas geradas proceduralmente e um tema por mundo
- `src/ui/`: React + Tailwind (menu, painel de código, variáveis, pilha de laços, controles)
- `tests/`: o teste de cada fase executa o próprio programa até a vitória e confere que qualquer ação
  diferente da esperada é rejeitada em todos os passos

### Modelo de tempo

Cada ação física dura 1 tick; instruções automáticas não consomem ticks.
Botão apertado no tick *p* fica ativo de *p* até *p + duração − 1*. Repetidor: `saída(t) = entrada(t − atraso)`.
Relógio: ativo quando `(tick + fase) mod período < ligado`. Pistões não estendem sobre o jogador.

## Publicação

`.github/workflows/deploy.yml` testa, compila e publica no GitHub Pages a cada push em `main`.
No repositório, em *Settings → Pages*, selecione **GitHub Actions** como fonte. O `base: './'` do Vite faz o
site funcionar em qualquer caminho (`usuario.github.io/<repo>/`).
