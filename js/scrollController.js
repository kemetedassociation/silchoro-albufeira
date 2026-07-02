/**
 * scrollController.js — GSAP ScrollTrigger + Canvas 2D
 *
 * Supports two scene types:
 *   - standard   : one sequence, one canvas
 *   - multi-seq  : N sequences played end-to-end on ONE pinned canvas
 *
 * Rules:
 *   - pinSpacing:false on every scene → sections butt together, zero gaps
 *   - RAF lock is PER-SCENE (local var) so scenes never block each other
 *   - Canvas resize resets transform before scaling → no DPR accumulation
 */

class ScrollController {
  constructor(preloader, scenes) {
    this.preloader = preloader;
    this.scenes    = scenes;
    this.dpr       = Math.min(window.devicePixelRatio || 1, 2);
    this.isMobile  = window.innerWidth <= 900;
  }

  /* ── canvas helpers ──────────────────────────── */

  _makeCanvas(id) {
    const canvas = document.getElementById(`canvas-${id}`);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    this._resizeCanvas(canvas, ctx);
    const ro = new ResizeObserver(() => this._resizeCanvas(canvas, ctx));
    ro.observe(canvas.parentElement || canvas);
    return { canvas, ctx };
  }

  _resizeCanvas(canvas, ctx) {
    const w = canvas.offsetWidth  || window.innerWidth;
    const h = canvas.offsetHeight || window.innerHeight;
    // Setting canvas dimensions resets the 2D context — scale fresh each time
    canvas.width  = Math.round(w * this.dpr);
    canvas.height = Math.round(h * this.dpr);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  _drawFrame(ctx, img, canvas) {
    if (!img || !img.naturalWidth) return;
    const cw = canvas.offsetWidth  || window.innerWidth;
    const ch = canvas.offsetHeight || window.innerHeight;
    // Cover-fit: fill the viewport, center the image
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const sw    = img.naturalWidth  * scale;
    const sh    = img.naturalHeight * scale;
    ctx.drawImage(img, (cw - sw) / 2, (ch - sh) / 2, sw, sh);
  }

  /* ── text panel animation ────────────────────── */

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

  /* ── register one STANDARD scene ────────────── */

  _registerStandard(scene) {
    const cv = this._makeCanvas(scene.id);
    if (!cv) return;
    const { canvas, ctx } = cv;

    // Per-scene RAF lock — scenes never block each other
    let raf = false;

    const tryFirstFrame = () => {
      const f = this.preloader.frame(scene, 0);
      if (f) { this._drawFrame(ctx, f, canvas); return; }
      setTimeout(tryFirstFrame, 80);
    };
    tryFirstFrame();

    const panels = Array.from(
      document.querySelectorAll(`#st-wrap-${scene.id} .st-text`)
    );

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
          if (frame) this._drawFrame(ctx, frame, canvas);
          this._animatePanels(panels, progress);
        });
      }
    });

    gsap.set(canvas, { opacity: 0 });
    ScrollTrigger.create({
      trigger: `#st-wrap-${scene.id}`,
      start  : 'top 80%',
      once   : true,
      onEnter: () => gsap.to(canvas, { opacity: 1, duration: 0.55, ease: 'power2.out' })
    });
  }

  /* ── register MULTI-SEQUENCE scene (Respirez) ── */

  _registerMultiSeq(sceneGroup) {
    const { wrapperId, sequences, totalScrollHeight } = sceneGroup;
    const cv = this._makeCanvas(wrapperId);
    if (!cv) return;
    const { canvas, ctx } = cv;

    const seqCount = sequences.length;
    // Per-scene RAF lock
    let raf = false;

    const panels = Array.from(
      document.querySelectorAll(`#${wrapperId} .st-text`)
    );

    const tryFirstFrame = () => {
      const f = this.preloader.frame(sequences[0], 0);
      if (f) { this._drawFrame(ctx, f, canvas); return; }
      setTimeout(tryFirstFrame, 80);
    };
    tryFirstFrame();

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

          // Map global progress → active sequence + local progress
          const seqIdx      = Math.min(Math.floor(progress * seqCount), seqCount - 1);
          const seqProgress = (progress * seqCount) - seqIdx;
          const seq         = sequences[seqIdx];
          const frameIdx    = Math.min(
            Math.round(seqProgress * (seq.count - 1)),
            seq.count - 1
          );
          const frame = this.preloader.frame(seq, frameIdx);
          if (frame) this._drawFrame(ctx, frame, canvas);

          this._animatePanels(panels, progress);
        });
      }
    });

    gsap.set(canvas, { opacity: 0 });
    ScrollTrigger.create({
      trigger: `#${wrapperId}`,
      start  : 'top 80%',
      once   : true,
      onEnter: () => gsap.to(canvas, { opacity: 1, duration: 0.55, ease: 'power2.out' })
    });
  }

  /* ── PUBLIC ──────────────────────────────────── */

  init() {
    if (!window.gsap || !window.ScrollTrigger) {
      console.warn('GSAP / ScrollTrigger not loaded'); return;
    }
    gsap.registerPlugin(ScrollTrigger);

    // iOS Safari: prevent rubber-band snap from breaking pinning
    ScrollTrigger.config({ ignoreMobileResize: true });

    this.scenes
      .filter(s => s.type !== 'multi-seq')
      .forEach(s => this._registerStandard(s));

    this.scenes
      .filter(s => s.type === 'multi-seq')
      .forEach(s => this._registerMultiSeq(s));

    // Refresh after layout settles (fonts, safe-area, etc.)
    setTimeout(() => ScrollTrigger.refresh(), 500);

    // Re-refresh on orientation change (iOS)
    window.addEventListener('orientationchange', () => {
      setTimeout(() => ScrollTrigger.refresh(), 300);
    });
  }

  refresh() { ScrollTrigger.refresh(); }
}

window.ScrollController = ScrollController;
