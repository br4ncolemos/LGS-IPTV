import { PlayerManager } from './player/playerManager.js';
import { storage } from './api/storage.js';
import { parseM3U } from './api/iptvParser.js';
import { XtreamApi } from './api/xtreamApi.js';
import { initSpatialNavigation, setFocus } from './tv/spatialNav.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// --- O EXTERMINADOR DE BANNER (SHADOW DOM KILLER) ---
// Roda assim que a página carrega
document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        // Se o nó for o banner ou contiver o banner
        if (node.nodeName && node.nodeName.toLowerCase() === 'netlify-badge') {
          node.remove();
        }
        if (node.id === 'netlify-badge' || node.className === 'netlify-badge') {
          node.remove();
        }
      });
    });
  });
  
  // Observa TUDO na página, até o que o Netlify injeta por baixo dos panos
  observer.observe(document.documentElement, { 
    childList: true, 
    subtree: true 
  });
});

// --- SISTEMA MAC ADDRESS (Blindado) ---
setTimeout(() => {
  try {
    const mac = storage.getDeviceMac();
    if ($('#setup-mac')) $('#setup-mac').textContent = mac;
    if ($('#home-mac')) $('#home-mac').textContent = mac;
    if ($('#settings-mac')) $('#settings-mac').textContent = mac;
  } catch(e) {}
}, 100);

let currentPlaylist = []; 
let filteredPlaylist = []; 
let currentXtreamApi = null;
let currentSeriesData = null;
let currentMovieData = null;
let currentViewType = 'live'; 
let currentCategoryId = '';
let previousScreen = 'screen-channels'; 

let renderIndex = 0;
const RENDER_BATCH = 20;
let isRendering = false;

let hideControlsTimeout;
let progressSaveInterval;
let pendingPlayData = null; 

const video = $('#video');

function showToast(message, type = 'info') {
  const container = $('#toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
}

function showLoader(text = 'Carregando...') {
  const loader = $('#global-loader');
  if (loader) { loader.querySelector('.loader-text').innerHTML = text; loader.classList.add('active'); }
}
function hideLoader() { 
  const loader = $('#global-loader'); 
  if (loader) loader.classList.remove('active'); 
}

setTimeout(() => {
  const loader = $('#global-loader');
  if (loader && loader.classList.contains('active')) {
    hideLoader();
    showScreen('screen-setup');
  }
}, 4000);

async function enterFullscreen() {
  const el = $('#screen-player');
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
  } catch (err) { console.warn("Tela cheia bloqueada:", err); }
}

async function exitFullscreen() {
  try {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    }
    if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
  } catch (err) { console.warn(err); }
}

function showScreen(id) {
  const currentActive = document.querySelector('.screen.active');
  if (currentActive && currentActive.id !== 'screen-player' && id === 'screen-player') {
    previousScreen = currentActive.id;
  }

  $$('.screen').forEach((s) => s.classList.remove('active'));
  const screen = document.getElementById(id);
  if(screen) {
    screen.classList.add('active');
    setTimeout(() => {
      if (id === 'screen-home') {
        const first = document.querySelector('.hub-card'); if(first) setFocus(first);
      } else if (id === 'screen-channels') {
        const first = document.querySelector('#sidebar .category-btn.active, #content .card'); 
        if(first) setFocus(first);
      } else if (id === 'screen-series-details') {
        const first = document.querySelector('.season-btn'); 
        if(first) setFocus(first);
      } else if (id === 'screen-movie-details') {
        const playBtn = document.querySelector('#btn-play-movie');
        if(playBtn) setFocus(playBtn);
      } else if (id === 'screen-settings') {
        const backBtn = document.querySelector('#btn-back-settings');
        if(backBtn) setFocus(backBtn);
      } else if (id === 'screen-player') {
        const playBtn = document.querySelector('#btn-play-pause');
        if(playBtn) setFocus(playBtn);
      }
    }, 100);
  }
}

