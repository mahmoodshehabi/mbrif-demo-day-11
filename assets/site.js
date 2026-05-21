// Shared site behavior: nav, reveal-on-scroll, animated counters, parallax, particles
(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        if (e.target.dataset.count) {
          animateCount(e.target);
        }
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const duration = 1800;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      // ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const value = target * eased;
      el.textContent = prefix + value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initReveal() {
    $$('[data-reveal]').forEach((el) => io.observe(el));
    $$('[data-count]').forEach((el) => io.observe(el));
  }

  // Subtle parallax for elements with data-parallax="speed"
  function initParallax() {
    const els = $$('[data-parallax]');
    if (!els.length) return;
    let raf = null;
    function update() {
      const sy = window.scrollY;
      els.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0.15;
        el.style.transform = `translate3d(0, ${sy * speed}px, 0)`;
      });
      raf = null;
    }
    window.addEventListener('scroll', () => {
      if (raf == null) raf = requestAnimationFrame(update);
    }, { passive: true });
  }

  // Card tilt
  function initTilt() {
    $$('[data-tilt]').forEach((card) => {
      const max = 6;
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${-py * max}deg) rotateY(${px * max}deg) translateY(-4px)`;
        const glow = card.querySelector('[data-tilt-glow]');
        if (glow) {
          glow.style.background = `radial-gradient(circle at ${(px + 0.5) * 100}% ${(py + 0.5) * 100}%, rgba(255,255,255,0.18), transparent 50%)`;
        }
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        const glow = card.querySelector('[data-tilt-glow]');
        if (glow) glow.style.background = '';
      });
    });
  }

  // Hero canvas: animated diagonal streaks + soft glow blobs
  function initHeroCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, streaks, blobs, dpr;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      const count = Math.floor((w * h) / 12000);
      streaks = [];
      for (let i = 0; i < count; i++) {
        const palette = ['#5ee7d0', '#38c6ff', '#2e6bff', '#7df3a8', '#ffffff'];
        streaks.push({
          x: Math.random() * w * 1.4 - w * 0.2,
          y: Math.random() * h * 1.4 - h * 0.2,
          len: 80 + Math.random() * 260,
          width: 0.6 + Math.random() * 2.2,
          speed: 0.4 + Math.random() * 1.4,
          alpha: 0.15 + Math.random() * 0.55,
          color: palette[Math.floor(Math.random() * palette.length)]
        });
      }
      blobs = [
        { x: w * 0.15, y: h * 0.25, r: Math.max(w, h) * 0.4, color: 'rgba(56, 198, 255, 0.18)' },
        { x: w * 0.18, y: h * 0.85, r: Math.max(w, h) * 0.35, color: 'rgba(94, 231, 208, 0.12)' },
        { x: w * 0.75, y: h * 0.15, r: Math.max(w, h) * 0.3, color: 'rgba(46, 107, 255, 0.16)' }
      ];
    }

    const angle = -Math.PI / 4; // -45 degrees
    const cos = Math.cos(angle), sin = Math.sin(angle);

    function frame() {
      ctx.clearRect(0, 0, w, h);
      // background gradient
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#050b24');
      g.addColorStop(0.5, '#081034');
      g.addColorStop(1, '#0a1648');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // blobs
      blobs.forEach((b) => {
        const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        rg.addColorStop(0, b.color);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, w, h);
      });
      // streaks moving along -45deg
      streaks.forEach((s) => {
        s.x += cos * s.speed;
        s.y += sin * s.speed;
        // wrap
        if (s.x < -300 || s.y > h + 300) {
          s.x = w + Math.random() * 200;
          s.y = -200 + Math.random() * (h * 0.3);
        }
        ctx.strokeStyle = hexToRgba(s.color, s.alpha);
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - cos * s.len, s.y - sin * s.len);
        ctx.stroke();
      });
      requestAnimationFrame(frame);
    }

    function hexToRgba(hex, a) {
      const m = hex.replace('#', '');
      const r = parseInt(m.substring(0, 2), 16);
      const g = parseInt(m.substring(2, 4), 16);
      const b = parseInt(m.substring(4, 6), 16);
      return `rgba(${r},${g},${b},${a})`;
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  }

  // Mouse-tracked spotlight on hero
  function initSpotlight(target) {
    if (!target) return;
    target.addEventListener('mousemove', (e) => {
      const r = target.getBoundingClientRect();
      target.style.setProperty('--mx', `${e.clientX - r.left}px`);
      target.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initParallax();
    initTilt();
    initHeroCanvas(document.getElementById('hero-canvas'));
    initSpotlight(document.querySelector('[data-spotlight]'));

    // Nav scroll state
    const nav = document.querySelector('.nav');
    if (nav) {
      const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // Hamburger menu
    const hamburger = document.querySelector('.nav__hamburger');
    const mobileMenu = document.querySelector('.nav__mobile-menu');
    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', () => {
        const open = hamburger.classList.toggle('is-open');
        mobileMenu.classList.toggle('is-open', open);
        document.body.style.overflow = open ? 'hidden' : '';
      });
      mobileMenu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          hamburger.classList.remove('is-open');
          mobileMenu.classList.remove('is-open');
          document.body.style.overflow = '';
        });
      });
    }
  });
})();
