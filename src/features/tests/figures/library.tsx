import type { CSSProperties, ReactNode } from 'react'

/**
 * Skizzen der Testbibliothek.
 *
 * Schematisch und ohne Wörter: Beschriftet wird nur mit Buchstaben, Zahlen
 * und Einheiten, die in jeder Sprache gleich sind. Die Bildbeschreibung für
 * Screenreader steht am Test (`procedure.figure.alt`), nicht hier.
 *
 * Farben kommen aus den Design-Tokens und folgen damit dem hellen und dem
 * dunklen Design. Maße stehen nur dort, wo das Protokoll sie nennt; wo es
 * keine nennt (z. B. der Pencak-Silat-Parcours), zeigt die Skizze keine.
 */

type Pt = [number, number]

const INK = 'var(--ink)'
const MUTED = 'var(--ink-muted)'
const ACCENT = 'var(--accent)'
const LINE = 'var(--line-strong)'

const base: CSSProperties = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
const S = {
  body: { ...base, stroke: INK, strokeWidth: 3 } as CSSProperties,
  thin: { ...base, stroke: MUTED, strokeWidth: 1.4 } as CSSProperties,
  dash: { ...base, stroke: MUTED, strokeWidth: 1.4, strokeDasharray: '4 4' } as CSSProperties,
  acc: { ...base, stroke: ACCENT, strokeWidth: 2.4 } as CSSProperties,
  floor: { ...base, stroke: LINE, strokeWidth: 2 } as CSSProperties,
  mat: { fill: 'var(--surface-sunken)', stroke: LINE, strokeWidth: 1.5 } as CSSProperties,
  dotInk: { fill: INK } as CSSProperties,
  dotAcc: { fill: ACCENT } as CSSProperties,
  txt: { fill: MUTED, fontSize: 10, fontFamily: 'var(--font-mono)' } as CSSProperties,
  txtInk: { fill: INK, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)' } as CSSProperties,
}

const pts = (p: Pt[]) => p.map((q) => q.join(',')).join(' ')

function Poly({ p, st = S.body }: { p: Pt[]; st?: CSSProperties }) {
  return <polyline points={pts(p)} style={st} />
}
function Head({ x, y, r = 7 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} style={S.body} />
}
function T({ x, y, children, a = 'middle', k = 'txt' }: { x: number; y: number; children: ReactNode; a?: 'start' | 'middle' | 'end'; k?: 'txt' | 'txtInk' }) {
  return (
    <text x={x} y={y} textAnchor={a} style={S[k]}>
      {children}
    </text>
  )
}
function Arrow({ from, to, st = S.acc }: { from: Pt; to: Pt; st?: CSSProperties }) {
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0])
  const h = 6
  const a1: Pt = [to[0] - h * Math.cos(ang - 0.45), to[1] - h * Math.sin(ang - 0.45)]
  const a2: Pt = [to[0] - h * Math.cos(ang + 0.45), to[1] - h * Math.sin(ang + 0.45)]
  return (
    <>
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} style={st} />
      <polyline points={pts([a1, to, a2])} style={st} />
    </>
  )
}
/** Maßlinie mit Endstrichen und Beschriftung. */
function Dim({ a, b, label, off = 0 }: { a: Pt; b: Pt; label: string; off?: number }) {
  const vertical = a[0] === b[0]
  return (
    <>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} style={S.thin} />
      {vertical ? (
        <>
          <line x1={a[0] - 3} y1={a[1]} x2={a[0] + 3} y2={a[1]} style={S.thin} />
          <line x1={b[0] - 3} y1={b[1]} x2={b[0] + 3} y2={b[1]} style={S.thin} />
          <T x={a[0] + 8 + off} y={(a[1] + b[1]) / 2 + 3} a="start">{label}</T>
        </>
      ) : (
        <>
          <line x1={a[0]} y1={a[1] - 3} x2={a[0]} y2={a[1] + 3} style={S.thin} />
          <line x1={b[0]} y1={b[1] - 3} x2={b[0]} y2={b[1] + 3} style={S.thin} />
          <T x={(a[0] + b[0]) / 2} y={a[1] - 6 + off}>{label}</T>
        </>
      )}
    </>
  )
}
function Timer({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={9} style={S.thin} />
      <line x1={x} y1={y} x2={x} y2={y - 6} style={S.thin} />
      <line x1={x} y1={y} x2={x + 4} y2={y + 2} style={S.thin} />
      <line x1={x - 3} y1={y - 12} x2={x + 3} y2={y - 12} style={S.thin} />
    </g>
  )
}
/** Person in Draufsicht: Kreis mit Kennbuchstabe. */
function Dot({ x, y, k, on = false }: { x: number; y: number; k?: string; on?: boolean }) {
  return (
    <>
      <circle cx={x} cy={y} r={9} style={on ? S.dotAcc : { ...S.mat, fill: 'var(--surface)' }} />
      {k && <T x={x} y={y + 3.5} k="txtInk">{k}</T>}
    </>
  )
}
const Floor = ({ y = 160, x1 = 20, x2 = 300 }: { y?: number; x1?: number; x2?: number }) => <line x1={x1} y1={y} x2={x2} y2={y} style={S.floor} />

