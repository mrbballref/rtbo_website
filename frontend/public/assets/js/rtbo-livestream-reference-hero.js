(function () {
  'use strict';

  const HERO_ID = 'rtbo-live-reference-hero';

  function createHero() {
    const hero = document.createElement('section');
    hero.id = HERO_ID;
    hero.className = 'rtbo-live-reference-hero';
    hero.setAttribute('aria-labelledby', 'rtbo-live-reference-title');

    hero.innerHTML = `
      <div class="rtbo-live-reference-visual" aria-hidden="true">
        <img src="/assets/images/3d_rtbo_livestream_player.jpg" alt="" decoding="async">
      </div>
      <div class="rtbo-live-reference-shade" aria-hidden="true"></div>
      <div class="rtbo-live-reference-inner">
        <div class="rtbo-live-reference-copy">
          <p class="rtbo-live-reference-kicker">THE LAB</p>
          <h1 id="rtbo-live-reference-title" class="rtbo-live-reference-title">
            <span>THE LIVE</span>
            <strong>STREAM</strong>
          </h1>
          <p class="rtbo-live-reference-tagline">Real games. Real moments. Real time.</p>
          <p class="rtbo-live-reference-description">Professional live streaming of games, events, and clinics with multiple camera angles, live stats, and broadcast-quality production.</p>
          <div class="rtbo-live-reference-actions">
            <button class="rtbo-live-reference-primary" type="button" data-live-hero-action="watch">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 8.5a5 5 0 0 0 0 7M5.7 5.7a9 9 0 0 0 0 12.6M15.5 8.5a5 5 0 0 1 0 7M18.3 5.7a9 9 0 0 1 0 12.6M12 10.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z"/></svg>
              <span>WATCH LIVE NOW</span>
            </button>
            <button class="rtbo-live-reference-secondary" type="button" data-live-hero-action="schedule">VIEW SCHEDULE</button>
          </div>
        </div>

        <div class="rtbo-live-reference-feature-rail" aria-label="Live stream production features">
          <div class="rtbo-live-reference-feature">
            <span class="rtbo-live-reference-feature-icon rtbo-live-reference-hd" aria-hidden="true">HD</span>
            <span><strong>1080P QUALITY</strong></span>
          </div>
          <div class="rtbo-live-reference-feature">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h12v11h-12zM15.5 10l5-2.5v9l-5-2.5z"/></svg>
            <span><strong>MULTI ANGLE</strong></span>
          </div>
          <div class="rtbo-live-reference-feature">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h3V11H4zm6 0h3V6h-3zm6 0h3V3h-3z"/></svg>
            <span><strong>LIVE STATS</strong></span>
          </div>
          <div class="rtbo-live-reference-feature">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="m10 8 6 4-6 4z"/></svg>
            <span><strong>INSTANT REPLAY</strong></span>
          </div>
        </div>
      </div>
    `;

    return hero;
  }

  function scrollToElement(element) {
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function enhanceLivestreamPage(page) {
    if (!page || page.querySelector(`#${HERO_ID}`)) return;

    const intro = page.querySelector(':scope > .livestream-intro');
    const topCards = page.querySelector(':scope > .livestream-top-cards');
    const hero = createHero();

    page.classList.add('has-reference-livestream-hero');
    page.prepend(hero);

    [intro, topCards].forEach((element) => {
      if (!element) return;
      element.classList.add('rtbo-live-reference-replaced');
      element.setAttribute('aria-hidden', 'true');
    });

    hero.querySelector('[data-live-hero-action="watch"]')?.addEventListener('click', () => {
      const existingWatchAction = page.querySelector('.livestream-feature-actions .livestream-platform-action');
      existingWatchAction?.click();
      window.requestAnimationFrame(() => scrollToElement(page.querySelector('#livestream-player')));
    });

    hero.querySelector('[data-live-hero-action="schedule"]')?.addEventListener('click', () => {
      scrollToElement(page.querySelector('.livestream-schedule-section'));
    });
  }

  function scan() {
    document.querySelectorAll('.livestream-page').forEach(enhanceLivestreamPage);
  }

  function start() {
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', scan);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
