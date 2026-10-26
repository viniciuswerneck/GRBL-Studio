# Site do GRBL Studio

Site estático de divulgação do **GRBL Studio**, publicado em
`https://grblstudio.werneck.dev.br/`.

Não há framework, bundler ou dependência de CDN. É HTML, CSS e JavaScript puros,
com fontes e imagens servidas localmente.

## Pré-visualizar

```bash
python3 -m http.server 8080 -d site
```

Abra `http://localhost:8080/`.

Também funciona com qualquer servidor estático:

```bash
npx serve site
```

## Estrutura

```text
site/
├── index.html              # página principal
├── 404.html                # página de erro
├── CNAME                   # domínio do GitHub Pages
├── robots.txt
├── sitemap.xml
├── site.webmanifest
├── llms.txt                # resumo para buscadores/IA
├── _headers                # cache e segurança (Netlify/Cloudflare)
├── .nojekyll               # desativa Jekyll no GitHub Pages
├── favicon.ico
└── assets/
    ├── css/styles.css
    ├── js/main.js
    ├── fonts/              # Inter e Space Grotesk (OFL)
    └── img/                # screenshots WebP, OG image e ícones
```

## Deploy

### Netlify ou Cloudflare Pages

- **Build command:** vazio
- **Publish directory:** `site`
- O arquivo `_headers` já configura cache e cabeçalhos de segurança.

### GitHub Pages

O site está em `site/`, e não na raiz nem em `docs/`. Para publicar sem mover
arquivos, use **GitHub Actions** como fonte do Pages:

1. Em **Settings → Pages**, selecione **GitHub Actions** como source.
2. Crie um workflow que envie `site/` como artefato. Exemplo:

```yaml
name: Deploy site

on:
  push:
    branches: [main]
    paths: ['site/**']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v4
```

3. O arquivo `site/CNAME` já contém `grblstudio.werneck.dev.br`.
4. No DNS, crie um `CNAME` para `grblstudio` apontando para
   `viniciuswerneck.github.io` (ou para o host indicado pelo Pages).

> O GitHub Pages precisa estar habilitado no repositório. Se o repositório for
> privado, confirme se o plano permite Pages. Os links de download apontam para
> as releases do GitHub; elas precisam estar públicas.

### DNS

Para qualquer provedor, o registro deve ser:

| Tipo | Nome | Valor |
| :--- | :--- | :--- |
| CNAME | `grblstudio` | host do provedor (ex.: `viniciuswerneck.github.io`) |

Depois de propagar o DNS, ative **HTTPS** no provedor. O site não usa cookies,
telemetria ou recursos de terceiros.

## SEO e indexação

Já incluído:

- `title`, meta description, canonical e `hreflang` pt-BR;
- Open Graph e Twitter Card com `og-image.png` 1200×630;
- JSON-LD de `SoftwareApplication`, `Organization`, `WebSite` e `FAQPage`;
- `robots.txt`, `sitemap.xml` e `llms.txt`;
- HTML semântico, um único `h1`, textos alternativos e navegação por teclado;
- imagens WebP com `srcset`, dimensões explícitas e lazy loading fora do hero;
- fontes locais com `font-display: swap` e preload do hero;
- `prefers-reduced-motion` e fallback sem JavaScript.

Checklist pós-deploy:

1. Confirme `https://grblstudio.werneck.dev.br/robots.txt` e
   `https://grblstudio.werneck.dev.br/sitemap.xml`.
2. Envie o sitemap no **Google Search Console** e no **Bing Webmaster Tools**.
3. Valide o JSON-LD no [Rich Results Test](https://search.google.com/test/rich-results).
4. Teste o preview social com o [OpenGraph.xyz](https://www.opengraph.xyz/).
5. Rode Lighthouse em desktop e mobile; o alvo é 95+ em Performance, SEO,
   Acessibilidade e Boas Práticas.

## Atualizar a versão

Ao lançar uma versão nova, revise:

- `index.html`: textos de versão (`v0.23.0`), `softwareVersion` no JSON-LD,
  `og:title`/descrição se necessário;
- `sitemap.xml`: `lastmod`;
- `llms.txt`: versão e fatos;
- screenshots em `assets/img/` se a interface mudar.

As imagens de produto são derivadas de `docs/manual/img/` e otimizadas em WebP.
Mantenha os nomes e as dimensões usados no HTML (ou ajuste `width`, `height`,
`srcset` e `sizes` juntos) para não gerar layout shift.

## Licença

O site é parte do projeto GRBL Studio e segue a licença MIT. As fontes Inter e
Space Grotesk são distribuídas sob a SIL Open Font License; os textos das
licenças estão em `assets/fonts/`.