// ---------------------------------------------------------------------------

function SjftMat() {
  return (
    <>
      <rect x="14" y="44" width="292" height="92" rx="12" style={S.mat} />
      <Dim a={[60, 40]} b={[160, 40]} label="6 m" />
      <Dim a={[160, 40]} b={[260, 40]} label="6 m" />
      <Dot x={60} y={90} k="A" />
      <Dot x={160} y={90} k="B" on />
      <Dot x={260} y={90} k="C" />
      <Arrow from={[148, 78]} to={[76, 78]} />
      <Arrow from={[76, 102]} to={[148, 102]} />
      <Arrow from={[172, 78]} to={[244, 78]} />
      <Arrow from={[244, 102]} to={[172, 102]} />
      <T x={160} y={128}>15 s · 30 s · 30 s</T>
      <Timer x={292} y={22} />
    </>
  )
}
function SwftMat() {
  return (
    <>
      <rect x="14" y="30" width="292" height="120" rx="12" style={S.mat} />
      <Dot x={70} y={90} k="A" />
      <Dot x={160} y={90} k="B" on />
      <Dot x={250} y={90} k="C" />
      <Arrow from={[150, 80]} to={[82, 80]} />
      <Arrow from={[82, 100]} to={[150, 100]} />
      <Arrow from={[170, 80]} to={[238, 80]} />
      <Arrow from={[238, 100]} to={[170, 100]} />
      <Timer x={292} y={16} />
      <path d="M22 14c-4-4-10 1-6 6l6 6 6-6c4-5-2-10-6-6z" style={S.thin} />
    </>
  )
}

