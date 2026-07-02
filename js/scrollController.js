/**
 * scrollController.js — GSAP ScrollTrigger + Canvas 2D
 *
 * scene types:
 *   standard  : one sequence, one canvas (id = scene.id)
 *   multi-seq : N sequences on ONE canvas (id = wrapperId minus "st-wrap-" prefix)
 *
 * Key invariants:
 *   - pinSpacing:false → sections butt together, zero whitespace gaps
 *   - Per-scene RAF lock → scenes never block each other
 *   - ctx.setTransform() on resize → no DPR accumulation
 *   - Redraw last frame on resize → no blank flash after orientation change
 *   - Canvas lookup uses correct ID for both scene types
 */

class ScrollController {
  constructor(preloader, scenes) {
    this.preloader = preloader;
    this.scenes    = scenes;
    this.dpr       = Math.min(window.devicePixelRatio || 1, 2);
  }

  /* ─── canvas setup ─────────────────────────────── */

  /**
   * Find canvas by id, size it, attach ResizeObserver.
   * Returns { canvas, ctx, setRedraw } or null if not found.
   */
  _makeCanvas(id) {
    const canvas = document.getElementById(`canvas-${id}`);
    if (!canvas) {
      console.warn(`[ScrollController] canvas not found: canvas-${id}`);
      return null;
    }
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    let _redrawFn = null;

    const resize = () => {
      const w = canvas.offsetWidth  || window.innerWidth;
      const h = canvas.offsetHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      // Setting .width/.height resets context — apply transform fresh
      canvas.width  = Math.round(w * this.dpr);
      canvas.height = Math.round(h * this.dpr);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      // Redraw last frame so canvas never shows blank after resize
      if (_redrawFn) _redrawFn();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement || canvas);
    resize();

    return {
      canvas,
      ctx,
      /** Register a callback that redraws the current frame on resize */
      setRedraw: fn => { _redrawFn = fn; },
    };
  }

  /* ─── frame rendering ──────────────────────────── */

