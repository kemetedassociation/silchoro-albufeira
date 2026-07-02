/**
 * preloader.js — Progressive frame loader
 * - stride support: load every Nth frame (e.g. stride=2 → f0001,f0003,...,f0251)
 * - sequential background loading: scene2 waits for scene1 to finish
 * - onReady fires at 20% (ensures first scene is mostly ready before unlocking scroll)
 */

class FramePreloader {
  constructor() {
    this.cache       = new Map();
    this.loading     = new Set();
    this.totalFrames = 0;
    this.loadedFrames = 0;
    this.onProgress  = null;
    this.onReady     = null;
    this.readyFired  = false;
  }

  /**
   * Build URL list for a scene.
   * stride=1 → every frame (f0001…f0251)
   * stride=2 → every other frame (f0001,f0003,…,f0251) — full coverage, half the files
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
    if (this.cache.has(url)) return Promise.resolve(this.cache.get(url));
    if (this.loading.has(url)) {
      return new Promise(res => {
        const poll = setInterval(() => {
          if (this.cache.has(url)) { clearInterval(poll); res(this.cache.get(url)); }
        }, 16);
      });
    }
    this.loading.add(url);
    return new Promise((resolve, reject) => {
      const img       = new Image();
      img.decoding    = 'async';
      img.onload = () => {
        this.cache.set(url, img);
        this.loading.delete(url);
        this.loadedFrames++;
        const pct = Math.round((this.loadedFrames / this.totalFrames) * 100);
        this.onProgress?.(Math.min(pct, 100));
        if (!this.readyFired && pct >= 20) {
          this.readyFired = true;
          this.onReady?.();
        }
        resolve(img);
      };
      img.onerror = () => {
        this.loading.delete(url);
        this.loadedFrames++;          // count as loaded so progress keeps moving
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
   * Main entry — load scenes in strict priority order.
   * @param {Array<{basePath, count, stride?}>} scenes
   */
  async load(scenes) {
    this.totalFrames = scenes.reduce((s, sc) => s + sc.count, 0);

    for (const scene of scenes) {
      scene.urls = FramePreloader.urls(scene.basePath, scene.count, scene.stride || 1);
    }

    // Priority 1: scene1 — 12 concurrent, block until done
    if (scenes[0]) {
      await this._loadBatch(scenes[0].urls, 12);
    }

    // Priority 2+: remaining scenes strictly in sequence, 4 concurrent each
    // Sequential = scene2 fully loads before scene3 starts → smoother progression
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

  /** Get a frame image by scene config + frame index */
  frame(scene, idx) {
    if (!scene.urls || !scene.urls.length) return null;
    const i = Math.max(0, Math.min(Math.round(idx), scene.urls.length - 1));
    return this.get(scene.urls[i]);
  }

  isLoaded(scene) {
    return scene.urls?.every(u => this.cache.has(u)) ?? false;
  }
}

window.FramePreloader = FramePreloader;
