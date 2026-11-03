import { createHls, canPlayNativeHls } from './hlsSetup.js';
import { playNative } from './nativePlayer.js';

export class PlayerManager {
  constructor(videoEl) {
    this.video = videoEl;
    this.hls = null;
  }

  async play(item) {
    const url = typeof item === 'string' ? item : item.url;
    const title = typeof item === 'string' ? '' : (item.name || '');
    const titleEl = document.getElementById('player-title');
    if (titleEl) titleEl.textContent = title;

    this.stop(); // Para o vídeo anterior e limpa a memória

    const isHls = /\.m3u8(\?|$)/i.test(url);

    if (!isHls) {
      this.video.src = url;
      return this.video.play().catch((e) => console.error('Erro nativo:', e));
    }

    if (canPlayNativeHls()) {
      return playNative(this.video, url);
    }

    this.hls = createHls(this.video);
    if (!this.hls) {
      console.warn('HLS não suportado neste navegador');
      return;
    }

    return new Promise((resolve, reject) => {
      this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        this.video.play().then(resolve).catch(reject);
      });
      this.hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('HLS erro fatal:', data);
          reject(data);
        }
      });
      this.hls.loadSource(url);
    });
  }

  stop() {
    if (this.hls) { 
      this.hls.destroy(); 
      this.hls = null; 
    }
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
  }
}