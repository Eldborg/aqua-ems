import { useState, useEffect } from 'react'
import {
  Activity, AlertTriangle, CheckCircle, Zap, Droplets,
  TrendingDown, TrendingUp, Thermometer, Wind, BarChart2,
  Bell, Wifi, Battery, Settings, Fish, Gauge
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────
interface Cage { id: number; name: string; o2: number; temp: number }
interface PowerSystem { name: string; kw: number; baseline: number; color: string }
interface Alert { id: number; time: string; severity: 'info' | 'warning' | 'critical'; message: string }
interface Pump { id: number; name: string; kw: number; baseline: number }
interface SpotHour { hour: number; price: number }

// ── Helpers ───────────────────────────────────────────────────────────────
const fl = (v: number, pct: number) => v + (Math.random() - 0.5) * 2 * v * pct
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const fmt = (n: number) => Math.round(n).toLocaleString('nb-NO')
const fmtNok = (n: number) => fmt(n) + ' NOK'

// ── Static seed data ──────────────────────────────────────────────────────
const SEED_CAGES: Cage[] = [
  { id: 1, name: 'Merd 1', o2: 8.2, temp: 12.4 },
  { id: 2, name: 'Merd 2', o2: 7.8, temp: 12.1 },
  { id: 3, name: 'Merd 3', o2: 8.9, temp: 12.6 },
  { id: 4, name: 'Merd 4', o2: 7.2, temp: 12.3 },
  { id: 5, name: 'Merd 5', o2: 8.5, temp: 12.5 },
  { id: 6, name: 'Merd 6', o2: 9.1, temp: 12.2 },
  { id: 7, name: 'Merd 7', o2: 8.0, temp: 12.4 },
  { id: 8, name: 'Merd 8', o2: 7.6, temp: 12.1 },
]

const SEED_POWER: PowerSystem[] = [
  { name: 'Lufting / Oksygen',  kw: 382, baseline: 382, color: '#0ea5e9' },
  { name: 'Sirkulasjonspumper', kw: 214, baseline: 214, color: '#818cf8' },
  { name: 'Oppvarming',         kw: 127, baseline: 127, color: '#f59e0b' },
  { name: 'Fôringsanlegg',      kw:  68, baseline:  68, color: '#34d399' },
  { name: 'Belysning',          kw:  56, baseline:  56, color: '#a78bfa' },
]

const SEED_PUMPS: Pump[] = [
  { id: 1, name: 'Luftepumpe 1 — Merd 1/2', kw: 45.2, baseline: 45 },
  { id: 2, name: 'Luftepumpe 2 — Merd 3/4', kw: 44.8, baseline: 45 },
  { id: 3, name: 'Luftepumpe 3 — Merd 5/6', kw: 51.4, baseline: 45 },
  { id: 4, name: 'Luftepumpe 4 — Merd 7/8', kw: 45.9, baseline: 45 },
  { id: 5, name: 'Sjøvannspumpe A',          kw: 38.1, baseline: 38 },
  { id: 6, name: 'Sjøvannspumpe B',          kw: 37.3, baseline: 38 },
]

const ALERTS: Alert[] = [
  { id: 1, time: '14:28', severity: 'warning',  message: 'Merd 4: O₂ 7.2 mg/L — nærmer seg sikkerhetsterskel' },
  { id: 2, time: '14:15', severity: 'warning',  message: 'Luftepumpe 3: +14% over baseline effektforbruk — inspiser lager' },
  { id: 3, time: '13:47', severity: 'info',     message: 'Effektstyring aktivert — toppbelastning redusert 87 kW kl. 08:30' },
  { id: 4, time: '13:30', severity: 'info',     message: 'Spotpris stiger til 1.14 NOK/kWh kl. 17:00 — lastskift planlagt' },
  { id: 5, time: '12:15', severity: 'info',     message: 'Ny månedlig toppbelastning registrert: 892 kW kl. 08:43' },
  { id: 6, time: '11:02', severity: 'info',     message: 'Fôring Merd 6 forskjøvet 20 min — strømpris 1.22 NOK/kWh' },
]

function makeSpotPrices(): SpotHour[] {
  const now = new Date().getHours()
  return Array.from({ length: 24 }, (_, i) => {
    const h = (now + i) % 24
    let price: number
    if      (h >= 2  && h <= 6)  price = 0.38 + Math.random() * 0.18
    else if (h >= 7  && h <= 9)  price = 0.88 + Math.random() * 0.32
    else if (h >= 10 && h <= 15) price = 0.62 + Math.random() * 0.22
    else if (h >= 16 && h <= 20) price = 0.92 + Math.random() * 0.38
    else                          price = 0.48 + Math.random() * 0.20
    return { hour: h, price: Math.round(price * 100) / 100 }
  })
}

// ── O2 gauge bar ──────────────────────────────────────────────────────────
function O2Bar({ cage }: { cage: Cage }) {
  const pct = clamp((cage.o2 / 12) * 100, 0, 100)
  const isCrit = cage.o2 < 7.0
  const isWarn = cage.o2 < 7.5 && !isCrit
  const color  = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : '#10b981'
  const bg     = isCrit ? 'rgba(239,68,68,0.12)' : isWarn ? 'rgba(245,158,11,0.10)' : 'rgba(16,185,129,0.08)'
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
      <div className="w-14 text-xs text-slate-400 font-medium">{cage.name}</div>
      <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-2 rounded-full transition-all duration-700"
             style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-20 flex items-center gap-1.5">
        <span className="text-sm font-semibold" style={{ color }}>{cage.o2}</span>
        <span className="text-xs text-slate-500">mg/L</span>
        {(isCrit || isWarn) && <AlertTriangle size={11} color={color} />}
      </div>
      <div className="w-12 text-xs text-slate-500 text-right">{cage.temp}°C</div>
    </div>
  )
}

