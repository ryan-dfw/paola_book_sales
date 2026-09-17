// Rigid-body physics for the spinning book.
//
// The book is a free rigid body pinned at its centre of mass (no gravity —
// it floats), integrated with Euler's rotation equations in the body frame:
//
//     dL/dt = τ + L × ω,   ω = I⁻¹ L,   dq/dt = ½ q ⊗ (0, ω)
//
// where I is the book's real principal inertia tensor (a flat box: smallest
// moment about the long axis, largest about the axis through the covers).
// Because the three moments are all different, a fling that's mostly about
// the *intermediate* axis (the horizontal one across the cover) is unstable
// and the book flips over on its own mid-spin — the tennis-racket /
// Dzhanibekov effect. That's real physics, not an animation.
//
// Losses are air drag (quadratic, from the area each axis sweeps) plus a
// little linear "pivot" friction so a hard fling settles in a few seconds.
// When nobody's touching it, a gentle controller applies torque to ease the
// book back to its display pose — the cover facing the reader with the same
// slight counter-clockwise tilt the flat cover always had. It's a calm drift
// home, not a snap: turn the book around, look at the back, and it will make
// its own way back when you let go.
//
// Softcovers additionally get two flex degrees of freedom: each cover can
// lift off the page block at the fore-edge, driven by the inertial (Euler +
// centrifugal) acceleration in the spinning frame and by the air-pressure
// difference between the leading and trailing face, against the stiffness
// of the cover stock. Hardcover boards are rigid, so they never flex.

import type { Quaternion } from 'three';
import { HARDCOVER, type BookSpec } from './specs';

const IN = 0.0254;
const RHO_AIR = 1.2;
const CD_PLATE = 1.17;

export const STEP = 1 / 240;
const MAX_RELEASE_SPEED = 30; // rad/s — beyond this the frame rate can't show it anyway
const PIVOT_FRICTION = 0.32; // 1/s

// Resting pose: cover to the reader, turned a few degrees so the fore-edge
// shows (the page-edge strip the flat cover faked) and rolled 1.5°
// counter-clockwise — the tilt .cover-frame has always had.
const HOME_YAW = -0.11; // rad, about the vertical axis
const HOME_ROLL = (-1.5 * Math.PI) / 180; // rad, in the screen plane

// Coming home
const HOME_DELAY = 1.4; // s after release before the drift home may start
const HOME_FORCE_AFTER = 5; // s — take over even if it's still spinning a bit
const HOME_ENGAGE_SPEED = 1.6; // rad/s
const HOME_RAMP = 3; // s to reach full controller strength
const HOME_GAIN = 1.4; // 1/s — how hard it chases the speed it wants
const HOME_RATE = 0.45; // 1/s — turn rate per radian still to go (paired with
// HOME_GAIN for a just-short-of-critically-damped arrival: no bounce at the end)
const HOME_MAX_SPEED = 1.0; // rad/s — an unhurried walk home, never a snap

// Softcover flex
const FLEX_K = (2 * Math.PI * 3.2) ** 2;
const FLEX_C = 2 * 0.18 * Math.sqrt(FLEX_K);
const FLEX_PRELOAD = 0.03; // rad — the page block holds the cover shut a little
const FLEX_AIR = 5.5;
const FLEX_MAX = 0.95;

type V3 = [number, number, number];
type Q4 = [number, number, number, number]; // x, y, z, w

function principalInertia(spec: BookSpec): V3 {
  const w = spec.width * IN;
  const h = spec.height * IN;
  const t = spec.thickness * IN;
  const box = (m: number, a: number, b: number, c: number): V3 => [
    (m * (b * b + c * c)) / 12,
    (m * (a * a + c * c)) / 12,
    (m * (a * a + b * b)) / 12,
  ];

  if (spec.format === 'softcover') return box(spec.mass, w, h, t);

  // Hardcover: text block in the middle plus two boards out at ±z, which
  // (parallel-axis theorem) adds noticeably to the x and y moments.
  const bt = HARDCOVER.board * IN;
  const bw = (spec.width + HARDCOVER.overhang) * IN;
  const bh = (spec.height + 2 * HARDCOVER.overhang) * IN;
  const boardVol = bw * bh * bt;
  const blockVol = w * h * (t - 2 * bt) * 0.9; // paper is lighter than board
  const boardMass = (spec.mass * boardVol) / (2 * boardVol + blockVol);
  const blockMass = spec.mass - 2 * boardMass;
  const I = box(blockMass, w, h, t - 2 * bt);
  const d = t / 2 - bt / 2;
  const b = box(boardMass, bw, bh, bt);
  return [I[0] + 2 * (b[0] + boardMass * d * d), I[1] + 2 * (b[1] + boardMass * d * d), I[2] + 2 * b[2]];
}

