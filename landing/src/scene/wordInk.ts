/**
 * Word Ink — der Schriftzug KYDON als Punktwolke, die Tinte abgibt.
 *
 * Abgeleitet von der DNA-Ink-Szene der Vorlage: dort war die Geburtslinie
 * eine Doppelhelix, hier ist es die Fläche der Buchstaben. Zwei Wolken:
 *
 *   Kern   dichte Punkte, die die Buchstaben zeichnen (die "Strands")
 *   Tinte  Punkte, die auf den Buchstaben geboren werden und von einem
 *          Simplex-Strömungsfeld nach aussen getragen werden, wachsen und
 *          verblassen — Farbstoff in Wasser.
 *
 * Hell: MULTIPLY auf dem Nebelgrund (Tinte dunkelt das Papier ab).
 * Dunkel: ADDITIVE auf der Nachttinte (Punkte leuchten). Die Farben kommen
 * aus dem Designsystem der App (Mondstein / Mondlicht).
 */

import * as THREE from 'three'

export type Theme = 'light' | 'dark'

interface Palette {
  bg: string
  coreA: string
  coreB: string
  inkCore: string
  inkMid: string
  inkEdge: string
  coreOpacity: number
  inkOpacity: number
}

const PALETTES: Record<Theme, Palette> = {
  light: {
    bg: '#EAF1F0',
    coreA: '#17614D',
    coreB: '#1E7D63',
    inkCore: '#3FBF93',
    inkMid: '#90A0A4',
    inkEdge: '#1E7D63',
    coreOpacity: 1.5,
    inkOpacity: 0.38,
  },
  dark: {
    bg: '#0B1014',
    coreA: '#A6F0CE',
    coreB: '#7FE5B5',
    inkCore: '#7FE5B5',
    inkMid: '#3FBF93',
    inkEdge: '#90A0A4',
    coreOpacity: 0.95,
    inkOpacity: 0.16,
  },
}

/** Weltbreite des Schriftzugs. Die Kamera richtet sich danach. */
const WORD_WIDTH = 12
const CAMERA_FOV = 40

const SNOISE = /* glsl */ `
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  // leichtes Atmen des Schriftzugs, wie das Wiegen der Helix
  vec3 sway(vec3 p, float t) {
    p.z += sin(t * 0.6 + p.x * 0.5) * 0.18;
    p.y += cos(t * 0.45 + p.x * 0.35) * 0.05;
    return p;
  }
  vec3 repel(vec3 wp, vec3 cursor, float radius, float strength, float activity) {
    vec3 toP = wp - cursor;
    float fall = smoothstep(radius, 0.0, length(toP));
    return wp + normalize(toP + vec3(1e-4)) * fall * strength * activity;
  }
  // Hell: Farbe mischt sich ins Weiss (MULTIPLY). Dunkel: Farbe leuchtet (ADDITIVE).
  vec4 shade(vec3 color, float cov, float dark) {
    vec3 light = mix(vec3(1.0), color, cov);
    return vec4(mix(light, color * cov, dark), 1.0);
  }`

const CORE_VERTEX = /* glsl */ `
  attribute vec3 aHome; attribute vec4 aRnd;
  uniform float uTime, uSize, uPixelScale, uThick, uAppear;
  uniform vec3 uCoreA, uCoreB, uCursor; uniform float uRepelRadius, uRepelStrength, uActivity;
  varying vec3 vColor; varying float vFade;
  ${SNOISE}
  void main() {
    vec3 p = aHome + (aRnd.xyz - 0.5) * uThick;
    // beim Erscheinen aus einer losen Wolke zusammenziehen
    p += (aRnd.xyz - 0.5) * vec3(6.0, 4.0, 6.0) * (1.0 - uAppear) * (1.0 - uAppear);
    p = sway(p, uTime);
    vec3 wp = repel((modelMatrix * vec4(p, 1.0)).xyz, uCursor, uRepelRadius, uRepelStrength, uActivity);
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    vColor = mix(uCoreB, uCoreA, aRnd.w);
    vFade = 0.6 + 0.4 * aRnd.y;
    gl_PointSize = max(uSize * uPixelScale * (12.0 / -mv.z), 1.3);
    gl_Position = projectionMatrix * mv;
  }`

