# GRBL Studio - Roadmap

> **Nota:** o plano canônico de execução agora é o
> [PLANO_DE_ACAO.md](PLANO_DE_ACAO.md) — veja a **§1.1 Status de execução** para
> o estado atual e o que falta; os requisitos estão em
> [PRODUCT_SPEC.md](PRODUCT_SPEC.md). Este arquivo é mantido como resumo
> histórico por versão.

## Estado da implementação (2026-10-17)

**Fases 0–6 concluídas**; **Fase 7 (polish) e Fase 8 (qualidade) parciais** —
detalhe e pendências em `PLANO_DE_ACAO.md` §1.1 e no `PRODUCT_SPEC.md` §6
(ver `CHANGELOG.md`):

- [x] Core de comunicação confiável: `SerialTransport` + `GrblClient` com fila
      *send-response* (só envia após `ok`).
- [x] Console exibindo respostas reais da máquina (banner, `ok`, `error:`, `ALARM:`).
- [x] Status GRBL em tempo real (`?`) → badge de estado, DRO de posição, feed/S.
- [x] Comandos de tempo real corretos (`!`, `~`, `0x18`, overrides `0x90–0x94`).
- [x] Jog via `$J=`, Home, Unlock, Reset, Set Origin, Go to zero.
- [x] Pausar / Retomar / Parar durante o job.
- [x] IPC tipado + preload empacotado (`sandbox: true`).
- [x] 29 testes (Vitest) + smoke test headless.

**Versões 0.3.0/0.4.0** acrescentaram catálogo de máquinas, Modo Básico
(wizard), perfis de material 3W e — na Fase 7 — **11 temas** (RF-APP-1),
**i18n pt-BR/en/es** (RF-APP-2), barra inferior e menu **Ajuda → Sobre**
(RF-APP-6/7). Ver `CHANGELOG.md`.

## Objetivo
Criar uma alternativa moderna para LaserGRBL, focada em Linux. Interface moderna e intuitiva, mantendo o core de controle GRBL funcional.

## MVP (Atual)
- [x] Estrutura Electron + TypeScript
- [x] Lista de portas seriais
- [x] Conexão/desconexão (115200)
- [x] Console de comandos GRBL
- [x] JOG (X+/X-/Y+/Y-/Home) com passo configurável
- [x] Carregamento e envio de arquivo G-Code
- [x] Botão parar

## v0.2 - Melhoria UX
- [x] Persistir última porta conectada
- [x] Seleção de baud rate (9600/115200/250000)
- [x] Histórico de comandos no console
- [x] Status GRBL em tempo real (idle/run/hold/alarm)
- [x] Indicador de posição atual (X/Y/Z)
- [x] Velocidade/feed e spindle
- [x] Melhorar transmissão G-Code (com confirmação `ok`)
- [x] Scroll automático no console *(toggle pausar/limpar pendente — RF-CON-14)*

## v0.3 - Preview & JOG Avançado
- [x] Preview 2D minimalista (renderizar caminho G-Code)
- [x] Zero/Set Origin (G92)
- [x] Unlock/Soft Reset ($X, Ctrl+X)
- [x] Homing ($H) com feedback
- [x] Distâncias JOG customizáveis (0.01/0.1/1/5/10/50)
- [ ] Teclas de atalho (setas, home, page up/down) *(RF-JOG-6, pendente)*
- [ ] Mover para posição clicada (se preview) *(pendente)*

## v0.4 - Configurações
- [x] Janela de configurações
- [x] Grbl Settings ($$) viewer/editor
- [x] Preferências salvas (`PrefsStore` → `prefs.json`)
- [x] Temas claro/escuro (hoje: 11 temas — ver `DESIGN.md` §2.3)
- [x] Unidades (mm/inch)
- [ ] Auto scroll console toggle *(pausar/limpar — RF-CON-14, pendente)*

## v0.5 - Recursos Avançados
- [x] Laser mode / Spindle (M3/M4)
- [ ] Probe (sonda) *(fora de escopo)*
- [x] Job resume
- [x] Macros personalizáveis
- [ ] Camera overlay *(fora de escopo / futuro)*
- [ ] Gerador de formas simples (retângulo/círculo/texto) *(opcional)*

## Próximos passos imediatos

Ver `PLANO_DE_ACAO.md` §1.1. Resumo:
1. Fechar a **Fase 7**: RNF-9 (log persistente de sessão), revisão de
   acessibilidade/polish e checklist visual (`DESIGN.md` §8).
2. Automação de release no GitHub (tag + artefatos); Flatpak (Could).
3. **Fase 8**: cobertura do protocolo > 80 %, E2E Playwright, testes em hardware.
4. Pendências pontuais: RF-STA-5 (bloquear em alarme), RF-JOG-2/6, tempo
   estimado/restante (RF-GC-2/5), RF-CON-14/15.
