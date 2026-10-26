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
  const langSelect = document.querySelector('#langSelect');

  // i18n state
  let currentLang = 'pt-BR';
  let translations = {};
  const supportedLangs = ['pt-BR', 'en', 'es'];

  // Load translations
  async function loadTranslations(lang) {
    try {
      const response = await fetch(`assets/i18n/${lang}.json`);
      if (!response.ok) throw new Error(`Failed to load ${lang}`);
      translations = await response.json();
      currentLang = lang;
      applyTranslations();
      updateMetaTags();
      updateJsonLd();
      updateHtmlLang();
      if (langSelect) langSelect.value = lang;
    } catch (err) {
      console.error('i18n load error:', err);
    }
  }

  // Apply translations to elements with data-i18n
  function applyTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const value = getNested(translations, key);
      if (value !== undefined) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = value;
        } else if (el.hasAttribute('data-i18n-aria')) {
          el.setAttribute('aria-label', value);
        } else {
          el.textContent = value;
        }
      }
    });

    // Handle aria-label translations
    const ariaElements = document.querySelectorAll('[data-i18n-aria]');
    ariaElements.forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      const value = getNested(translations, key);
      if (value !== undefined) {
        el.setAttribute('aria-label', value);
      }
    });
  }

  function getNested(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  // Update meta tags for SEO
  function updateMetaTags() {
    const meta = translations.meta;
    if (!meta) return;

    document.title = meta.title || document.title;

    const updateMeta = (name, content, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      const el = document.querySelector(selector);
      if (el && content) el.setAttribute('content', content);
    };

    updateMeta('description', meta.description);
    updateMeta('og:title', meta.ogTitle, true);
    updateMeta('og:description', meta.ogDescription, true);
    updateMeta('og:image:alt', meta.ogImageAlt, true);
    updateMeta('twitter:title', meta.twitterTitle);
    updateMeta('twitter:description', meta.twitterDescription);
    updateMeta('twitter:image:alt', meta.twitterImageAlt);
  }

  // Update JSON-LD for current language
  function updateJsonLd() {
    const script = document.querySelector('script[type="application/ld+json"]');
    if (!script) return;

    try {
      const data = JSON.parse(script.textContent);
      const graph = data['@graph'] || [];
      const t = translations;

      // Update SoftwareApplication
      const software = graph.find(item => item['@type'] === 'SoftwareApplication');
      if (software) {
        software.description = t.recursos?.cards?.[0]?.desc || software.description;
        software.inLanguage = currentLang;
        software.featureList = t.recursos?.cards?.map(c => c.title) || software.featureList;
      }

      // Update WebSite
      const website = graph.find(item => item['@type'] === 'WebSite');
      if (website) {
        website.inLanguage = currentLang;
      }

      // Update FAQPage
      const faq = graph.find(item => item['@type'] === 'FAQPage');
      if (faq && t.faq?.questions) {
        faq.mainEntity = t.faq.questions.map(q => ({
          '@type': 'Question',
          name: q.q,
          acceptedAnswer: { '@type': 'Answer', text: q.a }
        }));
      }

      script.textContent = JSON.stringify(data);
    } catch (err) {
      console.error('JSON-LD update error:', err);
    }
  }

  function updateHtmlLang() {
    root.setAttribute('lang', currentLang);
    const alternateLinks = document.querySelectorAll('link[rel="alternate"][hreflang]');
    alternateLinks.forEach(link => {
      const hreflang = link.getAttribute('hreflang');
      if (hreflang === 'pt-BR') {
        link.setAttribute('href', `https://grblstudio.werneck.dev.br/`);
      } else if (hreflang === 'x-default') {
        link.setAttribute('href', `https://grblstudio.werneck.dev.br/`);
      } else {
        link.setAttribute('href', `https://grblstudio.werneck.dev.br/?lang=${hreflang}`);
      }
    });
    // Update og:locale
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute('content', currentLang === 'pt-BR' ? 'pt_BR' : currentLang);
  }

  // Language switcher
  if (langSelect) {
    langSelect.addEventListener('change', async (e) => {
      const lang = e.target.value;
      if (supportedLangs.includes(lang)) {
        await loadTranslations(lang);
        // Update URL without reload
        const url = new URL(window.location);
        if (lang === 'pt-BR') {
          url.searchParams.delete('lang');
        } else {
          url.searchParams.set('lang', lang);
        }
        window.history.replaceState({}, '', url);
      }
    });
  }

  // Detect language from URL on load
  function detectInitialLang() {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang && supportedLangs.includes(urlLang)) {
      return urlLang;
    }
    // Check browser language
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('pt')) return 'pt-BR';
    if (browserLang.startsWith('es')) return 'es';
    if (browserLang.startsWith('en')) return 'en';
    return 'pt-BR';
  }

  const closeMenu = () => {
    body.classList.remove('nav-open');
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', getNested(translations, 'headerActions.menuAbrir') || 'Abrir menu');
      const use = menuBtn.querySelector('use');
      if (use) use.setAttribute('href', '#icon-menu');
    }
  };

  const openMenu = () => {
    body.classList.add('nav-open');
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.setAttribute('aria-label', getNested(translations, 'headerActions.menuFechar') || 'Fechar menu');
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
    const defaultLabel = button.getAttribute('aria-label') || getNested(translations, 'copyBtn') || 'Copiar';
    let resetTimer;

    const markCopied = () => {
      button.classList.add('is-copied');
      button.setAttribute('aria-label', getNested(translations, 'copied') || 'Copiado!');
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
    document.documentElement.style.scrollBehavior = reduceMotion.matches ? 'auto' : '';
  }

  // Initialize i18n
  const initialLang = detectInitialLang();
  loadTranslations(initialLang);
})();