// ── Effektstyring arc gauge ───────────────────────────────────────────────
function EffektGauge({ value, max }: { value: number; max: number }) {
  const pct   = clamp(value / max, 0, 1)
  const R     = 70
  const cx    = 90
  const cy    = 90
  const start = Math.PI * 0.85
  const end   = Math.PI * 0.15 + Math.PI
  const span  = end - start
  const angle = start + span * pct
  const x1    = cx + R * Math.cos(start)
  const y1    = cy + R * Math.sin(start)
  const x2    = cx + R * Math.cos(end)
  const y2    = cy + R * Math.sin(end)
  const xv    = cx + R * Math.cos(angle)
  const yv    = cy + R * Math.sin(angle)
  const color = pct > 0.9 ? '#ef4444' : pct > 0.75 ? '#f59e0b' : '#10b981'
  const largeArc = span * pct > Math.PI ? 1 : 0

  return (
    <svg viewBox="0 0 180 110" className="w-full max-w-[200px] mx-auto">
      {/* Track */}
      <path d={`M ${x1} ${y1} A ${R} ${R} 0 1 1 ${x2} ${y2}`}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
      {/* Value arc */}
      <path d={`M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${xv} ${yv}`}
            fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            style={{ transition: 'all 0.8s ease' }} />
      {/* Labels */}
      <text x={cx} y={cy - 8} textAnchor="middle" fill={color}
            fontSize="22" fontWeight="700" fontFamily="Inter, sans-serif">
        {Math.round(value)}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b"
            fontSize="9" fontFamily="Inter, sans-serif">kW / {max} kW</text>
      <text x={cx} y={cy + 26} textAnchor="middle"
            fill={pct > 0.9 ? '#ef4444' : pct > 0.75 ? '#f59e0b' : '#10b981'}
            fontSize="9" fontWeight="600" fontFamily="Inter, sans-serif">
        {Math.round(pct * 100)}% av terskel
      </text>
      {/* Min / Max labels */}
      <text x="18" y="100" fill="#334155" fontSize="8" fontFamily="Inter, sans-serif">0</text>
      <text x="148" y="100" fill="#334155" fontSize="8" fontFamily="Inter, sans-serif">{max}</text>
    </svg>
  )
}