function showPlayerControls() {
  const overlay = $('#player-controls');
  const screen = $('#screen-player');
  if(!overlay) return;
  
  overlay.classList.add('visible');
  screen.classList.add('show-cursor');
  
  clearTimeout(hideControlsTimeout);
  
  if (video.paused) return;

  hideControlsTimeout = setTimeout(() => {
    overlay.classList.remove('visible');
    screen.classList.remove('show-cursor');
  }, 4000);
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateProgressBar() {
  if (!video.duration) return;
  const pct = (video.currentTime / video.duration) * 100;
  $('#video-progress').value = pct;
  $('#video-progress').style.setProperty('--progress', pct + '%');
  $('#time-current').textContent = formatTime(video.currentTime);
  $('#time-total').textContent = formatTime(video.duration);
}

function loadMoreItems() {
  if (isRendering || renderIndex >= filteredPlaylist.length) return;
  isRendering = true;

  const content = $('#content');
  const grid = content.querySelector('.grid-container') || document.createElement('div');
  if (!content.querySelector('.grid-container')) {
    grid.className = 'grid-container';
    content.innerHTML = '';
    content.appendChild(grid);
  }

  const batch = filteredPlaylist.slice(renderIndex, renderIndex + RENDER_BATCH);
  
  batch.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'card'; card.setAttribute('tabindex', '0');
    card.innerHTML = `
      <img src="${ch.logo || 'public/assets/images/fallback.png'}" alt="${ch.name}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'160\\' height=\\'220\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23222\\'/></svg>'" />
      <div class="card-title">${ch.name}</div>
    `;
    
    card.addEventListener('click', async () => {
      if (ch.type === 'series') openSeriesDetails(ch.id, ch.name);
      else if (ch.type === 'vod') openMovieDetails(ch);
      else initiatePlay(ch.url, ch.name); 
    });

    grid.appendChild(card);
  });

  renderIndex += RENDER_BATCH;
  isRendering = false;
}

function renderGrid(channels) {
  filteredPlaylist = channels;
  renderIndex = 0;
  const content = $('#content');
  content.innerHTML = '<div class="grid-container"></div>';
  
  if (channels.length === 0) {
    content.innerHTML = '<p class="empty">Nenhum item encontrado.</p>';
    return;
  }

  content.onscroll = () => {
    if (content.scrollTop + content.clientHeight >= content.scrollHeight - 200) {
      loadMoreItems();
    }
  };
  loadMoreItems();
}

function renderCategories(categories) {
  const list = $('#category-list');
  list.innerHTML = '';
  
  const allBtn = document.createElement('button');
  allBtn.className = 'category-btn active';
  allBtn.textContent = 'Todos';
  allBtn.setAttribute('tabindex', '0');
  allBtn.onclick = () => { fetchCategory(''); };
  list.appendChild(allBtn);

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.textContent = cat.category_name;
    btn.setAttribute('tabindex', '0');
    btn.onclick = () => { fetchCategory(cat.category_id, btn); };
    list.appendChild(btn);
  });
}