const CORE_FRAGMENT = /* glsl */ `
  uniform float uOpacity, uAppear, uDark;
  varying vec3 vColor; varying float vFade;
  ${'vec4 shade(vec3 color, float cov, float dark){ vec3 light = mix(vec3(1.0), color, cov); return vec4(mix(light, color * cov, dark), 1.0); }'}
  void main() {
    float ll = length(gl_PointCoord - 0.5);
    if (ll > 0.5) discard;
    float cov = clamp(smoothstep(0.5, 0.05, ll) * vFade * uOpacity * uAppear, 0.0, 1.0);
    gl_FragColor = shade(vColor, cov, uDark);
  }`

const INK_VERTEX = /* glsl */ `
  attribute vec3 aHome; attribute vec4 aRnd;
  uniform float uTime, uSize, uPixelScale, uThick;
  uniform float uEmitRate, uSpread, uRise, uTurb, uNoiseFreq, uNoiseEvolve, uGrow;
  uniform vec3 uInkCore, uInkMid, uInkEdge, uCursor; uniform float uRepelRadius, uRepelStrength, uActivity;
  varying vec3 vColor; varying float vAlpha;
  ${SNOISE}
  void main() {
    float life = fract(aRnd.w * 7.13 + uTime * uEmitRate * (0.7 + 0.6 * aRnd.x));
    float birthTime = uTime - life / max(uEmitRate, 1e-4);
    vec3 birth = sway(aHome + (aRnd.xyz - 0.5) * uThick, birthTime);

    // nach aussen: weg von der Mittellinie des Schriftzugs, in die Tiefe
    vec3 outward = normalize(vec3(birth.x * 0.08, birth.y, (aRnd.z - 0.5) * 1.6) + vec3(1e-4));

    float e = uTime * uNoiseEvolve;
    vec3 np = birth * uNoiseFreq;
    vec3 flow = vec3(
      snoise(np + vec3(e, 0.0, 0.0)),
      snoise(np + vec3(0.0, e, 0.0) + 11.0),
      snoise(np + vec3(0.0, 0.0, e) + 23.0)
    );
    vec3 p = birth + outward * life * uSpread + flow * pow(life, 1.4) * uTurb + vec3(0.0, life * uRise, 0.0);

    vec3 wp = repel((modelMatrix * vec4(p, 1.0)).xyz, uCursor, uRepelRadius, uRepelStrength, uActivity);
    vec4 mv = viewMatrix * vec4(wp, 1.0);

    vec3 c = mix(uInkCore, uInkMid, smoothstep(0.0, 0.4, life));
    vColor = mix(c, uInkEdge, smoothstep(0.35, 1.0, life));
    vAlpha = smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.4, 1.0, life));

    gl_PointSize = max(uSize * (0.35 + life * uGrow) * uPixelScale * (12.0 / -mv.z), 1.0);
    gl_Position = projectionMatrix * mv;
  }`

const INK_FRAGMENT = /* glsl */ `
  uniform float uOpacity, uAppear, uDark;
  varying vec3 vColor; varying float vAlpha;
  ${'vec4 shade(vec3 color, float cov, float dark){ vec3 light = mix(vec3(1.0), color, cov); return vec4(mix(light, color * cov, dark), 1.0); }'}
  void main() {
    float ll = length(gl_PointCoord - 0.5);
    if (ll > 0.5) discard;
    float cov = clamp(exp(-ll * ll * 7.0) * vAlpha * uOpacity * uAppear, 0.0, 1.0);
    gl_FragColor = shade(vColor, cov, uDark);
  }`