// ── Spot price SVG chart ──────────────────────────────────────────────────
function SpotChart({ prices }: { prices: SpotHour[] }) {
  const W = 340; const H = 100; const PAD = { t: 12, r: 12, b: 22, l: 34 }
  const iW = W - PAD.l - PAD.r
  const iH = H - PAD.t - PAD.b
  const maxP = Math.max(...prices.map(p => p.price), 1.4)
  const minP = 0

  const px = (i: number) => PAD.l + (i / (prices.length - 1)) * iW
  const py = (p: number) => PAD.t + (1 - (p - minP) / (maxP - minP)) * iH

  const polyline = prices.map((p, i) => `${px(i)},${py(p.price)}`).join(' ')
  const area = `M ${px(0)},${py(prices[0].price)} ` +
    prices.map((p, i) => `L ${px(i)},${py(p.price)}`).join(' ') +
    ` L ${px(prices.length - 1)},${PAD.t + iH} L ${px(0)},${PAD.t + iH} Z`

  const current = prices[0]
  const isExp = current.price > 0.85

  const yTicks = [0.4, 0.8, 1.2]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Y grid lines */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={PAD.l} y1={py(t)} x2={W - PAD.r} y2={py(t)}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <text x={PAD.l - 4} y={py(t) + 3} textAnchor="end"
                fill="#475569" fontSize="7" fontFamily="Inter">{t.toFixed(1)}</text>
        </g>
      ))}
      {/* Cheap zone shading */}
      {prices.map((p, i) => p.price < 0.60 ? (
        <rect key={i}
              x={px(i) - iW / (prices.length * 2)}
              y={PAD.t} width={iW / prices.length + 1} height={iH}
              fill="rgba(16,185,129,0.08)" />
      ) : null)}
      {/* Area */}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0ea5e9" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaGrad)" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#0ea5e9"
                strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {/* Current hour dot */}
      <circle cx={px(0)} cy={py(current.price)} r="4"
              fill={isExp ? '#f59e0b' : '#10b981'} stroke="#020b18" strokeWidth="2" />
      {/* X axis labels — every 4 hours */}
      {prices.filter((_, i) => i % 4 === 0).map((p, idx) => (
        <text key={idx} x={px(idx * 4)} y={H - 4}
              textAnchor="middle" fill="#475569" fontSize="7" fontFamily="Inter">
          {String(p.hour).padStart(2, '0')}
        </text>
      ))}
      {/* Current price callout */}
      <text x={px(0)} y={py(current.price) - 8}
            textAnchor="middle" fill={isExp ? '#f59e0b' : '#10b981'}
            fontSize="8" fontWeight="600" fontFamily="Inter">
        {current.price.toFixed(2)} kr
      </text>
    </svg>
  )
}

// ── Power bar ─────────────────────────────────────────────────────────────
function PowerBar({ sys, total }: { sys: PowerSystem; total: number }) {
  const pct = (sys.kw / total) * 100
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-32 text-xs text-slate-400 truncate">{sys.name}</div>
      <div className="flex-1 h-1.5 rounded-full bg-slate-800">
        <div className="h-1.5 rounded-full transition-all duration-700"
             style={{ width: `${pct}%`, background: sys.color }} />
      </div>
      <div className="w-14 text-right text-xs font-medium" style={{ color: sys.color }}>
        {sys.kw} kW
      </div>
      <div className="w-8 text-right text-xs text-slate-600">{Math.round(pct)}%</div>
    </div>
  )
}

// ── Pump row ──────────────────────────────────────────────────────────────
function PumpRow({ pump }: { pump: Pump }) {
  const delta = ((pump.kw - pump.baseline) / pump.baseline) * 100
  const isWarn = delta > 8
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isWarn ? 'bg-amber-400' : 'bg-emerald-400'}`} />
      <div className="flex-1 text-xs text-slate-300 truncate">{pump.name}</div>
      <div className="text-xs font-medium text-slate-300 w-12 text-right">{pump.kw.toFixed(1)} kW</div>
      <div className={`text-xs w-14 text-right font-medium ${isWarn ? 'text-amber-400' : 'text-slate-600'}`}>
        {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
      </div>
      {isWarn
        ? <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
        : <CheckCircle   size={12} className="text-emerald-600 flex-shrink-0" />
      }
    </div>
  )
}

// ── Card wrapper ──────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-4 ${className}`}>
      {children}
    </div>
  )
}

