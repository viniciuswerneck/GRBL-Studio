# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added — Fase 1: core de comunicação confiável
- Módulo de protocolo puro `src/shared/protocol.ts`: parse de status report,
  classificação de linhas (`ok`/`error`/`ALARM`/`[MSG]`/settings), tabelas de
  alarmes e erros do GRBL 1.1, split de linhas e formatação de posição.
- `GrblClient` (`src/main/services/GrblClient.ts`) com **fila send-response**
  (só envia a próxima linha após `ok`), polling de status, watchdog de resposta,
  overrides e comandos de controle.
- `SerialTransport` (`src/main/services/SerialTransport.ts`) com line framing
  e escrita de comandos de tempo real (byte único, sem `\n`).
- Camada **IPC tipada** (`src/shared/channels.ts`, `src/main/ipc.ts`) e preload
  como `contextBridge` (`window.grbl`), empacotado com esbuild e mantendo
  `sandbox: true`.
- Renderer reescrito usando `window.grbl`: console com respostas reais da máquina,
  DRO de posição, badge de estado, progresso do job, jog via `$J=`, pausar/retomar/
  parar corretos.
- Design tokens Fluent/Windows 11 (`public/tokens.css`) e estilos base.
- Suíte de testes (Vitest): 29 testes — parser de protocolo, fila do `GrblClient`
  (transporte falso) e integração real de `SerialTransport` via PTY (socat).
- Modo smoke test headless (`GRBL_SMOKE_TEST=1`) para CI.
- Documentação: `PRODUCT_SPEC`, `PLANO_DE_ACAO`, `DESIGN`, `ARCHITECTURE`,
  índice `docs/README.md` e kit de IA (`AGENTS.md` + skills).

### Fixed
- Nenhum dado serial chegava ao renderer (B1): agora o console exibe as respostas.
- Envio de G-code era *fire-and-forget* (B2): agora é send-response com `ok` (B2).
- Comando de Feed Hold enviado com `\n` (B3): agora é o byte `!` puro.
- Jog enviava 3 comandos em uma linha (B4): agora usa `$J=`.

### Removed
- `src/main-serial.ts.bak` e o código legado em `src/main.ts`, `src/main-serial.ts`,
  `src/preload.js` (substituídos pela nova arquitetura).
