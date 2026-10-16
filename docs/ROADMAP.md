# GRBL Studio - Roadmap

> **Nota:** o plano canônico de execução agora é o
> [PLANO_DE_ACAO.md](PLANO_DE_ACAO.md); os requisitos estão em
> [PRODUCT_SPEC.md](PRODUCT_SPEC.md). Este arquivo é mantido como resumo
> histórico por versão.

## Estado da implementação (2026-10-16)

**Fase 0 e Fase 1 concluídas** (ver `CHANGELOG.md`):

- [x] Core de comunicação confiável: `SerialTransport` + `GrblClient` com fila
      *send-response* (só envia após `ok`).
- [x] Console exibindo respostas reais da máquina (banner, `ok`, `error:`, `ALARM:`).
- [x] Status GRBL em tempo real (`?`) → badge de estado, DRO de posição, feed/S.
- [x] Comandos de tempo real corretos (`!`, `~`, `0x18`, overrides `0x90–0x94`).
- [x] Jog via `$J=`, Home, Unlock, Reset, Set Origin, Go to zero.
- [x] Pausar / Retomar / Parar durante o job.
- [x] IPC tipado + preload empacotado (`sandbox: true`).
- [x] 29 testes (Vitest) + smoke test headless.

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
- [ ] Persistir última porta conectada
- [ ] Seleção de baud rate (9600/115200/250000)
- [ ] Histórico de comandos no console
- [ ] Status GRBL em tempo real (idle/run/hold/alarm)
- [ ] Indicador de posição atual (X/Y/Z)
- [ ] Velocidade/feed e spindle
- [ ] Melhorar transmissão G-Code (com confirmação `ok`)
- [ ] Scroll automático no console

## v0.3 - Preview & JOG Avançado
- [ ] Preview 2D minimalista (renderizar caminho G-Code)
- [ ] Zero/Set Origin (G92)
- [ ] Unlock/Soft Reset ($X, Ctrl+X)
- [ ] Homing ($H) com feedback
- [ ] Distâncias JOG customizáveis (0.01/0.1/1/5/10/50)
- [ ] Teclas de atalho (setas, home, page up/down)
- [ ] Mover para posição clicada (se preview)

## v0.4 - Configurações
- [ ] Janela de configurações
- [ ] Grbl Settings ($$) viewer/editor
- [ ] Preferências salvas (localStorage/electron-store)
- [ ] Temas claro/escuro
- [ ] Unidades (mm/inch)
- [ ] Auto scroll console toggle

## v0.5 - Recursos Avançados
- [ ] Laser mode / Spindle
- [ ] Probe (sonda)
- [ ] Job resume
- [ ] Macros personalizáveis
- [ ] Camera overlay (futuro)
- [ ] Gerador de formas simples (retângulo/círculo/texto) - opcional

## Próximos passos imediatos
1. Implementar leitura de status GRBL via `?` (polling)
2. Mostrar posição X/Y/Z atual
3. Implementar queue handling (grbl serial buffer)
4. Adicionar leitura de `ok`/`error` para transmissão confiável
5. Persistir configurações
