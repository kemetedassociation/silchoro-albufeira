/**
 * scrollController.js — GSAP ScrollTrigger + Canvas cinematic engine
 * Each scene: sticky canvas, scroll position → exact frame index
 * No interpolation blur — 1 scroll px = 1 exact frame
 */

class ScrollController {
  /**
   * @param {FramePreloader} preloader
   * @param {Array} scenes  — scene config objects
   */
  constructor(preloader, scenes) {
    this.preloader = preloader;
    this.scenes = scenes;
    this.canvases = new Map();   // sceneId → {canvas, ctx}
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.isMobile = window.innerWidth <= 900;
    this._ticking = false;
  }

  /** Create & mount a canvas for a scene */
  _makeCanvas(scene) {
    const canvas = document.getElementById(`canvas-${scene.id}`);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    this._resizeCanvas(canvas, ctx);
    window.addEventListener('resize', () => this._resizeCanvas(canvas, ctx), { passive: true });
    this.canvases.set(scene.id, { canvas, ctx });
    return { canvas, ctx };
  }

  _resizeCanvas(canvas, ctx) {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width  = w * this.dpr;
    canvas.height = h * this.dpr;
    ctx.scale(this.dpr, this.dpr);
  }

  /** Draw a frame onto the canvas — fills with cover scaling */
  _draw(ctx, img, canvasEl) {
    if (!img || !img.naturalWidth) return;
    const cw = canvasEl.offsetWidth;
    const ch = canvasEl.offsetHeight;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    const sx = (cw - sw) / 2;
    const sy = (ch - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh);
  }

  /** Get exact frame index from scroll progress (0–1) */
  _frameIndex(scene, progress) {
    return Math.min(
      Math.round(progress * (scene.count - 1)),
      scene.count - 1
    );
  }

  /** Register all ScrollTriggers */
  init() {
    if (!window.gsap || !window.ScrollTrigger) {
      console.warn('GSAP not loaded'); return;
    }
    gsap.registerPlugin(ScrollTrigger);

    this.scenes.forEach(scene => {
      const cv = this._makeCanvas(scene);
      if (!cv) return;
      const { canvas, ctx } = cv;

      // Draw first available frame immediately
      const firstFrame = this.preloader.frame(scene, 0);
      if (firstFrame) this._draw(ctx, firstFrame, canvas);

      // Animate text elements per scene
      const textEls = document.querySelectorAll(`[data-scene="${scene.id}"] .st-text`);

      ScrollTrigger.create({
        trigger: `#st-wrap-${scene.id}`,
        start: 'top top',
        end: `+=${scene.scrollHeight || 3000}`,
        pin: true,
        pinSpacing: true,
        scrub: false,          // we handle our own rAF sync
        onUpdate: self => {
          if (this._ticking) return;
          this._ticking = true;
          requestAnimationFrame(() => {
            this._ticking = false;
            const progress = self.progress;
            const idx = this._frameIndex(scene, progress);
            const frame = this.preloader.frame(scene, idx);
            if (frame) this._draw(ctx, frame, canvas);

            // Animate text panels
            if (textEls.length) {
              const count = textEls.length;
              const seg = 1 / count;
              textEls.forEach((el, i) => {
                const center = (i + 0.5) * seg;
                const dist = Math.abs(progress - center);
                const half = seg * 0.36;
                const fade = seg * 0.14;
                let opacity, ty;
                if (dist < half - fade) {
                  opacity = 1; ty = 0;
                } else if (dist < half + fade) {
                  const t = (dist - (half - fade)) / (fade * 2);
                  opacity = 1 - (1 - Math.pow(1 - t, 3));
                  ty = progress < center ? (1 - opacity) * 44 : -(1 - opacity) * 32;
                } else {
                  opacity = 0;
                  ty = progress < center ? 56 : -32;
                }
                el.style.opacity = opacity;
                el.style.transform = `translateY(${ty}px)`;
                el.style.filter = opacity < 0.25
                  ? `blur(${(1 - opacity) * 7}px)` : 'none';
                const line = el.querySelector('.st-line');
                if (line) line.style.width = opacity > 0.5 ? '80px' : '0';
              });
            }
          });
        }
      });

      // Fade-in canvas when entering
      gsap.set(`#st-wrap-${scene.id} canvas`, { opacity: 0 });
      ScrollTrigger.create({
        trigger: `#st-wrap-${scene.id}`,
        start: 'top 80%',
        once: true,
        onEnter: () => gsap.to(`#st-wrap-${scene.id} canvas`, { opacity: 1, duration: 0.6, ease: 'power2.out' })
      });
    });
  }

  /** Refresh on resize */
  refresh() {
    ScrollTrigger.refresh();
  }
}

window.ScrollController = ScrollController;
