export function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      const name = line.split(',').pop().trim() || 'Sem nome';
      const logo = /tvg-logo="([^"]+)"/.exec(line)?.[1] || '';
      const group = /group-title="([^"]+)"/.exec(line)?.[1] || 'Geral';
      
      current = { name, logo, group, url: '' };
    } else if (line.startsWith('http') && current) {
      current.url = line;
      items.push(current);
      current = null;
    }
  }
  return items;
}