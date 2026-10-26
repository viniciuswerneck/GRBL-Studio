(() => {
  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector('.site-header');
  const menuBtn = document.querySelector('#menuBtn');
  const nav = document.querySelector('#navegacao');
  const toTop = document.querySelector('#toTop');
  const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];
  const mobileQuery = window.matchMedia('(max-width: 940px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const closeMenu = () => {
    body.classList.remove('nav-open');
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Abrir menu');
      const use = menuBtn.querySelector('use');
      if (use) use.setAttribute('href', '#icon-menu');
    }
  };

  const openMenu = () => {
    body.classList.add('nav-open');
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.setAttribute('aria-label', 'Fechar menu');
      const use = menuBtn.querySelector('use');
      if (use) use.setAttribute('href', '#icon-close');
    }
  };

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      if (body.classList.contains('nav-open')) closeMenu();
      else openMenu();
    });

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('click', (event) => {
      if (!body.classList.contains('nav-open')) return;
      if (event.target.closest('.site-header')) return;
      closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && body.classList.contains('nav-open')) {
        closeMenu();
        menuBtn.focus();
      }
    });

    const onViewportChange = (event) => {
      if (!event.matches) closeMenu();
    };

    if (mobileQuery.addEventListener)
      mobileQuery.addEventListener('change', onViewportChange);
    else mobileQuery.addListener(onViewportChange);
  }

  const setHeaderState = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };

  const navSections = navLinks
    .filter((link) => !link.classList.contains('nav-cta'))
    .map((link) => {
      const id = link.getAttribute('href')?.slice(1);
      const section = id ? document.getElementById(id) : null;
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  const setActiveNav = () => {
    if (!navSections.length) return;
    const marker = window.scrollY + Math.min(window.innerHeight * 0.34, 320);
    let current = null;

    if (window.scrollY > 240) {
      for (const item of navSections) {
        const top = item.section.getBoundingClientRect().top + window.scrollY;
        if (top <= marker) current = item.link;
      }
    }

    for (const item of navSections) {
      item.link.classList.toggle('is-active', item.link === current);
    }
  };

  const setToTopState = () => {
    if (!toTop) return;
    toTop.classList.toggle('is-visible', window.scrollY > 620);
  };

  let scrollTicking = false;
  const onScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(() => {
      setHeaderState();
      setActiveNav();
      setToTopState();
      scrollTicking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  setHeaderState();
  setActiveNav();
  setToTopState();

  if (toTop) {
    toTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion.matches ? 'auto' : 'smooth',
      });
    });
  }

  const revealItems = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -7% 0px' },
    );

    for (const item of revealItems) revealObserver.observe(item);
  } else {
    for (const item of revealItems) item.classList.add('is-visible');
  }

  const copyButtons = [...document.querySelectorAll('.copy-btn')];
  for (const button of copyButtons) {
    const defaultLabel = button.getAttribute('aria-label') || 'Copiar';
    let resetTimer;

    const markCopied = () => {
      button.classList.add('is-copied');
      button.setAttribute('aria-label', 'Copiado!');
      const use = button.querySelector('use');
      if (use) use.setAttribute('href', '#icon-check');
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        button.classList.remove('is-copied');
        button.setAttribute('aria-label', defaultLabel);
        if (use) use.setAttribute('href', '#icon-copy');
      }, 1800);
    };

    const fallbackCopy = (text) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      return ok;
    };

    button.addEventListener('click', async () => {
      const text = button.getAttribute('data-copy') || '';
      if (!text) return;
      try {
        if (navigator.clipboard?.writeText)
          await navigator.clipboard.writeText(text);
        else if (!fallbackCopy(text)) throw new Error('copy unavailable');
        markCopied();
      } catch {
        if (fallbackCopy(text)) markCopied();
      }
    });
  }

  if (root.classList.contains('js')) {
    document.documentElement.style.scrollBehavior = reduceMotion.matches
      ? 'auto'
      : '';
  }
})();
