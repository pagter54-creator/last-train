(() => {
  'use strict';
  const g = window.lastRail;
  if (!g) return;
  const $ = s => document.querySelector(s);
  const touchQuery = matchMedia('(pointer: coarse)');
  const mobileUA = /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const isTouchDevice = () => mobileUA || navigator.maxTouchPoints > 0 || touchQuery.matches;
  const isCompactTouch = () => isTouchDevice() && (mobileUA || innerHeight <= 720 || innerWidth <= 1024);
  let portraitPause = null;
  let portraitState = null;

  // Rotation prompt is intentionally independent from the normal game overlay so a
  // landscape return can restore the exact same UI/game state.
  const rotate = document.createElement('div');
  rotate.className = 'mobile-rotate-overlay';
  rotate.setAttribute('role','status');
  rotate.setAttribute('aria-live','polite');
  rotate.innerHTML = '<section class="mobile-rotate-card"><div class="mobile-rotate-mark">LR</div><h2>가로 화면에서 플레이해주세요.</h2><p>빠른 직원 재배치와 넓은 전장 시야를 위해<br>모바일 버전은 가로 화면에 최적화되어 있습니다.</p><div class="mobile-rotate-icon" aria-hidden="true">↻</div></section>';
  document.body.append(rotate);

  // A single compact speed control replaces the three-button desktop speed control.
  const speed = document.createElement('button');
  speed.type = 'button';
  speed.className = 'mobile-speed-button';
  speed.setAttribute('aria-label','게임 배속 변경');
  speed.textContent = '1x';
  const menuButton = $('#menu-btn');
  menuButton?.before(speed);


  function mountPcOptimizedNotice(){
    const menu = document.querySelector('#modal.menu-modal .menu-content');
    if (!menu) return;
    let notice = menu.querySelector('.mobile-pc-optimized-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'mobile-pc-optimized-notice';
      notice.setAttribute('role', 'note');
      notice.textContent = '이 게임은 PC 환경에 최적화되었습니다.';
      menu.append(notice);
    }
  }

  function visiblePreferredSpeed(){
    if (!g.state) return 1;
    const tactical = document.body.classList.contains('is-tactical');
    if (tactical && [1,2,3].includes(g.preferredSpeed)) return g.preferredSpeed;
    if ([1,2,3].includes(g.state.speed)) return g.state.speed;
    if ([1,2,3].includes(g.state.priorSpeed)) return g.state.priorSpeed;
    return [1,2,3].includes(g.preferredSpeed) ? g.preferredSpeed : 1;
  }
  function updateSpeedButton(){
    speed.textContent = `${visiblePreferredSpeed()}x`;
    speed.disabled = !g.state || g.mode !== 'battle' || $('#overlay')?.classList.contains('show');
  }
  speed.onclick = () => {
    if (!g.state || g.mode !== 'battle' || $('#overlay')?.classList.contains('show')) return;
    const current = visiblePreferredSpeed();
    const next = current === 1 ? 2 : current === 2 ? 3 : 1;
    g.setSpeed(next);
    updateSpeedButton();
  };

  function pauseForPortrait(){
    if (!g.state || g.mode !== 'battle' || portraitState === g.state) return;
    portraitState = g.state;
    portraitPause = g.state.speed;
    if (g.state.speed !== 0) {
      g.state.speed = 0;
      g.renderSpeed?.();
    }
  }
  function resumeFromPortrait(){
    if (portraitState && g.state === portraitState && g.mode === 'battle' && portraitPause !== null && !$('#overlay')?.classList.contains('show')) {
      // Restore only the speed that the rotation overlay itself interrupted.
      if (g.state.speed === 0) g.state.speed = portraitPause;
      g.renderSpeed?.();
    }
    portraitState = null;
    portraitPause = null;
  }

  function applyMobileMode(){
    const mobile = isCompactTouch();
    const portrait = mobile && innerHeight > innerWidth;
    const landscape = mobile && !portrait;
    document.body.classList.toggle('mobile-ui', mobile);
    document.body.classList.toggle('mobile-portrait', portrait);
    document.body.classList.toggle('mobile-landscape', landscape);
    if (mobile && g.mode === 'menu') mountPcOptimizedNotice();
    if (portrait) pauseForPortrait(); else resumeFromPortrait();
    updateSpeedButton();
    // movement.js owns the battlefield transform; recalc after orientation/UI changes.
    requestAnimationFrame(() => g.resize?.());
  }

  addEventListener('resize', applyMobileMode, {passive:true});
  addEventListener('orientationchange', () => setTimeout(applyMobileMode, 60), {passive:true});
  touchQuery.addEventListener?.('change', applyMobileMode);

  // Mobile crew movement: after selecting a crew member, the player may tap the
  // railcar body itself. The shared moveCrew() routine still decides capacity,
  // restraints and wreck legality, so mobile never owns a second ruleset.
  const deck = $('#train-cars');
  deck?.addEventListener('click', e => {
    if (!document.body.classList.contains('mobile-landscape') || !g.state || g.mode !== 'battle' || !g.state.selectedCrew) return;
    if (e.target.closest('[data-crew],[data-equipment],[data-output],[data-captain],button,select,input,a')) return;
    const car = e.target.closest('[data-car-index]');
    if (!car) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    g.moveCrew(g.state.selectedCrew, Number(car.dataset.carIndex));
  }, true);

  // On touch layouts, keyboard-only visual state should never survive a hybrid-device
  // key press or a desktop session that was resized into the mobile breakpoint.
  document.addEventListener('pointerdown', () => {
    if (!document.body.classList.contains('mobile-landscape')) return;
    document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
  }, true);

  const priorRenderSpeed = g.renderSpeed?.bind(g);
  if (priorRenderSpeed) g.renderSpeed = function(...args){
    const result = priorRenderSpeed(...args);
    updateSpeedButton();
    return result;
  };
  const priorShowMainMenu = g.showMainMenu?.bind(g);
  if (priorShowMainMenu) g.showMainMenu = function(...args){
    const result = priorShowMainMenu(...args);
    requestAnimationFrame(() => {
      updateSpeedButton();
      if (isCompactTouch()) mountPcOptimizedNotice();
    });
    return result;
  };

  applyMobileMode();
})();