const hex = (value: string) => {
  const n = parseInt(value.slice(1), 16)
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

/**
 * Punkte auf der Fläche eines Wortes, aus einer Zeichnung auf einer
 * Leinwand. Liefert Weltkoordinaten, zentriert, WORD_WIDTH breit.
 */
function sampleWord(word: string, font: string, count: number): Float32Array {
  const W = 1400
  const H = 360
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let size = 300
  ctx.font = `700 ${size}px ${font}`
  // Laufweite wie im App-Lockup: weit gesperrt.
  const tracking = 0.12
  const measure = () => {
    let w = 0
    for (const ch of word) w += ctx.measureText(ch).width
    return w + tracking * size * (word.length - 1)
  }
  while (measure() > W * 0.94) {
    size -= 8
    ctx.font = `700 ${size}px ${font}`
  }
  let x = (W - measure()) / 2
  for (const ch of word) {
    const w = ctx.measureText(ch).width
    ctx.fillText(ch, x + w / 2, H / 2 + size * 0.04)
    x += w + tracking * size
  }

  const data = ctx.getImageData(0, 0, W, H).data
  const filled: number[] = []
  let minX = W
  let maxX = 0
  for (let y = 0; y < H; y += 2) {
    for (let x2 = 0; x2 < W; x2 += 2) {
      if (data[(y * W + x2) * 4 + 3] > 128) {
        filled.push(x2, y)
        if (x2 < minX) minX = x2
        if (x2 > maxX) maxX = x2
      }
    }
  }
  const scale = WORD_WIDTH / Math.max(1, maxX - minX)
  const cx = (minX + maxX) / 2
  const out = new Float32Array(count * 3)
  const pixels = filled.length / 2
  for (let i = 0; i < count; i++) {
    const k = Math.floor(Math.random() * pixels) * 2
    out[i * 3] = (filled[k] + Math.random() * 2 - cx) * scale
    out[i * 3 + 1] = -(filled[k + 1] + Math.random() * 2 - H / 2) * scale
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.35
  }
  return out
}

function cloudGeometry(word: string, font: string, count: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const home = sampleWord(word, font, count)
  const rnd = new Float32Array(count * 4)
  for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random()
  // `position` braucht three für die Anzahl; die Lage kommt aus aHome.
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(home, 3))
  geometry.setAttribute('aHome', new THREE.Float32BufferAttribute(home, 3))
  geometry.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 4))
  return geometry
}

export interface WordInkOptions {
  word?: string
  font?: string
  coreCount?: number
  inkCount?: number
}

