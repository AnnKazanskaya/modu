// modu — главная страница: мягкое появление элементов при скролле
(() => {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        // лёгкая каскадная задержка для группы
        e.target.style.transitionDelay = `${Math.min(i * 60, 180)}ms`;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

  els.forEach(el => io.observe(el));
})();

// modu — экран загрузки + приветственный поп-ап + разблокировка видео
(() => {
  const video = document.querySelector('.hero video');
  const playVideo = () => {
    if (!video) return;
    video.muted = true;
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  };

  // --- приветственный поп-ап ---
  const modal = document.getElementById('welcome');
  const close = () => { if (modal) { modal.hidden = true; } document.body.style.overflow = ''; playVideo(); };
  const showWelcome = () => {
    if (!modal || sessionStorage.getItem('modu_welcome')) return;
    modal.hidden = false; document.body.style.overflow = 'hidden';
    sessionStorage.setItem('modu_welcome', '1');
  };
  if (modal) {
    document.getElementById('welcome-close')?.addEventListener('click', close);
    document.getElementById('welcome-later')?.addEventListener('click', close);
    document.getElementById('welcome-cta')?.addEventListener('click', () => { document.body.style.overflow = ''; });
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });
  }

  // --- экран загрузки ---
  const pre = document.getElementById('preloader');
  const MIN_MS = 800;               // минимальное время показа, чтобы не мигал
  const startedAt = Date.now();
  const hidePreloader = () => {
    const wait = Math.max(0, MIN_MS - (Date.now() - startedAt));
    setTimeout(() => {
      if (pre) {
        pre.classList.add('hide');
        setTimeout(() => { pre.style.display = 'none'; }, 650);
      }
      showWelcome();
    }, wait);
  };
  if (pre) {
    if (document.readyState === 'complete') hidePreloader();
    else window.addEventListener('load', hidePreloader);
    // страховка: убрать в любом случае через 6 c
    setTimeout(() => { if (pre && !pre.classList.contains('hide')) hidePreloader(); }, 6000);
  } else {
    showWelcome();
  }

  // запасной вариант: первое касание/клик/скролл тоже запускает видео
  ['touchstart', 'pointerdown', 'scroll'].forEach((ev) =>
    window.addEventListener(ev, function once() {
      playVideo();
      window.removeEventListener(ev, once);
    }, { passive: true, once: true })
  );
})();

// modu — карусели в каталоге диванов
(() => {
  document.querySelectorAll('[data-carousel]').forEach((car) => {
    const track = car.querySelector('.carousel__track');
    const dotsWrap = car.querySelector('.carousel__dots');
    const prev = car.querySelector('.carousel__btn--prev');
    const next = car.querySelector('.carousel__btn--next');
    if (!track) return;
    const slides = Array.from(track.children);
    let i = 0;

    if (slides.length <= 1) { prev?.remove(); next?.remove(); return; }

    // точки
    slides.forEach((_, idx) => {
      const d = document.createElement('button');
      d.setAttribute('aria-label', 'Фото ' + (idx + 1));
      if (idx === 0) d.classList.add('active');
      d.addEventListener('click', () => go(idx));
      dotsWrap?.appendChild(d);
    });
    const dots = dotsWrap ? Array.from(dotsWrap.children) : [];

    function go(n) {
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${i * 100}%)`;
      dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
    }
    prev?.addEventListener('click', () => go(i - 1));
    next?.addEventListener('click', () => go(i + 1));

    // свайп на телефоне
    let x0 = null;
    car.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    car.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
      x0 = null;
    });
  });
})();
