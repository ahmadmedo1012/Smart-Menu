'use client';

/* P12-2b (S1) — «جزيرة المطبخ»: the ORIGINAL three.js diorama.
 * A round floating wooden table-island carrying a steaming teapot, bowls,
 * amber tea glasses, a small parasol and a string of lantern lights —
 * floating over a deep plum void (dark stage) / cream daylight (light
 * stage) with a soft radial sheen beneath. Steam = drifting sprites.
 *
 * The world is Smart Menu's own Libyan tea-table — original props only:
 * no borrowed characters, no street-stall copy, no foreign signage
 * (spec adaptation rules).
 *
 * Mechanics (spec implementation notes, all honored):
 *   · plain three (imported members only — no namespace import, no r3f);
 *   · dynamic-imported with ssr:false from the client HomePage;
 *   · idle float bob + pointer-move parallax (camera lerp ~±2°) +
 *     drag-to-rotate the island with inertia decay;
 *   · theme-aware: stage read from the REAL CSS var --sm-paper on
 *     .landing (night = warm lantern lighting, day = cream daylight),
 *     MutationObserver on <html> class repaints live;
 *   · DPR capped at 2; rAF paused offscreen (IntersectionObserver) and
 *     on hidden tabs (visibilitychange);
 *   · prefers-reduced-motion → ONE static framed render, no loop, no
 *     parallax, no drag;
 *   · full dispose on unmount (geometries, materials, textures, renderer).
 * The canvas is aria-hidden decor: headline, CTAs and hotspot links are
 * real HTML above it.
 */

import { useEffect, useRef } from 'react';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Group,
  Mesh,
  Sprite,
  SpriteMaterial,
  Points,
  PointsMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  AdditiveBlending,
  CanvasTexture,
  SRGBColorSpace,
  Color,
  Fog,
  HemisphereLight,
  DirectionalLight,
  PointLight,
  CylinderGeometry,
  SphereGeometry,
  ConeGeometry,
  TorusGeometry,
  TubeGeometry,
  PlaneGeometry,
  QuadraticBezierCurve3,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Vector3,
  type Material,
  type Texture,
} from 'three';

/* Stage palettes — the void pair is the spec's plum world (#20122E→#2A1840),
 * the day pair is cream daylight. Lantern warmth flips with the stage. */
const STAGE = {
  night: {
    bg1: '#20122E',
    bg2: '#2A1840',
    fog: '#241635',
    hemiSky: '#3A2A55',
    hemiGround: '#160E20',
    hemiI: 0.5,
    key: '#FFD3A0',
    keyI: 1.05,
    rim: '#8A76C9',
    rimI: 0.9,
    lanternI: 2.4,
    lanternLight: 1.35,
    teaI: 1.1,
    steamOp: 0.5,
    sheen: '#E8935C',
  },
  day: {
    bg1: '#F6EEDD',
    bg2: '#E7D9BC',
    fog: '#EFE3C9',
    hemiSky: '#FFF7E8',
    hemiGround: '#D8C6A6',
    hemiI: 1.15,
    key: '#FFFFFF',
    keyI: 1.5,
    rim: '#F2B07B',
    rimI: 0.55,
    lanternI: 0.35,
    lanternLight: 0.12,
    teaI: 0.45,
    steamOp: 0.32,
    sheen: '#F2D8A8',
  },
} as const;

type StageKey = keyof typeof STAGE;