/** Klimmzug von vorn, zwei Phasen; der Judogi hängt mit den Revers über der Stange. */
function ChinUpFront() {
  const phase = (cx: number, top: boolean) => {
    const sy = top ? 62 : 90
    const hy = top ? 34 : 70
    return (
      <>
        <rect x={cx - 20} y="34" width="5" height={top ? 22 : 30} rx="1.5" style={S.dotAcc} />
        <rect x={cx + 15} y="34" width="5" height={top ? 22 : 30} rx="1.5" style={S.dotAcc} />
        <Head x={cx} y={hy} />
        <Poly p={[[cx - 12, 42], [top ? cx - 24 : cx - 10, top ? 56 : 66], [cx - 8, sy]]} />
        <Poly p={[[cx + 12, 42], [top ? cx + 24 : cx + 11, top ? 56 : 66], [cx + 8, sy]]} />
        <Poly p={[[cx, sy], [cx, sy + 55]]} />
        <Poly p={[[cx, sy + 55], [cx - 7, sy + 90]]} />
        <Poly p={[[cx, sy + 55], [cx + 7, sy + 90]]} />
      </>
    )
  }
  return (
    <>
      <line x1="60" y1="40" x2="260" y2="40" style={{ ...S.body, strokeWidth: 5 }} />
      {phase(120, false)}
      {phase(215, true)}
      <Arrow from={[160, 120]} to={[160, 70]} />
    </>
  )
}
/** Isometrischer Klimmzug von der Seite: Kinn über der Stange, Timer, Mindesthöhe. */
function ChinUpSide() {
  return (
    <>
      <line x1="80" y1="46" x2="240" y2="46" style={S.dash} />
      <circle cx="170" cy="50" r="4.5" style={{ ...S.body, strokeWidth: 3.5 }} />
      <rect x="162" y="50" width="5" height="26" rx="1.5" style={S.dotAcc} />
      <Head x={158} y={34} />
      <Poly p={[[168, 50], [156, 62], [154, 50]]} />
      <Poly p={[[154, 50], [152, 100]]} />
      <Poly p={[[152, 100], [147, 150]]} />
      <Poly p={[[152, 100], [158, 148]]} />
      <Timer x={252} y={30} />
      <Arrow from={[120, 60]} to={[120, 42]} st={S.thin} />
    </>
  )
}
function Handgrip() {
  return (
    <>
      <Head x={120} y={30} />
      <Poly p={[[120, 37], [120, 100]]} />
      <Poly p={[[120, 100], [114, 140], [114, 168]]} />
      <Poly p={[[120, 100], [126, 140], [126, 168]]} />
      <Poly p={[[120, 50], [120, 84], [158, 84]]} />
      <rect x="156" y="74" width="26" height="20" rx="5" style={S.dotAcc} />
      <path d="M124 84 A 12 12 0 0 0 120 72" style={S.thin} />
      <T x={92} y={86} a="end">90°</T>
      <Floor y={168} x1={60} x2={200} />
      <Arrow from={[210, 84]} to={[184, 84]} st={S.thin} />
    </>
  )
}
function ReactiveAgility() {
  return (
    <>
      <Dot x={160} y={140} k="S" on />
      <Dot x={60} y={82} />
      <Dot x={260} y={82} />
      <Dot x={160} y={30} />
      <Arrow from={[150, 132]} to={[72, 88]} />
      <Arrow from={[170, 132]} to={[248, 88]} />
      <Arrow from={[160, 128]} to={[160, 42]} />
      <T x={172} y={86} a="start">3 m</T>
      <T x={98} y={128} a="end">3 m</T>
      <T x={222} y={128} a="start">3 m</T>
    </>
  )
}
function YBalance() {
  return (
    <>
      <rect x="146" y="80" width="28" height="36" rx="8" style={S.mat} />
      <Arrow from={[160, 78]} to={[160, 18]} />
      <Arrow from={[152, 112]} to={[100, 160]} />
      <Arrow from={[168, 112]} to={[220, 160]} />
      <T x={172} y={20} a="start">1</T>
      <T x={92} y={158} a="end">2</T>
      <T x={228} y={158} a="start">3</T>
    </>
  )
}
function Stork() {
  return (
    <>
      <Head x={160} y={26} />
      <Poly p={[[160, 33], [160, 92]]} />
      <Poly p={[[160, 44], [140, 66], [160, 80]]} />
      <Poly p={[[160, 44], [180, 66], [160, 80]]} />
      <Poly p={[[160, 92], [160, 128], [160, 162]]} />
      <Poly p={[[160, 92], [176, 112], [160, 126]]} />
      <line x1="154" y1="162" x2="170" y2="162" style={{ ...S.body, strokeWidth: 3 }} />
      <Floor />
      <Timer x={236} y={30} />
      <Arrow from={[222, 160]} to={[222, 150]} st={S.thin} />
    </>
  )
}
function JumpSequence({ hold }: { hold?: boolean }) {
  const fig = (x: number, kind: 'stand' | 'dip' | 'air' | 'squat') => {
    const dy = kind === 'air' ? -32 : 0
    const dip = kind === 'dip' || kind === 'squat'
    const hip: Pt = dip ? [x, 100] : [x, 84 + dy]
    const knee: Pt = dip ? [x + 16, 122] : [x - 2, 122 + dy]
    const foot: Pt = kind === 'air' ? [x, 156 + dy] : [x, 158]
    return (
      <>
        <Head x={x} y={(dip ? 56 : 40) + dy} />
        <Poly p={[[x, (dip ? 63 : 47) + dy], hip]} />
        <Poly p={[hip, knee, foot]} />
        <Poly p={[[x, (dip ? 74 : 58) + dy], [x + 10, hip[1] - 2]]} />
      </>
    )
  }
  return (
    <>
      {fig(50, 'stand')}
      {fig(120, hold ? 'squat' : 'dip')}
      {fig(190, 'air')}
      {fig(260, 'stand')}
      <Floor y={160} />
      <Arrow from={[190, 34]} to={[190, 10]} st={S.thin} />
      <line x1="170" y1="40" x2="210" y2="40" style={S.dash} />
      {hold && (
        <>
          <path d="M132 112 A 16 16 0 0 0 128 96" style={S.thin} />
          <T x={106} y={112} a="end">90°</T>
          <T x={120} y={176}>2 s</T>
        </>
      )}
    </>
  )
}
function McGillFlexor() {
  return (
    <>
      <line x1="30" y1="150" x2="290" y2="150" style={S.floor} />
      <polygon points="120,150 160,110 160,150" style={S.mat} />
      <Head x={196} y={62} />
      <Poly p={[[188, 68], [160, 110]]} />
      <Poly p={[[160, 110], [124, 122], [112, 150]]} />
      <Poly p={[[190, 82], [172, 92], [186, 96]]} />
      <path d="M124 150 A 32 32 0 0 1 143 121" style={S.thin} />
      <T x={104} y={140} a="end">60°</T>
      <Timer x={252} y={40} />
    </>
  )
}
function TrunkExtension() {
  return (
    <>
      <rect x="120" y="98" width="70" height="12" rx="3" style={S.mat} />
      <line x1="130" y1="110" x2="130" y2="150" style={S.floor} />
      <line x1="180" y1="110" x2="180" y2="150" style={S.floor} />
      <Poly p={[[190, 90], [258, 90]]} />
      <Poly p={[[190, 90], [150, 90]]} />
      <line x1="196" y1="82" x2="196" y2="98" style={S.acc} />
      <Head x={274} y={90} />
      <Poly p={[[266, 96], [250, 100], [262, 104]]} />
      <line x1="150" y1="72" x2="290" y2="72" style={S.dash} />
      <Timer x={40} y={36} />
    </>
  )
}
function SidePlank() {
  return (
    <>
      <Floor y={150} x1={40} x2={290} />
      <Head x={78} y={98} />
      <Poly p={[[86, 104], [130, 122], [200, 138], [262, 148]]} />
      <Poly p={[[86, 108], [90, 148], [110, 148]]} />
      <line x1="60" y1="148" x2="118" y2="148" style={S.acc} />
      <Poly p={[[86, 104], [270, 148]]} st={S.dash} />
      <Timer x={252} y={40} />
    </>
  )
}
function Flamingo() {
  return (
    <>
      <rect x="120" y="150" width="80" height="10" rx="2" style={S.mat} />
      <Head x={160} y={30} />
      <Poly p={[[160, 37], [160, 90]]} />
      <Poly p={[[160, 90], [160, 130], [160, 148]]} />
      <Poly p={[[160, 90], [178, 108], [176, 132]]} />
      <Poly p={[[160, 48], [140, 66]]} />
      <Poly p={[[160, 48], [180, 66]]} />
      <Timer x={252} y={30} />
      <T x={252} y={64}>60 s</T>
    </>
  )
}
function PunchForce() {
  return (
    <>
      <Floor y={160} />
      <Head x={100} y={52} />
      <Poly p={[[100, 59], [100, 106]]} />
      <Poly p={[[100, 106], [90, 132], [88, 160]]} />
      <Poly p={[[100, 106], [116, 134], [124, 160]]} />
      <Poly p={[[100, 70], [140, 68], [186, 68]]} />
      <circle cx="192" cy="68" r="8" style={S.dotInk} />
      <rect x="204" y="44" width="16" height="70" rx="4" style={S.mat} />
      <line x1="220" y1="60" x2="220" y2="98" style={S.acc} />
      <line x1="224" y1="60" x2="224" y2="98" style={S.acc} />
      <Dim a={[100, 132]} b={[204, 132]} label="" />
      <Dim a={[240, 160]} b={[240, 68]} label="" />
      <Arrow from={[196, 68]} to={[204, 68]} />
    </>
  )
}
function Sprint({ meters, lead }: { meters: number; lead?: boolean }) {
  return (
    <>
      <line x1="20" y1="70" x2="300" y2="70" style={S.floor} />
      <line x1="20" y1="110" x2="300" y2="110" style={S.floor} />
      {lead && <line x1="40" y1="64" x2="40" y2="116" style={S.thin} />}
      <line x1="70" y1="60" x2="70" y2="120" style={{ ...S.acc, strokeWidth: 3 }} />
      <line x1="270" y1="60" x2="270" y2="120" style={{ ...S.acc, strokeWidth: 3 }} />
      <Dim a={[70, 138]} b={[270, 138]} label={`${meters} m`} off={20} />
      {lead && <Dim a={[40, 126]} b={[70, 126]} label="50 cm" off={20} />}
      <Arrow from={[80, 90]} to={[258, 90]} />
      <T x={70} y={54}>0</T>
      <T x={270} y={54}>{meters}</T>
    </>
  )
}
function Shuttle({ meters, legs, kick }: { meters: number; legs: number; kick?: boolean }) {
  const ys = Array.from({ length: legs }, (_, i) => 50 + i * (80 / Math.max(legs - 1, 1)))
  const path: Pt[] = ys.map((y, i) => [i % 2 === 0 ? 100 : 220, y] as Pt)
  return (
    <>
      <line x1="100" y1="34" x2="100" y2="146" style={S.floor} />
      <line x1="220" y1="34" x2="220" y2="146" style={S.floor} />
      <Poly p={path} st={S.acc} />
      <Dim a={[100, 160]} b={[220, 160]} label={`${meters} m`} off={20} />
      {kick && <rect x="246" y="78" width="14" height="36" rx="4" style={S.mat} />}
      {kick && <Arrow from={[228, 96]} to={[244, 96]} st={S.thin} />}
    </>
  )
}
function KickTarget({ axis }: { axis: string }) {
  return (
    <>
      <Floor y={158} />
      <Head x={90} y={52} />
      <Poly p={[[90, 59], [90, 104]]} />
      <Poly p={[[90, 104], [82, 130], [82, 158]]} />
      <Poly p={[[90, 104], [126, 96], [176, 80]]} />
      <rect x="196" y="40" width="18" height="70" rx="5" style={S.mat} />
      <line x1="180" y1="80" x2="230" y2="80" style={S.dash} />
      <Arrow from={[150, 92]} to={[190, 80]} />
      <line x1="30" y1="176" x2="290" y2="176" style={S.thin} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={36 + i * 42} y="170" width="26" height="12" rx="3" style={S.dotAcc} />
      ))}
      <T x={300} y={174} a="end">{axis}</T>
    </>
  )
}
function FencingStrip() {
  return (
    <>
      <rect x="20" y="66" width="280" height="48" rx="4" style={S.mat} />
      <line x1="160" y1="66" x2="160" y2="114" style={S.dash} />
      <Dot x={130} y={90} on />
      <Arrow from={[120, 80]} to={[60, 80]} />
      <Arrow from={[60, 100]} to={[120, 100]} />
      <Arrow from={[142, 90]} to={[204, 90]} />
      <rect x="196" y="72" width="60" height="36" rx="4" style={{ ...S.thin, fill: 'var(--accent-quiet)' }} />
      <Timer x={284} y={40} />
    </>
  )
}
function Lunge() {
  return (
    <>
      <Floor y={160} />
      <Head x={70} y={52} />
      <Poly p={[[70, 59], [70, 104]]} />
      <Poly p={[[70, 104], [58, 132], [50, 160]]} />
      <Poly p={[[70, 104], [82, 130], [82, 160]]} />
      <Poly p={[[70, 72], [100, 80], [136, 86]]} />
      <Head x={190} y={56} />
      <Poly p={[[190, 63], [186, 106]]} />
      <Poly p={[[186, 106], [190, 132], [190, 160]]} />
      <Poly p={[[186, 106], [172, 132], [176, 160]]} />
      <Poly p={[[190, 76], [160, 82], [146, 92]]} />
      <circle cx="140" cy="88" r="4" style={S.dotAcc} />
      <rect x="252" y="44" width="16" height="70" rx="5" style={S.mat} />
      <Arrow from={[100, 96]} to={[246, 96]} st={S.thin} />
      <Timer x={284} y={30} />
    </>
  )
}
function Course() {
  return (
    <>
      <Poly p={[[50, 140], [120, 140], [120, 60], [200, 60], [200, 120], [270, 120]]} st={S.acc} />
      {[[50, 140, 'S'], [120, 60, '1'], [200, 120, '2'], [270, 120, 'Z']].map(([x, y, k]) => (
        <Dot key={String(k)} x={x as number} y={y as number} k={k as string} on={k === 'S'} />
      ))}
      <Timer x={284} y={30} />
    </>
  )
}
function SitReach() {
  return (
    <>
      <Floor y={140} />
      <rect x="190" y="104" width="60" height="36" rx="3" style={S.mat} />
      <line x1="190" y1="100" x2="290" y2="100" style={S.thin} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <line key={i} x1={196 + i * 9} y1="100" x2={196 + i * 9} y2={i % 5 === 0 ? 94 : 97} style={S.thin} />
      ))}
      <Head x={62} y={66} />
      <Poly p={[[66, 73], [96, 112], [186, 112]]} />
      <Poly p={[[80, 84], [140, 90], [222, 98]]} />
      <Arrow from={[176, 90]} to={[236, 90]} st={S.thin} />
    </>
  )
}
function BroadJump() {
  return (
    <>
      <Floor y={158} />
      <line x1="74" y1="150" x2="74" y2="166" style={S.acc} />
      <Head x={62} y={78} />
      <Poly p={[[62, 85], [66, 120], [72, 152]]} />
      <Poly p={[[66, 120], [50, 140], [50, 156]]} />
      <Poly p={[[62, 96], [40, 82]]} />
      <Head x={196} y={76} />
      <Poly p={[[196, 83], [192, 116], [176, 138]]} />
      <Poly p={[[192, 116], [206, 136], [214, 150]]} />
      <Poly p={[[196, 96], [220, 82]]} />
      <circle cx="176" cy="158" r="3.5" style={S.dotAcc} />
      <Dim a={[74, 174]} b={[176, 174]} label="" />
      <Arrow from={[90, 60]} to={[170, 60]} st={S.thin} />
    </>
  )
}


