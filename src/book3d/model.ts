// Geometry for the 3D book, built procedurally in inches.
//
// Body axes: x runs across the cover (spine at −x, fore-edge at +x), y is up,
// z comes out through the front cover. The printed wrap is laid along a
// cross-section path that runs back fore-edge → spine → front fore-edge,
// so one texture covers back, spine and front exactly like the real print.
//
// Softcover: thin 10pt cover sheet wrapped flush around the page block with
// tight, squarish spine corners. The front/back flaps are bendable — their
// lift comes from the physics (see physics.ts), past a score line near the
// spine, just like a real paperback's hinge.
//
// Hardcover: thick boards that overhang the pages on three sides, a
// rounded spine standing off a rounded text block (hollow back — visible
// from the top), French grooves at the joints, a concave fore-edge, and
// headbands. All rigid.

import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  ShapeUtils,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  type Material,
  type Texture,
} from 'three';
import { HARDCOVER, SOFTCOVER, type BookSpec } from './specs';

interface ProfilePoint {
  x: number;
  z: number;
  u: number;
  thick: number;
}

// ---------------------------------------------------------------------------
// Thick swept shell (the cover/case)
// ---------------------------------------------------------------------------

/**
 * A shell swept along an x–z profile between two heights. Group 0 = printed
 * outside (plus the cut edges, which pick up the print's colour at that
 * spot, like a real turned-in or trimmed edge); group 1 = inside paper.
 */
class Shell {
  readonly geometry = new BufferGeometry();
  private readonly n: number;
  private readonly positions: Float32Array;

  constructor(profile: ProfilePoint[], private readonly y0: number, private readonly y1: number) {
    const n = (this.n = profile.length);
    // Vertex layout: 4 rings (outer bottom/top, inner bottom/top) for the
    // faces + separate copies for the edge strips so normals stay crisp.
    const blocks = 8; // outer b/t, inner b/t, topcap o/i, botcap o/i
    const verts = n * blocks + 8; // + two end caps
    this.positions = new Float32Array(verts * 3);
    const uvs = new Float32Array(verts * 2);
    const index: number[] = [];

    const vi = (block: number, i: number) => block * n + i;
    const setUV = (v: number, u: number, vv: number) => {
      uvs[v * 2] = u;
      uvs[v * 2 + 1] = vv;
    };
    for (let i = 0; i < n; i++) {
      const u = profile[i].u;
      setUV(vi(0, i), u, 0);
      setUV(vi(1, i), u, 1);
      setUV(vi(2, i), u, 0);
      setUV(vi(3, i), u, 1);
      setUV(vi(4, i), u, 0.998);
      setUV(vi(5, i), u, 0.998);
      setUV(vi(6, i), u, 0.002);
      setUV(vi(7, i), u, 0.002);
    }
    const capBase = n * blocks;
    const u0 = profile[0].u;
    const u1 = profile[n - 1].u;
    for (let k = 0; k < 4; k++) {
      setUV(capBase + k, u0 + 0.002, k < 2 ? 0 : 1);
      setUV(capBase + 4 + k, u1 - 0.002, k < 2 ? 0 : 1);
    }

    const quad = (a: number, b: number, c: number, d: number) => index.push(a, b, c, a, c, d);

    // Outer surface (group 0)
    for (let i = 0; i < n - 1; i++) quad(vi(0, i), vi(0, i + 1), vi(1, i + 1), vi(1, i));
    const outerCount = index.length;
    // Top & bottom cut edges (group 0 too — they show the print colour)
    for (let i = 0; i < n - 1; i++) quad(vi(4, i), vi(4, i + 1), vi(5, i + 1), vi(5, i));
    for (let i = 0; i < n - 1; i++) quad(vi(6, i), vi(7, i), vi(7, i + 1), vi(6, i + 1));
    // End caps (fore-edges of the boards/flaps)
    quad(capBase, capBase + 1, capBase + 3, capBase + 2);
    quad(capBase + 4, capBase + 6, capBase + 7, capBase + 5);
    const edgeCount = index.length - outerCount;
    // Inner surface (group 1)
    for (let i = 0; i < n - 1; i++) quad(vi(2, i), vi(3, i), vi(3, i + 1), vi(2, i + 1));
    const innerCount = index.length - outerCount - edgeCount;

    this.geometry.setIndex(index);
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3)); // shares the array we mutate
    this.geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    this.geometry.addGroup(0, outerCount + edgeCount, 0);
    this.geometry.addGroup(outerCount + edgeCount, innerCount, 1);
    this.update(profile);
  }

  update(profile: ProfilePoint[]) {
    const { n, y0, y1 } = this;
    const p = this.positions;
    const set = (v: number, x: number, y: number, z: number) => {
      p[v * 3] = x;
      p[v * 3 + 1] = y;
      p[v * 3 + 2] = z;
    };
    const inner: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = profile[Math.max(0, i - 1)];
      const b = profile[Math.min(n - 1, i + 1)];
      let tx = b.x - a.x;
      let tz = b.z - a.z;
      const l = Math.hypot(tx, tz) || 1;
      tx /= l;
      tz /= l;
      // inward normal for a path running back → spine → front
      const { x, z, thick } = profile[i];
      inner.push([x + tz * thick, z - tx * thick]);
    }
    for (let i = 0; i < n; i++) {
      const { x, z } = profile[i];
      const [ix, iz] = inner[i];
      set(i, x, y0, z);
      set(n + i, x, y1, z);
      set(2 * n + i, ix, y0, iz);
      set(3 * n + i, ix, y1, iz);
      set(4 * n + i, x, y1, z);
      set(5 * n + i, ix, y1, iz);
      set(6 * n + i, x, y0, z);
      set(7 * n + i, ix, y0, iz);
    }
    const c = 8 * n;
    const f = profile[0];
    const l = profile[n - 1];
    set(c, f.x, y0, f.z);
    set(c + 1, inner[0][0], y0, inner[0][1]);
    set(c + 2, f.x, y1, f.z);
    set(c + 3, inner[0][0], y1, inner[0][1]);
    set(c + 4, l.x, y0, l.z);
    set(c + 5, inner[n - 1][0], y0, inner[n - 1][1]);
    set(c + 6, l.x, y1, l.z);
    set(c + 7, inner[n - 1][0], y1, inner[n - 1][1]);

    const attr = this.geometry.getAttribute('position');
    attr.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
  }
}

