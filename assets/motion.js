(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.__motion = true;
  root.classList.add('js');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ── Split text into masked words ── */
  const splitWords = (el, cls, wrap) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            frag.appendChild(wrap(part, i++));
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    el.classList.add(cls);
  };

  document.querySelectorAll('[data-split]').forEach((el) => {
    splitWords(el, 'is-split', (word, i) => {
      const w = document.createElement('span');
      w.className = 'w';
      const wi = document.createElement('span');
      wi.className = 'wi';
      wi.style.setProperty('--i', i);
      wi.textContent = word;
      w.appendChild(wi);
      return w;
    });
    if (el.dataset.delay) el.style.setProperty('--d', el.dataset.delay + 'ms');
  });

  const scrubs = [...document.querySelectorAll('[data-scrub]')].map((el) => {
    const words = [];
    splitWords(el, 'is-scrub', (word) => {
      const s = document.createElement('span');
      s.className = 'sw';
      s.textContent = word;
      words.push(s);
      return s;
    });
    return { el, words };
  });

  /* ── Reveal on enter ── */
  const revealables = document.querySelectorAll('.reveal, [data-reveal], [data-split], .section-label, .footer-mark');
  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach((el) => el.classList.add('in'));
  } else {
    // A fully clipped element has no visible area, so watch its container instead.
    const targets = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        (targets.get(e.target) || []).forEach((el) => el.classList.add('in'));
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealables.forEach((el) => {
      const watch = el.matches('[data-reveal="clip"]') ? el.parentElement : el;
      if (!targets.has(watch)) targets.set(watch, []);
      targets.get(watch).push(el);
      io.observe(watch);
    });
    // Whatever is already on screen at load should not wait for the observer.
    setTimeout(() => {
      targets.forEach((els, watch) => {
        const r = watch.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.94 && r.bottom > 0) {
          els.forEach((el) => el.classList.add('in'));
          io.unobserve(watch);
        }
      });
    }, 60);
  }

  /* ── Videos: pick a size, play only when visible ── */
  document.querySelectorAll('video[data-src-lg]').forEach((v) => {
    const wide = window.innerWidth > 900 && (window.devicePixelRatio || 1) * window.innerWidth > 1200;
    const src = wide ? v.dataset.srcLg : v.dataset.srcSm;
    if (src && v.getAttribute('src') !== src) { v.src = src; v.load(); }
  });
  const videos = [...document.querySelectorAll('video[autoplay]')];
  const tryPlay = (v) => { if (v.dataset.visible !== '0') v.play().catch(() => {}); };
  videos.forEach((v) => {
    v.addEventListener('canplay', () => tryPlay(v));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tryPlay(v); });
  });
  if ('IntersectionObserver' in window) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target;
        v.dataset.visible = e.isIntersecting ? '1' : '0';
        if (e.isIntersecting) tryPlay(v);
        else v.pause();
      });
    }, { threshold: 0.01 });
    videos.forEach((v) => vio.observe(v));
  }

  /* ── Smooth scroll ── */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, anchors: { offset: -60 } });
  }

  /* ── Header: hide on the way down, return on the way up ── */
  const header = document.querySelector('.header');
  let lastY = 0;

  /* ── Clock ── */
  const clock = document.querySelector('[data-clock]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Bucharest', hour: '2-digit', minute: '2-digit' });
    const tick = () => { clock.textContent = 'Bucharest ' + fmt.format(new Date()); };
    tick();
    setInterval(tick, 15000);
  }

  /* ── Parallax ── */
  const parallax = [...document.querySelectorAll('[data-parallax]')];

  /* ── Marquee ── */
  const marquees = [...document.querySelectorAll('[data-marquee]')].map((el) => {
    const track = el.querySelector('.marquee-track');
    const group = track.querySelector('.marquee-group');
    track.appendChild(group.cloneNode(true));
    return { track, group, x: 0 };
  });

  /* ── Film stage (landing hero) ── */
  const stage = document.querySelector('[data-stage]');
  let stageGeo = null;
  const measureStage = () => {
    if (!stage) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = Math.min(56, Math.max(20, vw * 0.04));
    const copy = stage.querySelector('.stage-copy');
    const meta = stage.querySelector('.stage-meta');
    if (vw > 900) {
      stageGeo = { t: vh * 0.16, r: pad, b: vh - meta.offsetTop + vh * 0.035, l: vw * 0.47, vw, vh };
    } else {
      const copyBottom = copy.offsetTop + copy.offsetHeight;
      stageGeo = { t: copyBottom + vh * 0.035, r: pad, b: vh - meta.offsetTop + vh * 0.025, l: pad, vw, vh };
    }
  };
  measureStage();

  let raf = 0;
  const frame = (time) => {
    if (lenis) lenis.raf(time);
    const y = lenis ? lenis.scroll : window.scrollY;
    const velocity = lenis ? lenis.velocity : y - lastY;
    const vh = window.innerHeight;

    if (header) {
      const delta = y - lastY;
      if (y > 140 && delta > 2) header.classList.add('is-hidden');
      else if (delta < -2 || y <= 140) header.classList.remove('is-hidden');
    }
    lastY = y;

    if (!reduce) {
      parallax.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const speed = parseFloat(el.dataset.parallax) || 0.08;
        const offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.translate = `0 ${offset.toFixed(1)}px`;
      });

      marquees.forEach((m) => {
        const w = m.group.offsetWidth;
        m.x -= 0.55 + Math.min(Math.abs(velocity) * 0.35, 18);
        if (m.x <= -w) m.x += w;
        m.track.style.transform = `translate3d(${m.x.toFixed(2)}px,0,0)`;
      });

      scrubs.forEach(({ el, words }) => {
        const r = el.getBoundingClientRect();
        const p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.38));
        const lit = Math.floor(p * words.length * 1.02);
        words.forEach((w, i) => w.classList.toggle('on', i < lit));
      });

      if (stage && stageGeo) {
        const r = stage.getBoundingClientRect();
        const run = stage.offsetHeight - vh;
        const raw = clamp(-r.top / run);
        const e = easeInOut(clamp(raw / 0.6));
        const g = stageGeo;
        stage.style.setProperty('--t', lerp(g.t, 0, e).toFixed(1) + 'px');
        stage.style.setProperty('--r', lerp(g.r, 0, e).toFixed(1) + 'px');
        stage.style.setProperty('--b', lerp(g.b, 0, e).toFixed(1) + 'px');
        stage.style.setProperty('--l', lerp(g.l, 0, e).toFixed(1) + 'px');
        stage.style.setProperty('--e', e.toFixed(4));
        stage.style.setProperty('--fade', (1 - clamp((raw - 0.22) / 0.3)).toFixed(4));
        stage.style.setProperty('--lift', (raw * -90).toFixed(1) + 'px');
        stage.style.setProperty('--cap', clamp((raw - 0.62) / 0.2).toFixed(4));
      }
    }

    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measureStage, 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureStage);

  /* ── Page transitions for browsers without cross-document view transitions ── */
  const hasVT = 'onpagereveal' in window;
  if (!hasVT && !reduce) {
    root.classList.add('no-vt');
    document.addEventListener('click', (ev) => {
      const a = ev.target.closest('a');
      if (!a || ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.protocol.startsWith('mailto')) return;
      if (url.pathname === location.pathname && url.hash) return;
      ev.preventDefault();
      root.classList.add('is-leaving');
      setTimeout(() => { location.href = url.href; }, 420);
    });
    window.addEventListener('pageshow', () => root.classList.remove('is-leaving'));
  }
})();
