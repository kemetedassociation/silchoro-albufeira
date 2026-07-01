/**
 * preloader.js — Progressive frame loader with smart caching
 * Strategy: load first scene immediately, stream others in background
 */

class FramePreloader {
  constructor() {
    this.cache = new Map();       // url → HTMLImageElement
    this.loading = new Set();     // urls currently fetching
    this.totalFrames = 0;
    this.loadedFrames = 0;
    this.onProgress = null;       // (pct: 0–100) => void
    this.onReady = null;          // () => void  — fires at 15% loaded
    this.readyFired = false;
  }

  /** Build sequential frame URL list for a scene */
  static urls(basePath, count, pad = 4) {
    const list = [];
    for (let i = 1; i <= count; i++) {
      list.push(`${basePath}/f${String(i).padStart(pad, '0')}.webp`);
    }
    return list;
  }

  /** Load a single image, resolve with the element */
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
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        this.cache.set(url, img);
        this.loading.delete(url);
        this.loadedFrames++;
        const pct = Math.round((this.loadedFrames / this.totalFrames) * 100);
        this.onProgress?.(pct);
        if (!this.readyFired && pct >= 15) {
          this.readyFired = true;
          this.onReady?.();
        }
        resolve(img);
      };
      img.onerror = () => { this.loading.delete(url); reject(new Error(`Failed: ${url}`)); };
      img.src = url;
    });
  }

  /** Load a batch of URLs concurrently (respecting concurrency limit) */
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
   * Main entry — load scenes in priority order
   * @param {Array<{id, basePath, count}>} scenes
   */
  async load(scenes) {
    this.totalFrames = scenes.reduce((s, sc) => s + sc.count, 0);

    for (const scene of scenes) {
      scene.urls = FramePreloader.urls(scene.basePath, scene.count);
    }

    // Priority 1: first scene — load synchronously at full concurrency
    if (scenes[0]) {
      await this._loadBatch(scenes[0].urls, 12);
    }

    // Priority 2: remaining scenes — background stream
    const rest = scenes.slice(1);
    for (const scene of rest) {
      this._loadBatch(scene.urls, 6).catch(() => {});
    }
  }

  /** Get a loaded frame (returns null if not yet loaded) */
  get(url) {
    return this.cache.get(url) || null;
  }

  /** Get frame by scene + index */
  frame(scene, idx) {
    const url = scene.urls?.[Math.max(0, Math.min(idx, scene.count - 1))];
    return url ? this.get(url) : null;
  }

  isLoaded(scene) {
    return scene.urls?.every(u => this.cache.has(u)) ?? false;
  }
}

window.FramePreloader = FramePreloader;
