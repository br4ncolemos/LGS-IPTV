export class XtreamApi {
  constructor({ host, username, password }) {
    this.host = host.replace(/\/+$/, '');
    this.username = username;
    this.password = password;
  }

  get base() {
    return `${this.host}/player_api.php?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`;
  }

  async request(action = '', extra = '') {
    const url = `${this.base}${action ? '&action=' + action : ''}${extra}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
    return res.json();
  }

  // --- AO VIVO ---
  async getLiveCategories() { return this.request('get_live_categories'); }
  async getLiveStreams(catId = '') { return this.request('get_live_streams', catId ? `&category_id=${catId}` : ''); }
  liveUrl(streamId, ext = 'm3u8') { return `${this.host}/live/${this.username}/${this.password}/${streamId}.${ext}`; }

  // --- FILMES (VOD) ---
  async getVodCategories() { return this.request('get_vod_categories'); }
  async getVodStreams(catId = '') { return this.request('get_vod_streams', catId ? `&category_id=${catId}` : ''); }
  vodUrl(streamId, ext = 'mp4') { return `${this.host}/movie/${this.username}/${this.password}/${streamId}.${ext}`; }

  // --- SÉRIES ---
  async getSeriesCategories() { return this.request('get_series_categories'); }
  async getSeries(catId = '') { return this.request('get_series', catId ? `&category_id=${catId}` : ''); }
  async getSeriesInfo(seriesId) { return this.request('get_series_info', `&series_id=${seriesId}`); }
  episodeUrl(episodeId, ext = 'mp4') { return `${this.host}/series/${this.username}/${this.password}/${episodeId}.${ext}`; }
}