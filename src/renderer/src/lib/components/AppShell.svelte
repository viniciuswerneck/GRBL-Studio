/**
 * AppShell — layout principal com header, nav rail e área de conteúdo.
 */

interface AppShellProps {
  children: any;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div class="fluent-appshell">
      <header class="fluent-appshell__header" role="banner">
        <div class="fluent-appshell__header-left">
          <!-- Menu button para mobile (futuro) -->
        </div>
        <div class="fluent-appshell__header-center">
          <h1 class="fluent-appshell__title">GRBL Studio</h1>
        </div>
        <div class="fluent-appshell__header-right">
          <!-- Ações globais: tema, idioma, notificações -->
          <slot name="header-actions" />
        </div>
      </header>
      
      <div class="fluent-appshell__body">
        <aside class="fluent-appshell__sidebar" role="complementary">
          <slot name="sidebar" />
        </aside>
        
        <main class="fluent-appshell__main" role="main">
          {children}
        </main>
      </div>
      
      <footer class="fluent-appshell__footer" role="contentinfo">
        <div class="fluent-appshell__footer-left">
          <span>GRBL Studio</span>
        </div>
        <div class="fluent-appshell__footer-center">
          <span>Desenvolvido por WerneckLab</span>
        </div>
        <div class="fluent-appshell__footer-right">
          <a href="https://lab.werneck.dev.br" target="_blank" rel="noopener noreferrer">
            lab.werneck.dev.br
          </a>
        </div>
      </footer>
    </div>
  );
}