// ---------------------------------------------------------------------------
// Text block: a prism extruded along y from an x–z cross-section
// ---------------------------------------------------------------------------

const PAGE = 0; // page edges (lined texture)
const PAPER = 1; // the flat first/last page
const HIDDEN = 2; // glued spine — never really seen

function textBlock(section: { x: number; z: number; mat: number }[], halfH: number): BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const groups: Record<number, number[]> = { 0: [], 1: [], 2: [] };
  const add = (x: number, y: number, z: number, u: number, v: number) => {
    pos.push(x, y, z);
    uv.push(u, v);
    return pos.length / 3 - 1;
  };
  const S = 2.2; // texture repeats per inch

  // walls
  const n = section.length;
  for (let i = 0; i < n; i++) {
    const a = section[i];
    const b = section[(i + 1) % n];
    const a0 = add(a.x, -halfH, a.z, -halfH * 0.25, a.z * S);
    const b0 = add(b.x, -halfH, b.z, -halfH * 0.25, b.z * S);
    const b1 = add(b.x, halfH, b.z, halfH * 0.25, b.z * S);
    const a1 = add(a.x, halfH, a.z, halfH * 0.25, a.z * S);
    groups[a.mat].push(a0, b0, b1, a0, b1, a1);
  }

  // caps
  const contour = section.map((p) => new Vector2(p.x, p.z));
  const tris = ShapeUtils.triangulateShape(contour, []);
  for (const sign of [1, -1]) {
    const base = pos.length / 3;
    for (const p of section) add(p.x, sign * halfH, p.z, p.x * 0.25, p.z * S);
    for (const t of tris) {
      if (sign > 0) groups[PAGE].push(base + t[0], base + t[2], base + t[1]);
      else groups[PAGE].push(base + t[0], base + t[1], base + t[2]);
    }
  }

  const g = new BufferGeometry();
  const index: number[] = [];
  for (const m of [PAGE, PAPER, HIDDEN]) {
    g.addGroup(index.length, groups[m].length, m);
    index.push(...groups[m]);
  }
  g.setIndex(index);
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// Procedural textures
// ---------------------------------------------------------------------------

