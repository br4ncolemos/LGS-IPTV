let currentFocus = null;

export function initSpatialNavigation() {
  document.addEventListener('keydown', (e) => {
    const key = e.key;
    
    // Se o modal de continuar assistindo estiver aberto, a navegação é restrita a ele
    const isModalOpen = document.querySelector('#modal-continue.active');
    if (isModalOpen) {
      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        e.preventDefault();
        const btnStart = document.querySelector('#btn-start-over');
        const btnResume = document.querySelector('#btn-resume');
        
        if (currentFocus === btnResume) {
          setFocus(btnStart);
        } else {
          setFocus(btnResume);
        }
        return;
      }
      
      if (key === 'Enter') {
        e.preventDefault();
        if (currentFocus) currentFocus.click();
        return;
      }
      
      // Bloqueia outras teclas enquanto o modal estiver aberto
      if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'Escape' || key === 'Backspace') {
        e.preventDefault();
        return;
      }
    }

    const isPlayerScreen = document.getElementById('screen-player')?.classList.contains('active');

    // Se estiver no player, isola a navegação
    if (isPlayerScreen) {
      if (key === ' ' || key === 'ArrowLeft' || key === 'ArrowRight') return;
      
      if (key === 'Enter') {
        e.preventDefault();
        if (currentFocus) currentFocus.click();
        return;
      }

      if (key === 'ArrowUp' || key === 'ArrowDown') {
        e.preventDefault();
        
        if (!currentFocus) {
          const playBtn = document.querySelector('#btn-play-pause');
          if(playBtn) setFocus(playBtn);
          return;
        }

        if (key === 'ArrowDown') {
          if (currentFocus.id === 'btn-back') setFocus(document.querySelector('#btn-play-pause'));
          else if (currentFocus.id === 'btn-play-pause') setFocus(document.querySelector('#video-progress'));
        } else if (key === 'ArrowUp') {
          if (currentFocus.id === 'video-progress') setFocus(document.querySelector('#btn-play-pause'));
          else if (currentFocus.id === 'btn-play-pause') setFocus(document.querySelector('#btn-back'));
        }
        return;
      }
      return;
    }
    
    if (key === 'Escape' || key === 'Backspace' || key === 'Home' || key === 'BrowserBack') {
      const activeScreen = document.querySelector('.screen.active');
      if (activeScreen) {
        const searchInput = activeScreen.querySelector('#search-input');
        const backBtn = activeScreen.querySelector('.btn-back');
        if (searchInput) {
          e.preventDefault(); searchInput.focus(); searchInput.classList.add('focused'); currentFocus = searchInput;
        } else if (backBtn) {
          e.preventDefault(); setFocus(backBtn);
        }
      }
      return;
    }

    const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'];
    if (!validKeys.includes(key)) return;

    const isInput = document.activeElement.tagName === 'INPUT';
    if (isInput) {
      if (key === 'Enter') {
        document.activeElement.blur(); e.preventDefault();
        if (document.activeElement.id === 'search-input') {
          const firstCard = document.querySelector('#content .card');
          if (firstCard) { document.activeElement.classList.remove('focused'); setFocus(firstCard); }
        } else {
          const form = document.activeElement.closest('form');
          const submitBtn = form ? form.querySelector('.btn-action') : null;
          if (submitBtn) setFocus(submitBtn);
        }
        return;
      }
      if (key === 'ArrowLeft' || key === 'ArrowRight') return; 
      const moved = moveFocus(key, true);
      if (moved) { e.preventDefault(); document.activeElement.blur(); }
      return; 
    }

    if (!currentFocus) {
      const activeScreen = document.querySelector('.screen.active');
      if (!activeScreen) return;
      const firstFocusable = activeScreen.querySelector('.card, .animated-button, .login-tab, .btn-gear, .btn-back, .hub-card, .btn-danger, .btn-menu, .category-btn, .search-container input, .season-btn, .episode-card');
      if (firstFocusable) { setFocus(firstFocusable); e.preventDefault(); }
      return;
    }

    if (key === 'Enter') { e.preventDefault(); currentFocus.click(); return; }

    e.preventDefault();
    moveFocus(key);
  });
}

export function setFocus(el) {
  if (!el) return;
  document.querySelectorAll('.focused').forEach(e => e.classList.remove('focused'));
  currentFocus = el;
  currentFocus.classList.add('focused');
  currentFocus.focus();
  currentFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function moveFocus(direction, fromInput = false) {
  const activeScreen = document.querySelector('.screen.active');
  if (!activeScreen) return false;

  const currentEl = fromInput ? document.activeElement : currentFocus;
  if (!currentEl) return false;

  if (currentEl.classList.contains('season-btn')) {
    if (direction === 'ArrowRight' || direction === 'ArrowLeft') {
      const seasons = Array.from(document.querySelectorAll('.season-btn'));
      const idx = seasons.indexOf(currentEl);
      if (direction === 'ArrowRight' && idx < seasons.length - 1) { setFocus(seasons[idx + 1]); return true; }
      if (direction === 'ArrowLeft' && idx > 0) { setFocus(seasons[idx - 1]); return true; }
      return false;
    }
    if (direction === 'ArrowDown') { const firstEp = document.querySelector('.episode-card'); if (firstEp) { setFocus(firstEp); return true; } }
    if (direction === 'ArrowUp') { const backBtn = document.querySelector('#btn-back-series'); if (backBtn) { setFocus(backBtn); return true; } }
    return false;
  }

  if (currentEl.classList.contains('episode-card')) {
    if (direction === 'ArrowUp' || direction === 'ArrowDown') {
      const eps = Array.from(document.querySelectorAll('.episode-card'));
      const idx = eps.indexOf(currentEl);
      if (direction === 'ArrowDown' && idx < eps.length - 1) { setFocus(eps[idx + 1]); return true; }
      if (direction === 'ArrowUp') {
        if (idx > 0) { setFocus(eps[idx - 1]); return true; }
        else { const activeSeason = document.querySelector('.season-btn.active'); if (activeSeason) { setFocus(activeSeason); return true; } }
      }
      return false;
    }
    return false;
  }

  const focusables = Array.from(activeScreen.querySelectorAll('.card, .animated-button, .login-tab, .btn-gear, .btn-back, .hub-card, .btn-danger, .btn-menu, .category-btn, .search-container input, .season-btn, .episode-card'));
  if (focusables.length === 0) return false;

  const currentRect = currentEl.getBoundingClientRect();
  let bestMatch = null;
  let minDistance = Infinity;

  focusables.forEach(el => {
    if (el === currentEl) return;
    const rect = el.getBoundingClientRect();
    let isInDirection = false;

    if (direction === 'ArrowRight') isInDirection = rect.left >= currentRect.right - 10; 
    else if (direction === 'ArrowLeft') isInDirection = rect.right <= currentRect.left + 10;
    else if (direction === 'ArrowDown') isInDirection = rect.top >= currentRect.bottom - 10;
    else if (direction === 'ArrowUp') isInDirection = rect.bottom <= currentRect.top + 10;

    if (direction === 'ArrowUp' && currentRect.top > 150) { if (rect.top < 100) isInDirection = true; }

    if (isInDirection) {
      const dx = (rect.left + rect.width / 2) - (currentRect.left + currentRect.width / 2);
      const dy = (rect.top + rect.height / 2) - (currentRect.top + currentRect.height / 2);
      const realDistance = Math.abs(dx) + Math.abs(dy);
      if (realDistance < minDistance) { minDistance = realDistance; bestMatch = el; }
    }
  });

  if (bestMatch) { setFocus(bestMatch); return true; }
  return false;
}