/** vertical two-stop gradient texture (scene background) */
function gradientTexture(top: string, bottom: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 512);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** soft radial disc texture (steam sprite / floor sheen) */
function radialTexture(inner: string, alphaIn: number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(alphaIn, inner);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export default function KitchenIslandScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hostEl = hostRef.current;
    if (!hostEl) return;
    const el = hostEl; // non-null capture for the hoisted event handlers
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── renderer / scene / camera ─────────────────────────────────── */
    const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x20122e, 1);
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.display = 'block';
    canvas.style.inlineSize = '100%';
    canvas.style.blockSize = '100%';
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 900ms ease-out';
    canvas.style.touchAction = 'pan-y'; // horizontal drag rotates, vertical scrolls
    hostEl.appendChild(canvas);

    const scene = new Scene();
    const camera = new PerspectiveCamera(36, 1, 0.1, 60);
    const CAM_BASE = new Vector3(0, 1.05, 6.9);
    camera.position.copy(CAM_BASE);
    camera.lookAt(0, 0.1, 0);

    /* ── world root (drag rotates THIS; bob moves THIS) ────────────── */
    const island = new Group();
    scene.add(island);

    const woodTop = new MeshStandardMaterial({ color: '#9A663B', roughness: 0.62, metalness: 0.05 });
    const woodSide = new MeshStandardMaterial({ color: '#57351F', roughness: 0.75, metalness: 0.04 });
    const brass = new MeshStandardMaterial({ color: '#B06A2F', roughness: 0.3, metalness: 0.65 });
    const creamWare = new MeshStandardMaterial({ color: '#F1E4CC', roughness: 0.55, metalness: 0.02 });
    const terraWare = new MeshStandardMaterial({ color: '#C2452D', roughness: 0.6, metalness: 0.02 });
    const foodGold = new MeshStandardMaterial({ color: '#D9A441', roughness: 0.8, metalness: 0 });
    const foodRed = new MeshStandardMaterial({ color: '#A93A26', roughness: 0.8, metalness: 0 });
    const poleWood = new MeshStandardMaterial({ color: '#4A2E1A', roughness: 0.7, metalness: 0.05 });
    const glassMat = new MeshStandardMaterial({
      color: '#F7EFE2',
      roughness: 0.15,
      metalness: 0,
      transparent: true,
      opacity: 0.4,
    });
    const teaMat = new MeshStandardMaterial({
      color: '#C97A2E',
      emissive: '#E8912D',
      emissiveIntensity: 0.45,
      roughness: 0.4,
    });
    const lanternMat = new MeshStandardMaterial({
      color: '#FFDCA8',
      emissive: '#FFA64D',
      emissiveIntensity: 0.35,
      roughness: 0.5,
    });
    const wireMat = new MeshStandardMaterial({ color: '#3A2417', roughness: 0.9 });

    // island body — cylinder top + darker tapered side
    const topMesh = new Mesh(new CylinderGeometry(1.55, 1.55, 0.16, 48), woodTop);
    topMesh.position.y = 0.08;
    const sideMesh = new Mesh(new CylinderGeometry(1.5, 1.05, 0.95, 48), woodSide);
    sideMesh.position.y = -0.48;
    island.add(topMesh, sideMesh);
    const TOP = 0.16; // table surface height

    // ── teapot (sphere body + spout + handle torus + lid) ─────────────
    const teapot = new Group();
    const body = new Mesh(new SphereGeometry(0.34, 26, 18), brass);
    body.scale.set(1, 0.8, 1);
    body.position.y = TOP + 0.24;
    const spout = new Mesh(new CylinderGeometry(0.045, 0.085, 0.48, 12), brass);
    spout.position.set(0.42, TOP + 0.4, 0.05);
    spout.rotation.z = -0.9;
    const handle = new Mesh(new TorusGeometry(0.15, 0.032, 10, 18, Math.PI), brass);
    handle.position.set(-0.38, TOP + 0.27, 0);
    handle.rotation.z = Math.PI / 2;
    const lid = new Mesh(new CylinderGeometry(0.15, 0.18, 0.09, 18), brass);
    lid.position.y = TOP + 0.56;
    const knob = new Mesh(new SphereGeometry(0.055, 12, 10), poleWood);
    knob.position.y = TOP + 0.63;
    teapot.add(body, spout, handle, lid, knob);
    teapot.position.set(-0.55, 0, -0.42);
    island.add(teapot);

    // ── bowls (sphere halves) + food mounds ───────────────────────────
    const bowlGeo = new SphereGeometry(0.27, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const bowlSpots: Array<[number, number, number, Material]> = [
      [0.42, TOP + 0.05, 0.35, creamWare],
      [0.85, TOP + 0.05, -0.18, creamWare],
      [-0.02, TOP + 0.05, 0.66, creamWare],
    ];
    const foodMats = [foodGold, foodRed, foodGold];
    bowlSpots.forEach(([x, y, z, m], i) => {
      const b = new Mesh(bowlGeo, m);
      b.position.set(x, y, z);
      const food = new Mesh(new SphereGeometry(0.19, 18, 12), foodMats[i]!);
      food.scale.y = 0.45;
      food.position.set(x, y + 0.05, z);
      island.add(b, food);
    });

    // ── tea glasses (small cylinders, emissive amber tea) ─────────────
    const glassSpots: Array<[number, number]> = [
      [0.02, -0.75],
      [0.3, -0.62],
      [0.58, -0.5],
    ];
    for (const [x, z] of glassSpots) {
      const glass = new Mesh(new CylinderGeometry(0.075, 0.06, 0.2, 12), glassMat);
      glass.position.set(x, TOP + 0.1, z);
      const tea = new Mesh(new CylinderGeometry(0.062, 0.052, 0.155, 12), teaMat);
      tea.position.set(x, TOP + 0.09, z);
      island.add(glass, tea);
    }

    // ── parasol (cone on a pole) ──────────────────────────────────────
    const parasolPole = new Mesh(new CylinderGeometry(0.028, 0.028, 1.45, 10), poleWood);
    parasolPole.position.set(0.95, TOP + 0.72, 0.78);
    const canopy = new Mesh(new ConeGeometry(0.52, 0.34, 9), creamWare);
    canopy.position.set(0.95, TOP + 1.32, 0.78);
    const canopyTip = new Mesh(new SphereGeometry(0.045, 10, 8), terraWare);
    canopyTip.position.set(0.95, TOP + 1.52, 0.78);
    island.add(parasolPole, canopy, canopyTip);

    // ── lantern string on a catenary-ish sag between two poles ────────
    const poleA = new Mesh(new CylinderGeometry(0.022, 0.022, 1.05, 8), poleWood);
    poleA.position.set(-1.25, TOP + 0.5, -0.95);
    const poleB = new Mesh(new CylinderGeometry(0.022, 0.022, 1.05, 8), poleWood);
    poleB.position.set(1.3, TOP + 0.5, -0.85);
    island.add(poleA, poleB);
    const sag = new QuadraticBezierCurve3(
      new Vector3(-1.25, TOP + 1.0, -0.95),
      new Vector3(0, TOP + 0.7, -0.9),
      new Vector3(1.3, TOP + 1.0, -0.85),
    );
    const wire = new Mesh(new TubeGeometry(sag, 24, 0.008, 5), wireMat);
    island.add(wire);
    const lanterns: Mesh[] = [];
    for (let i = 1; i <= 7; i++) {
      const p = sag.getPoint(i / 8);
      const l = new Mesh(new SphereGeometry(0.052, 12, 10), lanternMat);
      l.position.copy(p).add(new Vector3(0, -0.05, 0));
      island.add(l);
      lanterns.push(l);
    }
    const lanternLight = new PointLight('#FFB056', 1.3, 5.5, 1.8);
    lanternLight.position.set(0, TOP + 0.8, -0.9);
    island.add(lanternLight);

    /* ── steam — drifting Points + sprites rising and fading ────────── */
    const steamTex = radialTexture('rgba(255,255,255,0.85)', 0.35);
    const sprites: Sprite[] = [];
    const steamSeeds: Array<{ ox: number; oy: number; oz: number; speed: number; phase: number; sway: number }> = [];
    const steamOrigins: Array<[number, number, number]> = [
      [-0.02, TOP + 0.66, -0.36], // teapot lid
      [0.08, TOP + 0.52, -0.3], // spout tip area
      [0.42, TOP + 0.18, 0.35], // bowl 1
      [0.85, TOP + 0.18, -0.18], // bowl 2
    ];
    for (let i = 0; i < 14; i++) {
      const m = new SpriteMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false });
      const s = new Sprite(m);
      const o = steamOrigins[i % steamOrigins.length]!;
      const seed = {
        ox: o[0] + (Math.random() - 0.5) * 0.12,
        oy: o[1],
        oz: o[2] + (Math.random() - 0.5) * 0.12,
        speed: 0.28 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        sway: 0.04 + Math.random() * 0.05,
      };
      s.scale.setScalar(0.22);
      s.position.set(seed.ox, seed.oy, seed.oz);
      scene.add(s);
      sprites.push(s);
      steamSeeds.push(seed);
    }
    // a sparse Points cloud for ambient vapor drift (cheap depth cue)
    const vCount = 60;
    const vPos = new Float32Array(vCount * 3);
    for (let i = 0; i < vCount; i++) {
      vPos[i * 3] = (Math.random() - 0.5) * 5;
      vPos[i * 3 + 1] = -1 + Math.random() * 3.6;
      vPos[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    const vGeo = new BufferGeometry();
    vGeo.setAttribute('position', new Float32BufferAttribute(vPos, 3));
    const vMat = new PointsMaterial({
      map: steamTex,
      size: 0.08,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      color: new Color('#FFE9D2'),
    });
    const vapor = new Points(vGeo, vMat);
    scene.add(vapor);

    /* ── reflection sheen — radial glow plane under the island ─────── */
    const sheenTex = radialTexture('rgba(255,255,255,0.55)', 0.4);
    const sheenMat = new MeshBasicMaterial({
      map: sheenTex,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const sheen = new Mesh(new PlaneGeometry(4.6, 2.6), sheenMat);
    sheen.rotation.x = -Math.PI / 2;
    sheen.position.y = -1.42;
    scene.add(sheen);

    /* ── lights ─────────────────────────────────────────────────────── */
    const hemi = new HemisphereLight('#3A2A55', '#160E20', 0.5);
    scene.add(hemi);
    const key = new DirectionalLight('#FFD3A0', 1.05);
    key.position.set(4.5, 6.5, 3.5);
    scene.add(key);
    const rim = new DirectionalLight('#8A76C9', 0.9);
    rim.position.set(-5, 3.5, -4.5);
    scene.add(rim);

    /* ── stage (theme) machinery ────────────────────────────────────── */
    const world: Record<'v1' | 'v2' | 'd1' | 'd2', string> = {
      v1: STAGE.night.bg1,
      v2: STAGE.night.bg2,
      d1: STAGE.day.bg1,
      d2: STAGE.day.bg2,
    };
    let stage: StageKey = 'night';
    let bgTex: Texture = gradientTexture(STAGE.night.bg1, STAGE.night.bg2);
    scene.background = bgTex;
    scene.fog = new Fog(new Color(STAGE.night.fog), 7.5, 16);

    function applyStage(k: StageKey) {
      stage = k;
      const p = STAGE[k];
      const bg1 = k === 'night' ? world.v1 : world.d1;
      const bg2 = k === 'night' ? world.v2 : world.d2;
      bgTex.dispose();
      bgTex = gradientTexture(bg1, bg2);
      scene.background = bgTex;
      (scene.fog as Fog).color.set(p.fog);
      hemi.color.set(p.hemiSky);
      hemi.groundColor.set(p.hemiGround);
      hemi.intensity = p.hemiI;
      key.color.set(p.key);
      key.intensity = p.keyI;
      rim.color.set(p.rim);
      rim.intensity = p.rimI;
      lanternMat.emissiveIntensity = p.lanternI;
      lanternLight.intensity = p.lanternLight;
      teaMat.emissiveIntensity = p.teaI;
      vMat.opacity = k === 'night' ? 0.16 : 0.07;
      vMat.color.set(k === 'night' ? '#FFE9D2' : '#FFFFFF');
      sheenMat.color.set(p.sheen);
      sheenMat.opacity = k === 'night' ? 0.5 : 0.42;
    }
    applyStage('night'); // default; the real stage is read right after mount

    function readWorldColors() {
      const landingEl = el.closest('.landing');
      if (!landingEl) return;
      const cs = getComputedStyle(landingEl);
      const v1 = cs.getPropertyValue('--sm-void-1').trim();
      const v2 = cs.getPropertyValue('--sm-void-2').trim();
      const d1 = cs.getPropertyValue('--sm-scene-day-1').trim();
      const d2 = cs.getPropertyValue('--sm-scene-day-2').trim();
      if (v1) world.v1 = v1;
      if (v2) world.v2 = v2;
      if (d1) world.d1 = d1;
      if (d2) world.d2 = d2;
    }

    function readStageFromDom(): StageKey {
      const landingEl = el.closest('.landing');
      const paper = landingEl
        ? getComputedStyle(landingEl).getPropertyValue('--sm-paper').trim()
        : '';
      if (paper) {
        const c = new Color();
        try {
          c.setStyle(paper);
          return c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722 < 0.4 ? 'night' : 'day';
        } catch {
          /* fall through to class check */
        }
      }
      return document.documentElement.classList.contains('dark') ? 'night' : 'day';
    }
    readWorldColors();
    applyStage(readStageFromDom());

    const themeObserver = new MutationObserver(() => {
      readWorldColors();
      applyStage(readStageFromDom()); // repaint even when the stage is unchanged
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    /* ── sizing ─────────────────────────────────────────────────────── */
    function resize() {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(hostEl);

    /* ── interaction state ──────────────────────────────────────────── */
    const pointer = { x: 0, y: 0 }; // target parallax NDC
    let dragVel = 0;
    let dragging = false;
    let lastX = 0;
    let baseRotY = -0.42; // authored 3/4 low-angle framing
    island.rotation.y = baseRotY;

    function onPointerMove(e: PointerEvent) {
      const r = el.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (dragging) {
        dragVel += (e.clientX - lastX) * 0.0006;
        lastX = e.clientX;
      }
    }
    function onPointerDown(e: PointerEvent) {
      if (reduced) return;
      dragging = true;
      lastX = e.clientX;
      el.setPointerCapture?.(e.pointerId);
    }
    function onPointerUp(e: PointerEvent) {
      dragging = false;
      el.releasePointerCapture?.(e.pointerId);
    }
    if (!reduced) {
      hostEl.addEventListener('pointermove', onPointerMove, { passive: true });
      hostEl.addEventListener('pointerdown', onPointerDown);
      hostEl.addEventListener('pointerup', onPointerUp);
      hostEl.addEventListener('pointerleave', onPointerUp);
      canvas.style.cursor = 'grab';
    }

    /* ── render loop (or single static frame under RM) ─────────────── */
    let raf = 0;
    let running = false;
    let visible = true;
    let hidden = false;
    const clockStart = performance.now();

    function frame(now: number) {
      const t = (now - clockStart) / 1000;
      // idle float bob + the faintest sway
      island.position.y = Math.sin(t * 0.8) * 0.07;
      island.rotation.z = Math.sin(t * 0.5) * 0.008;
      // drag inertia + decay
      baseRotY += dragVel;
      dragVel *= 0.93;
      if (!dragging && Math.abs(dragVel) < 0.00002) dragVel = 0;
      island.rotation.y = baseRotY + pointer.x * 0.05;
      // parallax — camera lerps ±~2° around the base
      camera.position.x += (CAM_BASE.x + pointer.x * 0.28 - camera.position.x) * 0.06;
      camera.position.y += (CAM_BASE.y - pointer.y * 0.18 - camera.position.y) * 0.06;
      camera.lookAt(0, 0.1, 0);
      // steam sprites — rise, sway, fade over their life
      const op = STAGE[stage].steamOp;
      for (let i = 0; i < sprites.length; i++) {
        const s = sprites[i]!;
        const seed = steamSeeds[i]!;
        const life = (t * 0.16 * (0.7 + seed.speed) + seed.phase / (Math.PI * 2)) % 1;
        s.position.set(
          seed.ox + Math.sin(t * 0.9 + seed.phase) * seed.sway,
          seed.oy + life * 1.05,
          seed.oz + Math.cos(t * 0.7 + seed.phase) * seed.sway * 0.6,
        );
        s.scale.setScalar(0.16 + life * 0.55);
        (s.material as SpriteMaterial).opacity = Math.sin(life * Math.PI) * op;
      }
      vapor.rotation.y = t * 0.02;
      renderer.render(scene, camera);
      if (running) raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible && !hidden) start();
        else stop();
      },
      { threshold: 0.05 },
    );
    io.observe(hostEl);

    function onVisibility() {
      hidden = document.hidden;
      if (hidden) stop();
      else if (visible) start();
    }
    document.addEventListener('visibilitychange', onVisibility);

    /* first paint: fade the canvas in honestly (content is already in
     * the HTML — this is a scene entrance, never a loading gate) */
    requestAnimationFrame(() => {
      renderer.render(scene, camera);
      canvas.style.opacity = '1';
      if (!reduced) start();
    });
    if (reduced) {
      // static framed render — one composition, no loop, no parallax
      canvas.style.opacity = '1';
    }

    /* ── teardown ───────────────────────────────────────────────────── */
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      if (!reduced) {
        hostEl.removeEventListener('pointermove', onPointerMove);
        hostEl.removeEventListener('pointerdown', onPointerDown);
        hostEl.removeEventListener('pointerup', onPointerUp);
        hostEl.removeEventListener('pointerleave', onPointerUp);
      }
      scene.traverse((o) => {
        if (o instanceof Mesh || o instanceof Points) {
          o.geometry.dispose();
          const m = o.material as Material | Material[];
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
        if (o instanceof Sprite) {
          o.geometry.dispose();
          (o.material as SpriteMaterial).dispose();
        }
      });
      for (const s of sprites) (s.material as SpriteMaterial).dispose();
      steamTex.dispose();
      sheenTex.dispose();
      bgTex.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return <div ref={hostRef} className="ln-island-host" aria-hidden="true" />;
}
