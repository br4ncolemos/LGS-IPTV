const KEY_LISTS = 'lgs:lists';
const KEY_MAC = 'lgs:device_mac';
const KEY_HISTORY = 'lgs:history';

export const storage = {
  getDeviceMac() {
    let mac = localStorage.getItem(KEY_MAC);
    if (!mac) {
      const hex = () => Math.floor(Math.random() * 255).toString(16).padStart(2, '0').toUpperCase();
      mac = `00:1A:2B:${hex()}:${hex()}:${hex()}`;
      localStorage.setItem(KEY_MAC, mac);
    }
    return mac;
  },

  getLists() {
    try {
      const data = localStorage.getItem(KEY_LISTS);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  saveList(list) {
    const lists = this.getLists();
    const filtered = lists.filter(l => l.name !== list.name);
    filtered.push(list);
    localStorage.setItem(KEY_LISTS, JSON.stringify(filtered));
  },

  removeList(name) {
    const lists = this.getLists().filter(l => l.name !== name);
    localStorage.setItem(KEY_LISTS, JSON.stringify(lists));
  },

  getActiveList() {
    const lists = this.getLists();
    return lists.length > 0 ? lists[0] : null;
  },

  // --- HISTÓRICO (Chave = Título do Filme) ---
  getHistory() {
    try {
      const data = localStorage.getItem(KEY_HISTORY);
      return data ? JSON.parse(data) : {};
    } catch { return {}; }
  },

  saveProgress(title, url, currentTime, duration) {
    if (duration > 0 && (currentTime / duration) > 0.95) {
      this.removeProgress(title);
      return;
    }

    const history = this.getHistory();
    history[title] = { url, currentTime, duration, lastWatched: Date.now() };
    localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
  },

  getProgress(title) {
    const history = this.getHistory();
    return history[title] || null;
  },

  removeProgress(title) {
    const history = this.getHistory();
    if (history[title]) {
      delete history[title];
      localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
    }
  }
};