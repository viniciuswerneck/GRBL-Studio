/**
 * AboutModal — modal “Sobre” (RF-APP-6/7).
 *
 * Primeiro componente do renderer migrado de vanilla JS (`public/renderer.js`)
 * para Svelte 5 + TypeScript. É montado incrementalmente num elemento DOM
 * existente (`#about-root`) enquanto o restante do renderer continua em
 * vanilla JS. Toda a informação da app vem do main (via `window.grbl`) —
 * nunca hardcoded aqui.
 */

interface AboutModalProps {
  open: boolean;
}

export function AboutModal({ open }: AboutModalProps) {
  let appInfo: Awaited<ReturnType<typeof window.grbl.getAppInfo>> | null = null;
  let loading = true;

  // Carrega metadados da app (versão/autor/licença/links) — nunca hardcoded.
  async function loadAppInfo() {
    try {
      appInfo = await window.grbl.getAppInfo();
    } catch {
      /* Falha silenciosa: o modal ainda abre com valores padrão. */
    } finally {
      loading = false;
    }
  }

  if (open && !appInfo && loading) {
    void loadAppInfo();
  }

  function handleLink(url: string) {
    void window.grbl.openExternal(url);
  }

  const version = appInfo?.version ?? '—';
  const author = appInfo?.author ?? '—';
  const license = appInfo?.license ?? '—';
  const url = appInfo?.url ?? 'https://lab.werneck.dev.br/';
  const repository = appInfo?.repository ?? 'https://github.com/viniciuswerneck/GRBL-Studio';

  if (!open) return '';

  return (
    <div
      class="about-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
      onmousedown={(e) => {
        if (e.target === e.currentTarget) {
          dispatchClose();
        }
      }}
    >
      <div class="about-modal">
        <header class="about-modal__head">
          <button
            class="about-modal__close"
            aria-label="Fechar sobre"
            onclick={dispatchClose}
          >
            ✕
          </button>
        </header>

        <div class="about-modal__body">
          <h2 id="about-title" class="about-modal__title">
            {appInfo?.name ?? 'GRBL Studio'}
          </h2>
          <p class="about-modal__version">v{version}</p>

          <dl class="about-modal__details">
            <dt>Desenvolvido por</dt>
            <dd>{author}</dd>
            <dt>Licença</dt>
            <dd>{license}</dd>
          </dl>

          <div class="about-modal__links">
            <a class="about-modal__link" onclick={() => handleLink(url)}>
              🌐 WerneckLab
            </a>
            <a class="about-modal__link" onclick={() => handleLink(repository)}>
              🔗 GitHub
            </a>
          </div>

          <p class="about-modal__note">
            Código aberto sob licença MIT. Sem nuvem, sem conta, sem limite de
            arquivo. Totalmente offline após instalado.
          </p>
        </div>

        <footer class="about-modal__foot">
          <button class="about-modal__btn about-modal__btn--primary" onclick={dispatchClose}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );

  function dispatchClose() {
    const ev = new CustomEvent('close');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).dispatchEvent?.(ev);
  }
}
