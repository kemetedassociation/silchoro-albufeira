/**
 * scrollController.js — GSAP ScrollTrigger + Canvas 2D
 *
 * Supports two scene types:
 *   - standard   : one sequence, one canvas
 *   - multi-seq  : N sequences played end-to-end on ONE pinned canvas
 *
 * Principle: 1 scroll px = 1 exact frame, no interpolation.
 */

class ScrollController {
  constructor(preloader, scenes) {
    this.preloader = preloader;
    this.scenes    = scenes;
    this.dpr       = Math.min(window.devicePixelRatio || 1, 2);
    this.isMobile  = window.innerWidth <= 900;
    this._raf      = false;
  }

  /* ── canvas helpers ──────────────────────────── */

  _makeCanvas(id) {
    const canvas = document.getElementById(`canvas-${id}`);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    this._resizeCanvas(canvas, ctx);
    const ro = new ResizeObserver(() => this._resizeCanvas(canvas, ctx));
    ro.observe(canvas);
    return { canvas, ctx };
  }

  _resizeCanvas(canvas, ctx) {
    const w = canvas.offsetWidth  || window.innerWidth;
    const h = canvas.offsetHeight || window.innerHeight;
    canvas.width  = Math.round(w * this.dpr);
    canvas.height = Math.round(h * this.dpr);
    ctx.scale(this.dpr, this.dpr);
  }

  _drawFrame(ctx, img, canvas) {
    if (!img || !img.naturalWidth) return;
    const cw = canvas.offsetWidth  || window.innerWidth;
    const ch = canvas.offsetHeight || window.innerHeight;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const sw = img.naturalWidth  * scale;
    const sh = img.naturalHeight * scale;
    ctx.drawImage(img, (cw - sw) / 2, (ch - sh) / 2, sw, sh);
  }

  /* ── text panel animation ────────────────────── */

  _animatePanels(panels, progress) {
    const n = panels.length;
    if (!n) return;
    panels.forEach((el, i) => {
      const center    = (i + 0.5) / n;
      const halfWin   = 0.38 / n;
      const fadeZone  = 0.14 / n;
      const dist      = Math.abs(progress - center);
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
      el.style.filter    = opacity < 0.25 ? `blur(${(1 - opacity) * 7}px)` : 'none';
      const line = el.querySelector('.st-line');
      if (line) line.style.width = opacity > 0.5 ? '80px' : '0';
    });
  }

  /* ── register one STANDARD scene ────────────── */

  _registerStandard(scene) {
    const cv = this._makeCanvas(scene.id);
    if (!cv) return;
    const { canvas, ctx } = cv;

    // Show first frame immediately when available
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
      trigger : `#st-wrap-${scene.id}`,
      start   : 'top top',
      end     : `+=${scene.scrollHeight || 3000}`,
      pin     : `#st-wrap-${scene.id} .st-sticky`,
      pinSpacing: false,   // ← no extra padding inserted, scenes butt together
      onUpdate: self => {
        if (this._raf) return;
        this._raf = true;
        requestAnimationFrame(() => {
          this._raf = false;
          const progress = self.progress;
          const idx   = Math.min(Math.round(progress * (scene.count - 1)), scene.count - 1);
          const frame = this.preloader.frame(scene, idx);
          if (frame) this._drawFrame(ctx, frame, canvas);
          this._animatePanels(panels, progress);
        });
      }
    });

    // Fade-in on first entry
    gsap.set(canvas, { opacity: 0 });
    ScrollTrigger.create({
      trigger: `#st-wrap-${scene.id}`,
      start  : 'top 80%',
      once   : true,
      onEnter: () => gsap.to(canvas, { opacity: 1, duration: 0.55, ease: 'power2.out' })
    });
  }

  /* ── register MULTI-SEQUENCE Respirez scene ──── */
  //  One pinned viewport, N sequences end-to-end

  _registerMultiSeq(sceneGroup) {
    const { wrapperId, sequences, totalScrollHeight } = sceneGroup;
    const cv = this._makeCanvas(wrapperId);
    if (!cv) return;
    const { canvas, ctx } = cv;

    const seqCount = sequences.length;
    const panels   = Array.from(
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
      pinSpacing: false,   // ← no gap after this pinned block
      onUpdate  : self => {
        if (this._raf) return;
        this._raf = true;
        requestAnimationFrame(() => {
          this._raf = false;
          const progress = self.progress;

          // Which sequence is active?
          const seqIdx      = Math.min(Math.floor(progress * seqCount), seqCount - 1);
          const seqProgress = (progress * seqCount) - seqIdx;   // 0→1 within sequence
          const seq         = sequences[seqIdx];
          const frameIdx    = Math.min(
            Math.round(seqProgress * (seq.count - 1)),
            seq.count - 1
          );
          const frame = this.preloader.frame(seq, frameIdx);
          if (frame) this._drawFrame(ctx, frame, canvas);

          // Animate text panels across full progress range
          this._animatePanels(panels, progress);
        });
      }
    });

    // Fade in
    gsap.set(canvas, { opacity: 0 });
    ScrollTrigger.create({
      trigger: `#${wrapperId}`,
      start  : 'top 80%',
      once   : true,
      onEnter: () => gsap.to(canvas, { opacity: 1, duration: 0.55, ease: 'power2.out' })
    });
  }

  /* ── PUBLIC: initialise all scenes ──────────── */

  init() {
    if (!window.gsap || !window.ScrollTrigger) {
      console.warn('GSAP / ScrollTrigger not loaded'); return;
    }
    gsap.registerPlugin(ScrollTrigger);

    // Standard single-sequence scenes
    this.scenes
      .filter(s => s.type !== 'multi-seq')
      .forEach(s => this._registerStandard(s));

    // Multi-sequence scenes
    this.scenes
      .filter(s => s.type === 'multi-seq')
      .forEach(s => this._registerMultiSeq(s));

    // Refresh after fonts / layout settle
    setTimeout(() => ScrollTrigger.refresh(), 400);
  }

  refresh() { ScrollTrigger.refresh(); }
}

window.ScrollController = ScrollController;