  _drawFrame(ctx, img, canvas) {
    if (!img || !img.naturalWidth) return;
    const cw = canvas.offsetWidth  || window.innerWidth;
    const ch = canvas.offsetHeight || window.innerHeight;
    if (cw <= 0 || ch <= 0) return;

    // Cover-fit: preserve aspect ratio, center the image
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const sw    = img.naturalWidth  * scale;
    const sh    = img.naturalHeight * scale;

    // Clear before draw — avoids ghost artifacts if image didn't fill last time
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - sw) / 2, (ch - sh) / 2, sw, sh);
  }

  /* ─── text panels ──────────────────────────────── */

  _animatePanels(panels, progress) {
    const n = panels.length;
    if (!n) return;
    panels.forEach((el, i) => {
      const center   = (i + 0.5) / n;
      const halfWin  = 0.38 / n;
      const fadeZone = 0.14 / n;
      const dist     = Math.abs(progress - center);
      let opacity, ty;

      if (dist < halfWin - fadeZone) {
        opacity = 1; ty = 0;
      } else if (dist < halfWin + fadeZone) {
        const t = (dist - (halfWin - fadeZone)) / (fadeZone * 2);
        opacity = 1 - (1 - Math.pow(1 - t, 3));
        ty      = progress < center ? (1 - opacity) * 44 : -(1 - opacity) * 32;
      } else {
        opacity = 0;
        ty      = progress < center ? 56 : -32;
      }

      el.style.opacity   = opacity;
      el.style.transform = `translateY(${ty}px)`;
      el.style.filter    = opacity < 0.25 ? `blur(${(1 - opacity) * 6}px)` : 'none';
      const line = el.querySelector('.st-line');
      if (line) line.style.width = opacity > 0.5 ? '80px' : '0';
    });
  }

  /* ─── standard scene ───────────────────────────── */

  _registerStandard(scene) {
    // Canvas ID for standard scenes: "canvas-scene1", "canvas-scene2", etc.
    const cv = this._makeCanvas(scene.id);
    if (!cv) return;
    const { canvas, ctx, setRedraw } = cv;

    let raf = false;
    let lastFrame = null;

    const panels = Array.from(
      document.querySelectorAll(`#st-wrap-${scene.id} .st-text`)
    );

    // Draw first available frame while rest load
    const tryFirstFrame = () => {
      const f = this.preloader.frame(scene, 0);
      if (f) { lastFrame = f; this._drawFrame(ctx, f, canvas); return; }
      setTimeout(tryFirstFrame, 80);
    };
    tryFirstFrame();

    // On resize, redraw whatever frame was last shown
    setRedraw(() => { if (lastFrame) this._drawFrame(ctx, lastFrame, canvas); });

    ScrollTrigger.create({
      trigger   : `#st-wrap-${scene.id}`,
      start     : 'top top',
      end       : `+=${scene.scrollHeight || 3000}`,
      pin       : `#st-wrap-${scene.id} .st-sticky`,
      pinSpacing: false,
      onUpdate  : self => {
        if (raf) return;
        raf = true;
        requestAnimationFrame(() => {
          raf = false;
          const progress = self.progress;
          const idx   = Math.min(Math.round(progress * (scene.count - 1)), scene.count - 1);
          const frame = this.preloader.frame(scene, idx);
          if (frame) { lastFrame = frame; this._drawFrame(ctx, frame, canvas); }
          this._animatePanels(panels, progress);
        });
      },
    });

    gsap.set(canvas, { opacity: 0 });
    ScrollTrigger.create({
      trigger: `#st-wrap-${scene.id}`,
      start  : 'top 80%',
      once   : true,
      onEnter: () => gsap.to(canvas, { opacity: 1, duration: 0.55, ease: 'power2.out' }),
    });
  }

  /* ─── multi-sequence scene (Respirez) ─────────── */

  _registerMultiSeq(sceneGroup) {
    const { wrapperId, sequences, totalScrollHeight } = sceneGroup;

    // Canvas ID: strip "st-wrap-" prefix from wrapperId
    // "st-wrap-respirez" → "respirez" → looks for "canvas-respirez" in HTML
    const canvasId = wrapperId.replace(/^st-wrap-/, '');
    const cv = this._makeCanvas(canvasId);
    if (!cv) return;
    const { canvas, ctx, setRedraw } = cv;

    const seqCount = sequences.length;
    let raf = false;
    let lastFrame = null;

    const panels = Array.from(
      document.querySelectorAll(`#${wrapperId} .st-text`)
    );

    const tryFirstFrame = () => {
      const f = this.preloader.frame(sequences[0], 0);
      if (f) { lastFrame = f; this._drawFrame(ctx, f, canvas); return; }
      setTimeout(tryFirstFrame, 80);
    };
    tryFirstFrame();

    setRedraw(() => { if (lastFrame) this._drawFrame(ctx, lastFrame, canvas); });

    ScrollTrigger.create({
      trigger   : `#${wrapperId}`,
      start     : 'top top',
      end       : `+=${totalScrollHeight}`,
      pin       : `#${wrapperId} .st-sticky`,
      pinSpacing: false,
      onUpdate  : self => {
        if (raf) return;
        raf = true;
        requestAnimationFrame(() => {
          raf = false;
          const progress = self.progress;

          // Map 0→1 across all sequences proportionally
          const seqIdx      = Math.min(Math.floor(progress * seqCount), seqCount - 1);
          const seqProgress = (progress * seqCount) - seqIdx;
          const seq         = sequences[seqIdx];
          const frameIdx    = Math.min(
            Math.round(seqProgress * (seq.count - 1)),
            seq.count - 1
          );
          const frame = this.preloader.frame(seq, frameIdx);
          if (frame) { lastFrame = frame; this._drawFrame(ctx, frame, canvas); }

          this._animatePanels(panels, progress);
        });
      },
    });

    gsap.set(canvas, { opacity: 0 });
    ScrollTrigger.create({
      trigger: `#${wrapperId}`,
      start  : 'top 80%',
      once   : true,
      onEnter: () => gsap.to(canvas, { opacity: 1, duration: 0.55, ease: 'power2.out' }),
    });
  }

  /* ─── public ───────────────────────────────────── */

  init() {
    if (!window.gsap || !window.ScrollTrigger) {
      console.warn('[ScrollController] GSAP / ScrollTrigger not loaded');
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    // Prevents iOS address-bar resize from mis-triggering pin recalculation
    ScrollTrigger.config({ ignoreMobileResize: true });

    this.scenes.filter(s => s.type !== 'multi-seq').forEach(s => this._registerStandard(s));
    this.scenes.filter(s => s.type === 'multi-seq').forEach(s => this._registerMultiSeq(s));

    setTimeout(() => ScrollTrigger.refresh(), 500);

    window.addEventListener('orientationchange', () => {
      setTimeout(() => ScrollTrigger.refresh(), 400);
    });
  }

  refresh() { ScrollTrigger.refresh(); }
}

window.ScrollController = ScrollController;
