# GRBL Studio - Documentação Principal

Este diretório contém toda a documentação do projeto GRBL Studio.

## Arquivos

- `ROADMAP.md` - Plano de desenvolvimento com etapas e prioridades
- `ARCHITECTURE.md` - Arquitetura técnica (Electron + TypeScript + serialport)
- `DEVELOPMENT.md` - Guia para desenvolvimento e testes
- `FEATURES_COMPARISON.md` - Comparação entre LaserGRBL e GRBL Studio
- `lasergrbl-manual.pdf` - Manual oficial do LaserGRBL (referência)
- `comgo_z1_lasergrbl_user_manual.md` - Manual específico COMGO Z1 (traduzido/referência)

## Referências do LaserGRBL

Páginas oficiais consultadas:
- https://lasergrbl.com/usage/user-interface/ - Interface e layout
- https://lasergrbl.com/usage/arduino-connection/ - Conexão serial
- https://lasergrbl.com/usage/load-and-send/ - Carregamento e envio G-Code
- https://lasergrbl.com/usage/jogging/ - Controle JOG
- https://lasergrbl.com/configuration/ - Configurações

## Início Rápido

> **Nota:** este arquivo é um índice secundário. O índice canônico da
> documentação é [`docs/README.md`](README.md).

```bash
cd "GRBL Studio"
npm install
npm run build
npm start
# Em container/ambiente sem sandbox:
npx electron --no-sandbox .
```