function renderSeriesDetails(seriesInfo, seriesName) {
  $('#series-details-title').textContent = seriesName;
  $('#series-cover').src = seriesInfo.info.cover || 'public/assets/images/fallback.png';
  $('#series-plot').textContent = seriesInfo.info.plot || 'Sem sinopse disponível.';
  $('#series-genre').textContent = seriesInfo.info.genre || 'Não informado';
  $('#series-release').textContent = seriesInfo.info.releaseDate || 'Não informado';
  $('#series-rating').textContent = `★ ${seriesInfo.info.rating || '0.0'}`;

  const seasonsTabs = $('#seasons-tabs');
  const episodesList = $('#episodes-list');
  seasonsTabs.innerHTML = ''; episodesList.innerHTML = '';

  const seasons = Object.keys(seriesInfo.episodes);

  seasons.forEach((seasonNum, index) => {
    const btn = document.createElement('button');
    btn.className = `season-btn ${index === 0 ? 'active' : ''}`;
    btn.textContent = `Temporada ${seasonNum}`;
    btn.setAttribute('tabindex', '0');
    btn.onclick = () => {
      $$('.season-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetHeader = document.getElementById(`season-header-${seasonNum}`);
      if (targetHeader) targetHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    seasonsTabs.appendChild(btn);
  });

  seasons.forEach((seasonNum) => {
    const header = document.createElement('div');
    header.className = 'season-header';
    header.id = `season-header-${seasonNum}`;
    header.textContent = `Temporada ${seasonNum}`;
    episodesList.appendChild(header);

    seriesInfo.episodes[seasonNum].forEach(ep => {
      const epCard = document.createElement('div');
      epCard.className = 'episode-card'; epCard.setAttribute('tabindex', '0');
      epCard.innerHTML = `
        <div class="ep-num">${ep.episode_num}</div>
        <div class="ep-info">
          <div class="ep-title">${ep.title}</div>
          <div class="ep-plot">${ep.info.plot || 'Sem descrição.'}</div>
        </div>
      `;
      const url = currentXtreamApi.episodeUrl(ep.id, ep.container_extension);
      epCard.onclick = () => initiatePlay(url, `${ep.title} (T${ep.season})`);
      episodesList.appendChild(epCard);
    });
  });
}

async function openSeriesDetails(seriesId, seriesName) {
  showLoader('Buscando episódios...');
  try {
    const info = await currentXtreamApi.getSeriesInfo(seriesId);
    currentSeriesData = { id: seriesId, name: seriesName, info };
    renderSeriesDetails(info, seriesName);
    showScreen('screen-series-details');
  } catch (err) { 
    showToast('Erro ao carregar série.', 'error'); 
  } finally {
    hideLoader();
  }
}

function openMovieDetails(movie) {
  currentMovieData = movie;
  $('#movie-details-title').textContent = movie.name;
  $('#movie-cover').src = movie.logo || 'public/assets/images/fallback.png';
  $('#movie-plot').textContent = movie.plot || 'Sem sinopse disponível.';
  $('#movie-genre').textContent = movie.genre || 'Não informado';
  $('#movie-release').textContent = movie.releaseDate || 'Não informado';
  $('#movie-rating').textContent = `★ ${movie.rating || '0.0'}`;
  
  showScreen('screen-movie-details');
}

async function fetchCategory(catId, btnElement = null) {
  $$('.category-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  else document.querySelector('.category-btn').classList.add('active');

  currentCategoryId = catId;
  showLoader('Buscando...');

  try {
    if (currentViewType === 'live') {
      const streams = await currentXtreamApi.getLiveStreams(catId);
      currentPlaylist = streams.map(s => ({ name: s.name, logo: s.stream_icon, url: currentXtreamApi.liveUrl(s.stream_id), type: 'live' }));
    } else if (currentViewType === 'movies') {
      const vods = await currentXtreamApi.getVodStreams(catId);
      currentPlaylist = vods.map(v => ({ 
        name: v.name, 
        logo: v.stream_icon, 
        url: currentXtreamApi.vodUrl(v.stream_id, v.container_extension), 
        type: 'vod',
        plot: v.plot,
        genre: v.genre,
        releaseDate: v.releasedate,
        rating: v.rating
      }));
    } else if (currentViewType === 'series') {
      const series = await currentXtreamApi.getSeries(catId);
      currentPlaylist = series.map(s => ({ name: s.name, logo: s.cover, id: s.series_id, type: 'series' }));
    }
    renderGrid(currentPlaylist);
  } catch (err) { 
    showToast('Erro ao carregar categoria.', 'error'); 
  } finally {
    hideLoader();
  }
}

function initiatePlay(url, title) {
  const history = storage.getProgress(title);
  
  if (history && history.currentTime > 10) {
    pendingPlayData = { url, title, startTime: history.currentTime };
    
    $('#modal-movie-name').textContent = title;
    $('#modal-movie-time').textContent = `Você parou em ${formatTime(history.currentTime)}`;
    $('#modal-continue').classList.add('active');
    
    setTimeout(() => {
      const btnResume = $('#btn-resume');
      if(btnResume) setFocus(btnResume);
    }, 100);
  } else {
    executePlay(url, title, 0);
  }
}

function executePlay(url, title, startTime) {
  $('#modal-continue').classList.remove('active');
  const player = new PlayerManager(video);
  showScreen('screen-player');
  $('#player-title').textContent = title;
  
  showPlayerControls();
  $('#video-progress').value = 0;
  $('#time-current').textContent = '00:00';
  $('#time-total').textContent = '00:00';

  enterFullscreen();

  showLoader('Sintonizando...');
  player.play({ url, name: title }).then(() => {
    hideLoader();
    if (startTime > 0) {
      video.currentTime = startTime;
    }
    
    clearInterval(progressSaveInterval);
    progressSaveInterval = setInterval(() => {
      if (video.duration) {
        storage.saveProgress(title, url, video.currentTime, video.duration);
      }
    }, 5000);

  }).catch(() => {
    hideLoader(); showToast('Erro no vídeo.', 'error'); showScreen(previousScreen);
  });
}

async function tryAutoLogin() {
  const activeList = storage.getActiveList();
  if (!activeList) return false; 
  
  showLoader('Restaurando sessão...');
  try {
    if (activeList.type === 'xtream') {
      currentXtreamApi = new XtreamApi(activeList);
      const streams = await currentXtreamApi.getLiveStreams();
      currentPlaylist = streams.map(s => ({ name: s.name, logo: s.stream_icon, url: currentXtreamApi.liveUrl(s.stream_id), type: 'live' }));
    } else if (activeList.type === 'm3u') {
      const res = await fetch(activeList.url);
      const text = await res.text();
      currentPlaylist = parseM3U(text).map(c => ({...c, type: 'live'}));
    }
    hideLoader(); 
    showScreen('screen-home'); 
    return true;
  } catch (err) {
    console.warn("Erro no auto-login, mas mantendo a sessão:", err);
    hideLoader(); 
    showToast('Sua lista está offline, mas seu MAC está salvo.', 'error');
    showScreen('screen-home'); 
    return true;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  initSpatialNavigation();
  showLoader('Iniciando...');
  
  const isLogged = await tryAutoLogin();
  if (!isLogged) { 
    showScreen('screen-setup'); 
    hideLoader(); 
  }

  $('#btn-resume').addEventListener('click', () => {
    if (pendingPlayData) executePlay(pendingPlayData.url, pendingPlayData.title, pendingPlayData.startTime);
  });

  $('#btn-start-over').addEventListener('click', () => {
    if (pendingPlayData) {
      storage.removeProgress(pendingPlayData.title); 
      executePlay(pendingPlayData.url, pendingPlayData.title, 0);
    }
  });

  $$('.hub-card').forEach(card => {
    card.addEventListener('click', async () => {
      const target = card.dataset.target;
      currentViewType = target;
      $('#channels-title').textContent = card.querySelector('h3').textContent;
      
      if (!currentXtreamApi && target !== 'live') {
        return showToast('Filmes e Séries apenas no Xtream Codes.', 'error');
      }

      $('#sidebar').style.display = 'flex'; 
      showLoader('Buscando categorias...');

      try {
        if (target === 'live') {
          if (currentXtreamApi) {
            const cats = await currentXtreamApi.getLiveCategories();
            renderCategories(cats);
          }
          await fetchCategory('');
          showScreen('screen-channels');
        } 
        else if (target === 'movies') {
          const cats = await currentXtreamApi.getVodCategories();
          renderCategories(cats);
          await fetchCategory('');
          showScreen('screen-channels');
        }
        else if (target === 'series') {
          const cats = await currentXtreamApi.getSeriesCategories();
          renderCategories(cats);
          await fetchCategory('');
          showScreen('screen-channels');
        }
      } catch (err) {
        hideLoader();
        showToast('Erro ao carregar categorias.', 'error');
      }
    });
  });

  $('#btn-back-home').addEventListener('click', () => showScreen('screen-home'));
  $('#btn-back-series').addEventListener('click', () => showScreen('screen-channels'));
  $('#btn-back-movie').addEventListener('click', () => showScreen('screen-channels'));
  $('#btn-back-settings').addEventListener('click', () => showScreen('screen-home'));
  $('#btn-open-settings').addEventListener('click', () => { showScreen('screen-settings'); });
  $('#btn-toggle-sidebar').addEventListener('click', () => {
    const sidebar = $('#sidebar');
    sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
  });

  $('#search-input').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    if (!term) { renderGrid(currentPlaylist); return; }
    const results = currentPlaylist.filter(item => item.name.toLowerCase().includes(term));
    renderGrid(results);
  });

  const togglePlay = () => {
    if (video.paused) video.play(); else video.pause();
  };

  $('#btn-play-pause').addEventListener('click', togglePlay);
  $('#btn-rewind').addEventListener('click', () => { video.currentTime -= 10; updateProgressBar(); showPlayerControls(); });
  $('#btn-forward').addEventListener('click', () => { video.currentTime += 10; updateProgressBar(); showPlayerControls(); });

  $('#btn-play-movie').addEventListener('click', () => {
    if (currentMovieData) initiatePlay(currentMovieData.url, currentMovieData.name);
  });

  video.addEventListener('play', () => {
    $('#icon-play').style.display = 'none';
    $('#icon-pause').style.display = 'block';
    showPlayerControls(); 
  });
  
  video.addEventListener('pause', () => {
    $('#icon-play').style.display = 'block';
    $('#icon-pause').style.display = 'none';
    showPlayerControls(); 
    clearTimeout(hideControlsTimeout); 
  });

  video.addEventListener('timeupdate', updateProgressBar);

  $('#video-progress').addEventListener('input', (e) => {
    const pct = e.target.value;
    e.target.style.setProperty('--progress', pct + '%');
    if (video.duration) $('#time-current').textContent = formatTime((pct / 100) * video.duration);
  });

  $('#video-progress').addEventListener('change', (e) => {
    const pct = e.target.value;
    if (video.duration) video.currentTime = (pct / 100) * video.duration;
  });

  $('#screen-player').addEventListener('mousemove', showPlayerControls);
  $('#screen-player').addEventListener('click', (e) => {
    if (e.target === video || e.target === $('#player-controls')) showPlayerControls();
  });

  window.addEventListener('keydown', (e) => {
    if (document.getElementById('screen-player').classList.contains('active')) {
      showPlayerControls(); 
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); togglePlay(); } 
      else if (e.key === 'ArrowLeft' && document.activeElement.id !== 'btn-rewind') { e.preventDefault(); video.currentTime -= 10; updateProgressBar(); } 
      else if (e.key === 'ArrowRight' && document.activeElement.id !== 'btn-forward') { e.preventDefault(); video.currentTime += 10; updateProgressBar(); }
    }
  });

  $('#btn-logout').addEventListener('click', () => {
    const active = storage.getActiveList(); if (active) storage.removeList(active.name); 
    window.location.reload(); 
  });

  $('#btn-back').addEventListener('click', async () => {
    if (video.duration && video.currentTime > 10) {
      const currentTitle = $('#player-title').textContent;
      storage.saveProgress(currentTitle, video.src, video.currentTime, video.duration);
    }
    video.pause();
    video.removeAttribute('src');
    video.load();
    clearTimeout(hideControlsTimeout);
    clearInterval(progressSaveInterval);
    await exitFullscreen();
    showScreen(previousScreen); 
  });

  const loginTabs = $$('.login-tab');
  const formXtream = $('#form-xtream');
  const formM3u = $('#form-m3u');

  loginTabs.forEach(tab => {
    tab.setAttribute('tabindex', '0');
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      loginTabs.forEach(t => t.classList.remove('active'));
      formXtream.classList.remove('active'); formM3u.classList.remove('active');
      tab.classList.add('active');
      if (tab.dataset.type === 'xtream') formXtream.classList.add('active');
      if (tab.dataset.type === 'm3u') formM3u.classList.add('active');
    });
  });

  formXtream.addEventListener('submit', async (e) => {
    e.preventDefault(); showLoader('Conectando...');
    const name = $('#xt-name').value, user = $('#xt-user').value, pass = $('#xt-pass').value, host = $('#xt-host').value;
    try {
      const api = new XtreamApi({ host, username: user, password: pass });
      const streams = await api.getLiveStreams();
      if (!streams || streams.length === 0) throw new Error('Vazio');
      
      storage.saveList({ name, type: 'xtream', host, username: user, password: pass });
      currentXtreamApi = api;
      currentPlaylist = streams.map(s => ({ name: s.name, logo: s.stream_icon, url: api.liveUrl(s.stream_id), type: 'live' }));
      showScreen('screen-home'); hideLoader(); showToast('Conectado!', 'success');
    } catch (err) { hideLoader(); showToast('Erro Xtream. Verifique seus dados.', 'error'); }
  });

  formM3u.addEventListener('submit', async (e) => {
    e.preventDefault(); showLoader('Baixando...');
    const name = $('#m3u-name').value, url = $('#m3u-url').value;
    try {
      const res = await fetch(url); if (!res.ok) throw new Error('Erro');
      const text = await res.text();
      const channels = parseM3U(text);
      storage.saveList({ name, type: 'm3u', url });
      currentPlaylist = channels.map(c => ({...c, type: 'live'}));
      showScreen('screen-home'); hideLoader(); showToast('M3U Carregada!', 'success');
    } catch (err) { hideLoader(); showToast('Erro M3U.', 'error'); }
  });
});