export class WordInk {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 200)
  private readonly group = new THREE.Group()
  private readonly core: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>
  private readonly ink: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>
  private readonly shared: Record<string, THREE.IUniform>
  private readonly bg = new THREE.Color()

  private elapsed = 0
  private last = performance.now() / 1000
  private readonly started = performance.now()
  private readonly pointerTarget = new THREE.Vector2()
  private readonly pointer = new THREE.Vector2()
  private pointerActive = false
  private pointerLastMove = 0
  private activity = 0
  private readonly cursor = new THREE.Vector3()
  private readonly tmp = new THREE.Vector3()
  private readonly dir = new THREE.Vector3()
  private camDist = 16

  constructor(canvas: HTMLCanvasElement, theme: Theme, options: WordInkOptions = {}) {
    const word = options.word ?? 'KYDON'
    const font = options.font ?? '"Saira Condensed", "Arial Narrow", sans-serif'
    const small = window.matchMedia('(max-width: 720px)').matches
    const coreCount = options.coreCount ?? (small ? 26000 : 46000)
    const inkCount = options.inkCount ?? (small ? 50000 : 110000)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    // Keine Farbraumumrechnung: die Hex-Werte sind bereits die Bildschirmfarben
    // (wie in der Vorlage). Sonst hellt three den Nachtgrund zu Grau auf.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    this.scene.background = this.bg
    this.scene.add(this.camera)
    this.scene.add(this.group)

    this.shared = {
      uTime: { value: 0 },
      uAppear: { value: 0 },
      uPixelScale: { value: 1 },
      uDark: { value: 0 },
      uThick: { value: 0.035 },
      uCursor: { value: this.cursor },
      uRepelRadius: { value: 1.6 },
      uRepelStrength: { value: 0.9 },
      uActivity: { value: 0 },
    }

    const material = (vertexShader: string, fragmentShader: string, extra: Record<string, THREE.IUniform>) =>
      new THREE.ShaderMaterial({
        uniforms: { ...this.shared, ...extra },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        premultipliedAlpha: true,
      })

    this.core = new THREE.Points(
      cloudGeometry(word, font, coreCount),
      material(CORE_VERTEX, CORE_FRAGMENT, {
        uSize: { value: 1.5 },
        uOpacity: { value: 0.6 },
        uCoreA: { value: new THREE.Vector3() },
        uCoreB: { value: new THREE.Vector3() },
      }),
    )
    this.ink = new THREE.Points(
      cloudGeometry(word, font, inkCount),
      material(INK_VERTEX, INK_FRAGMENT, {
        uSize: { value: 2.6 },
        uOpacity: { value: 0.4 },
        uGrow: { value: 2.2 },
        uEmitRate: { value: 0.09 },
        uSpread: { value: 0.9 },
        uRise: { value: 0.45 },
        uTurb: { value: 1.1 },
        uNoiseFreq: { value: 0.55 },
        uNoiseEvolve: { value: 0.08 },
        uInkCore: { value: new THREE.Vector3() },
        uInkMid: { value: new THREE.Vector3() },
        uInkEdge: { value: new THREE.Vector3() },
      }),
    )
    this.core.frustumCulled = false
    this.ink.frustumCulled = false
    this.group.add(this.ink, this.core)
    this.setTheme(theme)
  }

  setTheme(theme: Theme): void {
    const p = PALETTES[theme]
    const dark = theme === 'dark'
    const c = this.bg
    const v = hex(p.bg)
    c.setRGB(v.x, v.y, v.z)
    this.renderer.setClearColor(c, 1)
    this.shared.uDark.value = dark ? 1 : 0
    const cu = this.core.material.uniforms
    cu.uCoreA.value.copy(hex(p.coreA))
    cu.uCoreB.value.copy(hex(p.coreB))
    cu.uOpacity.value = p.coreOpacity
    const iu = this.ink.material.uniforms
    iu.uInkCore.value.copy(hex(p.inkCore))
    iu.uInkMid.value.copy(hex(p.inkMid))
    iu.uInkEdge.value.copy(hex(p.inkEdge))
    iu.uOpacity.value = p.inkOpacity
    for (const m of [this.core.material, this.ink.material]) {
      m.blending = dark ? THREE.AdditiveBlending : THREE.MultiplyBlending
      m.needsUpdate = true
    }
  }

  setSize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return
    const ratio = Math.min(window.devicePixelRatio, 1.75)
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    // So weit weg, dass der Schriftzug ~82 % der Breite füllt.
    const halfFov = THREE.MathUtils.degToRad(CAMERA_FOV / 2)
    const narrow = width < 720
    const fill = narrow ? 0.86 : 0.66
    const fitWidth = (WORD_WIDTH / fill / 2) / (Math.tan(halfFov) * this.camera.aspect)
    const fitHeight = 3.2 / Math.tan(halfFov)
    this.camDist = Math.max(fitWidth, fitHeight)
    // Der Schriftzug steht im oberen Teil; unten liegt der Text.
    const visibleHalf = Math.tan(halfFov) * this.camDist
    this.group.position.y = visibleHalf * (narrow ? 0.34 : 0.2)
    this.camera.updateProjectionMatrix()
    this.shared.uPixelScale.value = ((height * ratio) / 1400) * (16 / this.camDist) * 1.6
  }

  setPointer(x: number, y: number): void {
    this.pointerTarget.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)))
    this.pointerActive = true
    this.pointerLastMove = performance.now()
  }

  clearPointer(): void {
    this.pointerActive = false
  }

  render(reducedMotion = false): void {
    const now = performance.now()
    const delta = Math.min(0.05, now / 1000 - this.last)
    this.last = now / 1000
    if (!reducedMotion) this.elapsed += delta
    this.shared.uTime.value = this.elapsed
    this.shared.uAppear.value = reducedMotion ? 1 : Math.min(1, Math.max(0, ((now - this.started) / 1000 - 0.15) / 1.8))

    this.pointer.lerp(this.pointerTarget, 0.05)
    this.group.rotation.y = Math.sin(this.elapsed * 0.18) * 0.12 + this.pointer.x * 0.12
    this.group.rotation.x = -this.pointer.y * 0.08
    this.camera.position.set(this.pointer.x * 1.2, this.pointer.y * 0.8, this.camDist)
    this.camera.lookAt(0, 0, 0)

    // Zeiger auf die Ebene z = 0 projizieren.
    this.tmp.set(0, 0, 0)
    if (this.pointerActive) {
      this.dir.set(this.pointerTarget.x, this.pointerTarget.y, 0.5).unproject(this.camera).sub(this.camera.position).normalize()
      if (Math.abs(this.dir.z) > 1e-4) {
        const d = -this.camera.position.z / this.dir.z
        if (d > 0) this.tmp.copy(this.camera.position).addScaledVector(this.dir, d)
      }
    }
    this.cursor.lerp(this.tmp, 0.15)
    const idle = (now - this.pointerLastMove) / 1000
    this.activity += ((this.pointerActive && idle < 3 ? 1 : 0) - this.activity) * 0.08
    this.shared.uActivity.value = this.activity

    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    for (const cloud of [this.core, this.ink]) {
      cloud.geometry.dispose()
      cloud.material.dispose()
    }
    this.renderer.dispose()
  }
}