function Track400() {
  return (
    <>
      <rect x="40" y="36" width="240" height="118" rx="59" style={S.thin} />
      <rect x="52" y="48" width="216" height="94" rx="47" style={S.acc} />
      <rect x="64" y="60" width="192" height="70" rx="35" style={S.thin} />
      <line x1="160" y1="30" x2="160" y2="66" style={{ ...S.body, strokeWidth: 3.5 }} />
      <T x={160} y={24}>0</T>
      {[
        [290, 96, '100'],
        [160, 172, '200'],
        [30, 96, '300'],
      ].map(([x, y, k]) => (
        <T key={String(k)} x={x as number} y={y as number} a={x === 290 ? 'start' : x === 30 ? 'end' : 'middle'}>
          {k as string}
        </T>
      ))}
      <Arrow from={[176, 95]} to={[214, 95]} />
      <Timer x={160} y={98} />
    </>
  )
}
function CssPool() {
  return (
    <>
      <rect x="24" y="26" width="272" height="96" rx="8" style={S.mat} />
      <line x1="24" y1="74" x2="296" y2="74" style={S.dash} />
      <Arrow from={[40, 50]} to={[276, 50]} />
      <Arrow from={[40, 98]} to={[158, 98]} />
      <T x={158} y={44}>400 m</T>
      <T x={100} y={116}>200 m</T>
      <Timer x={284} y={98} />
      <T x={160} y={158} k="txtInk">CSS = (T400 − T200) / 2</T>
    </>
  )
}
function TriProcess({ swim, bike, run }: { swim: string; bike: string; run: string }) {
  const stage = (x: number, dist: string, icon: ReactNode) => (
    <>
      <rect x={x} y="60" width="54" height="44" rx="10" style={{ ...S.mat, stroke: ACCENT }} />
      {icon}
      <T x={x + 27} y={124}>{dist}</T>
    </>
  )
  const trans = (x: number, k: string) => (
    <>
      <rect x={x} y="60" width="36" height="44" rx="10" style={S.mat} />
      <T x={x + 18} y={86} k="txtInk">{k}</T>
    </>
  )
  return (
    <>
      {stage(12, swim, <path d="M22 84 q6 -8 12 0 t12 0 t12 0 M22 94 q6 -8 12 0 t12 0" style={S.body} />)}
      {trans(76, 'T1')}
      {stage(120, bike, (
        <>
          <circle cx="138" cy="90" r="7" style={S.body} />
          <circle cx="156" cy="90" r="7" style={S.body} />
          <Poly p={[[138, 90], [146, 78], [156, 90]]} />
        </>
      ))}
      {trans(184, 'T2')}
      {stage(228, run, (
        <>
          <Head x={252} y={72} r={4} />
          <Poly p={[[252, 77], [252, 90]]} />
          <Poly p={[[252, 90], [246, 100]]} />
          <Poly p={[[252, 90], [258, 100]]} />
          <Poly p={[[252, 82], [259, 86]]} />
        </>
      ))}
      <Arrow from={[68, 82]} to={[76, 82]} st={S.thin} />
      <Arrow from={[112, 82]} to={[120, 82]} st={S.thin} />
      <Arrow from={[176, 82]} to={[184, 82]} st={S.thin} />
      <Arrow from={[220, 82]} to={[228, 82]} st={S.thin} />
    </>
  )
}
function StarExcursion() {
  const dirs = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4)
  return (
    <>
      <circle cx="160" cy="95" r="70" style={S.dash} />
      <rect x="150" y="80" width="20" height="30" rx="6" style={S.mat} />
      {dirs.map((a, i) => (
        <Arrow key={i} from={[160 + 16 * Math.cos(a), 95 + 16 * Math.sin(a)]} to={[160 + 66 * Math.cos(a), 95 + 66 * Math.sin(a)]} />
      ))}
    </>
  )
}
function SingleLegHop() {
  return (
    <>
      <Floor y={158} />
      <line x1="74" y1="150" x2="74" y2="166" style={S.acc} />
      <Head x={62} y={76} />
      <Poly p={[[62, 83], [66, 116], [66, 152]]} />
      <Poly p={[[66, 116], [80, 134], [66, 140]]} />
      <Poly p={[[62, 94], [42, 80]]} />
      <Head x={214} y={76} />
      <Poly p={[[214, 83], [210, 116], [206, 152]]} />
      <Poly p={[[210, 116], [222, 134], [212, 142]]} />
      <Poly p={[[214, 94], [232, 82]]} />
      <circle cx="206" cy="158" r="3.5" style={S.dotAcc} />
      <Dim a={[74, 176]} b={[206, 176]} label="" />
      <Arrow from={[90, 58]} to={[196, 58]} st={S.thin} />
    </>
  )
}