let pageTexture: Texture | null = null;
function getPageTexture(): Texture {
  if (pageTexture) return pageTexture;
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f3eee3';
  g.fillRect(0, 0, c.width, c.height);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < c.height; y += 2) {
    const d = rnd();
    const shade = 225 + Math.round(d * 25) - (d > 0.85 ? 22 : 0);
    g.fillStyle = `rgb(${shade},${shade - 5},${shade - 14})`;
    g.fillRect(0, y, c.width, 1);
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return (pageTexture = t);
}

let headbandTexture: Texture | null = null;
function getHeadbandTexture(): Texture {
  if (headbandTexture) return headbandTexture;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 8;
  const g = c.getContext('2d')!;
  for (let x = 0; x < c.width; x += 4) {
    g.fillStyle = (x / 4) % 2 ? '#f1ece4' : '#b3121c';
    g.fillRect(x, 0, 4, c.height);
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(3, 1);
  t.colorSpace = SRGBColorSpace;
  return (headbandTexture = t);
}

// ---------------------------------------------------------------------------
// Book assembly
// ---------------------------------------------------------------------------

export interface BookModel {
  group: Group;
  /** Apply softcover flex (front, back lift in radians). No-op for hardcover. */
  setFlex(front: number, back: number): void;
  dispose(): void;
}

function materials(spec: BookSpec, wrap: Texture) {
  const soft = spec.format === 'softcover';
  const outside = new MeshPhysicalMaterial({
    map: wrap,
    side: DoubleSide,
    // Paperbacks: glossy laminate. Hardcover case wrap: satin/matte.
    roughness: soft ? 0.38 : 0.6,
    clearcoat: soft ? 0.5 : 0.12,
    clearcoatRoughness: soft ? 0.18 : 0.5,
    sheen: soft ? 0 : 0.2,
    sheenRoughness: 0.8,
    sheenColor: new Color('#553333'),
  });
  const inside = new MeshStandardMaterial({ color: soft ? '#f4f1ea' : '#e9e2d2', roughness: 0.92, side: DoubleSide });
  const page = new MeshStandardMaterial({ map: getPageTexture(), roughness: 0.96, side: DoubleSide });
  const paper = new MeshStandardMaterial({ color: '#f2eee5', roughness: 0.95, side: DoubleSide });
  const hidden = new MeshStandardMaterial({ color: '#2a2622', roughness: 1, side: DoubleSide });
  return { outside, inside, page, paper, hidden };
}

export function buildBook(spec: BookSpec, wrap: Texture): BookModel {
  return spec.format === 'hardcover' ? buildHardcover(spec, wrap) : buildSoftcover(spec, wrap);
}

function buildSoftcover(spec: BookSpec, wrap: Texture): BookModel {
  const { width: W, height: H, thickness: T } = spec;
  const { spineStart: s0, spineEnd: s1 } = spec.wrap;
  const c = SOFTCOVER.cover;
  const hx = -W / 2 + SOFTCOVER.hinge; // score line
  const r = 0.035; // spine corner radius — paperbacks are nearly square here
  const FLAP = 22;
  const mats = materials(spec, wrap);
  const group = new Group();

  const profile = (flexF: number, flexB: number): ProfilePoint[] => {
    const pts: ProfilePoint[] = [];
    const flapLen = W / 2 - hx;
    const flap = (sigma: number, phi: number, a: number) => {
      // Bend with constant curvature past the score line.
      const k = phi / flapLen;
      const x = k > 1e-5 ? hx + Math.sin(k * a) / k : hx + a;
      const lift = k > 1e-5 ? (1 - Math.cos(k * a)) / k : 0;
      return { x, z: sigma * (T / 2 + lift) };
    };
    const uBack = (a: number) => s0 * (1 - (a + SOFTCOVER.hinge) / W); // a measured from the hinge outward
    const uFront = (a: number) => s1 + (1 - s1) * ((a + SOFTCOVER.hinge) / W);

    // back flap, fore-edge → hinge
    for (let i = FLAP; i >= 0; i--) {
      const a = (flapLen * i) / FLAP;
      const p = flap(-1, flexB, a);
      pts.push({ ...p, u: uBack(a), thick: c });
    }
    // back panel between hinge and spine corner
    pts.push({ x: -W / 2 + r, z: -T / 2, u: s0 * (1 - r / W), thick: c });
    // corner, spine, corner
    const spineLen = T - 2 * r + Math.PI * r;
    const spinePts: { x: number; z: number; d: number }[] = [];
    const quarter = (Math.PI * r) / 2;
    for (let i = 0; i <= 4; i++) {
      const th = -Math.PI / 2 - (i / 4) * (Math.PI / 2);
      spinePts.push({ x: -W / 2 + r + r * Math.cos(th), z: -T / 2 + r + r * Math.sin(th), d: (i / 4) * quarter });
    }
    for (let i = 1; i < 6; i++) {
      const dz = ((T - 2 * r) * i) / 6;
      spinePts.push({ x: -W / 2, z: -T / 2 + r + dz, d: quarter + dz });
    }
    for (let i = 0; i <= 4; i++) {
      const th = Math.PI - (i / 4) * (Math.PI / 2);
      spinePts.push({
        x: -W / 2 + r + r * Math.cos(th),
        z: T / 2 - r + r * Math.sin(th),
        d: quarter + (T - 2 * r) + (i / 4) * quarter,
      });
    }
    for (const p of spinePts) pts.push({ x: p.x, z: p.z, u: s0 + ((s1 - s0) * p.d) / spineLen, thick: c });
    // front panel from the corner to the hinge
    pts.push({ x: -W / 2 + r, z: T / 2, u: s1 + (1 - s1) * (r / W), thick: c });
    for (let i = 0; i <= FLAP; i++) {
      const a = (flapLen * i) / FLAP;
      const p = flap(1, flexF, a);
      pts.push({ ...p, u: uFront(a), thick: c });
    }
    return pts;
  };

  let flexState: [number, number] = [0, 0];
  const cover = new Shell(profile(0, 0), -H / 2, H / 2);
  group.add(new Mesh(cover.geometry, [mats.outside, mats.inside]));

  const inset = 0.004;
  const zt = T / 2 - c;
  const block = textBlock(
    [
      { x: -W / 2 + c, z: -zt, mat: PAPER },
      { x: W / 2 - inset, z: -zt, mat: PAGE },
      { x: W / 2 - inset, z: zt, mat: PAPER },
      { x: -W / 2 + c, z: zt, mat: HIDDEN },
    ],
    H / 2 - inset,
  );
  group.add(new Mesh(block, [mats.page, mats.paper, mats.hidden]));

  return {
    group,
    setFlex(front, back) {
      if (Math.abs(front - flexState[0]) < 2e-4 && Math.abs(back - flexState[1]) < 2e-4) return;
      flexState = [front, back];
      cover.update(profile(front, back));
    },
    dispose() {
      disposeGroup(group);
    },
  };
}

function buildHardcover(spec: BookSpec, wrap: Texture): BookModel {
  const { width: W, height: H, thickness: T } = spec;
  const { spineStart: s0, spineEnd: s1 } = spec.wrap;
  const { board: b, overhang: o, spineBulge: bulge } = HARDCOVER;
  const mats = materials(spec, wrap);
  const group = new Group();

  const xj = -W / 2 + 0.2; // board's spine edge
  const xs = -W / 2 - 0.06; // spine stiffener edge
  const dip = 0.065; // French groove depth
  const xf = W / 2 + o; // board fore-edge
  const caseThin = 0.03;
  const spineThick = 0.05;

  const pts: ProfilePoint[] = [];
  const boardU = (x: number) => (xf - x) / (xf - xs); // 0 at fore-edge → 1 at the spine edge
  const smooth = (e0: number, e1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const side = (sigma: number) => {
    const out: ProfilePoint[] = [];
    // board face, fore-edge → joint
    for (let i = 0; i <= 6; i++) {
      const x = xf + ((xj - xf) * i) / 6;
      out.push({ x, z: sigma * (T / 2), u: boardU(x), thick: b });
    }
    // French groove
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      const x = xj + (xs - xj) * t;
      const z = sigma * (T / 2 - (dip * (1 - Math.cos(2 * Math.PI * t))) / 2);
      out.push({ x, z, u: boardU(x), thick: b + (caseThin - b) * smooth(0, 0.3, t) });
    }
    return out;
  };

  const back = side(-1).map((p) => ({ ...p, u: s0 * p.u }));
  const front = side(1)
    .reverse()
    .map((p) => ({ ...p, u: s1 + (1 - s1) * (1 - p.u) }));
  pts.push(...back);
  const SP = 24;
  for (let i = 1; i < SP; i++) {
    const t = i / SP;
    const th = -Math.PI / 2 + Math.PI * t;
    pts.push({
      x: xs - bulge * Math.cos(th),
      z: (T / 2) * Math.sin(th),
      u: s0 + (s1 - s0) * t,
      thick: spineThick,
    });
  }
  pts.push(...front);

  const shell = new Shell(pts, -H / 2 - o, H / 2 + o);
  group.add(new Mesh(shell.geometry, [mats.outside, mats.inside]));

  // Rounded & backed text block: convex back, matching concave fore-edge.
  const tb = T / 2 - b - 0.004;
  const bb = bulge * 0.62;
  const section: { x: number; z: number; mat: number }[] = [];
  const N = 16;
  // fore-edge (concave), bottom→top in z
  for (let i = 0; i <= N; i++) {
    const th = -Math.PI / 2 + (Math.PI * i) / N;
    section.push({ x: W / 2 - 0.02 - bb * Math.cos(th), z: tb * Math.sin(th), mat: i === N ? PAPER : PAGE });
  }
  // spine (convex), top→bottom in z
  for (let i = 0; i <= N; i++) {
    const th = Math.PI / 2 - (Math.PI * i) / N;
    section.push({ x: -W / 2 - bb * Math.cos(th), z: tb * Math.sin(th), mat: i === N ? PAPER : HIDDEN });
  }
  group.add(new Mesh(textBlock(section, H / 2), [mats.page, mats.paper, mats.hidden]));

  // Headbands along the top and bottom of the spine.
  const hbMat = new MeshStandardMaterial({ map: getHeadbandTexture(), roughness: 0.7 });
  for (const sy of [1, -1]) {
    const curvePts: Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const th = -Math.PI / 2 + (Math.PI * i) / 12;
      curvePts.push(new Vector3(-W / 2 - bb * Math.cos(th) + 0.03, sy * (H / 2 + 0.018), tb * 0.94 * Math.sin(th)));
    }
    const tube = new TubeGeometry(new CatmullRomCurve3(curvePts), 24, 0.032, 8, false);
    group.add(new Mesh(tube, hbMat));
  }

  return {
    group,
    setFlex() {},
    dispose() {
      disposeGroup(group);
    },
  };
}

function disposeGroup(group: Group) {
  const seen = new Set<Material>();
  group.traverse((obj) => {
    if (obj instanceof Mesh) {
      obj.geometry.dispose();
      const list = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of list as Material[]) seen.add(m);
    }
  });
  // Shared procedural textures (pages, headband) are cached and kept; the
  // wrap texture belongs to the caller.
  seen.forEach((m) => m.dispose());
}
