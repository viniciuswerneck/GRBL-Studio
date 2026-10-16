---
name: GRBL Protocol
description: Implementar, corrigir ou revisar o protocolo GRBL (serial, streaming com ok, status, overrides, alarmes) no GRBL Studio, incluindo testes com emulador.
---

# Skill: Protocolo GRBL

Use esta skill ao mexer em conexão serial, streaming de G-code, status,
overrides, alarmes ou no parser de respostas.

## Fontes

- Especificação e requisitos: `../../../docs/PRODUCT_SPEC.md` (seção 8 —
  Referência do protocolo GRBL; e módulos M1–M6).
- Invariantes e comandos: `../../../AGENTS.md`.
- Arquitetura: `../../../docs/ARCHITECTURE.md`.

## Regras de ouro

1. **Tempo real = byte único, sem `\n`:**
   `?` status · `!` feed hold · `~` resume · `0x18` soft reset ·
   `0x90`–`0x94` overrides de feed.
2. **Streaming send-response:** envie a próxima linha somente após `ok`;
   em `error:` interrompa e reporte. Nunca `write` em laço com `setTimeout`.
3. **Line framing:** acumule bytes e separe por `\n`; nunca assuma que uma
   leitura de `data` contém exatamente uma linha.
4. **Comandos de linha** (levam `\n`): `$H`, `$X`, `$J=…`, `G92 …`, `$$`,
   `$#`, `$I`, `$G`, `$n=valor`.

## Formato de status (parsear para objeto tipado)

```
<Idle|MPos:0.000,0.000,0.000|FS:0,0|WCO:0.000,0.000,0.000>
<Run|MPos:12.340,5.000,0.000|FS:1200,0|Ov:100,100,100>
<Alarm|MPos:0.000,0.000,0.000>
```

Campos: estado (`Idle/Run/Hold/Alarm/Home/Jog/Door/Check/…`), `MPos`, `WPos`,
`FS` (feed, spindle), `Ov` (overrides), `WCO`, `Pn`, `Bf` (buffer).

## Workflow

1. Localize a mudança no módulo certo (`SerialTransport` para I/O,
   `GrblClient` para fila/protocolo, `shared/protocol` para parsing puro).
2. **Parsing deve ser função pura** e testada — nunca dentro de handler de UI.
3. Escreva/atualize testes unitários (Vitest) cobrindo:
   - status completo, parcial e malformado;
   - múltiplas linhas em uma única leitura;
   - `ok`, `error:N`, `[MSG:…]`, `ALARM:…`;
   - timeout de `ok` (máquina parou de responder).
4. Teste de integração sem hardware com emulador (abaixo).
5. Confirme os orçamentos: latência de status ≤ 200 ms, UI não bloqueada.

## Emulador GRBL (sem hardware)

Crie um par de PTYs e aponte um *fake* GRBL que responde `ok` e o formato de
status. Exemplo de PTY:

```bash
socat -d -d pty,raw,echo=0 pty,raw,echo=0
```

O app conecta em uma ponta; um script Node/teste escreve `ok` e status na outra.
Casos a simular: banner `Grbl 1.1f ['$' for help]`, `ok` por linha, `error:9`,
`ALARM:1`, atraso de resposta (timeout), e desconexão no meio do job.

## Checklist de conclusão

- [ ] Testes unitários do parser passam e cobrem casos de borda.
- [ ] Teste com emulador do fluxo conectar → enviar → `ok` por linha.
- [ ] Nenhum comando de tempo real com `\n`.
- [ ] Erros/desconexão propagados à UI com mensagem clara.
- [ ] Requisito (`RF-CON-*`, `RF-GC-*`, `RF-STA-*`, `RF-OVR-*`) citado.
