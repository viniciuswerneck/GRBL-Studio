# Handoff — retomada do trabalho (desenho → G-code)

**Data:** 2026-10-18
**Branch:** `main`
**Estado:** código pronto, testado e commitado. App rodando na sessão Wayland.

---

## 1. O que foi resolvido nesta sessão

Queixa do usuário: ao gerar o G-code de um desenho (2 × 2 no meio de uma
página 10 × 10), o preview mostrava uma **diagonal** que parecia ser gravada, e
o desenho "gerava o 10 × 10". Depois, o pedido ficou explícito:

> "por questões de alinhamento de onde vou gravar, coloco o objeto, posiciono o
> laser e ele não pode deslocar" / "começa a gravar em X0 Y0, sem deslocar a
> gravadora".

### Correções aplicadas

1. **Arte ancorada na origem (o principal)** — `src/shared/design.ts`
   O G-code era emitido em **coordenadas absolutas da prancheta** (um 2 × 2 no
   meio de uma página 10 × 10 saía em `X4/Y4`), então a máquina saía andando em
   diagonal até o desenho antes de queimar. Agora o **canto inferior esquerdo do
   desenho vira `X0 Y0`**:
   - `machineX = pageX − minX`
   - `machineY = maxY − pageY` (de pé, sem espelhar)
   A posição do objeto na prancheta não desloca mais o job. O usuário posiciona
   o laser no material, **define a origem ali** (`G10 L20`/`G92`) e o job começa
   sob o cabeçote.
2. **Início pelo canto mais próximo** — `src/shared/design.ts`
   Cada contorno começa no ponto mais próximo do cabeçote (contorno anterior
   termina onde o próximo começa); formas abertas podem inverter o sentido.
   Assim o primeiro `G0` aponta para o próprio `X0 Y0` (zero deslocamento).
3. **Preview pintava o `G0` como queima** — `public/renderer.js`
   `drawGcodePreview` lia `prog.burns` (campo inexistente) e caía em `moves`,
   pintando **todos** os `G0` na cor de queima. O `G0 X0 Y0` final herdava o `S`
   do último `M4` e virava uma **diagonal azul viva**. Agora usa só
   `previewProgram.burns`.
4. **Legenda do preview** — `public/index.html` + `public/style.css` + i18n
   A caixa tracejada da área de trabalho ($130/$131) ganhou a entrada
   **"Área de trabalho"** (pt/en/es) para não ser confundida com o job.
5. **Rodapé do editor** — i18n (`design.status.hint`): avisa que a gravação
   começa em X0 Y0 e que se deve posicionar o laser e definir a origem.

### G-code resultante (2 × 2 no meio de uma página 10 × 10)

```
G21
G90
G94
M5
G0 X0.000 Y0.000 F3000   ; zero deslocamento (laser DESLIGADO)
M4 S800
G1 X0.000 Y2.000 F1000
G1 X2.000 Y2.000 F1000
G1 X2.000 Y0.000 F1000
G1 X0.000 Y0.000 F1000   ; fecha o quadrado
M5
M5
G0 X0 Y0
```

---

## 2. Como retomar (após reiniciar o computador)

```bash
cd "/home/vinicius/dev/app/GRBL Studio"
npm install                    # só se node_modules não existir
npm run build                  # OBRIGATÓRIO: regenera dist/ e os bundles public/*.js
npx electron --no-sandbox .    # abre o app
```

> ⚠️ `npm start` **falha nesta máquina** (o `chrome-sandbox` do Electron não está
> com owner/mode `4755`) e aborta com `SIGTRAP`. Use sempre `--no-sandbox`
> (ou `npm run start:dev`, que faz build + abre).

> ⚠️ `public/design.js` e `public/i18n.js` são **gerados e gitignored**. Eles não
> vêm no `git clone`/checkout — por isso o `npm run build` é obrigatório.
> `public/renderer.js` **é fonte** (rastreado) e não precisa ser gerado.

---

## 3. Qualidade (rodado e verde)

- `npm run typecheck` ✅
- `npm test` ✅ **371 testes** (25 arquivos), inclui o novo teste de ancoragem em
  `tests/design.test.ts`
- `npx biome check <arquivos alterados>` ✅
- `npx biome check .` tem **2 erros de formatação pré-existentes**
  (`public/renderer.js` e `public/style.css`) — já estavam no `HEAD`, não são
  deste trabalho.

---

## 4. Teste manual sugerido

1. Abrir **Desenhar**, desenhar um quadrado em qualquer lugar da prancheta.
2. **Gerar e visualizar** → o preview deve mostrar **só o quadrado**, começando
   em X0 Y0, **sem diagonal**.
3. Opcional: **Salvar** o `.gcode` e conferir que começa em `G0 X0 Y0` e que só
   há `G1` do próprio desenho.

---

## 5. Decisões em aberto / próximos passos

- [x] Validar na máquina real: posicionar o laser, **Definir origem** e gravar
      — confirmar que o cabeçote não se desloca antes de queimar.
      *(validado pelo usuário: “funciona bem, acabei de gravar para testar”)*
- [x] Confirmar se a **ancoragem na origem** é o comportamento definitivo.
      *(confirmada na v0.5.1; a alternativa de coordenadas absolutas foi
      descartada — `git log` tem a versão anterior se for preciso)*
- [x] Documentar a decisão de forma permanente em `docs/PRODUCT_SPEC.md`/
      `docs/DESIGN.md` (requisito `RF-DSN-*`), já que hoje o comportamento não
      está especificado. *(feito: módulo **M13 — Editor vetorial** com
      **RF-DSN-9** e nota de ancoragem em `DESIGN.md`)*

---

## 6. Arquivos deste trabalho

- `src/shared/design.ts`
- `public/renderer.js`
- `public/index.html`
- `public/style.css`
- `src/shared/i18n/pt-BR.ts`, `src/shared/i18n/en.ts`, `src/shared/i18n/es.ts`
- `tests/design.test.ts`
- `CHANGELOG.md`

> **Atualização (18/10/2026):** as alterações em `docs/ARCHITECTURE.md`,
> `docs/FEATURES_COMPARISON.md`, `docs/PLANO_PREMIUM.md`, `docs/PRODUCT_SPEC.md`,
> `docs/README.md`, `docs/ROADMAP.md` e o novo `docs/PLANO_QR_BARCODE.md`
> (plano de QR Code / código de barras) foram **commitadas** em
> `docs: planejamento dos geradores de QR Code e código de barras (v0.6)`. A
> ancoragem na origem foi especificada como **RF-DSN-9** (módulo M13) e o
> script `test:e2e` foi restaurado — ver `CHANGELOG.md` (`[Unreleased]`).