function CardTitle({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-slate-400">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</span>
      {sub && <span className="text-xs text-slate-600 ml-auto">{sub}</span>}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({
  label, value, unit, sub, color, icon, trend
}: {
  label: string; value: string; unit?: string; sub?: string;
  color: string; icon: React.ReactNode; trend?: 'up' | 'down'
}) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-slate-500 font-medium">{label}</span>
        <span className="text-slate-600">{icon}</span>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-bold tracking-tight" style={{ color }}>{value}</span>
        {unit && <span className="text-sm text-slate-500 mb-1">{unit}</span>}
      </div>
      {sub && (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          {trend === 'down' && <TrendingDown size={11} className="text-emerald-400" />}
          {trend === 'up'   && <TrendingUp   size={11} className="text-red-400" />}
          {sub}
        </div>
      )}
    </Card>
  )
}

// ═════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════
export default function App() {
  const [cages,  setCages]  = useState<Cage[]>(SEED_CAGES)
  const [power,  setPower]  = useState<PowerSystem[]>(SEED_POWER)
  const [pumps,  setPumps]  = useState<Pump[]>(SEED_PUMPS)
  const [time,   setTime]   = useState(new Date())
  const [spot]              = useState<SpotHour[]>(makeSpotPrices)
  const [monthlyPeak]       = useState(892)
  const THRESHOLD           = 1000

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Simulate live sensor updates every 4 s
  useEffect(() => {
    const t = setInterval(() => {
      setCages(prev => prev.map(c => ({
        ...c,
        o2:   Math.round(clamp(fl(c.o2,   0.009), 6.4, 10.5) * 10) / 10,
        temp: Math.round(clamp(fl(c.temp, 0.003), 10.5, 14.5) * 10) / 10,
      })))
      setPower(prev => prev.map(s => ({
        ...s,
        kw: Math.round(clamp(fl(s.kw, 0.022), s.baseline * 0.68, s.baseline * 1.32)),
      })))
      setPumps(prev => prev.map(p => ({
        ...p,
        kw: Math.round(clamp(fl(p.kw, 0.015), p.baseline * 0.82, p.baseline * 1.28) * 10) / 10,
      })))
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const totalPower   = power.reduce((s, p) => s + p.kw, 0)
  const currentPrice = spot[0]?.price ?? 0.83
  const isExpensive  = currentPrice > 0.85
  const o2Warnings   = cages.filter(c => c.o2 < 7.5).length
  const effektPct    = clamp(totalPower / THRESHOLD, 0, 1)

  const savingsEffekt  = 143_200
  const savingsSpot    = 44_250
  const totalSavings   = savingsEffekt + savingsSpot

  const timeStr = time.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = time.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #020b18 0%, #050f1e 60%, #020b18 100%)' }}>

      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800/60 px-6 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Fish size={22} className="text-sky-400" />
              <div>
                <div className="text-sm font-bold text-white tracking-tight">AquaEMS</div>
                <div className="text-xs text-slate-500">av Skyfri</div>
              </div>
            </div>
            <div className="h-5 w-px bg-slate-700" />
            <div>
              <div className="text-sm font-semibold text-slate-200">Halsen Havbruk AS</div>
              <div className="text-xs text-slate-500">Sunnhordland, Hordaland</div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
              <span className="text-xs text-emerald-400 font-medium">LIVE</span>
            </div>
            {/* Alerts badge */}
            <div className="flex items-center gap-1.5">
              <Bell size={14} className={o2Warnings > 0 ? 'text-amber-400' : 'text-slate-600'} />
              {o2Warnings > 0 && (
                <span className="text-xs font-semibold text-amber-400">{o2Warnings} varsler</span>
              )}
            </div>
            {/* Connectivity */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Wifi size={12} className="text-emerald-500" />
              4G · Teltonika
            </div>
            {/* Clock */}
            <div className="text-right">
              <div className="text-sm font-mono font-semibold text-slate-200">{timeStr}</div>
              <div className="text-xs text-slate-500 capitalize">{dateStr}</div>
            </div>
            <Settings size={15} className="text-slate-600 cursor-pointer hover:text-slate-400 transition-colors" />
          </div>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────────────── */}
      <main className="max-w-screen-2xl mx-auto px-6 py-5 space-y-5">

        {/* ── KPI ROW ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total effekt nå"
            value={fmt(totalPower)}
            unit="kW"
            sub={`Terskel: ${THRESHOLD} kW · ${Math.round(effektPct * 100)}% benyttet`}
            color={effektPct > 0.9 ? '#ef4444' : effektPct > 0.75 ? '#f59e0b' : '#0ea5e9'}
            icon={<Zap size={16} />}
            trend={effektPct > 0.75 ? 'up' : undefined}
          />
          <StatCard
            label="Spotpris nå"
            value={currentPrice.toFixed(2)}
            unit="NOK/kWh"
            sub={isExpensive ? 'Høyt — lastskift aktivt' : 'Lavt — gunstig kjøring'}
            color={isExpensive ? '#f59e0b' : '#10b981'}
            icon={<Activity size={16} />}
            trend={isExpensive ? 'up' : 'down'}
          />
          <StatCard
            label="O₂ status"
            value={o2Warnings === 0 ? 'OK' : `${o2Warnings} varsler`}
            sub={`Merd 4: ${cages[3].o2} mg/L · Snitt: ${(cages.reduce((s, c) => s + c.o2, 0) / cages.length).toFixed(1)} mg/L`}
            color={o2Warnings === 0 ? '#10b981' : '#f59e0b'}
            icon={<Droplets size={16} />}
          />
          <StatCard
            label="Besparelser denne mnd"
            value={fmt(totalSavings)}
            unit="NOK"
            sub="Effektstyring + spotoptimering"
            color="#10b981"
            icon={<TrendingDown size={16} />}
            trend="down"
          />
        </div>

        {/* ── MAIN GRID ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── LEFT: O2 per cage ──────────────────────────────────── */}
          <Card>
            <CardTitle icon={<Droplets size={14} />} label="Oksygen per merd"
                       sub="Sikkerhetsterskel 7.0 mg/L" />
            <div className="space-y-0.5">
              {cages.map(c => <O2Bar key={c.id} cage={c} />)}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-slate-500">Kritisk</div>
                <div className="text-lg font-bold text-red-400">
                  {cages.filter(c => c.o2 < 7.0).length}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Advarsel</div>
                <div className="text-lg font-bold text-amber-400">
                  {cages.filter(c => c.o2 >= 7.0 && c.o2 < 7.5).length}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Normal</div>
                <div className="text-lg font-bold text-emerald-400">
                  {cages.filter(c => c.o2 >= 7.5).length}
                </div>
              </div>
            </div>
          </Card>

          {/* ── MIDDLE: Effektstyring + Power ──────────────────────── */}
          <Card>
            <CardTitle icon={<Gauge size={14} />} label="Effektstyring"
                       sub={`Mnd.topp: ${monthlyPeak} kW`} />
            <EffektGauge value={totalPower} max={THRESHOLD} />
            <div className="grid grid-cols-2 gap-2 mt-2 mb-5">
              <div className="rounded-lg bg-slate-800/50 p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">Toppbelastning mnd</div>
                <div className="text-lg font-bold text-sky-400">{monthlyPeak} kW</div>
              </div>
              <div className="rounded-lg bg-slate-800/50 p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">Spart på effekttariff</div>
                <div className="text-lg font-bold text-emerald-400">{fmt(savingsEffekt)}</div>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-4">
              <CardTitle icon={<BarChart2 size={14} />} label="Strømfordeling" />
              <div className="space-y-0.5">
                {power.map(s => <PowerBar key={s.name} sys={s} total={totalPower} />)}
              </div>
            </div>
          </Card>

          {/* ── RIGHT: Spot price + Alerts ─────────────────────────── */}
          <div className="space-y-4">
            <Card>
              <CardTitle icon={<Activity size={14} />} label="Spotpris 24 timer"
                         sub="NO5 · Neste 24t" />
              <SpotChart prices={spot} />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-emerald-950/50 p-2 border border-emerald-900/40">
                  <div className="text-xs text-emerald-600 mb-0.5">Billigst</div>
                  <div className="text-sm font-bold text-emerald-400">
                    {Math.min(...spot.map(s => s.price)).toFixed(2)} kr
                  </div>
                </div>
                <div className="rounded-lg bg-slate-800/50 p-2">
                  <div className="text-xs text-slate-500 mb-0.5">Nå</div>
                  <div className="text-sm font-bold text-sky-400">{currentPrice.toFixed(2)} kr</div>
                </div>
                <div className="rounded-lg bg-amber-950/50 p-2 border border-amber-900/40">
                  <div className="text-xs text-amber-600 mb-0.5">Dyrest</div>
                  <div className="text-sm font-bold text-amber-400">
                    {Math.max(...spot.map(s => s.price)).toFixed(2)} kr
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle icon={<Bell size={14} />} label="Siste varsler" />
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {ALERTS.map(a => (
                  <div key={a.id} className="flex items-start gap-2 text-xs">
                    <div className="flex-shrink-0 mt-0.5">
                      {a.severity === 'critical' && <AlertTriangle size={12} className="text-red-400" />}
                      {a.severity === 'warning'  && <AlertTriangle size={12} className="text-amber-400" />}
                      {a.severity === 'info'     && <CheckCircle   size={12} className="text-sky-500" />}
                    </div>
                    <div className="flex-1 text-slate-400 leading-relaxed">{a.message}</div>
                    <div className="flex-shrink-0 text-slate-600">{a.time}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ── BOTTOM ROW ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Equipment health */}
          <Card>
            <CardTitle icon={<Wind size={14} />} label="Utstyrshelse — pumper"
                       sub="Baseline-avvik" />
            <div className="space-y-0.5">
              {pumps.map(p => <PumpRow key={p.id} pump={p} />)}
            </div>
          </Card>

          {/* Monthly savings breakdown */}
          <Card>
            <CardTitle icon={<TrendingDown size={14} />} label="Månedsrapport — besparelser"
                       sub={time.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })} />
            <div className="space-y-3">
              {[
                { label: 'Effekttariff-besparelse', value: savingsEffekt, color: '#0ea5e9', pct: 76 },
                { label: 'Spotprisoptimering',       value: savingsSpot,   color: '#10b981', pct: 24 },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="font-semibold" style={{ color: item.color }}>{fmtNok(item.value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full transition-all duration-700"
                         style={{ width: `${item.pct}%`, background: item.color }} />
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-300">Total besparelse</span>
                <span className="text-xl font-bold text-emerald-400">{fmtNok(totalSavings)}</span>
              </div>
              <div className="rounded-lg bg-emerald-950/40 border border-emerald-900/40 p-3 text-center">
                <div className="text-xs text-emerald-600 mb-0.5">Strømpris uten EMS (estimert)</div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-slate-500 line-through text-sm">
                    {fmtNok(totalSavings * 5 + totalSavings)}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Du betaler: {fmtNok(totalSavings * 5)} NOK
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div>
                  <div className="text-xs text-slate-500">ROI faktor</div>
                  <div className="text-lg font-bold text-emerald-400">9.3x</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Tilbakebetaling</div>
                  <div className="text-lg font-bold text-sky-400">3 uker</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Årsbesparelse est.</div>
                  <div className="text-lg font-bold text-slate-300">
                    {fmt(totalSavings * 12)} kr
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-700 pb-4">
          AquaEMS by Skyfri · Demo — Halsen Havbruk AS · Data oppdateres hvert 4. sekund
        </div>
      </main>
    </div>
  )
}
