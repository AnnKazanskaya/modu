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

// modu — приветственный поп-ап + разблокировка автозапуска видео
(() => {
  const video = document.querySelector('.hero video');
  const playVideo = () => {
    if (!video) return;
    video.muted = true;
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  };

  const modal = document.getElementById('welcome');
  if (modal) {
    const open = () => { modal.hidden = false; document.body.style.overflow = 'hidden'; };
    const close = () => { modal.hidden = true; document.body.style.overflow = ''; playVideo(); };

    // показываем один раз за сессию
    if (!sessionStorage.getItem('modu_welcome')) {
      open();
      sessionStorage.setItem('modu_welcome', '1');
    }
    document.getElementById('welcome-close')?.addEventListener('click', close);
    document.getElementById('welcome-later')?.addEventListener('click', close);
    document.getElementById('welcome-cta')?.addEventListener('click', () => { document.body.style.overflow = ''; });
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });
  }

  // запасной вариант: первое касание/клик/скролл тоже запускает видео
  ['touchstart', 'pointerdown', 'scroll'].forEach((ev) =>
    window.addEventListener(ev, function once() {
      playVideo();
      window.removeEventListener(ev, once);
    }, { passive: true, once: true })
  );
})();
