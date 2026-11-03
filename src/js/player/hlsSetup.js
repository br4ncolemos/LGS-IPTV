export function createHls(videoEl) {
  if (!window.Hls || !window.Hls.isSupported()) return null;
  const hls = new window.Hls({
    lowLatencyMode: true,
    backBufferLength: 30,
    maxBufferLength: 20,
  });
  hls.attachMedia(videoEl);
  return hls;
}

export function canPlayNativeHls() {
  const v = document.createElement('video');
  return !!v.canPlayType('application/vnd.apple.mpegurl');
}