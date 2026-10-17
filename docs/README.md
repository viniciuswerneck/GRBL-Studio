# Documentação — GRBL Studio

Índice da documentação do projeto. **GRBL Studio** é uma alternativa moderna e
nativa para Linux ao LaserGRBL, para controlar gravadoras/cortadoras laser que
rodam firmware GRBL.

## Comece por aqui

| Documento | Para que serve |
| :--- | :--- |
| [PRODUCT_SPEC.md](PRODUCT_SPEC.md) | Visão de produto, escopo, requisitos funcionais e não-funcionais, critérios de aceite. É a **fonte da verdade** do "o quê". |
| [PLANO_DE_ACAO.md](PLANO_DE_ACAO.md) | Plano de execução: auditoria do estado atual, fases, tarefas, cronograma, riscos e Definition of Done. É o "como" e o "quando". |
| [DESIGN.md](DESIGN.md) | **Diretrizes de interface:** aparência Windows 11 (Fluent), orçamentos de performance, precisão, tokens de tema e checklist visual. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitetura de software (atual e alvo), módulos, fluxo de dados e decisões técnicas. |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Setup de ambiente, build, execução, testes e convenções de código. |
| [FEATURES_COMPARISON.md](FEATURES_COMPARISON.md) | Matriz de paridade de funcionalidades com o LaserGRBL. |
| [ROADMAP.md](ROADMAP.md) | Roadmap histórico por versão (resumo de alto nível). |
| [../CHANGELOG.md](../CHANGELOG.md) | Registro de mudanças por versão. |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Como contribuir (setup, DoD, estilo, testes). |
| [../LICENSE](../LICENSE) | Licença do projeto (MIT). |

## Referências e material de origem

| Arquivo | Conteúdo |
| :--- | :--- |
| [comgo_z1_lasergrbl_user_manual.md](comgo_z1_lasergrbl_user_manual.md) | Transcrição estruturada do manual da COMGO Z1 (parâmetros, fluxo de uso, modos M3/M4, tabelas de material, troubleshooting). |
| [lasergrbl-manual.pdf](lasergrbl-manual.pdf) | PDF de referência do LaserGRBL (manual oficial). |
| [LaserGRBL — Usage](https://lasergrbl.com/usage/) | Documentação oficial do produto de referência (interface, conexão, load/send, overrides, jog, custom buttons, raster import, configuração, machine status). |

## Como a documentação se relaciona

```
PRODUCT_SPEC.md  ──define──▶  requisitos (RF/RNF)
        │
        ├──▶ PLANO_DE_ACAO.md  ──planeja──▶  fases, tarefas, prazos
        │
        └──▶ ARCHITECTURE.md   ──desenha──▶  módulos, protocolo, stack

FEATURES_COMPARISON.md  e  ROADMAP.md  ──acompanham──▶  paridade e progresso
```

## Convenções destes documentos

- **Idioma:** português (pt-BR); termos técnicos e nomes de comandos GRBL mantidos no original. **A interface do aplicativo** é traduzida em pt-BR/en/es (ver `README.md`, `README.en.md` e `README.es.md`; chaves em `src/shared/i18n/`).
- **Prioridade (MoSCoW):** `Must` (obrigatório), `Should` (importante), `Could` (desejável), `Won't` (fora do escopo atual).
- **IDs de requisito:** `RF-<módulo>-<n>` para funcionais e `RNF-<n>` para não-funcionais.
- **Status:** ✅ implementado · 🟡 parcial · ⬜ pendente.

## Ferramentas de IA (OpenCode)

O repositório inclui instruções e skills para agentes de IA (ver [`../AGENTS.md`](../AGENTS.md)):

| Item | Papel |
| :--- | :--- |
| `../AGENTS.md` | Regras **sempre-válidas**: build, invariantes do protocolo, orçamentos (RNF-11/12), gate de fases, DoD. |
| `.opencode/skills/grbl-protocol/` | Como implementar/testar protocolo GRBL (streaming, status, overrides, emulador). |
| `.opencode/skills/fluent-ui/` | Como aplicar o design Windows 11 (`DESIGN.md`) e os orçamentos de performance/precisão. |
| `.opencode/skills/release-linux/` | Empacotamento e publicação (AppImage/deb, versionamento, permissões de serial). |
| `.opencode/agents/reviewer.md` | Subagente **somente leitura** que revisa mudanças contra DoD, performance e segurança. |