const FIGS: Record<string, () => ReactNode> = {
  sjft: SjftMat,
  swft: SwftMat,
  chinup_dynamic: ChinUpFront,
  chinup_isometric: ChinUpSide,
  handgrip: Handgrip,
  reactive_agility: ReactiveAgility,
  y_balance: YBalance,
  stork: Stork,
  cmj: () => <JumpSequence />,
  squat_jump: () => <JumpSequence hold />,
  mcgill_flexor: McGillFlexor,
  trunk_extension: TrunkExtension,
  side_plank: SidePlank,
  flamingo: Flamingo,
  punch_force: PunchForce,
  sprint_10m: () => <Sprint meters={10} lead />,
  sprint_30m: () => <Sprint meters={30} />,
  taikt: () => <KickTarget axis="…" />,
  taaa: () => (
    <>
      <Shuttle meters={4} legs={6} kick />
      <T x={160} y={20}>6 × (20 s + 10 s)</T>
    </>
  ),
  fencing_endurance: FencingStrip,
  shuttle_5x5: () => <Shuttle meters={5} legs={5} />,
  lunge: Lunge,
  agility_course: Course,
  sit_reach: SitReach,
  broad_jump: BroadJump,
  track_400: Track400,
  css_swim: CssPool,
  triathlon_sprint: () => <TriProcess swim="750 m" bike="20 km" run="5 km" />,
  triathlon_olympic: () => <TriProcess swim="1500 m" bike="40 km" run="10 km" />,
  star_excursion: StarExcursion,
  single_leg_hop: SingleLegHop,
  sprint_20m: () => <Sprint meters={20} />,
}

export const FIGURE_IDS = Object.keys(FIGS)

export default function Library({ id, alt }: { id: string; alt: string }) {
  const Fig = FIGS[id]
  if (!Fig) return null
  return (
    <svg
      role="img"
      aria-label={alt}
      viewBox="0 0 320 190"
      className="mx-auto block h-auto w-full max-w-[440px]"
    >
      <Fig />
    </svg>
  )
}
