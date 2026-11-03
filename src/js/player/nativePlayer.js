export function playNative(videoEl, url) {
  videoEl.src = url;
  return videoEl.play().catch((e) => console.error('playNative erro', e));
}