function dragCoefficients(spec: BookSpec): V3 {
  const w = spec.width * IN;
  const h = spec.height * IN;
  const t = spec.thickness * IN;
  const q = 0.5 * RHO_AIR * CD_PLATE;
  return [q * (w * h ** 4) / 32, q * (h * w ** 4) / 32, (q * t * (h ** 4 + w ** 4)) / 32];
}

const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);

function rotate(q: Q4, v: V3): V3 {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}
const rotateInv = (q: Q4, v: V3) => rotate([-q[0], -q[1], -q[2], q[3]], v);

/** The display pose: yaw about Y, then a small roll in the screen plane. */
export const HOME_ORIENTATION: Q4 = (() => {
  const y: Q4 = [0, Math.sin(HOME_YAW / 2), 0, Math.cos(HOME_YAW / 2)];
  const r: Q4 = [0, 0, Math.sin(HOME_ROLL / 2), Math.cos(HOME_ROLL / 2)];
  return mulQ(r, y);
})();

function normalizeQ(q: Q4): Q4 {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

export class BookPhysics {
  readonly I: V3;
  private readonly dragK: V3;
  private readonly isSoft: boolean;
  private readonly flexLever: number;
  private readonly flexX: number;
  private readonly halfT: number;

  q: Q4;
  L: V3 = [0, 0, 0]; // body frame angular momentum

  /** Softcover cover lift angles (front, back), radians. */
  flex: [number, number] = [0, 0];
  private flexVel: [number, number] = [0, 0];
  private alphaBody: V3 = [0, 0, 0];
  private prevOmegaBody: V3 = [0, 0, 0];

  grabbed = false;
  private grabOmegaWorld: V3 = [0, 0, 0];
  private samples: { t: number; w: V3 }[] = [];

  private sinceRelease = 999;
  private homeGain = 0;
  reducedMotion = false;

  constructor(spec: BookSpec, orientation?: Q4) {
    this.I = principalInertia(spec);
    this.dragK = dragCoefficients(spec);
    this.isSoft = spec.format === 'softcover';
    const hinge = -spec.width / 2 + 0.3;
    const flapLen = spec.width / 2 - hinge;
    this.flexLever = flapLen * 0.62 * IN;
    // Pressure and inertial load both grow toward the fore-edge, so their
    // resultant sits well out on the flap.
    this.flexX = (spec.width / 2) * 0.72 * IN;
    this.halfT = (spec.thickness / 2) * IN;
    this.q = orientation ?? HOME_ORIENTATION;
    this.homeGain = 1;
    this.sinceRelease = HOME_FORCE_AFTER;
  }

  omegaBody(L: V3 = this.L): V3 {
    return [L[0] / this.I[0], L[1] / this.I[1], L[2] / this.I[2]];
  }

  omegaWorld(): V3 {
    return this.grabbed ? this.grabOmegaWorld : rotate(this.q, this.omegaBody());
  }

  quaternion(out: Quaternion): Quaternion {
    return out.set(this.q[0], this.q[1], this.q[2], this.q[3]);
  }

  /** Swap in a different book (edition change) but keep orientation and spin rate. */
  static transfer(from: BookPhysics, spec: BookSpec): BookPhysics {
    const next = new BookPhysics(spec, from.q);
    const w = from.omegaWorld();
    const wb = rotateInv(from.q, w);
    next.L = [wb[0] * next.I[0], wb[1] * next.I[1], wb[2] * next.I[2]];
    next.sinceRelease = from.sinceRelease;
    next.homeGain = from.homeGain;
    next.reducedMotion = from.reducedMotion;
    return next;
  }

  /** A gentle spin kick about the vertical axis, applied as an angular impulse. */
  kick(radPerSec: number) {
    const wb = rotateInv(this.q, [0, radPerSec, 0]);
    this.L = [this.L[0] + wb[0] * this.I[0], this.L[1] + wb[1] * this.I[1], this.L[2] + wb[2] * this.I[2]];
    this.sinceRelease = 0;
    this.homeGain = 0;
  }

  // ---- direct manipulation -------------------------------------------------

  grab() {
    this.grabbed = true;
    // Catching the book stops it dead — whatever was stored in L is gone.
    this.L = [0, 0, 0];
    this.grabOmegaWorld = [0, 0, 0];
    this.samples = [];
    this.homeGain = 0;
  }

  /** Rotate by small world-space angles (radians) about the world X and Y axes. */
  drag(ax: number, ay: number, now: number, dt: number) {
    const h = Math.hypot(ax, ay);
    if (h > 0) {
      const s = Math.sin(h / 2) / h;
      const dq: Q4 = [ax * s, ay * s, 0, Math.cos(h / 2)];
      this.q = normalizeQ(mulQ(dq, this.q));
    }
    if (dt > 0) {
      this.samples.push({ t: now, w: [ax / dt, ay / dt, 0] });
    }
    this.samples = this.samples.filter((s) => now - s.t < 0.1);
  }

  release(now: number) {
    const recent = this.samples.filter((s) => now - s.t < 0.08);
    let w: V3 = [0, 0, 0];
    if (recent.length) {
      let tw = 0;
      for (const s of recent) {
        const k = 1 - (now - s.t) / 0.08; // favour the newest samples
        w = [w[0] + s.w[0] * k, w[1] + s.w[1] * k, 0];
        tw += k;
      }
      if (tw > 0) w = [w[0] / tw, w[1] / tw, 0];
    }
    const sp = len(w);
    if (sp > MAX_RELEASE_SPEED) w = [(w[0] * MAX_RELEASE_SPEED) / sp, (w[1] * MAX_RELEASE_SPEED) / sp, 0];

    // Hand the spin over to the free body: L = I ω, expressed in the body frame.
    const wb = rotateInv(this.q, w);
    this.L = [wb[0] * this.I[0], wb[1] * this.I[1], wb[2] * this.I[2]];
    this.grabbed = false;
    this.samples = [];
    this.sinceRelease = 0;
    this.homeGain = 0;
  }

  // ---- integration ---------------------------------------------------------

  step(h: number, now: number) {
    if (this.grabbed) {
      // Kinematic: orientation is set by the pointer; keep a smoothed ω for
      // the flex model and for the release.
      const fresh = this.samples.filter((s) => now - s.t < 0.05);
      const target: V3 = fresh.length ? fresh[fresh.length - 1].w : [0, 0, 0];
      const a = 1 - Math.exp(-h / 0.03);
      this.grabOmegaWorld = [
        this.grabOmegaWorld[0] + (target[0] - this.grabOmegaWorld[0]) * a,
        this.grabOmegaWorld[1] + (target[1] - this.grabOmegaWorld[1]) * a,
        0,
      ];
    } else {
      this.sinceRelease += h;
      const speed = len(this.omegaBody());
      const goHome =
        !this.reducedMotion &&
        this.sinceRelease > HOME_DELAY &&
        (speed < HOME_ENGAGE_SPEED || this.sinceRelease > HOME_FORCE_AFTER);
      this.homeGain = goHome ? Math.min(1, this.homeGain + h / HOME_RAMP) : this.reducedMotion ? 0 : this.homeGain;
      this.rk4(h);
    }

    const wb = this.grabbed ? rotateInv(this.q, this.grabOmegaWorld) : this.omegaBody();
    const aRaw: V3 = [(wb[0] - this.prevOmegaBody[0]) / h, (wb[1] - this.prevOmegaBody[1]) / h, (wb[2] - this.prevOmegaBody[2]) / h];
    const la = 1 - Math.exp(-h / 0.025);
    this.alphaBody = [
      this.alphaBody[0] + (aRaw[0] - this.alphaBody[0]) * la,
      this.alphaBody[1] + (aRaw[1] - this.alphaBody[1]) * la,
      this.alphaBody[2] + (aRaw[2] - this.alphaBody[2]) * la,
    ];
    this.prevOmegaBody = wb;

    if (this.isSoft) this.stepFlex(h, wb);
  }

  /** External torque (body frame) for a given state: drag + the drift home. */
  private torque(q: Q4, L: V3): V3 {
    const w = this.omegaBody(L);
    const sp = len(w);
    const tau: V3 = [
      -this.dragK[0] * w[0] * sp - PIVOT_FRICTION * this.I[0] * w[0],
      -this.dragK[1] * w[1] * sp - PIVOT_FRICTION * this.I[1] * w[1],
      -this.dragK[2] * w[2] * sp - PIVOT_FRICTION * this.I[2] * w[2],
    ];

    if (this.homeGain > 0) {
      const g = this.homeGain * this.homeGain * (3 - 2 * this.homeGain); // smoothstep
      // Feed-forward: the drift home also pays for the losses on the way.
      tau[0] -= g * tau[0];
      tau[1] -= g * tau[1];
      tau[2] -= g * tau[2];

      // Shortest rotation from where it is to the display pose, as a world
      // axis and angle: qe = q_home ⊗ q⁻¹.
      const qe = mulQ(HOME_ORIENTATION, [-q[0], -q[1], -q[2], q[3]]);
      const flip = qe[3] < 0 ? -1 : 1;
      const axis: V3 = [flip * qe[0], flip * qe[1], flip * qe[2]];
      const sin = len(axis);
      const angle = 2 * Math.atan2(sin, Math.abs(qe[3]));
      // Turn rate proportional to what's left, capped — so it eases in, holds
      // a gentle pace, and eases out as it arrives instead of stopping dead.
      const speed = Math.min(HOME_RATE * angle, HOME_MAX_SPEED);
      const k = sin > 1e-7 ? speed / sin : 0;
      const want: V3 = [axis[0] * k, axis[1] * k, axis[2] * k];

      const ww = rotate(q, w);
      const alphaW: V3 = [(want[0] - ww[0]) * HOME_GAIN, (want[1] - ww[1]) * HOME_GAIN, (want[2] - ww[2]) * HOME_GAIN];
      const ab = rotateInv(q, alphaW);
      // τ = I α − L × ω  (cancels the gyroscopic term so the controller is linear)
      const gyro = cross(L, w);
      tau[0] += g * (this.I[0] * ab[0] - gyro[0]);
      tau[1] += g * (this.I[1] * ab[1] - gyro[1]);
      tau[2] += g * (this.I[2] * ab[2] - gyro[2]);
    }

    return tau;
  }

  private deriv(q: Q4, L: V3): { dq: Q4; dL: V3 } {
    const w = this.omegaBody(L);
    const tau = this.torque(q, L);
    const gyro = cross(L, w);
    const dL: V3 = [tau[0] + gyro[0], tau[1] + gyro[1], tau[2] + gyro[2]];
    const p = mulQ(q, [w[0], w[1], w[2], 0]);
    return { dq: [p[0] / 2, p[1] / 2, p[2] / 2, p[3] / 2], dL };
  }

  private rk4(h: number) {
    const q0 = this.q;
    const L0 = this.L;
    const addQ = (q: Q4, d: Q4, s: number): Q4 => [q[0] + d[0] * s, q[1] + d[1] * s, q[2] + d[2] * s, q[3] + d[3] * s];
    const addV = (v: V3, d: V3, s: number): V3 => [v[0] + d[0] * s, v[1] + d[1] * s, v[2] + d[2] * s];

    const k1 = this.deriv(q0, L0);
    const k2 = this.deriv(addQ(q0, k1.dq, h / 2), addV(L0, k1.dL, h / 2));
    const k3 = this.deriv(addQ(q0, k2.dq, h / 2), addV(L0, k2.dL, h / 2));
    const k4 = this.deriv(addQ(q0, k3.dq, h), addV(L0, k3.dL, h));

    const q: Q4 = [0, 0, 0, 0];
    const L: V3 = [0, 0, 0];
    for (let i = 0; i < 4; i++) q[i] = q0[i] + (h / 6) * (k1.dq[i] + 2 * k2.dq[i] + 2 * k3.dq[i] + k4.dq[i]);
    for (let i = 0; i < 3; i++) L[i] = L0[i] + (h / 6) * (k1.dL[i] + 2 * k2.dL[i] + 2 * k3.dL[i] + k4.dL[i]);
    this.q = normalizeQ(q);
    this.L = L;
  }

  private stepFlex(h: number, w: V3) {
    const al = this.alphaBody;
    for (let i = 0; i < 2; i++) {
      const sigma = i === 0 ? 1 : -1; // front cover faces +z, back faces −z
      const r: V3 = [this.flexX, 0, sigma * this.halfT];
      // Pseudo-acceleration felt in the spinning frame: centrifugal + Euler.
      const wxr = cross(w, r);
      const cen = cross(w, wxr);
      const eul = cross(al, r);
      const aOut = sigma * (-cen[2] - eul[2]);
      // Air: the trailing face sees suction (lifts), the leading face is pressed shut.
      const vn = sigma * wxr[2];
      const aAir = -FLEX_AIR * vn * Math.abs(vn);

      const force = (aOut + aAir) / this.flexLever;
      const acc = force - FLEX_K * (this.flex[i] + FLEX_PRELOAD) - FLEX_C * this.flexVel[i];
      this.flexVel[i] += acc * h;
      this.flex[i] += this.flexVel[i] * h;
      if (this.flex[i] < 0) {
        this.flex[i] = 0;
        if (this.flexVel[i] < 0) this.flexVel[i] *= -0.15; // small, dead bounce off the pages
      } else if (this.flex[i] > FLEX_MAX) {
        this.flex[i] = FLEX_MAX;
        if (this.flexVel[i] > 0) this.flexVel[i] = 0;
      }
    }
  }
}

function mulQ(a: Q4, b: Q4): Q4 {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}
