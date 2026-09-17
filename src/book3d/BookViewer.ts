import {
  AmbientLight,
  DirectionalLight,
  Group,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Quaternion,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Texture,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildBook, type BookModel } from './model';
import { BookPhysics, STEP } from './physics';
import { bookSpec } from './specs';
import { loadWrapTexture } from './textures';

export interface BookInput {
  lang: string | null;
  format: string | null;
  weightOz: number | null;
  frontImage: string | null;
}

/** Radius (inches) the camera keeps in frame: the tumbling envelope of a display-scaled book, hardcover boards included. */
const FRAME_RADIUS = 5.6;
const FOV = 26;
const DRAG_GAIN = 3.2; // radians per canvas-height of pointer travel

/**
 * Imperative three.js scene for the spinning book. React owns the canvas's
 * lifetime (see components/Book3D.tsx); everything per-frame lives here.
 */
export class BookViewer {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, 1, 1, 100);
  private readonly holder = new Group();
  private readonly quat = new Quaternion();
  private readonly envMap: Texture;

  private physics: BookPhysics | null = null;
  private model: BookModel | null = null;
  private wrapTex: Texture | null = null;
  private loadToken = 0;
  private currentKey = '';

  private raf = 0;
  private last = 0;
  private acc = 0;
  private visible = true;
  private disposed = false;

  private pointerId: number | null = null;
  private lastPointer = { x: 0, y: 0, t: 0 };
  private readonly reducedMotion: MediaQueryList;
  private readonly resizeObs: ResizeObserver;
  private readonly visObs: IntersectionObserver;

  onFirstFrame: (() => void) | null = null;
  private firstFrameDone = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);

    const pmrem = new PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.envMap = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 0.32;

    const key = new DirectionalLight('#fff6ea', 2.4);
    key.position.set(-5, 7, 9);
    const fill = new DirectionalLight('#dfe6ff', 0.5);
    fill.position.set(6, -2, 6);
    // Brand-red rim light from behind: catches the edges of a dark cover
    // against the dark page, same job the old CSS glow did.
    const rim = new DirectionalLight('#e0333f', 2.2);
    rim.position.set(4, 3, -8);
    const rim2 = new DirectionalLight('#e0333f', 1.2);
    rim2.position.set(-6, -3, -6);
    this.scene.add(key, fill, rim, rim2, new AmbientLight('#ffffff', 0.12), this.holder);

    this.camera.position.set(0, 0, 30);
    this.camera.lookAt(0, 0, 0);

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('lostpointercapture', this.onUp);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas);
    this.visObs = new IntersectionObserver((entries) => {
      this.visible = entries.some((e) => e.isIntersecting);
      if (this.visible) this.start();
    });
    this.visObs.observe(canvas);
    this.resize();
    this.start();
  }

  async setBook(input: BookInput) {
    const key = `${input.lang}|${input.format}|${input.weightOz}|${input.frontImage}`;
    if (key === this.currentKey) return;
    this.currentKey = key;
    const token = ++this.loadToken;
    const spec = bookSpec(input.lang, input.format, input.weightOz);
    const tex = await loadWrapTexture(spec, input.frontImage, this.renderer);
    if (this.disposed || token !== this.loadToken) {
      tex.dispose();
      return;
    }
    const model = buildBook(spec, tex);
    model.group.scale.setScalar(spec.displayScale);

    const isSwap = !!this.physics;
    const prev = this.physics;
    this.physics = prev ? BookPhysics.transfer(prev, spec) : new BookPhysics(spec);
    this.physics.reducedMotion = this.reducedMotion.matches;
    // A little flourish on edition change: give it a turn, physically.
    if (isSwap && !this.physics.grabbed && !this.reducedMotion.matches) this.physics.kick(1.8);

    this.holder.remove(...this.holder.children);
    this.model?.dispose();
    this.wrapTex?.dispose();
    this.model = model;
    this.wrapTex = tex;
    this.holder.add(model.group);
    this.renderer.compile(this.scene, this.camera);
    this.start();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.visObs.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    this.canvas.removeEventListener('lostpointercapture', this.onUp);
    this.model?.dispose();
    this.wrapTex?.dispose();
    this.envMap.dispose();
    this.renderer.dispose();
  }

  // ---- input ---------------------------------------------------------------

  private onDown = (e: PointerEvent) => {
    if (!this.physics || this.pointerId !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.pointerId = e.pointerId;
    this.canvas.setPointerCapture(e.pointerId);
    this.canvas.classList.add('is-grabbing');
    this.lastPointer = { x: e.clientX, y: e.clientY, t: e.timeStamp / 1000 };
    this.physics.grab();
    e.preventDefault();
  };

  private onMove = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId || !this.physics) return;
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    const list = events.length ? events : [e];
    const k = DRAG_GAIN / Math.max(1, this.canvas.clientHeight);
    for (const ev of list) {
      const t = ev.timeStamp / 1000;
      const dx = ev.clientX - this.lastPointer.x;
      const dy = ev.clientY - this.lastPointer.y;
      const dt = t - this.lastPointer.t;
      this.physics.drag(dy * k, dx * k, t, dt > 0 ? dt : 0);
      this.lastPointer = { x: ev.clientX, y: ev.clientY, t };
    }
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.canvas.classList.remove('is-grabbing');
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    this.physics?.release(e.timeStamp / 1000);
  };

  // ---- frame loop ----------------------------------------------------------

  private resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    const vHalf = (FOV * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const dist = FRAME_RADIUS / Math.sin(Math.min(vHalf, hHalf));
    this.camera.position.set(0, 0, dist);
    this.camera.near = dist - 12;
    this.camera.far = dist + 12;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  private start() {
    if (this.raf || this.disposed) return;
    this.last = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (tMs: number) => {
    this.raf = 0;
    if (this.disposed || !this.visible) return;
    const now = tMs / 1000;
    const dt = this.last ? Math.min(0.1, now - this.last) : 0;
    this.last = now;

    const p = this.physics;
    if (p) {
      p.reducedMotion = this.reducedMotion.matches;
      this.acc += dt;
      // Pointer timestamps share this clock (both are performance.now()-based).
      let steps = 0;
      while (this.acc >= STEP && steps < 48) {
        p.step(STEP, now - this.acc);
        this.acc -= STEP;
        steps++;
      }
      if (steps === 48) this.acc = 0;
      this.holder.quaternion.copy(p.quaternion(this.quat));
      this.model?.setFlex(p.flex[0], p.flex[1]);
    }
    this.render();
    this.raf = requestAnimationFrame(this.frame);
  };

  private render() {
    this.renderer.render(this.scene, this.camera);
    if (!this.firstFrameDone && this.model) {
      this.firstFrameDone = true;
      this.onFirstFrame?.();
    }
  }
}
