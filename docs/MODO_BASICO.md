# Modo Básico — Wizard para leigos

> Requisitos: RF-BASIC-1 (fluxo guiado), §15 de `PLANO_DE_ACAO.md`.
> Público: usuário que nunca usou uma gravadora laser.

O **Modo Básico** transforma o GRBL Studio num assistente de 6 passos.
O modal do wizard **bloqueia a tela inteira** (`position: fixed`, `z-index: 90`):
não existe "errar" clicando em controle técnico — só o passo atual é visível e
interagível. O modo Avançado permanece intacto.

## Como entrar e sair

| Ação | Onde |
| :--- | :--- |
| Ativar o Modo Básico | botão **“Avançado”** no cabeçalho da barra lateral (vira **“Básico”**) |
| Sair pelo rodapé do wizard | botão **“Fechar (Modo Avançado)”** |
| Sair ao concluir | botão **“Concluir”** no passo 6 |

A escolha é persistida (`prefs.mode`); ao reabrir o app, o modo é restaurado e o
wizard volta para o **passo 1**.

## Os 6 passos

O título sempre mostra `Passo N de 6 — <assunto>` e o rodapé tem **Voltar** /
**Próximo**. O **Próximo** só habilita quando o passo foi cumprido.

| Passo | Título | O que aparece | “Próximo” habilita quando |
| :--- | :--- | :--- | :--- |
| 1 | Conectar | bolinha de status + botão **Conectar** | máquina conectada |
| 2 | Escolher imagem | botão **Escolher imagem** + nome do arquivo | imagem carregada |
| 3 | Tamanho, tipo e material | largura/altura (mm, proporção travada), cartões **Foto / P&B / Contorno**, seletor de material | sempre (há padrões) |
| 4 | Gerar G-code | botão **Gerar G-code** + progresso | G-code gerado |
| 5 | Posicionar | botão **Posicionar** (abre o modal de enquadramento: joystick + contorno fraco S=5) | sempre |
| 6 | Gravar | botão **Gravar** | sempre — vira **Concluir** |

### Detalhes de cada passo

- **Passo 1 — Conectar.** Reabastece a lista de portas USB (`refreshPorts`) e
  dispara o mesmo botão *Conectar* do modo Avançado. A bolinha acompanha o
  estado: cinza (desconectado), pulsando (conectando), verde (conectado),
  vermelha (erro).
- **Passo 2 — Escolher imagem.** Abre o seletor de arquivo (PNG/JPG/BMP). O
  preview e o pipeline de conversão continuam rodando em `<canvas>` atrás do
  modal, então o passo 3 já mostra o resultado.
- **Passo 3 — Tamanho, tipo e material.** Os campos são *espelhos* dos controles
  do modo Avançado (`imgWidth`, `imgHeight`, `imgAlgorithm`, perfis de material):
  mexer aqui muda o mesmo estado, então o G-code gerado é idêntico ao que o
  usuário avançado veria. A lista de materiais vem do módulo selecionado
  (3W = Sculpfun C1, 5W, 10W — `src/shared/materials.ts`) e aplica
  velocidade, potência (`S`) e 1 passada.
- **Passo 4 — Gerar G-code.** Dispara a geração completa (mesmo botão do modo
  Avançado) e só então libera o avanço. Recomenda-se conferir o preview.
- **Passo 5 — Posicionar.** Abre o modal de enquadramento: joystick, **Definir
  origem aqui** e **contorno fraco (S=5)**, que desenha o limite da peça sem
  queimar a superfície.
- **Passo 6 — Gravar.** Se o modal de enquadramento estiver aberto, dispara o
  contorno; caso contrário, inicia a gravação (`beginJob`). O modal do wizard
  sai do caminho durante o job e reaparece ao final.

## O que fica escondido no Básico

Sliders de ajuste fino, parâmetros de conversão (linhas/mm, direção, ponto de
origem, suavização), overrides em tempo real, editor de `$$`, macros, retomada
avançada e as abas laterais — tudo continua disponível no modo Avançado, e nada
é perdido ao trocar de modo.

## Arquivos

- `public/index.html` — estrutura do wizard (`.basic-guide` / `.wizard-card` /
  `.wizard-step`).
- `public/renderer.js` — `updateWizard()` (título, painel do passo, status,
  habilitação do Próximo) e os handlers `guide*`.
- `public/style.css` — `body.basic .basic-guide` (overlay) e `.wizard-card`.
- `src/shared/materials.ts` — perfis 3W/5W/10W usados no passo 3.
