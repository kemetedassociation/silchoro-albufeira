/**
 * preloader.js — Progressive frame loader
 *
 * Critical design: frame() looks up URLs by basePath (not object identity).
 * This lets preloader.load(allSeqs) and scrollController(controllerScenes)
 * use different object instances — only basePath must match.
 */

class FramePreloader {
  constructor() {
    this.cache        = new Map();  // url → HTMLImageElement
    this.loading      = new Set();  // urls currently fetching
    this.totalFrames  = 0;
    this.loadedFrames = 0;
    this.onProgress   = null;
    this.onReady      = null;
    this.readyFired   = false;
    this._urlsByPath  = new Map();  // basePath → url[] — the key fix
  }

  /**
   * Build sequential frame URL list.
   * stride=1 → every frame   (f0001…f0251)
   * stride=2 → every 2nd     (f0001,f0003,…f0251) — full coverage, half the files
   */
  static urls(basePath, count, stride = 1, pad = 4) {
    const list = [];
    const last  = count * stride;
    for (let i = 1; i <= last; i += stride) {
      list.push(`${basePath}/f${String(i).padStart(pad, '0')}.webp`);
    }
    return list;
  }

  _loadOne(url) {
    if (this.cache.has(url))   return Promise.resolve(this.cache.get(url));
    if (this.loading.has(url)) {
      return new Promise(res => {
        const poll = setInterval(() => {
          if (this.cache.has(url)) { clearInterval(poll); res(this.cache.get(url)); }
        }, 16);
      });
    }
    this.loading.add(url);
    return new Promise((resolve, reject) => {
      const img    = new Image();
      img.decoding = 'async';
      img.onload = () => {
        this.cache.set(url, img);
        this.loading.delete(url);
        this.loadedFrames++;
        const pct = Math.round((this.loadedFrames / this.totalFrames) * 100);
        this.onProgress?.(Math.min(pct, 100));
        if (!this.readyFired && pct >= 15) {
          this.readyFired = true;
          this.onReady?.();
        }
        resolve(img);
      };
      img.onerror = () => {
        this.loading.delete(url);
        this.loadedFrames++;
        const pct = Math.round((this.loadedFrames / this.totalFrames) * 100);
        this.onProgress?.(Math.min(pct, 100)); // also update bar on 404
        reject(new Error(`Failed: ${url}`));
      };
      img.src = url;
    });
  }

  async _loadBatch(urls, concurrency = 8) {
    let idx = 0;
    const next = async () => {
      if (idx >= urls.length) return;
      const url = urls[idx++];
      await this._loadOne(url).catch(() => {});
      await next();
    };
    const workers = Array.from({ length: Math.min(concurrency, urls.length) }, next);
    await Promise.all(workers);
  }

  /**
   * Load scenes in priority order.
   * URLs are stored BOTH on the scene object AND in _urlsByPath (keyed by basePath).
   * This means frame() works even if the caller uses a different object instance.
   *
   * @param {Array<{basePath, count, stride?}>} scenes
   */
  async load(scenes) {
    this.totalFrames = scenes.reduce((s, sc) => s + sc.count, 0);

    for (const scene of scenes) {
      const urls = FramePreloader.urls(scene.basePath, scene.count, scene.stride || 1);
      scene.urls = urls;                         // mutate for direct lookup
      this._urlsByPath.set(scene.basePath, urls); // index by basePath for cross-object lookup
    }

    // Priority 1: first scene — 12 concurrent, block until done
    if (scenes[0]) {
      await this._loadBatch(scenes[0].urls, 12);
    }

    // Priority 2+: remaining scenes — strict sequence, 4 concurrent each
    // Ensures scene2 frames are ready before scene3 starts loading
    const rest = scenes.slice(1);
    (async () => {
      for (const scene of rest) {
        await this._loadBatch(scene.urls, 4).catch(() => {});
      }
    })();
  }

  get(url) {
    return this.cache.get(url) || null;
  }

  /**
   * Get a frame by scene config + index.
   * Falls back to basePath lookup so it works regardless of object identity.
   */
  frame(scene, idx) {
    // Primary: urls on the scene object itself
    // Fallback: look up by basePath (handles cross-instance usage)
    const urls = scene.urls || this._urlsByPath.get(scene.basePath);
    if (!urls || !urls.length) return null;
    const i = Math.max(0, Math.min(Math.round(idx), urls.length - 1));
    return this.get(urls[i]);
  }

  isLoaded(scene) {
    const urls = scene.urls || this._urlsByPath.get(scene.basePath);
    return urls?.every(u => this.cache.has(u)) ?? false;
  }
}

window.FramePreloader = FramePreloader;
